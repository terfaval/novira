import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { detectUploadFormat, parseToCanonical, type CanonicalBook } from "@/lib/upload/parser";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const BUCKET_NAME = process.env.SUPABASE_UPLOAD_BUCKET ?? "books";

type BookStatusTarget = "processing" | "ready" | "failed";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "Hiányzó auth token." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient(accessToken);
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json({ ok: false, message: "Érvénytelen munkamenet." }, { status: 401 });
  }

  const userId = authData.user.id;
  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "A fájl kötelező." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, message: "A cím kötelező." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, message: "A fájl túl nagy (max 12 MB)." }, { status: 413 });
  }

  const format = detectUploadFormat(file.name, file.type);
  if (!format) {
    return NextResponse.json({ ok: false, message: "Csak HTML, RTF és DOCX formátum támogatott." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = format === "html" ? "html" : format;
  const storagePath = `${userId}/${Date.now()}-${safeBaseName(file.name)}.${ext}`;

  let bookId: string | null = null;
  try {
    const created = await createBookRow(supabase, userId, {
      title,
      author: author || null,
      description: description || null,
      format,
      filename: file.name,
    });
    bookId = created.id;

    await setBookProgress(supabase, bookId, "processing", 10);

    const uploadRes = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, { upsert: false, contentType: file.type || contentTypeForFormat(format) });
    if (uploadRes.error) {
      throw new Error(`Storage upload failed: ${uploadRes.error.message}`);
    }

    await setBookProgress(supabase, bookId, "processing", 40);

    const canonical = await parseToCanonical(buffer, format);
    if (canonical.chapters.length === 0) {
      throw new Error("A parser nem talált feldolgozható tartalmat.");
    }

    await persistCanonical(supabase, bookId, userId, canonical);
    await setBookProgress(supabase, bookId, "ready", 100);

    return NextResponse.json({
      ok: true,
      bookId,
      chapters: canonical.chapters.length,
      blocks: canonical.chapters.reduce((sum, ch) => sum + ch.blocks.length, 0),
    });
  } catch (err: any) {
    if (bookId) await setBookProgress(supabase, bookId, "failed", 100);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Sikertelen feltöltés." },
      { status: 500 }
    );
  }
}

async function createBookRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  args: { title: string; author: string | null; description: string | null; format: string; filename: string }
): Promise<{ id: string }> {
  const base = {
    title: args.title,
    author: args.author,
    description: args.description,
  };

  const payloads: Record<string, unknown>[] = [
    { ...base, status: "processing", progress: 5, source_format: args.format, source_filename: args.filename, user_id: userId },
    { ...base, status: "processing", progress: 5, source_format: args.format, source_filename: args.filename, owner_id: userId },
    { ...base, status: "processing", progress: 5, user_id: userId },
    { ...base, status: "processing", progress: 5, owner_id: userId },
    { ...base, status: "processing", progress: 5 },
    { ...base, source_format: args.format, source_filename: args.filename, user_id: userId },
    { ...base, source_format: args.format, source_filename: args.filename, owner_id: userId },
    base,
  ];

  let lastError: any = null;
  for (const payload of payloads) {
    const { data, error } = await supabase.from("books").insert(payload).select("id").single();
    if (!error && data?.id) return { id: data.id as string };
    lastError = error;
  }

  throw new Error(lastError?.message ?? "Nem sikerült létrehozni a könyv rekordot.");
}

async function setBookProgress(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  bookId: string,
  status: BookStatusTarget,
  progress: number
) {
  const statusCandidates = status === "processing"
    ? ["processing", "feldolgozas", "uj"]
    : status === "ready"
      ? ["ready", "kesz", "szerkesztes"]
      : ["failed", "hiba"];

  for (const st of statusCandidates) {
    const variants: Record<string, unknown>[] = [
      { status: st, progress },
      { status: st },
      { progress },
    ];

    for (const payload of variants) {
      const { error } = await supabase.from("books").update(payload).eq("id", bookId);
      if (!error) return;
    }
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
      chapter_index: chapter.order_index,
      title: chapter.title,
    });

    for (const block of chapter.blocks) {
      await insertBlock(supabase, userId, {
        book_id: bookId,
        chapter_id: chapterId,
        block_index: block.order_index,
        raw_text: block.raw_text,
      });
    }
  }
}

async function insertChapter(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  base: { book_id: string; chapter_index: number; title: string }
): Promise<string> {
  const payloads: Record<string, unknown>[] = [
    { ...base, owner_id: userId },
    { ...base, user_id: userId },
    base,
  ];

  let lastError: any = null;
  for (const payload of payloads) {
    const { data, error } = await supabase.from("chapters").insert(payload).select("id").single();
    if (!error && data?.id) return data.id as string;
    lastError = error;
  }

  throw new Error(lastError?.message ?? "Nem sikerült menteni a fejezetet.");
}

async function insertBlock(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  base: { book_id: string; chapter_id: string; block_index: number; raw_text: string }
) {
  const hash = createHash("sha256").update(base.raw_text).digest("hex");
  const payloads: Record<string, unknown>[] = [
    { ...base, type: "paragraph", original_text: base.raw_text, original_hash: hash, owner_id: userId },
    { ...base, type: "paragraph", original_text: base.raw_text, original_hash: hash, user_id: userId },
    { ...base, type: "paragraph", original_text: base.raw_text, owner_id: userId },
    { ...base, type: "paragraph", raw_text: base.raw_text, owner_id: userId },
    { ...base, type: "paragraph", text: base.raw_text, owner_id: userId },
    { ...base, original_text: base.raw_text, original_hash: hash },
    { ...base, raw_text: base.raw_text },
    { ...base, text: base.raw_text },
  ];

  let lastError: any = null;
  for (const payload of payloads) {
    const { error } = await supabase.from("blocks").insert(payload);
    if (!error) return;
    lastError = error;
  }

  throw new Error(lastError?.message ?? "Nem sikerült menteni a blokkot.");
}

function contentTypeForFormat(format: "html" | "rtf" | "docx") {
  if (format === "html") return "text/html";
  if (format === "rtf") return "application/rtf";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function safeBaseName(name: string) {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const base = dot > 0 ? lower.slice(0, dot) : lower;
  return base.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "upload";
}
