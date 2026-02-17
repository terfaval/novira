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
  GenerateChapterTitleInput,
  GenerateChapterTitleOutput,
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
    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_completion_tokens: maxOutputTokens,
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
    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_completion_tokens: maxOutputTokens,
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

    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
    const chapterList =
      input.chapterTitles && input.chapterTitles.length > 0
        ? input.chapterTitles.slice(0, 8).map((title, index) => `${index + 1}. ${title}`).join("\n")
        : "Nincs fejezetcím adat.";

    const sampleText = (input.sampleText ?? "").trim();
    const sampleSnippet = sampleText ? sampleText.slice(0, 1200) : "Nincs szovegreszlet.";

    const resp = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "Magyar irodalmi szerkesztő vagy. Feladatod: rövid, semleges, kétmondatos összefoglaló készítése.",
        },
        {
          role: "user",
          content: [
            `Cím: ${input.bookTitle ?? "Ismeretlen cím"}`,
            `Szerző: ${input.author ?? "Ismeretlen szerző"}`,
            "Fejezetcímek (ha vannak):",
            chapterList,
            "Reszlet a szovegbol:",
            sampleSnippet,
            "Irj pontosan 2 mondatot magyarul. Ne hasznalj felsorolast.",
          ].join("\n\n"),
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 180,
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
    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
    const { system, user } = buildInferPublicationYearPrompt(input);

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      max_completion_tokens: 120,
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

  async generateChapterTitle(input: GenerateChapterTitleInput): Promise<GenerateChapterTitleOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
    const maxOutputTokens = input.options?.maxOutputTokens ?? 80;
    const { system, user } = buildGenerateChapterTitlePrompt(input);

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_completion_tokens: maxOutputTokens,
    });

    const chapterTitle = (resp?.choices?.[0]?.message?.content ?? "").replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!chapterTitle) throw new Error("Empty model output");
    return { chapterTitle: chapterTitle.slice(0, 160).trim() || `Fejezet ${input.chapterIndex}` };
  }
}

function buildGenerateChapterTitlePrompt(input: GenerateChapterTitleInput): { system: string; user: string } {
  const currentTitle = (input.chapterTitle ?? "").trim();
  const sampleText = (input.sampleText ?? "").replace(/\s+/g, " ").trim();
  const sampleSnippet = sampleText ? sampleText.slice(0, 1800) : "Nincs blokkszoveg.";

  const system = [
    "Te egy magyar irodalmi szerkeszto vagy.",
    "Feladatod: magyar, rövid fejezetcím javaslása.",
    "Ha a meglévő cím értelmes és csak fordítani kell, add meg rövid magyar fordítását.",
    "Ha a cím hiányzik, csak szám, vagy általános fejezet-sorszám, adj új rövid címet a fejezet tartalma alapján.",
    "A kimenet csak egyetlen cím legyen, magyarázat nélkül.",
    "A cím 2-8 szóból álljon, max 64 karakterrel.",
  ].join("\n");

  const userParts = [
    `Könyv: ${input.bookTitle ?? "Ismeretlen cím"}`,
    `Szerző: ${input.author ?? "Ismeretlen szerző"}`,
    `Fejezet index: ${input.chapterIndex}`,
    `Aktuális fejezetcím: ${currentTitle || "(nincs)"}`,
    `Felhasznaloi komment: ${(input.userComment ?? "").trim() || "(nincs)"}`,
    "Fejezet blokk-reszlet:",
    sampleSnippet,
    "Adj egyetlen végső címet.",
  ];

  return { system, user: userParts.join("\n\n") };
}
