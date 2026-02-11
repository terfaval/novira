# Műfordító — SECURITY & RELIABILITY (v0.1)

Date: 2026-02-11

## 1. Threat model (MVP, no email/password UI)

### Key risks
- **Public database abuse** if anonymous access is not controlled
- **LLM API key leakage** if called directly from the browser
- Unbounded cost / spam requests against LLM endpoints
- Data loss (accidental deletion) without recovery
- Malformed uploads (DOCX/EPUB) causing crashes or memory spikes

## 2. Mandatory security controls (MVP)

### 2.1 Background identity (no login UI)
- Use **anonymous identity** issued automatically (no email/password).
- Store anon session securely (httpOnly cookie recommended).
- All data rows are tied to `owner_user_id`.

### 2.2 Row Level Security (RLS)
- Enforce that a user can only access rows where `owner_user_id = auth.uid()`.
- Books/Chapters/Blocks/Variants/Notes all protected via RLS.

### 2.3 Server-side LLM calls
- LLM provider key stored only in server env vars.
- Browser never sees provider API key.
- Use Next.js route handlers / server actions for model calls.

### 2.4 Rate limiting & cost controls
- Rate limit per anon user + per IP on:
  - variant generation
  - note generation
  - summarization jobs
- Add request size limits (max tokens / max block length).
- Consider caching static prompts (profile rules) and reuse context summaries.

### 2.5 Upload validation
- File type validation (magic bytes + extension)
- Size caps (configurable)
- Robust parsing with timeouts and safe failure states

### 2.6 Data protection & retention
- Soft-delete for Book/Chapter/Block/Variant/Note (optional MVP+)
- Basic backups (Supabase daily backups or export-based recovery)

## 3. Reliability / UX minimums

- Clear error states: import failure, generation failure, export failure.
- Long operations show progress + cancel where feasible.
- Auto-save for edits.
- Idempotent operations: re-running import does not duplicate or corrupt mapping.

## 4. Explicit non-goals (MVP)
- Formal compliance programs (SOC2 etc.)
- Advanced secrets management beyond env vars
- Multi-tenant enterprise controls
