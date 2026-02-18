import type { LlmError, LlmErrorCode } from "./types";

export function err(code: LlmErrorCode, message: string, details?: Record<string, unknown>): LlmError {
  return { code, message, details };
}

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

/**
 * Best-effort mapping for provider/API errors into a stable, user-safe shape.
 * We keep the external error as PROVIDER_ERROR but include rich details for debugging.
 */
export function mapProviderError(e: unknown): LlmError {
  const anyErr = e as any;

  // OpenAI SDK errors commonly expose `status`, and sometimes `error` / `response` payloads.
  const status =
    typeof anyErr?.status === "number"
      ? anyErr.status
      : typeof anyErr?.response?.status === "number"
        ? anyErr.response.status
        : null;

  const rawMessage =
    pickFirstString(
      anyErr?.error?.message,
      anyErr?.response?.data?.error?.message,
      anyErr?.message,
    ) ?? "Ismeretlen szolgáltatói hiba.";

  // Heuristic: some 400s are configuration / request-shape issues (developer action).
  const isTemperatureUnsupported =
    status === 400 &&
    rawMessage.toLowerCase().includes("unsupported value") &&
    rawMessage.toLowerCase().includes("temperature");

  const userMessage = isTemperatureUnsupported
    ? "A modellhívás paraméterei nem kompatibilisek a választott modellel."
    : "A modellhívás sikertelen volt.";

  return err("PROVIDER_ERROR", userMessage, {
    status: status ?? undefined,
    raw: rawMessage,
  });
}
