import type { GenerateNoteOptions, TranslateBlockOptions } from "../types";

export type TranslateBlockInput = {
  originalText: string;

  chapterTitle?: string | null;
  prevText?: string | null;
  nextText?: string | null;

  bookTitle?: string | null;
  author?: string | null;

  options?: TranslateBlockOptions;
};

export type TranslateBlockOutput = {
  text: string;
};

export type GenerateNoteInput = {
  originalText: string;
  selectedText: string;

  chapterTitle?: string | null;
  prevText?: string | null;
  nextText?: string | null;

  bookTitle?: string | null;
  author?: string | null;

  options?: GenerateNoteOptions;
};

export type GenerateNoteOutput = {
  noteText: string;
};

export interface LlmProvider {
  name: string;
  translateBlock(input: TranslateBlockInput): Promise<TranslateBlockOutput>;
  generateNote(input: GenerateNoteInput): Promise<GenerateNoteOutput>;
}
