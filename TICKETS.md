## Ticket NOV-000 — Documentation Alignment Gate (Pre-NOV-004)

**Type:** Docs / Governance  
**Priority:** Highest  
**Blocks:** NOV-004 implementation

### Goal
Make Novira documentation internally consistent so development can proceed without scope drift.

### Scope (IN)
1) **Import formats consistency**
   - Update `SPEC.md` and `TICKETS.md` so the MVP import story is consistent with:
     - `DECISIONS.md` D-014 (Local file upload first)
     - `docs/MEMO_mek-import.md`
     - `strategy/MEMO_canonical-text-model.md`
   - The MVP import statement must read consistently everywhere as:
     - **HTML + RTF + DOCX**
   - EPUB must be explicitly deferred (future/post-MVP), not “MVP IN”.

2) **Ticket list consistency**
   - In `TICKETS.md`, update the legacy “Import pipeline (DOCX + EPUB)” ticket to match current MVP:
     - Rename to “Import pipeline (HTML/RTF/DOCX)”
   - If EPUB remains desirable, move it to a clearly labeled future ticket (e.g., `NOV-FUTURE-EPUB`) with `Deferred` status.

3) **Decision log hygiene (no meaning change)**
   - In `DECISIONS.md`:
     - Remove any duplicated blocks/sections (e.g., duplicate “Future Extension” under D-013) **without changing meaning**.
     - Ensure D-014 exists and is clearly linked to NOV-004.
     - Keep D-012 as Deferred and ensure it references its memo (no duplication required).

4) **Docs navigation for Codex**
   - Update `AGENTS.md` so Codex can reliably find “source of truth”.
   - AGENTS must specify:
     - Read order (SPEC → TICKETS → DECISIONS → SECURITY → memos)
     - Folder map: `docs/`, `strategy/`, `legal/`, `EXPORTS/`
     - Hard rule: do not implement if docs conflict.

### Scope (OUT)
- Any code changes (API, parser, UI)  
- Any DB migrations / RLS changes  
- Any changes to `legal/*` documents (including `Novira_Legal_Baseline_and_Demo_Corpus_v1.md`)  
- Any changes to milestone snapshots under `EXPORTS/` (immutable)

### Acceptance Criteria
- `SPEC.md` contains a single coherent MVP import definition: **HTML + RTF + DOCX**.
- `TICKETS.md` contains no MVP import contradictions (no “DOCX/EPUB MVP IN”).
- `DECISIONS.md` has no duplicated sections; D-013 and D-014 are consistent and readable.
- `AGENTS.md` clearly instructs how to navigate docs and prevents scope drift.
- `git status` after completion shows only the intended docs edits (no accidental file changes).
- One docs-only commit exists:
  - `docs: align import scope and fix doc contradictions (NOV-000)`

### Notes / References
- Use: `docs/MEMO_mek-import.md`
- Use: `strategy/MEMO_canonical-text-model.md`
- Use: `DECISIONS.md` D-013, D-014


# Műfordító — TICKETS (v0.1)

Milestone: **M1 → M4 (Documentation Gate Active)**  
Scope is locked to SPEC v0.1.

## Ticket 1 — Project bootstrap
**Goal:** Create Next.js app scaffold + baseline repo files.  
**Acceptance:**
- App runs locally
- Lint/build scripts configured
- Repo baseline files present (README, DECISIONS, SECURITY, etc.)

## Ticket 2 — Database schema v0 + RLS + anon identity
**Goal:** Supabase project with tables and RLS enforcing per-anon-user ownership.  
**Acceptance:**
- Tables: books, chapters, blocks, variants, notes, style_profiles
- RLS policies prevent cross-user access
- Anonymous sign-in/session works without email/password UI

## Ticket 3 — Import pipeline (DOCX + EPUB)
**Goal:** Upload a book and create chapters + blocks deterministically.  
**Acceptance:**
- DOCX import works on sample book
- EPUB import works on sample book
- Chapters/blocks have stable order + IDs
- Re-import behavior defined (new book vs overwrite)

## Ticket 4 — Editor UI (linear workflow)
**Goal:** Parallel view editor for original + modernized with navigation.  
**Acceptance:**
- Next/Prev block navigation
- Shows original + current selected variant (or empty)
- Create/edit variant text locally
- Mark variant as final

## Ticket 5 — LLM provider abstraction + first provider
**Goal:** Provider interface + server routes + generation for “Mai irodalmi”.  
**Acceptance:**
- Server-only provider calls
- Generate variant for a block
- Generate alternative variant
- Store variants in DB linked to block + profile

## Ticket 6 — Notes (anchored spans)
**Goal:** Create/view notes attached to a selected text range.  
**Acceptance:**
- User selects span in original text
- Note saved with offsets
- Notes list panel + hover tooltip

## Ticket 7 — Export (MD + DOCX)
**Goal:** Export the final modernized text + notes.  
**Acceptance:**
- Markdown export includes structure (chapter headings)
- DOCX export basic formatting
- Notes included as footnotes/endnotes
- Export does not leak other users’ data

## Ticket 8 — Guardrails & UX polish
**Goal:** Minimum guardrails for cost + failures.  
**Acceptance:**
- Rate limiting on generation endpoints
- File size limits
- Error UI states
- Basic progress indicators
