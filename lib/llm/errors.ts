import type { LlmError, LlmErrorCode } from "./types";

export function err(code: LlmErrorCode, message: string, details?: Record<string, unknown>): LlmError {
  return { code, message, details };
}

export function mapProviderError(e: unknown): LlmError {
  const msg = e instanceof Error ? e.message : "Ismeretlen szolgáltatói hiba.";
  return err("PROVIDER_ERROR", "A modellhívás sikertelen volt.", { raw: msg });
}
