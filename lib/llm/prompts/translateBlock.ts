import type { TranslateBlockInput } from "../providers/provider";

export function buildTranslateBlockPrompt(input: TranslateBlockInput): { system: string; user: string } {
  const style = input.options?.style ?? "modernize_hu";
  const tone = input.options?.tone ?? "editorial";

  const system = [
    "Te egy magyar irodalmi szerkeszto vagy.",
    "Feladatod: a megadott szovegresz modern, jol olvashato magyar valtozatat elkesziteni ugy, hogy a jelentes es a stilus lenyege megmaradjon.",
    "Ne hasznalj AI-ra utalo kifejezeseket. Ne magyarazz, csak a kimeneti szoveget add.",
    "Tartsd meg a tulajdonneveket es a referenciakat. Ne roviditsd el a tartalmat.",
    `Stilus: ${style}. Hangnem: ${tone}.`,
  ].join("\n");

  const ctxParts: string[] = [];
  if (input.bookTitle) ctxParts.push(`Konyv: ${input.bookTitle}${input.author ? " - " + input.author : ""}`);
  if (input.chapterTitle) ctxParts.push(`Fejezet: ${input.chapterTitle}`);
  if (input.userComment) ctxParts.push(`Felhasznaloi utasitas: ${input.userComment}`);
  if (input.prevText) ctxParts.push(`Elozo blokk (rovid kontextus):\n${input.prevText}`);
  if (input.nextText) ctxParts.push(`Kovetkezo blokk (rovid kontextus):\n${input.nextText}`);

  const context = ctxParts.length ? ctxParts.join("\n\n") : "";

  const user = [context ? `KONTEXTUS\n${context}\n\n` : "", "SZOVEG (ezt alakitsd at):", input.originalText].join("\n");

  return { system, user };
}
