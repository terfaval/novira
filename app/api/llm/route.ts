import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { LlmRequest, LlmResponse } from "@/lib/llm/types";
import { err, mapProviderError } from "@/lib/llm/errors";
import { checkRateLimit } from "@/lib/llm/rateLimit";
import { OpenAiProvider } from "@/lib/llm/providers/openai";
import { getLlmContextForBlock } from "@/lib/db/queries/llmContext";
import { insertDraftVariant } from "@/lib/db/mutations/variants";
import { isAdminUser } from "@/lib/auth/identity";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * LLM endpoint (MVP)
 * - server-side only
 * - provider abstraction
 * - minimal rate limiting and payload caps
 */

const RATE_CFG = { windowMs: 10 * 60 * 1000, max: 30 };
const INPUT_CHAR_CAP = 8000;
const SELECTED_TEXT_CAP = 1200;
const MAX_OUTPUT_TOKENS_CAP = 1200;

const TranslateBlockSchema = z
  .object({
    action: z.literal("translate_block"),
    bookId: z.string().uuid(),
    blockId: z.string().uuid(),
    options: z
      .object({
        style: z.literal("modernize_hu").optional(),
        tone: z.literal("editorial").optional(),
        maxOutputTokens: z.number().int().positive().max(MAX_OUTPUT_TOKENS_CAP).optional(),
        userComment: z.string().trim().max(600).optional(),
      })
      .optional(),
  })
  .strict();

const GenerateNoteSchema = z
  .object({
    action: z.literal("generate_note"),
    bookId: z.string().uuid(),
    blockId: z.string().uuid(),
    selectedText: z.string().min(1).max(SELECTED_TEXT_CAP),
    options: z
      .object({
        tone: z.literal("editorial").optional(),
        maxOutputTokens: z.number().int().positive().max(MAX_OUTPUT_TOKENS_CAP).optional(),
      })
      .optional(),
  })
  .strict();

const GenerateBookSummarySchema = z
  .object({
    action: z.literal("generate_book_summary"),
    bookId: z.string().uuid(),
  })
  .strict();

const InferPublicationYearSchema = z
  .object({
    action: z.literal("infer_publication_year"),
    bookId: z.string().uuid(),
  })
  .strict();

const GenerateChapterTitleSchema = z
  .object({
    action: z.literal("generate_chapter_title"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    options: z
      .object({
        userComment: z.string().trim().max(600).optional(),
        maxOutputTokens: z.number().int().positive().max(MAX_OUTPUT_TOKENS_CAP).optional(),
      })
      .optional(),
  })
  .strict();

const LlmRequestSchema = z.discriminatedUnion("action", [
  TranslateBlockSchema,
  GenerateNoteSchema,
  GenerateBookSummarySchema,
  InferPublicationYearSchema,
  GenerateChapterTitleSchema,
]);

function getAccessToken(req: NextRequest): string {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const firstXff = xff?.split(",")?.[0]?.trim();
  if (firstXff) return firstXff;
  return req.headers.get("x-real-ip")?.trim() || "ip-unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse<LlmResponse>> {
  try {
    const bodyRaw = await req.json().catch(() => null);
    const parsed = LlmRequestSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: err("BAD_REQUEST", "Ervenytelen payload.") },
        { status: 400 }
      );
    }

    const body: LlmRequest = parsed.data;

    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: err("UNAUTHORIZED", "Hianyzo auth token.") },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServerClient(accessToken);
    const auth = await supabase.auth.getUser();
    if (auth.error || !auth.data.user) {
      return NextResponse.json(
        { ok: false, error: err("UNAUTHORIZED", "Ervenytelen munkamenet.") },
        { status: 401 }
      );
    }

    const userId = auth.data.user.id;
    const adminOnlyAction = body.action === "generate_book_summary" || body.action === "infer_publication_year";
    if (adminOnlyAction && !isAdminUser(auth.data.user)) {
      return NextResponse.json(
        { ok: false, error: err("UNAUTHORIZED", "Admin jogosultsag szukseges.") },
        { status: 403 }
      );
    }
    const ip = getClientIp(req);
    const rlKey = `llm:${userId}:${ip}`;

    const rl = checkRateLimit(rlKey, RATE_CFG);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: err("RATE_LIMITED", "Tul sok keres. Probald meg kesobb.") },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const provider = new OpenAiProvider();

    if (body.action === "generate_book_summary") {
      const { data: bookRow, error: bookErr } = await supabase
        .from("books")
        .select("id,title,author")
        .eq("id", body.bookId)
        .eq("user_id", userId)
        .single();
      if (bookErr || !bookRow) {
        return NextResponse.json(
          { ok: false, error: err("BAD_REQUEST", "A konyv nem talalhato a felhasznalohoz.") },
          { status: 400 }
        );
      }

      const { data: chapterRows } = await supabase
        .from("chapters")
        .select("title,chapter_index")
        .eq("book_id", body.bookId)
        .order("chapter_index", { ascending: true })
        .limit(12);

      const { data: blockRows } = await supabase
        .from("blocks")
        .select("original_text,block_index")
        .eq("book_id", body.bookId)
        .order("block_index", { ascending: true })
        .limit(4);

      const chapterTitles = ((chapterRows ?? []) as Array<{ title: string | null }>)
        .map((row) => (row.title ?? "").trim())
        .filter((title) => title.length > 0);
      const sampleText = ((blockRows ?? []) as Array<{ original_text: string | null }>)
        .map((row) => (row.original_text ?? "").trim())
        .filter((text) => text.length > 0)
        .join("\n\n");

      try {
        const out = await provider.generateBookSummary({
          bookTitle: bookRow.title,
          author: bookRow.author,
          chapterTitles,
          sampleText,
        });
        return NextResponse.json({ ok: true, summaryText: out.summaryText }, { status: 200 });
      } catch (providerError) {
        return NextResponse.json({ ok: false, error: mapProviderError(providerError) }, { status: 500 });
      }
    }

    if (body.action === "infer_publication_year") {
      const { data: bookRow, error: bookErr } = await supabase
        .from("books")
        .select("id,title,author,description,source_filename,publication_year,year")
        .eq("id", body.bookId)
        .eq("user_id", userId)
        .single();
      if (bookErr || !bookRow) {
        return NextResponse.json(
          { ok: false, error: err("BAD_REQUEST", "A konyv nem talalhato a felhasznalohoz.") },
          { status: 400 }
        );
      }

      const currentRaw = (bookRow as any).publication_year ?? (bookRow as any).year;
      const currentYear =
        currentRaw !== null && currentRaw !== undefined && `${currentRaw}`.trim() !== ""
          ? Number.parseInt(`${currentRaw}`, 10)
          : Number.NaN;
      if (Number.isFinite(currentYear)) {
        return NextResponse.json({ ok: true, inferredYear: currentYear, persisted: true }, { status: 200 });
      }

      const { data: chapterRows } = await supabase
        .from("chapters")
        .select("title,chapter_index")
        .eq("book_id", body.bookId)
        .order("chapter_index", { ascending: true })
        .limit(12);

      const { data: blockRows } = await supabase
        .from("blocks")
        .select("original_text,block_index")
        .eq("book_id", body.bookId)
        .order("block_index", { ascending: true })
        .limit(8);

      const chapterTitles = ((chapterRows ?? []) as Array<{ title: string | null }>)
        .map((row) => (row.title ?? "").trim())
        .filter((title) => title.length > 0);
      const sampleText = ((blockRows ?? []) as Array<{ original_text: string | null }>)
        .map((row) => (row.original_text ?? "").trim())
        .filter((text) => text.length > 0)
        .join("\n\n");

      let out: { year: number | null };
      try {
        out = await provider.inferPublicationYear({
          bookTitle: (bookRow as any).title ?? null,
          author: (bookRow as any).author ?? null,
          description: (bookRow as any).description ?? null,
          sourceFilename: (bookRow as any).source_filename ?? null,
          chapterTitles,
          sampleText,
        });
      } catch (providerError) {
        return NextResponse.json({ ok: false, error: mapProviderError(providerError) }, { status: 500 });
      }

      if (out.year === null) {
        return NextResponse.json({ ok: true, inferredYear: null, persisted: false }, { status: 200 });
      }

      const fullPayload = { publication_year: out.year, year: out.year };
      const legacyPayload = { year: out.year };

      const booksTable = supabase.from("books") as any;
      const fullUpdate = await booksTable.update(fullPayload).eq("id", body.bookId).eq("user_id", userId);
      if (fullUpdate.error) {
        if (hasMissingOptionalYearColumns(fullUpdate.error)) {
          const legacyUpdate = await booksTable.update(legacyPayload).eq("id", body.bookId).eq("user_id", userId);
          if (legacyUpdate.error) {
            return NextResponse.json(
              { ok: false, error: err("INTERNAL", legacyUpdate.error.message ?? "Sikertelen ev mentes.") },
              { status: 500 }
            );
          }
          return NextResponse.json({ ok: true, inferredYear: out.year, persisted: true }, { status: 200 });
        }

        return NextResponse.json(
          { ok: false, error: err("INTERNAL", fullUpdate.error.message ?? "Sikertelen ev mentes.") },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, inferredYear: out.year, persisted: true }, { status: 200 });
    }

    if (body.action === "generate_chapter_title") {
      const { data: bookRow, error: bookErr } = await supabase
        .from("books")
        .select("id,title,author")
        .eq("id", body.bookId)
        .eq("user_id", userId)
        .single();
      if (bookErr || !bookRow) {
        return NextResponse.json(
          { ok: false, error: err("BAD_REQUEST", "A konyv nem talalhato a felhasznalohoz.") },
          { status: 400 }
        );
      }

      const { data: chapterRow, error: chapterErr } = await supabase
        .from("chapters")
        .select("id,title,chapter_index")
        .eq("id", body.chapterId)
        .eq("book_id", body.bookId)
        .single();
      if (chapterErr || !chapterRow) {
        return NextResponse.json(
          { ok: false, error: err("BAD_REQUEST", "A fejezet nem talalhato a konyvben.") },
          { status: 400 }
        );
      }

      const { data: blockRows, error: blockErr } = await supabase
        .from("blocks")
        .select("original_text,block_index")
        .eq("book_id", body.bookId)
        .eq("chapter_id", body.chapterId)
        .order("block_index", { ascending: true })
        .limit(8);
      if (blockErr) {
        return NextResponse.json(
          { ok: false, error: err("INTERNAL", blockErr.message ?? "Nem sikerult beolvasni a fejezet blokkjait.") },
          { status: 500 }
        );
      }

      const sampleText = ((blockRows ?? []) as Array<{ original_text: string | null }>)
        .map((row) => (row.original_text ?? "").trim())
        .filter((text) => text.length > 0)
        .join("\n\n");

      try {
        const out = await provider.generateChapterTitle({
          chapterTitle: chapterRow.title ?? null,
          chapterIndex: chapterRow.chapter_index,
          bookTitle: bookRow.title,
          author: bookRow.author,
          sampleText,
          userComment: body.options?.userComment ?? null,
          options: {
            maxOutputTokens: body.options?.maxOutputTokens,
          },
        });
        return NextResponse.json({ ok: true, chapterTitle: out.chapterTitle }, { status: 200 });
      } catch (providerError) {
        return NextResponse.json({ ok: false, error: mapProviderError(providerError) }, { status: 500 });
      }
    }

    const ctx = await getLlmContextForBlock(supabase, { bookId: body.bookId, blockId: body.blockId });
    if (ctx.originalText.length > INPUT_CHAR_CAP) {
      return NextResponse.json(
        { ok: false, error: err("BAD_REQUEST", "A blokk tul hosszu az MVP limithez.", { cap: INPUT_CHAR_CAP }) },
        { status: 400 }
      );
    }

    if (body.action === "translate_block") {
      let out: { text: string };
      try {
        out = await provider.translateBlock({
          originalText: ctx.originalText,
          chapterTitle: ctx.chapterTitle,
          bookTitle: ctx.bookTitle,
          author: ctx.author,
          userComment: body.options?.userComment ?? null,
          prevText: ctx.prevText,
          nextText: ctx.nextText,
          options: body.options,
        });
      } catch (providerError) {
        return NextResponse.json({ ok: false, error: mapProviderError(providerError) }, { status: 500 });
      }

      const variant = await insertDraftVariant(supabase, {
        ownerId: userId,
        bookId: body.bookId,
        chapterId: ctx.chapterId,
        blockId: body.blockId,
        text: out.text,
      });
      return NextResponse.json({ ok: true, variant }, { status: 200 });
    }

    let noteOut: { noteText: string };
    try {
      noteOut = await provider.generateNote({
        originalText: ctx.originalText,
        selectedText: body.selectedText,
        chapterTitle: ctx.chapterTitle,
        bookTitle: ctx.bookTitle,
        author: ctx.author,
        prevText: ctx.prevText,
        nextText: ctx.nextText,
        options: body.options,
      });
    } catch (providerError) {
      return NextResponse.json({ ok: false, error: mapProviderError(providerError) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, noteText: noteOut.noteText }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ismeretlen szerverhiba.";
    return NextResponse.json({ ok: false, error: err("INTERNAL", message) }, { status: 500 });
  }
}

function hasMissingOptionalYearColumns(error: { message?: string } | null): boolean {
  const message = `${error?.message ?? ""}`.toLowerCase();
  return message.includes("publication_year") || message.includes("column") && message.includes(" year");
}
