# TICKETS.md - Novira

Milestone: M1 -> M4 (Documentation Gate Active)

## Ticket NOV-000 - Documentation Alignment Gate
Type: Docs / Governance
Blocks: NOV-004

Goal:
Ensure all documentation consistently states MVP import formats as:
HTML + RTF + DOCX.

No code changes allowed in this ticket.

---

## Ticket NOV-ING-002 - Footnote extraction + anchoring (Golyakalifa v0)
Type: Backend + DB + minimal normalization

Goal:
Extract numeric footnotes from the notes chapter into dedicated storage and anchor them in main text blocks as `[[fn:N]]`.

Acceptance:
- Notes chapter detection prefers title match (`Jegyzet`), with heuristic fallback.
- Footnotes are stored with unique `(book_id, number)` and source chapter/block references.
- Main text markers `[N]` are replaced with `[[fn:N]]`.
- `footnote_anchors` stores offsets per occurrence.
- Re-running extraction is idempotent (no duplicated rows).

---

## Ticket 1 - Project Bootstrap
Scaffold Next.js app and baseline repo files.

## Ticket 2 - Database Schema + RLS + Anonymous Identity
Implement Supabase schema and RLS isolation.

## Ticket 3 - Import Pipeline (HTML/RTF/DOCX)
Acceptance:
- HTML import works
- RTF import works
- DOCX import works
- Stable chapter/block IDs

## Ticket 4 - Editor UI
Parallel original + modernized view with navigation.

## Ticket 5 - LLM Provider Abstraction
Server-side generation with abstraction layer.

## Ticket 6 - Notes
Anchored notes on selected text spans.

## Ticket 7 - Export
Markdown + DOCX export with notes.

## Ticket 8 - Guardrails
Rate limiting, file size limits, error states.
