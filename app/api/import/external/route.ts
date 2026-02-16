import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { extractAndAnchorFootnotes } from "@/lib/upload/footnotes";
import type { CanonicalBook } from "@/lib/upload/parser";
import { importProjectGutenbergHtmlZip } from "@/lib/upload/external/projectGutenberg";

const BUCKET_NAME = process.env.SUPABASE_UPLOAD_BUCKET ?? "sources";

const ExternalImportSchema = z.object({
  source: z.literal("project_gutenberg"),
  workId: z
    .number()
    .int()
    .positive()
    .or(z.string().regex(/^\d+$/).transform((value) => Number.parseInt(value, 10))),
  title: z.string().trim().max(240).optional(),
  author: z.string().trim().max(160).optional(),
  description: z.string().trim().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "Hianyzo auth token." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient(accessToken);
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json({ ok: false, message: "Ervenytelen munkamenet." }, { status: 401 });
  }
  const userId = authData.user.id;

  const parsed = ExternalImportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Ervenytelen kulso import kerelmi parameter." },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const sourceWorkId = `${body.workId}`;

  const { data: cachedBookRows } = await supabase
    .from("books")
    .select("id")
    .eq("user_id", userId)
    .eq("source_name", "project_gutenberg")
    .eq("source_work_id", sourceWorkId)
    .eq("status", "ready")
    .order("updated_at", { ascending: false })
    .limit(1);
  const cachedBookId = (cachedBookRows as Array<{ id: string }> | null)?.[0]?.id;
  if (cachedBookId) {
    return NextResponse.json({ ok: true, cached: true, bookId: cachedBookId });
  }

  let imported: Awaited<ReturnType<typeof importProjectGutenbergHtmlZip>>;
  try {
    imported = await importProjectGutenbergHtmlZip(body.workId);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? "A kulso forras letoltese/feldolgozasa sikertelen." },
      { status: 500 }
    );
  }
  const zipHash = createHash("sha256").update(imported.zipBuffer).digest("hex");
  const sourceFilename = `pg${sourceWorkId}-h.zip`;
  const storagePath = `${userId}/external/${Date.now()}-${sourceFilename}`;

  const uploadRes = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, imported.zipBuffer, { upsert: false, contentType: "application/zip" });
  if (uploadRes.error) {
    return NextResponse.json(
      { ok: false, message: `A forrasfajl tarolasa sikertelen: ${uploadRes.error.message}` },
      { status: 500 }
    );
  }

  let bookId: string | null = null;
  try {
    const title = body.title?.trim() || imported.titleHint || `Project Gutenberg #${sourceWorkId}`;
    const description = body.description?.trim() || null;
    const author = body.author?.trim() || null;
    const baseBookInsertPayload = {
      owner_id: userId,
      user_id: userId,
      title,
      author,
      description,
      source_format: "html",
      source_filename: sourceFilename,
      source_mime: "application/zip",
      source_size_bytes: imported.zipBuffer.byteLength,
      source_storage_path: storagePath,
      source_name: imported.sourceName,
      source_url: imported.sourceUrl,
      source_retrieved_at: imported.sourceRetrievedAt,
      source_license_url: imported.sourceLicenseUrl,
      source_original_sha256: imported.sourceOriginalSha256,
      source_work_id: imported.sourceWorkId,
      status: "processing",
    };

    let insertResult = await supabase.from("books").insert(baseBookInsertPayload).select("id").single();
    if (insertResult.error && hasMissingOptionalSourceColumns(insertResult.error)) {
      const fallbackPayload = {
        owner_id: userId,
        user_id: userId,
        title,
        author,
        description,
        source_format: "html",
        source_filename: sourceFilename,
        source_mime: "application/zip",
        source_size_bytes: imported.zipBuffer.byteLength,
        source_storage_path: storagePath,
        status: "processing",
      };
      insertResult = await supabase.from("books").insert(fallbackPayload).select("id").single();
    }

    const { data, error } = insertResult;
    if (error || !data?.id) throw mapInsertError(error);
    bookId = data.id as string;

    await persistCanonical(supabase, bookId, userId, imported.canonical);
    await extractAndAnchorFootnotes(supabase, { userId, bookId });
    await setBookStatus(supabase, bookId, "ready", null);

    return NextResponse.json({
      ok: true,
      cached: false,
      bookId,
      source: imported.sourceName,
      sourceUrl: imported.sourceUrl,
      sourceOriginalSha256: imported.sourceOriginalSha256,
      zipSha256: zipHash,
    });
  } catch (err: any) {
    const message = err?.message ?? "Sikertelen kulso forras import.";
    if (bookId) {
      await setBookStatus(supabase, bookId, "failed", message);
    } else {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

function hasMissingOptionalSourceColumns(error: { message?: string } | null): boolean {
  const normalized = `${error?.message ?? ""}`.toLowerCase();
  return (
    normalized.includes("source_name") ||
    normalized.includes("source_url") ||
    normalized.includes("source_retrieved_at") ||
    normalized.includes("source_license_url") ||
    normalized.includes("source_original_sha256") ||
    normalized.includes("source_work_id")
  );
}

function mapInsertError(error: { message?: string } | null): Error {
  const raw = error?.message ?? "Nem sikerult letrehozni a konyv rekordot.";
  const normalized = raw.toLowerCase();
  if (normalized.includes("row-level security")) {
    return new Error("Nincs jogosultsag a konyv letrehozasahoz (RLS policy hiba).");
  }
  return new Error(raw);
}

async function setBookStatus(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  bookId: string,
  status: "processing" | "ready" | "failed",
  errorMessage: string | null
) {
  const payload =
    status === "failed"
      ? { status, error_message: errorMessage ?? "Ismeretlen feldolgozasi hiba." }
      : { status, error_message: null };

  const { error } = await supabase.from("books").update(payload).eq("id", bookId);
  if (error) {
    throw new Error(`Nem sikerult frissiteni a konyv statuszt: ${error.message}`);
  }
}

async function persistCanonical(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  bookId: string,
  userId: string,
  canonical: CanonicalBook
) {
  await supabase.from("blocks").delete().eq("book_id", bookId);
  await supabase.from("chapters").delete().eq("book_id", bookId);

  for (const chapter of canonical.chapters) {
    const chapterId = await insertChapter(supabase, userId, {
      book_id: bookId,
      chapter_index: chapter.chapter_index,
      title: chapter.title || null,
    });

    for (const block of chapter.blocks) {
      await insertBlock(supabase, userId, {
        book_id: bookId,
        chapter_id: chapterId,
        block_index: block.chapter_index,
        raw_text: block.raw_text,
      });
    }
  }
}

async function insertChapter(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  base: { book_id: string; chapter_index: number; title: string | null }
): Promise<string> {
  const payload = {
    owner_id: userId,
    book_id: base.book_id,
    chapter_index: base.chapter_index,
    title: base.title,
  };

  const { data, error } = await supabase
    .from("chapters")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(error?.message ?? "Nem sikerult menteni a fejezetet.");
  }
  return data.id as string;
}

async function insertBlock(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  base: { book_id: string; chapter_id: string; block_index: number; raw_text: string }
) {
  const hash = createHash("sha256").update(base.raw_text).digest("hex");
  const payload = {
    owner_id: userId,
    book_id: base.book_id,
    chapter_id: base.chapter_id,
    block_index: base.block_index,
    original_text: base.raw_text,
    original_hash: hash,
  };

  const { error } = await supabase.from("blocks").insert(payload);
  if (error) {
    throw new Error(error.message ?? "Nem sikerult menteni a blokkot.");
  }
}
