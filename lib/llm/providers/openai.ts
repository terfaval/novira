/**
 * OpenAI provider implementation (example).
 *
 * Requirements:
 * - Server-side only (no client keys)
 * - Reads API key from env
 */
import type { LlmProvider, TranslateBlockInput, TranslateBlockOutput } from "./provider";
import { buildTranslateBlockPrompt } from "../prompts/translateBlock";

export class OpenAiProvider implements LlmProvider {
  public name = "openai";

  async translateBlock(input: TranslateBlockInput): Promise<TranslateBlockOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // Lazy import so it's optional until wired.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey });

    const { system, user } = buildTranslateBlockPrompt(input);
    const maxOutputTokens = input.options?.maxOutputTokens ?? 450;
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: maxOutputTokens,
    });

    const text = (resp?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) throw new Error("Empty model output");
    return { text };
  }
}
