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

- Ticket: ADHOC-SUPABASE-GLOBAL-ACCESS-TEMP
- Goal: Expose the browser Supabase client on `globalThis` (`__NOVIRA_SUPABASE__`) so it is globally reachable for temporary development/debug usage.
- Files modified: `lib/supabase/client.ts`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-CHAPTER-TITLE-STICKY-TOP
- Goal: Keep chapter title header fixed at the top edge of each dashboard panel while scrolling through chapter blocks.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-NO-EDGE-COLOR-ON-ORIGINAL-FALLBACK
- Goal: In the edited panel, keep block left edge uncolored when the rendered text is original fallback (no translated content).
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-HIDE-BLOCK-TITLE
- Goal: Remove block title row from dashboard block cards so only block text is shown.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-INLINE-CHAPTER-EDIT-ORIGINAL-BLOCK-DELETE
- Goal: Right-align block action controls, switch chapter title editing to inline sticky-header mode via pencil action, allow chapter delete directly from header, and allow deleting original parser-only blocks (without edited variant).
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-BLOCK-POPUP-STACKING-CHAPTER-DELETE-RENUMBER
- Goal: Remove original-panel block edge color, fix edited block action popup stacking/expansion direction, and add chapter delete action with automatic chapter index re-numbering after delete.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-STICKY-CHAPTERS-ICON-HOVER-ACTIONS
- Goal: Simplify book dashboard block cards by rendering chapter title once per chapter as sticky section header, add chapter-title pencil edit overlay, remove original-panel block buttons, and replace edited-panel actions with color-coded icon-only hover popup controls.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-SHELL-WIDTH-FIXED-TOPBAR-EDGE-PANEL-CARD-SHAPE
- Goal: Align `/book/[id]` content width to home layout, move book topbar into reusable shell component with fixed position, make dashboard scrollable with static background, move progress below main viewport, and restyle dashboard/panel/block cards to active-book-card form with author-color left stripe and compact one-column editor panel options.
- Files modified: `components/ShellTopBar.tsx`, `components/TopBar.tsx`, `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-EDITED-PANEL-NAME-FALLBACK-DELETE-BLOCK
- Goal: Rename the translated panel to `Szerkesztett`, render original block text in edited view when no generated variant exists, and add per-block delete action to remove the current edited variant from the edited pane.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `lib/db/queries/books.ts`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-RIGHT-PANEL-ICON-ONLY-VERTICAL-EDGE
- Goal: Change right-side editor panel controls to icon-only buttons, stack them vertically, and move the panel closer to the right screen edge; convert single-page title switch button to icon-only as well.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-RIGHT-EDITOR-PANEL-DESKTOP-VIEW-SWITCH
- Goal: Add a right-side z-index editor activity panel on `/book/[id]` with desktop view switching (single-page vs split-page), and add title-row switch action in single-page mode to toggle original/translated panel content.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-SHELL-TOPBAR-ADMIN-BOTTOM-SPLIT-PROGRESS
- Goal: Rebuild `/book/[id]` with home-like fixed shell (title+author topbar, back button on right), move dashboard controls under bottom-bar Admin sheet, keep page fixed with internal scrolling only, and place completion progress as a separate element directly below the desktop dashboard area.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `app/globals.css`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-GAPS-AND-HOME-SCROLL-LOCK
- Goal: Increase vertical spacing between carousel shell, pagination, and prototype tools, and lock home page scrolling so the main screen does not move vertically.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `525aa23c6354fb7b051b929deed65cce82d63f31` (workspace base head; no new commit created in this session)

- Ticket: Ticket 5A-2 - Book Dashboard UI Hook (Generalas gomb)
- Goal: Add block-level `Generalas` action in Workbench to create draft variants via `/api/llm` and refresh translated panel state.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/BookDashboard/README.md`, `docs/BOOK_DASHBOARD.md`, `TICKETS.md`
- Commit hash: `525aa23c6354fb7b051b929deed65cce82d63f31` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SPINE-ICON-BRAND-PAPER-FRAME-SCALE
- Goal: Add a brand-paper frame to inactive spine icons and apply a slight base scale so the icon renders larger inside its container with overflow clipping.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-LAYER-ZINDEX-NO-VERTICAL-SCROLL
- Goal: Keep top logo and plus button on a dedicated higher z-index layer and disable vertical scrolling/overflow on the home page shell.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ACTIVE-CARD-NEUTRALIZED-IMAGE-SEPARATE-BASE-GRADIENT
- Goal: Make active card neutralization clearly visible by separating author-color base gradient (card background) from the faded, desaturated image layer.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ACTIVE-CARD-GRADIENT-TINT-VISIBILITY-BOOST
- Goal: Increase active card background visibility by using a stronger author-color gradient tint and stronger image fade/filter treatment.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ACTIVE-CARD-FAINT-IMAGE-AUTHOR-TINT
- Goal: Make active home carousel card background image fainter and add subtle author-color tint behind it.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `eb7356bcf5e97513bc22d40b6ca72e96a8b5dcee` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-TOPBAR-BRAND-COPY-OFFSETS-CENTERING
- Goal: Move home floating logo/plus further left with larger top/bottom offsets, add two-line NOVIRA brand copy next to the logo, and vertically center main home content.
- Files modified: `components/TopBar.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-DIV-CENTER-ALIGN
- Goal: Keep the home container centered on the page with an explicit reusable `home-container` width+margin rule.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-LIBRARY-DEFAULT-SORT-AUTHOR-ASC
- Goal: Set Library default sort order to author ascending (A-Z).
- Files modified: `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SPINE-LEFT-FILL-VISIBLE-SLOTS
- Goal: Render home carousel from left to right (left-filled shelf) so active card starts the visible slice and remaining visible slots are filled with inactive spines.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SPINE-HORIZONTAL-CENTERING-TWEAK
- Goal: Center spine author/title elements horizontally to avoid left drift while keeping vertical writing mode and rotation.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SPINE-KEEP-WRITINGMODE-TRANSFORM
- Goal: Keep `writing-mode` and `transform` on separate spine author/title elements so labels remain readable on narrow spines while preserving 3-item vertical layout with icon.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SPINE-LABEL-LAYOUT-AUTHOR-TOP-TITLE-CENTER
- Goal: Increase inactive spine icon size and change spine label layout so author is top-aligned, title is centered horizontally in the middle section, and spine content is center-aligned.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SPINE-ROTATED-LABEL-BOLD-AUTHOR
- Goal: Rotate inactive spine label to fit one line on the spine, keep only author name bold, and tune spine width/slot calculation to show as many books as fit on screen.
- Files modified: `components/BookCard.tsx`, `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SPINE-STYLE-AUTHOR-COLOR-ICON-SIZE
- Goal: Make inactive home carousel books render as narrow full-height solid-color spines with top-fixed `author: title`, bottom-fixed small paper-color icon, and ensure at least one spine remains visible beside active card.
- Files modified: `components/LibraryClient.tsx`, `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-DYNAMIC-SLOTS-SPINE-VISIBLE
- Goal: Keep inactive spine cards visible in home carousel while removing horizontal scrolling and dynamically calculating how many books fit on screen.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-FIRST-ACTIVE-FILTER-SORT-PAGINATION
- Goal: Set first home book active on load, switch to per-book carousel navigation with side arrows/pagination, and add a filter/sort prototype below the shelf.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: Ticket 5A-1 - LLM Route Wire-up (Supabase server client + guardrails)
- Goal: Wire `POST /api/llm` to repo Supabase server client with auth-aware rate-limit key, payload sanity checks, and draft variant insertion.
- Files modified: `app/api/llm/route.ts`, `docs/LLM_MODULE.md`, `TICKETS.md`
- Commit hash: `c618ef72ff9b39aa42383d3b0ce17cf4f8fd056e` (workspace base head; no new commit created in this session)

- Ticket: Ticket 4B-Refinement - Workflow UI Stabilizalas
- Goal: Stabilize Book Dashboard validation workflow before LLM with strict accept guard, status stripe, completion emphasis, and Reader state rules.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `lib/db/queries/books.ts`, `components/BookDashboard/README.md`, `docs/BOOK_DASHBOARD.md`, `app/book/[id]/page.tsx`, `TICKETS.md`
- Commit hash: `c618ef72ff9b39aa42383d3b0ce17cf4f8fd056e` (workspace base head; no new commit created in this session)
- Commit note: Workflow fix only; restored D-004 acceptance safety by blocking accept without an existing translatable variant and strengthening visual state feedback.

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

- Ticket: ADHOC-BOOK-METADATA-BACKGROUND-SLUG
- Goal: Add editable `background slug` for books and use it to resolve active card PNG background, independently from icon slug.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookCard.tsx`, `lib/types.ts`, `TICKETS.md`
- Commit hash: `c618ef72ff9b39aa42383d3b0ce17cf4f8fd056e` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-LIBRARY-KEYBOARD-PAGINATION-AND-DASHBOARD-TS-FIX
- Goal: Add left/right keyboard arrow pagination on home library and fix BookDashboard TypeScript `update(...): never` errors.
- Files modified: `components/LibraryClient.tsx`, `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-AUTHOR-UNIQUE-SPINE-COLORS
- Goal: Assign unique spine color per listed author and handle common author name spelling variants.
- Files modified: `components/BookCard.tsx`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-ARROW-SQUARE-SIMPLE-HEAD
- Goal: Make carousel arrow buttons square with fully rounded container and use simple arrowhead glyphs.
- Files modified: `app/globals.css`, `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-ARROW-ICON-CHEVRON
- Goal: Replace arrowhead text glyphs with minimal CSS chevron icons in carousel arrow buttons.
- Files modified: `app/globals.css`, `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ACTIVE-CARD-AUTHOR-TINT-OVERLAY-LAYER
- Goal: Ensure active card author tint is rendered as an overlay on top of background image, not behind it.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ACTIVE-CARD-AUTHOR-TINT-LIGHTER-SAME-HUE
- Goal: Lighten active card tint and tie overlay hue directly to spine color to improve visual color match.
- Files modified: `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-SHELL-LOGO-PLUS-NO-SCROLL
- Goal: Remove home title/subtitle text, add fixed left-aligned shell logo and plus upload button, and tighten/widen home layout so main content fits without scrolling.
- Files modified: `components/TopBar.tsx`, `app/page.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-LAYERED-SHELL-LOGO-INK-ALIGN
- Goal: Split home into separate top/main/plus layers, make topbar logo smaller and brand-ink colored, and keep equal left offset for logo and plus button with top/bottom edge alignment.
- Files modified: `components/TopBar.tsx`, `app/page.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-TOPBAR-FAVICON-V2-LOGO
- Goal: Use `novira_favicon_v2.svg` as the topbar logo mark on home and adjust it to square favicon proportions.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-TYPOGRAPHY-SPECTRAL-SOURCE-SERIF4
- Goal: Apply Spectral as display font and Source Serif 4 as body font via Next font variables.
- Files modified: `app/layout.tsx`, `app/globals.css`, `DECISIONS.md`, `TICKETS.md`
- Commit hash: `ebe5d09b42bcc447b7f0f0301230b30c68c0696f` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-EDITED-INLINE-NOTE-SUGGESTION-AND-SELECTION
- Goal: In edited view, show imported footnote-based note suggestions and allow manual text selection to generate/save anchored inline notes with dotted-underline + tooltip rendering.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `lib/db/queries/books.ts`, `app/api/llm/route.ts`, `lib/llm/types.ts`, `lib/llm/providers/provider.ts`, `lib/llm/providers/openai.ts`, `lib/llm/prompts/generateNote.ts`, `components/BookDashboard/README.md`, `docs/BOOK_DASHBOARD.md`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-NOTE-TOOLTIP-WIDTH-AND-INLINE-SUGGESTION-APPROVAL
- Goal: Remove separate suggestion infoline, render suggestion markers inline with tooltip-only UI constrained to panel width, and add suggestion approve/reject controls (`?` / `X`) directly in tooltip.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/BookDashboard/README.md`, `docs/BOOK_DASHBOARD.md`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-NOTE-SIGNAL-COUNT-BADGE
- Goal: Restore visible per-block explanation signal count (suggested + saved notes) while keeping inline tooltip-based suggestion workflow.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/BookDashboard/README.md`, `docs/BOOK_DASHBOARD.md`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-SUGGESTION-MARK-ON-TARGET-TEXT
- Goal: Render system note suggestions on the referenced target text segment (word/phrase) instead of standalone marker token, keeping tooltip + approve/reject actions.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/BookDashboard/README.md`, `docs/BOOK_DASHBOARD.md`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)
