import type { TranslateBlockInput } from "../providers/provider";

export function buildTranslateBlockPrompt(input: TranslateBlockInput): { system: string; user: string } {
  const style = input.options?.style ?? "modernize_hu";
  const tone = input.options?.tone ?? "editorial";

  const system = [
    "Te egy magyar irodalmi szerkesztő vagy.",
    "Feladatod: a megadott szövegrész modern, jól olvasható magyar változatát elkészíteni úgy, hogy a jelentés és a stílus lényege megmaradjon.",
    "Ne használj AI-ra utaló kifejezéseket. Ne magyarázz, csak a kimeneti szöveget add.",
    "Tartsd meg a tulajdonneveket és a referenciákat. Ne rövidítsd el a tartalmat.",
    `Stílus: ${style}. Hangnem: ${tone}.`,
  ].join("\n");

  const ctxParts: string[] = [];
  if (input.bookTitle) ctxParts.push(`Könyv: ${input.bookTitle}${input.author ? " — " + input.author : ""}`);
  if (input.chapterTitle) ctxParts.push(`Fejezet: ${input.chapterTitle}`);
  if (input.prevText) ctxParts.push(`Előző blokk (rövid kontextus):\n${input.prevText}`);
  if (input.nextText) ctxParts.push(`Következő blokk (rövid kontextus):\n${input.nextText}`);

  const context = ctxParts.length ? ctxParts.join("\n\n") : "";

  const user = [
    context ? `KONTEXTUS\n${context}\n\n` : "",
    "SZÖVEG (ezt alakítsd át):",
    input.originalText,
  ].join("\n");

  return { system, user };
}
