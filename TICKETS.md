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

---

## Implemented (Ad-hoc)

- Ticket: Ticket 4A' - Book Dashboard (Workbench + Reader + Documentation)
- Goal: Add a functional `/book/[id]` dashboard with desktop/mobile modes, completion tracking, and in-code/project documentation.
- Files modified: `app/book/[id]/page.tsx`, `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/BookDashboard/types.ts`, `components/BookDashboard/README.md`, `lib/db/queries/books.ts`, `docs/BOOK_DASHBOARD.md`, `README.md`, `SECURITY.md`, `OPEN_QUESTIONS.md`, `TICKETS.md`
- Commit hash: `27db94bb2e5776d2f01d40d1e16fd39823529138` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-SVG-COVERS-NIGHT-SWAP
- Goal: Use SVG covers on book cards (with PNG fallback) and swap indigo/light cover colors in dark mode.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `public/covers/SVG/arvacska.svg`, `public/covers/SVG/egyszeru_emberek.svg`, `public/covers/SVG/golyakalifa.svg`, `public/covers/SVG/ida_regenye.svg`, `public/covers/SVG/jo_palocok.svg`, `public/covers/SVG/szent_peter_esernyoje.svg`, `public/covers/SVG/voros_postakocsi.svg`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BACKGROUND-DAY-NIGHT-SVG-PALETTE
- Goal: Use day/night mobile/desktop background images and align UI colors to SVG indigo/paper palette with day/night inversion.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-BOOK-CAROUSEL
- Goal: Change the home page book list from grid layout to a horizontal carousel while keeping current default backgrounds.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-4-UP-DEFAULT-BG
- Goal: Use `mobile_default.png` / `desktop_default.png` backgrounds and keep 4 book cards visible at once in the home carousel.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-METADATA-EDIT-ON-BOOK-PAGE
- Goal: Add inline metadata editing on `/book/[id]` for title, author, year, short description, and icon slug.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-ACTIVE-SPINE-SHELF
- Goal: Make one active book card on the home carousel while inactive books appear as shelf spines with author-based colors, small top icon, and one-line author+title label.
- Files modified: `components/LibraryClient.tsx`, `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-CLICK-ACTIVE-AUTHOR-PALETTE
- Goal: Use documented author palette colors for spine mode, remove spine PNG icon fallback, and change click flow to first-click activate, second-click navigate.
- Files modified: `components/BookCard.tsx`, `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-SPINE-ICON-BOTTOM-EQUAL-HEIGHT
- Goal: Move spine icon to the bottom without frame/background and keep active cards at equal height with space-between content layout.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-SPINE-SPACING-CENTERING
- Goal: Keep spine text top-aligned, add clearer spine padding, reduce extra inactive empty space, and center inactive spines.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-ICON-COLOR-NO-PNG-ACTIVE
- Goal: Set spine icon color to brand accent, remove active icon PNG fallback, and remove active icon container background/border/shadow.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-SVG-CURRENTCOLOR-FIX-GOLYAKALIFA-EGYSZERU
- Goal: Replace hardcoded SVG fill colors with `currentColor` in `a_golyakalifa.svg` and `egyszeru_emberek.svg` so icon tinting works.
- Files modified: `public/covers/SVG/a_golyakalifa.svg`, `public/covers/SVG/egyszeru_emberek.svg`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-CARD-FAINT-PNG-BACKGROUNDS
- Goal: Show the first five SVG-matched cover PNGs as faint background images behind active home book cards.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-CARD-BG-COVER-NARROW-ACTIVE
- Goal: Switch active book card background image to cover mode and narrow active card width so the image fills the card more naturally.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ACTIVE-CARD-LEFT-EDGE-SPINE-STRIPE
- Goal: Remove left corner rounding on active cards and add a full-height left stripe using `authorSpineColor`.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-CARD-AUTO-PNG-BACKGROUND-BY-SLUG
- Goal: Resolve active card PNG background from `cover_slug` automatically (no hardcoded slug allowlist), so any uploaded `public/covers/SVG/<slug>.png` can appear behind the cover.
- Files modified: `components/BookCard.tsx`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)
