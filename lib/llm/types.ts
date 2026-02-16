export type LlmAction = "translate_block" | "generate_note" | "generate_book_summary";

export type LlmErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INTERNAL";

export type LlmError = {
  code: LlmErrorCode;
  message: string; // HU
  details?: Record<string, unknown>;
};

export type TranslateBlockOptions = {
  style?: "modernize_hu";
  tone?: "editorial";
  maxOutputTokens?: number;
};

export type GenerateNoteOptions = {
  tone?: "editorial";
  maxOutputTokens?: number;
};

export type LlmRequest =
  | {
      action: "translate_block";
      bookId: string;
      blockId: string;
      options?: TranslateBlockOptions;
    }
  | {
      action: "generate_note";
      bookId: string;
      blockId: string;
      selectedText: string;
      options?: GenerateNoteOptions;
    }
  | {
      action: "generate_book_summary";
      bookId: string;
    }
  | {
      action: "infer_publication_year";
      bookId: string;
    };

export type VariantStatus = "draft" | "accepted" | "rejected";

export type VariantRow = {
  id: string;
  block_id: string;
  status: VariantStatus;
  text: string;
};

export type LlmSuccessResponse = {
  ok: true;
  variant: VariantRow;
};

export type LlmNoteSuccessResponse = {
  ok: true;
  noteText: string;
};

export type LlmBookSummarySuccessResponse = {
  ok: true;
  summaryText: string;
};

export type LlmPublicationYearSuccessResponse = {
  ok: true;
  inferredYear: number | null;
  persisted: boolean;
};

export type LlmErrorResponse = {
  ok: false;
  error: LlmError;
};

export type LlmResponse =
  | LlmSuccessResponse
  | LlmNoteSuccessResponse
  | LlmBookSummarySuccessResponse
  | LlmPublicationYearSuccessResponse
  | LlmErrorResponse;
