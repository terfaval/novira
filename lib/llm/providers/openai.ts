/**
 * OpenAI provider implementation (example).
 *
 * Requirements:
 * - Server-side only (no client keys)
 * - Reads API key from env
 */
import type {
  GenerateBookSummaryInput,
  GenerateBookSummaryOutput,
  InferPublicationYearInput,
  InferPublicationYearOutput,
  GenerateNoteInput,
  GenerateNoteOutput,
  LlmProvider,
  TranslateBlockInput,
  TranslateBlockOutput,
} from "./provider";
import { buildTranslateBlockPrompt } from "../prompts/translateBlock";
import { buildGenerateNotePrompt } from "../prompts/generateNote";
import { buildInferPublicationYearPrompt } from "../prompts/inferPublicationYear";

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

  async generateNote(input: GenerateNoteInput): Promise<GenerateNoteOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey });

    const { system, user } = buildGenerateNotePrompt(input);
    const maxOutputTokens = input.options?.maxOutputTokens ?? 220;
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

    const noteText = (resp?.choices?.[0]?.message?.content ?? "").trim();
    if (!noteText) throw new Error("Empty model output");
    return { noteText };
  }

  async generateBookSummary(input: GenerateBookSummaryInput): Promise<GenerateBookSummaryOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey });

    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const chapterList =
      input.chapterTitles && input.chapterTitles.length > 0
        ? input.chapterTitles.slice(0, 8).map((title, index) => `${index + 1}. ${title}`).join("\n")
        : "Nincs fejezetcim adat.";

    const sampleText = (input.sampleText ?? "").trim();
    const sampleSnippet = sampleText ? sampleText.slice(0, 1200) : "Nincs szovegreszlet.";

    const resp = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "Magyar irodalmi szerkeszto vagy. Feladatod: rovid, semleges, ketmondatos osszefoglalo keszitese.",
        },
        {
          role: "user",
          content: [
            `Cim: ${input.bookTitle ?? "Ismeretlen cim"}`,
            `Szerzo: ${input.author ?? "Ismeretlen szerzo"}`,
            "Fejezetcimek (ha vannak):",
            chapterList,
            "Reszlet a szovegbol:",
            sampleSnippet,
            "Irj pontosan 2 mondatot magyarul. Ne hasznalj felsorolast.",
          ].join("\n\n"),
        },
      ],
      temperature: 0.2,
      max_tokens: 180,
    });

    const summaryText = (resp?.choices?.[0]?.message?.content ?? "").trim();
    if (!summaryText) throw new Error("Empty model output");
    return { summaryText };
  }

  async inferPublicationYear(input: InferPublicationYearInput): Promise<InferPublicationYearOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const { system, user } = buildInferPublicationYearPrompt(input);

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      max_tokens: 120,
    });

    const raw = (resp?.choices?.[0]?.message?.content ?? "").trim();
    if (!raw) return { year: null };

    let parsedYear: number | null = null;
    try {
      const parsed = JSON.parse(raw) as { year?: unknown };
      if (typeof parsed.year === "number" && Number.isFinite(parsed.year)) {
        parsedYear = Math.trunc(parsed.year);
      } else if (parsed.year === null) {
        parsedYear = null;
      }
    } catch {
      const match = raw.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
      parsedYear = match?.[1] ? Number.parseInt(match[1], 10) : null;
    }

    const currentYear = new Date().getUTCFullYear();
    if (parsedYear !== null && (parsedYear < 1500 || parsedYear > currentYear)) {
      return { year: null };
    }
    return { year: parsedYear };
  }
}
