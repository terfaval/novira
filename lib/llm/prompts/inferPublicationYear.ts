import type { InferPublicationYearInput } from "../providers/provider";

export function buildInferPublicationYearPrompt(
  input: InferPublicationYearInput,
): { system: string; user: string } {
  const chapterList =
    input.chapterTitles && input.chapterTitles.length > 0
      ? input.chapterTitles.slice(0, 10).map((title, index) => `${index + 1}. ${title}`).join("\n")
      : "Nincs fejezetcím adat.";

  const sampleText = (input.sampleText ?? "").trim();
  const sampleSnippet = sampleText ? sampleText.slice(0, 1400) : "Nincs szovegreszlet.";

  const system = [
    "Irodalomtörténeti asszisztens vagy.",
    "Feladat: becsüld meg egy mű eredeti (első) kiadási évét a megadott metaadatok alapján.",
    "Ha nincs elég információ, add vissza: {\"year\": null}.",
    "A kimenet mindig és kizárólag érvényes JSON legyen; semmi magyarázat, semmi extra mező.",
    "Formátum: {\"year\": number | null}",
    "Szabályok:",
    "- Csak 1500 és a jelen év közötti év lehet érvényes.",
    "- Ha csak újrakiadás/fordítás éve sejthető, de az eredeti nem, inkább null.",
  ].join("\n");

  const user = [
    `Cím: ${input.bookTitle ?? "Ismeretlen cím"}`,
    `Szerző: ${input.author ?? "Ismeretlen szerző"}`,
    `Leírás: ${(input.description ?? "").trim()}`,
    `Forrás fájlnév: ${(input.sourceFilename ?? "").trim()}`,
    "Fejezetcímek:",
    chapterList,
    "Szövegrészlet:",
    sampleSnippet,
    "Csak JSON válasszal válaszolj.",
  ].join("\n\n");

  return { system, user };
}
