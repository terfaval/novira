export type LlmAction = "translate_block";

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
  style?: "modernize_hu"; // MVP: HU-only modernizálás / szerkesztett változat
  tone?: "editorial";
  maxOutputTokens?: number;
};

export type LlmRequest =
  | {
      action: "translate_block";
      bookId: string;
      blockId: string;
      options?: TranslateBlockOptions;
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

export type LlmErrorResponse = {
  ok: false;
  error: LlmError;
};

export type LlmResponse = LlmSuccessResponse | LlmErrorResponse;
