import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { LlmRequest, LlmResponse } from "@/lib/llm/types";
import { err, mapProviderError } from "@/lib/llm/errors";
import { checkRateLimit } from "@/lib/llm/rateLimit";
import { OpenAiProvider } from "@/lib/llm/providers/openai";
import { getLlmContextForBlock } from "@/lib/db/queries/llmContext";
import { insertDraftVariant } from "@/lib/db/mutations/variants";
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

const LlmRequestSchema = z.discriminatedUnion("action", [
  TranslateBlockSchema,
  GenerateNoteSchema,
  GenerateBookSummarySchema,
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
