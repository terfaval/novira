import type { InferPublicationYearInput } from "../providers/provider";

export function buildInferPublicationYearPrompt(
  input: InferPublicationYearInput,
): { system: string; user: string } {
  const chapterList =
    input.chapterTitles && input.chapterTitles.length > 0
      ? input.chapterTitles.slice(0, 10).map((title, index) => `${index + 1}. ${title}`).join("\n")
      : "Nincs fejezetcim adat.";

  const sampleText = (input.sampleText ?? "").trim();
  const sampleSnippet = sampleText ? sampleText.slice(0, 1400) : "Nincs szovegreszlet.";

  const system = [
    "Irodalomtorteneti asszisztens vagy.",
    "Feladat: becsuld meg egy mu eredeti (elso) kiadasi evet.",
    "Ha bizonytalan vagy, akkor is adj legjobb ev-becslest (ne adj nullt, csak ha tenyleg nincs eleg informacio).",
    "Csak ervenyes JSON-t adj vissza, semmi mast.",
    'Formatum: {"year": number | null, "confidence": "low" | "medium" | "high", "reason": string}',
  ].join("\n");

  const user = [
    `Cim: ${input.bookTitle ?? "Ismeretlen cim"}`,
    `Szerzo: ${input.author ?? "Ismeretlen szerzo"}`,
    `Leiras: ${input.description ?? ""}`,
    `Forras fajlnev: ${input.sourceFilename ?? ""}`,
    "Fejezetcimek:",
    chapterList,
    "Szovegreszlet:",
    sampleSnippet,
    "Csak JSON valasszal valaszolj.",
  ].join("\n\n");

  return { system, user };
}
