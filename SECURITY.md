# Műfordító — SECURITY & RELIABILITY (v0.1)

Date: 2026-02-11

## 1. Threat model (MVP, password + guest access)

### Key risks
- **Public database abuse** if anonymous access is not controlled
- **LLM API key leakage** if called directly from the browser
- Unbounded cost / spam requests against LLM endpoints
- Data loss (accidental deletion) without recovery
- Malformed uploads (HTML/RTF/DOCX) causing crashes or memory spikes

## 2. Mandatory security controls (MVP)

### 2.1 Identity model (visible login + guest)
- Landing shows two explicit access paths:
  - password login (email + password)
  - guest session (anonymous auth)
- Guest session may be upgraded to password account, or burned on exit.
- All data rows are tied to authenticated user id (`auth.uid()`).

### 2.2 Row Level Security (RLS)
- Enforce that a user can only access rows where owner/user columns match `auth.uid()`.
- Books/Chapters/Blocks/Variants/Notes all protected via RLS.
- User-scoped variants/notes/edits must be isolated per `owner_id` / `user_id`, even when source books are shared.

### 2.3 Server-side LLM calls
- LLM provider key stored only in server env vars.
- Browser never sees provider API key.
- Use Next.js route handlers / server actions for model calls.

### 2.4 Rate limiting & cost controls
- Rate limit per authenticated user (including guest sessions) + per IP on:
  - variant generation
  - note generation
  - summarization jobs
- Add request size limits (max tokens / max block length).
- Consider caching static prompts (profile rules) and reuse context summaries.

### 2.5 Upload validation
- File type validation (magic bytes + extension)
- Size caps (configurable)
- Robust parsing with timeouts and safe failure states

### 2.6 Admin boundary
- Upload/import endpoints must enforce authenticated non-guest role server-side.
- Upload/import UI actions must be hidden for guest role.
- Admin-only UI actions must be hidden for non-admin roles.
- Admin checks must not rely on client-only gating.
- Book visibility (`is_public`) changes are admin-only and enforced by DB policy.
- Favorite boundary:
  - personal favorites must be user-scoped (`book_favorites`) and isolated by RLS;
  - global favorites on `books.is_favorite` are admin-only actions and must require explicit admin password confirmation.

### 2.7 Data protection & retention
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

## 5. Temporary exception - open read mode (OSS/demo)

Date: 2026-02-14

- RLS remains enabled.
- `SELECT` is temporarily open (`using (true)`) on:
  - `books`
  - `chapters`
  - `blocks`
  - `variants`
  - `notes`
  - `footnotes`
  - `footnote_anchors`
- `INSERT/UPDATE/DELETE` policies remain owner-bound.

Risk:
- Any user with project anon key can read all shared book content in this environment.

Rollback:
- Replace open `SELECT` policies with owner-bound policies (`owner_id = auth.uid()` / `user_id = auth.uid()`) when private mode is required again.

## 6. External source import controls (Project Gutenberg)

Date: 2026-02-16

- URL-based ingestion is allowed only for explicitly supported sources (`project_gutenberg`).
- Import requests must send identifiable `User-Agent` and use minimum pacing (1 req/sec) with retry backoff.
- Imported source provenance is stored on book rows:
  - `source_name`, `source_url`, `source_retrieved_at`
  - `source_license_url`, `source_work_id`
  - `source_original_sha256`
- Book UI must display source/license metadata and legal disclaimer text for Project Gutenberg imports.
- Import cache should reuse existing ready import by same source/work ID for the same user to prevent repeated automated downloads.

## 7. Public catalog visibility controls

Date: 2026-02-16

- Books have `is_public` visibility flag controlled from `/admin`.
- Public catalog behavior:
  - logged-out users: only `is_public = true` and `ready` books,
  - logged-in non-admin users: own books + public books.
- Admin update policy for cross-user book visibility uses fixed admin user id:
  - `956eb736-0fb5-49eb-9be8-7011517b9873`.
- Editorial isolation rule:
  - editing a public base book by non-owner happens via user-scoped variants/notes/edits layered over shared source blocks; no full fork is created by default.
  - admin can modify any source text (`original_text`) or source metadata; non-admin can only modify source text/metadata for own source books.
- Source provenance editing is admin-only through the book page admin panel mode (`Forras szerkesztes`).
