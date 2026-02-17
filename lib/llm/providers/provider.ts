import type { GenerateNoteOptions, TranslateBlockOptions } from "../types";

export type TranslateBlockInput = {
  originalText: string;

  chapterTitle?: string | null;
  prevText?: string | null;
  nextText?: string | null;

  bookTitle?: string | null;
  author?: string | null;
  userComment?: string | null;

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

export type GenerateBookSummaryInput = {
  bookTitle?: string | null;
  author?: string | null;
  chapterTitles?: string[];
  sampleText?: string | null;
};

export type GenerateBookSummaryOutput = {
  summaryText: string;
};

export type InferPublicationYearInput = {
  bookTitle?: string | null;
  author?: string | null;
  description?: string | null;
  sourceFilename?: string | null;
  chapterTitles?: string[];
  sampleText?: string | null;
};

export type InferPublicationYearOutput = {
  year: number | null;
};

export type GenerateChapterTitleInput = {
  chapterTitle?: string | null;
  chapterIndex: number;
  bookTitle?: string | null;
  author?: string | null;
  sampleText?: string | null;
  userComment?: string | null;
  options?: {
    maxOutputTokens?: number;
  };
};

export type GenerateChapterTitleOutput = {
  chapterTitle: string;
};

export interface LlmProvider {
  name: string;
  translateBlock(input: TranslateBlockInput): Promise<TranslateBlockOutput>;
  generateNote(input: GenerateNoteInput): Promise<GenerateNoteOutput>;
  generateBookSummary(input: GenerateBookSummaryInput): Promise<GenerateBookSummaryOutput>;
  inferPublicationYear(input: InferPublicationYearInput): Promise<InferPublicationYearOutput>;
  generateChapterTitle(input: GenerateChapterTitleInput): Promise<GenerateChapterTitleOutput>;
}
