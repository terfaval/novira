import type { GenerateNoteInput } from "../providers/provider";

export function buildGenerateNotePrompt(input: GenerateNoteInput): { system: string; user: string } {
  const tone = input.options?.tone ?? "editorial";

  const system = [
    "Te egy magyar irodalmi szerkesztoi jegyzetelo vagy.",
    "Feladatod: a kijelolt reszlethez rovid, tenyszeru magyar jegyzetet irni.",
    "A jegyzet adjon valos jelentest, kontextust vagy utalast, de ne legyen hosszabb 2-3 mondatnal.",
    "Ne hasznalj AI-ra utalo nyelvezetet.",
    `Hangnem: ${tone}.`,
  ].join("\n");

  const ctxParts: string[] = [];
  if (input.bookTitle) ctxParts.push(`Konyv: ${input.bookTitle}${input.author ? " - " + input.author : ""}`);
  if (input.chapterTitle) ctxParts.push(`Fejezet: ${input.chapterTitle}`);
  if (input.prevText) ctxParts.push(`Elozo blokk:\n${input.prevText}`);
  if (input.nextText) ctxParts.push(`Kovetkezo blokk:\n${input.nextText}`);

  const context = ctxParts.length ? ctxParts.join("\n\n") : "";

  const user = [
    context ? `KONTEXTUS\n${context}\n\n` : "",
    "TELJES BLOKK:",
    input.originalText,
    "",
    "KIJELOLT RESZLET:",
    input.selectedText,
    "",
    "Feladat: Adj rovid, valos jelentest tisztazo szerkesztoi jegyzetet.",
  ].join("\n");

  return { system, user };
}
