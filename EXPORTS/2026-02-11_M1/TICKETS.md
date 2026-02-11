# Műfordító — TICKETS (v0.1)

Milestone: **M1 → Build-ready tickets**  
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
