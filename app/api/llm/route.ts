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
 *
 * Action: translate_block -> create draft variant
 */

const RATE_CFG = { windowMs: 10 * 60 * 1000, max: 30 };
const INPUT_CHAR_CAP = 8000;
const MAX_OUTPUT_TOKENS_CAP = 1200;

const LlmRequestSchema = z
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
    const { bookId, blockId, options } = body;

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

    const ctx = await getLlmContextForBlock(supabase, { bookId, blockId });
    if (ctx.originalText.length > INPUT_CHAR_CAP) {
      return NextResponse.json(
        { ok: false, error: err("BAD_REQUEST", "A blokk tul hosszu az MVP limithez.", { cap: INPUT_CHAR_CAP }) },
        { status: 400 }
      );
    }

    let out: { text: string };
    try {
      const provider = new OpenAiProvider();
      out = await provider.translateBlock({
        originalText: ctx.originalText,
        chapterTitle: ctx.chapterTitle,
        bookTitle: ctx.bookTitle,
        author: ctx.author,
        prevText: ctx.prevText,
        nextText: ctx.nextText,
        options,
      });
    } catch (providerError) {
      return NextResponse.json({ ok: false, error: mapProviderError(providerError) }, { status: 500 });
    }

    const variant = await insertDraftVariant(supabase, { bookId, blockId, text: out.text });
    return NextResponse.json({ ok: true, variant }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ismeretlen szerverhiba.";
    return NextResponse.json({ ok: false, error: err("INTERNAL", message) }, { status: 500 });
  }
}
