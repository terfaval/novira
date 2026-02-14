# LLM Module v0 (MVP) — Novira

Goal: implement a minimal, safe server-side LLM layer that can generate **draft** block variants.
This is the MVP "engine" that powers the Book Dashboard workflow:

Upload → Segment → Read → Validate → Accept → Continue → Export

Constraints (from DECISIONS):
- Server-side LLM calls only (no client keys).
- Provider abstraction to avoid vendor lock-in.
- Guardrails baseline before expanding capabilities.
- Hungarian-only MVP.

## Scope v0 (Ticket 5A)
### In
- One endpoint: translate/generate a **draft** variant for a given `block_id`.
- Provider abstraction (interface + one provider implementation).
- Minimal rate limiting + payload caps.
- Structured error mapping.
- Deterministic DB write: insert a new row in `variants` with `status="draft"`.

### Out (deferred)
- Characters / arc extraction (book-level analysis).
- Sentence highlighting / "translation worthy" detection.
- Global glossary generation (planned as Ticket 5B).
- Streaming responses.
- Multi-provider selection UI.

## Variant strategy (MVP)
- LLM always writes `variants.status="draft"`.
- User validates by accepting a draft (promotes curated state).
- Export includes **accepted only**.

## Request/Response contract
### Request
`POST /api/llm`
```json
{
  "action": "translate_block",
  "bookId": "<uuid>",
  "blockId": "<uuid>",
  "options": {
    "style": "modernize_hu",
    "tone": "editorial",
    "maxOutputTokens": 450
  }
}
```

### Response (success)
```json
{
  "ok": true,
  "variant": {
    "id": "<uuid>",
    "block_id": "<uuid>",
    "status": "draft",
    "text": "..."
  }
}
```

### Response (error)
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED" | "BAD_REQUEST" | "UNAUTHORIZED" | "PROVIDER_ERROR" | "INTERNAL",
    "message": "human readable, HU"
  }
}
```

## Guardrails v0
- Per-user rate limit: default 30 req / 10 min (tune later).
- Payload cap: block input text max chars (e.g. 8k).
- Output cap: max tokens via provider param + server cap.

NOTE: in-memory rate limiting is OK for local/MVP, but should be replaced with durable store in prod.

## Files (suggested)
- `lib/llm/types.ts` – shared types
- `lib/llm/errors.ts` – error mapping
- `lib/llm/rateLimit.ts` – minimal limiter
- `lib/llm/providers/provider.ts` – provider interface
- `lib/llm/providers/openai.ts` – provider implementation (example)
- `lib/llm/prompts/translateBlock.ts` – prompt builder
- `lib/db/queries/llmContext.ts` – fetch block text + minimal context
- `lib/db/mutations/variants.ts` – insert draft variant (and variant_index policy)
- `app/api/llm/route.ts` – endpoint

## Context strategy v0 (minimal)
- Required: current block original text.
- Optional: surrounding blocks (previous + next) as lightweight context, capped.
- Optional: chapter title.
No book-level summaries in v0.

## Next extensions (Ticket 5B, 5C)
- Glossary v0: store term map per book; inject relevant entries in prompts.
- Book-level analysis jobs: characters, arc, key moments, etc. (batch + cost controls).

## Wire-up notes
- Supabase server client location: `lib/supabase/server.ts` (`getSupabaseServerClient(accessToken?: string)`).
- LLM route uses bearer token forwarding and server-side user resolution in `app/api/llm/route.ts`.
- Required env: `OPENAI_API_KEY`.
- Optional env: `OPENAI_MODEL` (default: `gpt-4o-mini`).
