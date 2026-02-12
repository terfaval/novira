import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { extractAndAnchorFootnotes } from "@/lib/upload/footnotes";
import {
  detectUploadFormat,
  parseToCanonical,
  type CanonicalBook,
  type UploadFormat,
} from "@/lib/upload/parser";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const BUCKET_NAME = process.env.SUPABASE_UPLOAD_BUCKET ?? "sources";

const MIME_BY_FORMAT: Record<UploadFormat, Set<string>> = {
  html: new Set(["text/html", "application/xhtml+xml"]),
  rtf: new Set(["application/rtf", "text/rtf", "application/x-rtf"]),
  docx: new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
};

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
  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "A fajl kotelezo." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, message: "A cim kotelezo." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, message: "A fajl tul nagy (max 12 MB)." }, { status: 413 });
  }

  const format = detectUploadFormat(file.name, file.type);
  if (!format) {
    return NextResponse.json(
      { ok: false, message: "Csak HTML, RTF es DOCX formatum tamogatott." },
      { status: 415 }
    );
  }

  if (!isAllowedMime(format, file.type)) {
    return NextResponse.json(
      { ok: false, message: "A MIME tipus nem megfelelo a fajl kiterjesztesehez." },
      { status: 415 }
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const ext = format === "html" ? "html" : format;
  const storagePath = `${userId}/${Date.now()}-${safeBaseName(file.name)}.${ext}`;
  const sourceMime = normalizeMime(file.type);

  const uploadRes = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { upsert: false, contentType: sourceMime });
  if (uploadRes.error) {
    return NextResponse.json(
      { ok: false, message: `A fajl tarolasa sikertelen: ${uploadRes.error.message}` },
      { status: 500 }
    );
  }

  let bookId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("books")
      .insert({
        owner_id: userId,
        user_id: userId,
        title,
        author: author || null,
        description: description || null,
        source_format: format,
        source_filename: file.name,
        source_mime: sourceMime,
        source_size_bytes: file.size,
        source_storage_path: storagePath,
        status: "processing",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      throw mapInsertError(error);
    }

    bookId = data.id as string;

    const canonical = await parseToCanonical(fileBuffer, format);
    if (canonical.chapters.length === 0) {
      throw new Error("A parser nem talalt feldolgozhato tartalmat.");
    }

    await persistCanonical(supabase, bookId, userId, canonical);
    await extractAndAnchorFootnotes(supabase, { userId, bookId });
    await setBookStatus(supabase, bookId, "ready", null);

    return NextResponse.json({
      ok: true,
      bookId,
      chapters: canonical.chapters.length,
      blocks: canonical.chapters.reduce((sum, ch) => sum + ch.blocks.length, 0),
    });
  } catch (err: any) {
    const message = err?.message ?? "Sikertelen feltoltes.";

    if (bookId) {
      await setBookStatus(supabase, bookId, "failed", message);
    } else {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    }

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

function normalizeMime(mime: string): string {
  return mime.trim().toLowerCase();
}

function isAllowedMime(format: UploadFormat, mime: string): boolean {
  const normalized = normalizeMime(mime);
  if (!normalized) return false;
  return MIME_BY_FORMAT[format].has(normalized);
}

function mapInsertError(error: { message?: string } | null): Error {
  const raw = error?.message ?? "Nem sikerult letrehozni a konyv rekordot.";
  const normalized = raw.toLowerCase();

  if (normalized.includes("could not find") && normalized.includes("column")) {
    return new Error(
      "Adatbazis schema elteres: hianyzik egy feltolteshez szukseges oszlop a books tablabol."
    );
  }
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

function safeBaseName(name: string) {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const base = dot > 0 ? lower.slice(0, dot) : lower;
  return base.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "upload";
}
