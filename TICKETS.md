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

## Ticket ADHOC-DATA-MODEL-SHARED-SOURCE-BOOKS
Type: Backend + DB + Data migration + UI

Goal:
Realign the data model so every upload/import creates an uploader-owned source book (canonical base), and user edits are stored only as user-scoped variants/notes/edits on top of shared source blocks (no full fork by default). Admin can edit any source book regardless of ownership.

Acceptance:
- Source book is uploader-owned; admin can edit any source book; non-admin can edit source text/metadata only on own source books.
- Users see source blocks, but do not receive a full personal copy of all blocks by default.
- User edits and generated content are stored as per-user overrides and visible only to that user.
- Opening a public base book does not auto-create a full fork; editor works on shared source blocks with user-scoped overrides.
- Migration plan: export existing books, reset storage, reimport (Gutenberg import can be used for automated recovery).

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

- Ticket: ADHOC-ADMIN-LIBRARY-EXCLUDE-USER-FORKS
- Goal: For admin library carousel, hide user fork copies (books with `source_book_id`) unless the fork is owned by the admin, while still showing all base books public or private.
- Files modified: `components/LibraryClient.tsx`, `SPEC.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOKDASHBOARD-BLOCK-GENERATION-OUTPUT-LIMIT
- Goal: Prevent Book Dashboard block generation from truncating mid-sentence by scaling LLM output token limits to block length within server caps.
- Files modified: `app/api/llm/route.ts`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-LLM-500-DEFAULT-MODEL-FIX
- Goal: Align default OpenAI model to `gpt-4o-mini` and use compatible chat completion token cap to prevent LLM 500s when GPT-5 access is unavailable.
- Files modified: `lib/llm/providers/openai.ts`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-ADMIN-PERSONAL-VS-GLOBAL-FAVORITE-BOUNDARY
- Goal: Split favorite handling into user-scoped personal favorites and separately gated global admin favorites, so admin default edits are private unless explicit privileged action is used.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/LibraryClient.tsx`, `lib/db/queries/books.ts`, `lib/types.ts`, `supabase/migrations/supabase_migrations_0010_book_personal_favorites.sql`, `SPEC.md`, `SECURITY.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOK-CHAPTER-GENERATE-COMMENT-MODAL-AND-SPACING
- Goal: Add larger chapter-block spacing, chapter-title hover generate action (translate or content-based title), and pre-generation comment modal before block/chapter generation.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `app/api/llm/route.ts`, `lib/llm/types.ts`, `lib/llm/providers/provider.ts`, `lib/llm/providers/openai.ts`, `lib/llm/prompts/translateBlock.ts`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOK-COVER-ICON-DEFAULT-SVG-FALLBACK
- Goal: Use `icon_default.svg` as fallback whenever a book-specific cover icon SVG cannot be loaded.
- Files modified: `components/BookCoverIcon.tsx`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOK-FAVORITE-STAR-PIN-FIRST-AND-SPINE-MARK
- Goal: Add book-page favorite star toggle next to `Vissza a konyvtarba`, pin favorites first on Home within current filtered results, and render a favorite star mark on inactive book spine near author line.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/LibraryClient.tsx`, `components/BookCard.tsx`, `app/globals.css`, `src/ui/icons/Icon.tsx`, `lib/types.ts`, `supabase/migrations/supabase_migrations_0009_books_favorite_flag.sql`, `SPEC.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOK-DELETE-BOTTOM-BAR-SOURCE-PROTECTION-ADMIN-PASSWORD
- Goal: Move book delete action next to bottom source-restore action, ensure non-admin delete only removes user-owned book data without deleting source books, and require admin role plus password confirmation for source-book deletion.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOK-SOURCE-RESTORE-DELETE-ACTIVITY-UNDO-REDO
- Goal: Add bottom-of-book-page `Eredeti konyv visszaallitasa` action to fully restore linked source material, add book delete controls for editor/admin in Activity panel, and upgrade undo UX with stronger icon + conditional redo action after undo.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `src/ui/icons/Icon.tsx`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOK-ADMIN-SOURCE-EDIT-TOGGLE-ON-EDITED-PANEL
- Goal: Replace Book admin `Forras szerkesztes` metadata editor with source-text edit toggle behavior so admin edits source block text directly in the `Szerkesztett` panel, while keeping source provenance as preview-only metadata.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `SPEC.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-HOME-REGISTERED-USER-PLUS-ADD-BOOK-ACCESS
- Goal: Make Home `+` add-book action available to registered users (non-guest), including mobile visibility, and allow upload/import endpoints for non-guest authenticated users.
- Files modified: `app/page.tsx`, `app/upload/page.tsx`, `app/api/upload/route.ts`, `app/api/import/external/route.ts`, `app/globals.css`, `lib/auth/identity.ts`, `SPEC.md`, `DECISIONS.md`, `SECURITY.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-HOME-MOBILE-CAROUSEL-SPINE-LIST-NO-ACTIVE-CARD
- Goal: On mobile Home carousel remove active card mode, render touch-scrollable inactive spine list only, and open book page directly on spine click.
- Files modified: `components/LibraryClient.tsx`, `components/BookCard.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-PAGINATION-INDICATOR-ONLY
- Goal: Make Home carousel pagination dots indicator-only so page changes happen only via carousel arrow controls.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-HOVER-ACTIVE-AND-PAGINATION-PAGE-STEP
- Goal: Make Home carousel cards activate on hover, and make carousel pagination/navigation step by visible-page size with edge-aware remaining-step behavior.
- Files modified: `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-LANDING-LOGIN-POPUP-REGISTER-MODE-AND-BUTTON-UNIFY
- Goal: Make landing `Belepes` open a popup auth form with login/register mode toggle and unify landing/topbar auth button visuals with the `Vissza` button style.
- Files modified: `app/landing/page.tsx`, `app/page.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-LANDING-LOGIN-POPUP-OVERLAY
- Goal: Make landing page `Belepes` open the login form as a centered popup modal above a darkened overlay.
- Files modified: `app/landing/page.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-HOME-TOPBAR-ADMIN-AND-LOGOUT-VISUAL-UNIFY
- Goal: Make both `Admin` and `Kilepes` buttons use the same explicit topbar button styling on the home page.
- Files modified: app/page.tsx, app/globals.css, TICKETS.md
- Commit hash: 493775f94efc30447a82ee8ad1edb7410947dd35 (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ACTIVITY-PANEL-ADMIN-ONLY-EDIT-BUTTONS
- Goal: Restrict Activity panel edit controls so only admin sees all Szerkesztes buttons, while non-admin keeps only `Utolso szerkesztes visszavonasa`.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `493775f94efc30447a82ee8ad1edb7410947dd35` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-TOPBAR-RIGHT-ALIGNED-AUTH-ACTIONS-LARGER-GAP
- Goal: Keep main home topbar auth actions right-aligned and increase spacing between buttons.
- Files modified: app/globals.css, TICKETS.md
- Commit hash: 493775f94efc30447a82ee8ad1edb7410947dd35 (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ACTIVITY-SCROLL-AND-ADMIN-SOURCE-EDIT-TOGGLE
- Goal: Make desktop activity panel scrollable and add an ADMIN toggle in Szerkesztes so admin can edit source text through the Szerkesztett panel.
- Files modified: components/BookDashboard/BookDashboard.tsx, components/BookDashboard/BookDashboard.module.css, TICKETS.md
- Commit hash: 493775f94efc30447a82ee8ad1edb7410947dd35 (workspace base head; no new commit created in this session)

- Ticket: ADHOC-GUEST-LOGIN-ROUTE-AND-LOGIN-REGISTER-TOGGLE-FORM
- Goal: Remove temporary home login button, route guest `Belepes` action to `/login`, and add a single-form login/register mode toggle on the login page.
- Files modified: `app/page.tsx`, `components/GuestSessionActions.tsx`, `components/BookDashboard/BookDashboard.tsx`, `app/login/page.tsx`, `SPEC.md`, `TICKETS.md`
- Commit hash: `5f61b99f471973abff39f843ca01e45631694bfc` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-TEMP-LOGIN-BUTTON
- Goal: Add a temporary login navigation button on the main home page that routes to `/login`.
- Files modified: `app/page.tsx`, `TICKETS.md`
- Commit hash: `cb2774c5449e160112d869837780e299bb8ffd80` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-AUTH-REDIRECT-LOGIC-ROOT-TO-LANDING-WHEN-LOGGED-OUT
- Goal: Normalize auth navigation so logged-in users stay on main library (`/`) while logged-out users are consistently redirected to `/landing`.
- Files modified: `app/page.tsx`, `app/upload/page.tsx`, `components/LibraryClient.tsx`, `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `911cbcda1784256efa3aab3f20078ae22afd2536` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-LANDING-PANEL-SPACING-REMOVE-ALL-WORKS-LINK-AND-NEW-AUDIENCE-ICONS
- Goal: Increase vertical spacing between landing sections, remove the `Minden mu megtekintese` link under carousel, and apply a new dedicated icon set for the `Kinek keszult?` cards.
- Files modified: `app/landing/page.tsx`, `app/globals.css`, `src/ui/icons/Icon.tsx`, `TICKETS.md`
- Commit hash: `8501d752c66474e072da81e8466ee987957a34d6` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-LOGIN-ROUTE-FIRST-ENTRY-THEN-LIBRARY
- Goal: Add dedicated `/login` entry route and make unauthenticated app start redirect to login first, then proceed to library after successful login/session.
- Files modified: `app/login/page.tsx`, `app/page.tsx`, `app/landing/page.tsx`, `app/upload/page.tsx`, `components/LibraryClient.tsx`, `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `e7cc49200e31b4fedbca0169516cda340d7adb10` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-LANDING-SEPARATE-ROUTE-TOPBAR-AUTH-BUTTONS-AND-HOME-REDIRECT
- Goal: Move unauthenticated first entry to dedicated `/landing` route, place top-bar auth buttons (`Belepes`, `Vendeg`) on the right-center alignment, and implement a structured marketing landing with reused home carousel.
- Files modified: `app/page.tsx`, `app/landing/page.tsx`, `app/globals.css`, `components/TopBar.tsx`, `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `a262f8e8ddd91687a8c0ddc04982152c4c2b03c5` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-AUTH-LANDING-PASSWORD-GUEST-ROLE-GATING
- Goal: Add first-visit landing auth flow (password login + guest session), guest session lifecycle actions (save account / delete and exit), and admin-only visibility/enforcement for upload/import/admin tools.
- Files modified: `app/page.tsx`, `app/globals.css`, `components/TopBar.tsx`, `components/GuestSessionActions.tsx`, `components/LibraryClient.tsx`, `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `app/upload/page.tsx`, `app/api/upload/route.ts`, `app/api/import/external/route.ts`, `app/api/llm/route.ts`, `lib/auth/identity.ts`, `SPEC.md`, `DECISIONS.md`, `SECURITY.md`, `README.md`, `TICKETS.md`, `.env.example`
- Commit hash: `cb4e34669f5e9d15a635956c9d0dba8f19e053fd` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DESKTOP-EDITORIAL-NOTE-PANEL-IN-BOTTOM-MULTI-BLOCK-SECTION
- Goal: Add a dedicated `Szerkesztoi jegyzet` panel to the Book Dashboard desktop bottom multi-panel block area, with live editorial workflow indicators.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-LARGE-BREAKPOINT-TYPE-AND-COVER-ICON-SCALE-UP
- Goal: Increase typography and cover icon sizes on the `min-width: 1360px` home carousel breakpoint for better large-screen readability and visual balance.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-DESKTOP-PAGINATION-VISIBILITY-AND-LARGE-SCREEN-TUNE
- Goal: Restore desktop home carousel pagination visibility after height capping by using viewport-safe carousel sizing, and add a dedicated larger-screen sizing tier.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-DESKTOP-MAX-HEIGHT-AND-TYPE-SCALE
- Goal: Limit desktop home carousel height with ratio-based active-card sizing, and scale book-card/spine typography so large screens do not stretch layout with undersized text.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MOBILE-FULLHEIGHT-REMOVE-FIXED-BOTTOM-GAP
- Goal: Remove fixed mobile bottom spacing from Book Dashboard shell so main panel can reach full viewport height, while keeping safe-area bottom inset.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MOBILE-MAIN-HEIGHT-FOCUS-RESTORE-H-INSET
- Goal: Correct mobile dashboard full-screen tweak to keep horizontal inset while targeting only vertical fill behavior on the dashboard main container.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MOBILE-MAIN-FULL-STRETCH-NO-INSET
- Goal: Ensure the mobile Book Dashboard main viewport fills the screen edge-to-edge by removing mobile main/header inset padding and top gap on the dashboard shell.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MOBILE-DASHBOARD-FULL-VIEWPORT-HEIGHT
- Goal: Make Book Dashboard fill the mobile viewport by switching mobile shell/main/stage to full-height layout and removing mobile panel/info max-height caps.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MOBILE-TOOLPANEL-PROGRESS-TOP-AND-THIN-CLOSE-X
- Goal: Move mobile progress card into the top of the mobile tool panel and make the tool panel close `X` visually thinner.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MOBILE-TOOLPANEL-CLOSE-X-AND-REMOVE-MODE-TOGGLES
- Goal: On mobile tool panel remove title and gear from header, add a dedicated `X` close button, and remove Workbench/Reader options from the panel.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MOBILE-ACTIVITY-VIEW-DROPDOWN-AND-PAGE-TABS
- Goal: Move mobile page tabs into the mobile activity `Nezet` group with icons, make the mobile activity group scrollable, switch mobile view menu to dropdown, and remove mobile controls for multi-block generate, sync scroll, scroll-based auto-generate, and chapter-title auto-translate.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `src/ui/icons/Icon.tsx`, `TICKETS.md`
- Commit hash: `a22e27d8b78ffb33f038cebd822a9936e437069b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-CAROUSEL-ONE-SPINE-BEFORE-ACTIVE
- Goal: Keep one spine before the active card on mobile carousel whenever a previous book exists, by adjusting visible window anchoring and mobile item ordering.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-PAGINATION-EDGE-COLUMN-POSITION-FIX
- Goal: Fix mobile pagination edge placement by switching from rotated-row positioning to a right-edge vertical column layout with small padding.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-PAGINATION-EDGE-SPACING-AND-SWIPE-NAV
- Goal: Keep mobile pagination on screen edge with small padding while bringing it visually closer to carousel by widening stage, and add touch swipe navigation on the home carousel.
- Files modified: `app/globals.css`, `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-PAGINATION-VISIBLE-RIGHT-OUTSIDE-FIX
- Goal: Fix mobile pagination visibility by anchoring rotated pagination to the right edge of the layout (outside carousel but inside viewport).
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-HIDE-PLUS-LEFT-ALIGN-CAROUSEL-OUTSIDE-PAGINATION
- Goal: On mobile home page hide the plus icon, left-align the carousel, and place rotated pagination outside next to the carousel.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-PAGINATION-ROTATE-TO-RIGHT-SIDE
- Goal: On mobile home carousel, move pagination to the right side of the carousel and rotate it for vertical side placement.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-TOOLS-PANEL-NO-TITLE-HIGHER-Z-INDEX
- Goal: Remove mobile tools panel title row (including gear icon) and raise panel/backdrop stacking above the floating plus button.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-SHELL-AND-CAROUSEL-SIDE-PADDING-INCREASE
- Goal: Increase mobile side padding on the home shell and carousel by adding final overrides for `home-layer-main` horizontal padding and tighter carousel stage width.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-ACTIVE-CARD-MATCH-CAROUSEL-WIDTH
- Goal: Force the active mobile book card to occupy full carousel width by adding final media overrides for active item and card width.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-SPINE-MATCH-STAGE-WIDTH-STRICT
- Goal: Ensure mobile spine cards match carousel width exactly by re-asserting mobile stage width in the final CSS override block so later duplicate base rules cannot reset it.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-SPINE-WIDTH-OVERRIDE-LAST-BLOCK
- Goal: Force full-width mobile spine cards by adding a final end-of-file media override that beats duplicated legacy carousel width rules.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-SPINE-FULL-CAROUSEL-WIDTH
- Goal: On mobile carousel, make inactive spine cards exactly match carousel width by enforcing full-width border-box sizing.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-CENTER-ALIGN-ALL-SCREENS
- Goal: Keep the home carousel horizontally centered across all screen sizes by forcing centered stage alignment in every active carousel style block.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-FIXED-VISIBLE-BOOK-COUNT-BY-BREAKPOINT
- Goal: Make the home carousel render a fixed number of visible books per screen-width breakpoint so the displayed item count is deterministic across viewport limits.
- Files modified: `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-BATCH-AUTO-GENERATE-RECOVERY-AND-RUNTIME-ALERTS
- Goal: Make translated-panel auto-generate continue chunk-by-chunk while near-bottom scrolling, add visible runtime popup alerts for stop/error states (including backend rate-limit feedback), and prevent editor-action lockups with LLM request timeout handling.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `3dc769abecc69762e52b14f9309559c90e677e6b` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-EDITED-PANEL-UNDO-LAST-CHANGE
- Goal: Add undo-safe recovery for edited-panel mutations by checkpointing block/variant state before generate/accept/delete/reject/manual-save actions, then restoring the last checkpoint from desktop/mobile tool controls.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-BATCH-GENERATE-SCROLL-AUTO-AND-UNACCEPTED-LIMIT
- Goal: Add dashboard multi-block generate action with scroll-triggered continuous generation option, enforce a fixed max on unaccepted generated blocks, and optionally auto-refresh chapter titles from newly generated content.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EXTIMPORT-PROJECT-GUTENBERG-HTML-ZIP
- Goal: Add Project Gutenberg HTML ZIP external importer (work-id based) with mirror/fallback fetch, rate-limit/backoff, provenance + license metadata storage, upload-page trigger, and Book Dashboard Source & License panel.
- Files modified: `app/api/import/external/route.ts`, `lib/upload/external/projectGutenberg.ts`, `supabase/migrations/supabase_migrations_0006_external_source_provenance.sql`, `app/upload/page.tsx`, `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `lib/types.ts`, `SPEC.md`, `DECISIONS.md`, `SECURITY.md`, `README.md`, `.env.example`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-REACT-WARNINGS-KEY-AND-NESTED-BUTTON
- Goal: Resolve Book Dashboard React console warnings by adding missing chapter list keys and removing invalid nested `button` markup in note navigator cards.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-CHAPTER-DELETE-MERGE-AND-SIDEBAR-ADD-MODE
- Goal: Ensure chapter delete always moves chapter blocks into the previous chapter when available, and add a sidebar `Fejezet +` mode where clicking a block creates a new chapter starting there with that block text as chapter title.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-YEAR-PERSISTENCE-DB-MIGRATION-AND-AI-PROMPT-RELAX
- Goal: Fix non-persisting manual/AI year updates by adding missing `books.publication_year/year` DB columns via migration, and relax AI year prompt so it returns best-effort estimate when data is sparse.
- Files modified: `supabase/migrations/supabase_migrations_0005_book_publication_year.sql`, `lib/llm/prompts/inferPublicationYear.ts`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-AI-PUBLICATION-YEAR-INFERENCE-PERSIST
- Goal: Replace fixed-title year fallback with AI-based original publication-year inference, persist inferred year to Supabase via `/api/llm`, auto-run once for year-empty books, and add manual admin trigger.
- Files modified: `app/api/llm/route.ts`, `lib/llm/types.ts`, `lib/llm/providers/provider.ts`, `lib/llm/providers/openai.ts`, `lib/llm/prompts/inferPublicationYear.ts`, `components/BookDashboard/BookDashboard.tsx`, `components/BookCard.tsx`, `components/LibraryClient.tsx`, `app/api/upload/route.ts`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ORIGINAL-YEAR-AUTOFILL-NO-CREATED-AT-FALLBACK
- Goal: Remove `created_at` year fallback (to prevent forced current-year display), keep manual year editable, and auto-fill original publication year from metadata/known works with one-time persistence on upload when inferable.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookCard.tsx`, `components/LibraryClient.tsx`, `app/api/upload/route.ts`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-YEAR-AUTOFILL-AND-LEGACY-SAVE-FALLBACK
- Goal: Ensure admin year edits persist even on legacy schema (`year` fallback), and auto-fill year in edit form from stored metadata/text/date when explicit year is missing.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-CHAPTER-DELETE-MOVE-BLOCKS-TO-PREVIOUS
- Goal: On chapter delete, move that chapter's blocks to the previous chapter before delete so block-linked data is preserved.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-REJECT-X-ONLY-WHEN-UNACCEPTED-GENERATED-AND-RIGHT-ALIGNED-ROW
- Goal: Render reject action as `X`, show it only for non-accepted generated state, and keep block action controls in one right-aligned row on hover.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-BLOCK-HOVER-RIGHT-ACTIONS-ACCEPT-FIRST-REJECT
- Goal: Show block actions only on block hover as right-edge z-index overlay, keep `Elfogad/Elfogadva` first, and add adjacent `Elutasitas` action that restores original text by removing edited variant.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-BLOCK-ACTIONS-TOP-ROW-LAYOUT
- Goal: Move block action controls from floating side overlay to a single horizontal row at the top of each block card.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-BLOCK-MANUAL-CLEAN-EDIT-IN-EDITED-PANEL
- Goal: Add per-block `Kezi javitas` action in edited panel so user can manually clean unwanted text and save as a new draft variant.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ACTIVITY-HIDE-WORKFLOW-SYNC-EDIT-LAST
- Goal: On desktop activity panel hide `Munkafolyamat` and `Szinkron` groups, and place `Szerkesztes` group at the end.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-EDIT-PANEL-TOGGLE-IN-ACTIVITY
- Goal: Hide desktop book edit/meta panel by default and show it only when toggled from the activity panel gear button.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-PROGRESS-UNDERPANEL-TOC-NOTES-BOOKMARKS-MOBILE-PAGES
- Goal: Add a new navigation panel below book progress with 3 side-by-side scrollable blocks (chapter TOC with per-chapter mini progress, navigable notes with selected expression + description, and navigable stored bookmarks), plus mobile page tabs for `Eredeti`, `Szerkesztett`, `Tartalom`, `Jegyzetek`, `Konyvjelzok`.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-BLOCK-BOOKMARK-COLOR-RIBBON
- Goal: Add multi-bookmark support (single progress + multiple important markers) set from edited block actions, with per-marker label, 10 predefined color categories, activity-panel/mobile list management, and no top bookmark bar.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `src/ui/icons/Icon.tsx`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-TOPBAR-ICON-SCALE-AND-SPINE-LIKE-FRAME
- Goal: Style `/book/[id]` topbar cover icon with spine-like frame treatment and increased SVG scale to match home spine icon visual language.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MERGE-SPACE-CONCAT-SAFETY-CHECK
- Goal: Merge neighboring blocks by concatenating `original_text` with a single space, and guard against destructive merge when source rows are missing or merged text would be empty.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ACCEPT-VISIBLE-ONLY-WITH-GENERATED-CONTENT
- Goal: Show block `Elfogad` action only when the translated panel has actual generated content (not original fallback text).
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-MERGE-ERROR-NONFATAL-RECOVERY
- Goal: Prevent block-merge failures from switching the whole dashboard into fatal error mode; show inline merge error and reload current dashboard state.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-EDIT-PANEL-MERGE-BETWEEN-BLOCKS-AND-CONDITIONAL-ACCEPT
- Goal: Add a hover merge action between neighboring edited-panel blocks and show `Elfogad` only when a generated acceptable variant exists.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `components/BookDashboard/README.md`, `src/ui/icons/Icon.tsx`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-UI-ICONS-MIGRATE-TO-LUCIDE-WRAPPER
- Goal: Migrate UI icon rendering to `lucide-react` exclusively via `src/ui/icons/Icon.tsx`, remove legacy registry SVG path rendering, and align icon policy docs.
- Files modified: `src/ui/icons/Icon.tsx`, `src/ui/icons/registry.ts`, `components/BookDashboard/BookDashboard.tsx`, `SPEC.md`, `DECISIONS.md`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ACTIVITY-PANEL-OUTSIDE-RIGHT-NO-BACKGROUND
- Goal: Move Book Dashboard activity panel outside to the right of the editor area and remove panel background styling.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ACTIVITY-PANEL-EDGE-ATTACH-NO-STRIPE
- Goal: Remove the colored left stripe from the Book Dashboard activity panel and align the panel to the edited panel right edge.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ACTIVITY-PANEL-SINGLE-COLUMN-ROWS
- Goal: Render Book Dashboard activity panel options in a single column with one option per row.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-UI-SVG-ICONS-CENTRALIZE-ICON-TSX
- Goal: Centralize Book Dashboard UI SVG icon rendering through `Icon.tsx` + registry, replace empty CSS swap icon with SVG icon, and document icon policy/decision.
- Files modified: `src/ui/icons/registry.ts`, `src/ui/icons/Icon.tsx`, `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `SPEC.md`, `DECISIONS.md`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-OSS-OPEN-READ-RLS-SELECT
- Goal: Keep RLS enabled but temporarily open `SELECT` policies for shared book/dashboard data so Vercel users can see Supabase content across anon sessions.
- Files modified: `supabase/migrations/supabase_migrations_0004_open_read_mode.sql`, `SECURITY.md`, `TICKETS.md`
- Commit hash: `b1657456e83af3426666b20edb0e7df1433ab524` (workspace base head; no new commit created in this session)

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

- Ticket: ADHOC-HOME-FAVICON-V3-AND-TOPBAR-LOGO-V3
- Goal: Set application favicon to `novira_favicon_v3.svg` and switch topbar logo mark to v3 asset.
- Files modified: `app/layout.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-TOPBAR-STYLE-AND-ICON-TOOLS-SYNC-SWITCH
- Goal: Align `/book/[id]` top bar styling to the home shell style, add a brand-ink SVG cover icon in the top bar, convert right editor tool panel controls to icon-only buttons, and replace sync checkbox with an ON/OFF switch.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-TOPBAR-COVER-ICON-BETWEEN-LOGO-AND-TITLE
- Goal: Place the book cover SVG icon in `/book/[id]` top bar directly between the shell logo mark and the title/subtitle text block.
- Files modified: `components/ShellTopBar.tsx`, `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-TOPBAR-POSITION-ALIGN-HOME-SHELL
- Goal: Align `/book/[id]` top bar position with home shell offsets by using shared shell top/left positioning variables.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-TOPBAR-ICON-SLUG-FALLBACK-MATCH-CARD
- Goal: Make `/book/[id]` topbar icon slug resolution match card behavior by using `cover_slug` first and falling back to title-derived slug when cover slug is missing.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-TOPBAR-ICON-RENDER-USING-BOOKCOVERICON
- Goal: Fix `/book/[id]` topbar icon visibility by rendering the SVG through `BookCoverIcon` (same mechanism as cards) instead of CSS mask-based drawing.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ADMIN-META-BELOW-PROGRESS-SINGLE-SLUG-SCROLL-RESTORE
- Goal: Move desktop book metadata admin section below progress, use one slug input for both SVG/PNG cover fields during save, and restore `/book/[id]` page scrolling.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-ALWAYS-OPEN-META-SUMMARY-GENERATE-SCROLLING-TOPBAR
- Goal: Keep book metadata panel always visible (remove admin open/close controls), reorganize metadata fields into a 2-column form with larger description area, add AI-generated 2-sentence book summary action, and make top bar title/author scroll with page.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `app/api/llm/route.ts`, `lib/llm/types.ts`, `lib/llm/providers/provider.ts`, `lib/llm/providers/openai.ts`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DEFAULT-SINGLE-EDITED-VIEW
- Goal: Make `/book/[id]` desktop default to single-page mode with the edited (`Szerkesztett`) panel active on load.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-CAROUSEL-HORIZONTAL-SPINES-STACKED
- Goal: On mobile home view, keep carousel behavior but render inactive book spines horizontally and stacked under each other.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-VERTICAL-SCROLL-CAROUSEL-NO-ARROWS
- Goal: On mobile home view, hide carousel arrows, keep spine rows near full width, and allow vertical (up/down) scrolling inside the carousel area.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-MOBILE-TOOLS-GEAR-BOTTOM-SHEET-HOME-DASHBOARD
- Goal: On mobile, move home and dashboard tool panels behind a bottom-right gear button with dimmed backdrop and bottom sheet; dashboard tools are selectable row actions with right-aligned icon.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-PLUS-BUTTON-MATCH-MOBILE-GEAR-FAB
- Goal: Make the home page plus button match the mobile gear FAB visual style and render a proper plus icon via centralized icon wrapper.
- Files modified: `src/ui/icons/Icon.tsx`, `app/page.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-FAB-POSITION-SYMMETRY-PLUS-TOOLS
- Goal: Make home mobile plus FAB and tools gear FAB positionally symmetric by aligning right-side FAB offsets to the same shell edge and bottom offsets used by the left-side plus control.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-TOOLBAR-STAGE-FILL-DESKTOP-MOBILE
- Goal: Make desktop home toolbar match the mobile tool panel style and keep it fixed above the carousel stage; make the stage fill the remaining viewport on desktop and mobile, with full-page mobile stage and visible active card rendering.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ONBOARDING-FUNCTION-INVENTORY-AND-ROUTE-POLICY
- Goal: Create a single onboarding inventory document listing current system functions with onboarding coverage, define first-visit onboarding route, and enforce mandatory onboarding integration (with popup info when needed) for every new editor/page feature.
- Files modified: `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-DESKTOP-HEIGHT-MOBILE-90W-60H-7SPINE
- Goal: Increase desktop home carousel stage height, and on mobile center carousel content at ~90% width with active card at ~60% stage height and inactive spines around ~7% height.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-MOBILE-STAGE-90P-CENTER-SPINES-FULL-WIDTH
- Goal: On mobile home view, center the carousel stage at 90% width and make inactive spine rows match the exact stage width.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ONBOARDING-EDITORIAL-ONLY-SCOPE
- Goal: Restrict onboarding scope to editorial functions only; explicitly exclude file upload and admin/tool functions from onboarding route and coverage.
- Files modified: `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ONBOARDING-EDITORIAL-ANCHOR-STEP-BLUEPRINT
- Goal: Add implementation-ready editorial onboarding blueprint with `data-onboarding-id` anchors, concrete step IDs, completion events, and runtime rules for `/book/[id]`.
- Files modified: `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-DASHBOARD-ONBOARDING-ANCHOR-WIRING
- Goal: Wire editorial onboarding anchors in Book Dashboard via `data-onboarding-id` attributes and add replay trigger controls for desktop/mobile.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

## Onboarding Development Queue (Active)

Ticket: ONB-DEV-000 - Editorial Onboarding Incremental Delivery
Type: Frontend + UX
Status: In Progress

Execution rule:
- When user says: "kovetkezo on-boarding fejlesztes", always implement the `Current active step` below.
- After finishing one step: mark it `done`, set completion date, and move `Current active step` to the next `pending` step.
- Do not skip steps unless explicitly requested.

Current active step: `none (queue complete)`

Step board:
- `ONB-DEV-001` | Onboarding function inventory + editorial-only scope | `done` | 2026-02-15
- `ONB-DEV-002` | UI anchor wiring (`data-onboarding-id`) + replay trigger event | `done` | 2026-02-15
- `ONB-DEV-003` | Onboarding step config source in code (`/book/[id]`) + step resolver | `done` | 2026-02-15
- `ONB-DEV-004` | Onboarding popup component (single visible step, anchor positioning, next/skip) | `done` | 2026-02-15
- `ONB-DEV-005` | Completion event integration (`mode_toggled`, `generate_success`, `accept_success`, `note_requested`, `note_decided`, `chapter_saved`) | `done` | 2026-02-15
- `ONB-DEV-006` | Progress persistence + versioning (`onboarding_version`) | `done` | 2026-02-15
- `ONB-DEV-007` | First-visit autostart + replay behavior finalization | `done` | 2026-02-15
- `ONB-DEV-008` | Optional telemetry events | `done` | 2026-02-15

- Ticket: ADHOC-ONBOARDING-DEV-QUEUE-TRACKER
- Goal: Add a sequential onboarding development queue with explicit current step pointer and execution rule for "next onboarding development" requests.
- Files modified: `TICKETS.md`
- Commit hash: `759611c9ca3aa8090acc6cfea52daa58fa1ca025` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ONBOARDING-UX-NAVIGATION-GUIDE-ICON-AND-FLOW-TUNING
- Goal: Improve onboarding popup anchor navigation, add dedicated Lucide onboarding icon, change flow so `Kovetkezo` is always active and `Kihagyas` stops onboarding, and add onboarding guide column with selectable step titles.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `components/BookDashboard/BookDashboard.module.css`, `src/ui/icons/Icon.tsx`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ONBOARDING-MANUAL-ONLY-ACTIVATION-AND-CONFIRMATION-GATE
- Goal: Disable automatic onboarding popup activation so onboarding appears only when manually opened, and document that new feature onboarding integration is evaluated first and implemented only after explicit confirmation.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-AUDIT-TRACKER-MANUAL-GOVERNANCE
- Goal: Create a large, onboarding-style efficiency audit tracker in one markdown document for manual (non-continuous) progress tracking of refactor opportunities.
- Files modified: `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `5d9942f72a24d64abf2526a6e4e34144271b969a` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF001-EFF002-PHASE1-BLOCKCARD-MEMO
- Goal: Start EFF-001/EFF-002 with a low-risk phase-1 optimization by memoizing `BlockCard` and removing per-render fallback `new Set()` allocations in dashboard block lists.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF005-PHASE1-CSS-BOOKMARK-CONSOLIDATION
- Goal: Start EFF-005 with a behavior-preserving CSS cleanup by consolidating duplicated bookmark-related style blocks and removing one empty rule.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF005-PHASE2-CSS-RULE-MERGE
- Goal: Continue EFF-005 with behavior-preserving CSS deduplication by merging repeated rule blocks for mobile tabs, list grids, active highlights, fills, and mobile layout wrappers.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF001-PHASE2-CHAPTER-BLOCKLIST-EXTRACTION
- Goal: Continue EFF-001 with behavior-preserving component extraction by introducing shared `ChapterBlockList` for duplicated original/translated chapter block rendering.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF002-PHASE2-LEAF-MEMO-BOUNDARIES
- Goal: Continue EFF-002 with behavior-preserving memoization by adding memo boundaries to leaf chapter/block UI components used in repeated render paths.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF001-PHASE3-PANEL-SHELL-EXTRACTION
- Goal: Continue EFF-001 with behavior-preserving extraction by introducing shared `DashboardPanelShell` for duplicated original/translated panel wrapper structure.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF001-PHASE4-CHAPTER-SECTION-EXTRACTION
- Goal: Continue EFF-001 with behavior-preserving extraction by introducing shared `ChapterSection` for duplicated chapter header + block list composition in original/translated panels.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF001-PHASE5-PANEL-RENDER-HELPER
- Goal: Continue EFF-001 with behavior-preserving consolidation by introducing a parameterized panel render helper that unifies original/translated panel branches.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF001-PHASE6-CHAPTER-HANDLER-BUNDLE
- Goal: Continue EFF-001 with behavior-preserving prop-surface reduction by bundling chapter-level callback props into typed `chapterSectionHandlers`.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF002-PHASE3-PANEL-CALLBACK-STABILIZATION
- Goal: Continue EFF-002 with behavior-preserving callback stabilization by replacing inline panel shell handlers with stable `useCallback` references in `renderDashboardPanel`.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF003-PHASE1-DERIVED-SELECTOR-NORMALIZATION
- Goal: Start EFF-003 with a behavior-preserving derived-state normalization by centralizing dashboard-level computed view values into a memoized selector block.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF003-PHASE2-BOOKMARK-DERIVED-CONSOLIDATION
- Goal: Continue EFF-003 with behavior-preserving selector normalization by consolidating bookmark-related derived state and navigator mapping into one memoized block.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF003-PHASE3-NAVIGATOR-DERIVED-CONSOLIDATION
- Goal: Continue EFF-003 with behavior-preserving selector normalization by consolidating chapter progress and note navigator derived calculations into one memoized block.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF004-PHASE1-NAVIGATOR-HANDLER-STABILIZATION
- Goal: Start EFF-004 with behavior-preserving handler stabilization by replacing per-item inline navigator click handlers with stable `useCallback` handlers and `data-*` payload lookup.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF005-PHASE3-CSS-SHARED-RULE-CONSOLIDATION
- Goal: Continue EFF-005 with behavior-preserving stylesheet deduplication by consolidating repeated scrollbar declarations and shared bookmark control base rules across desktop/mobile variants.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF004-PHASE2-MOBILE-EDITOR-HANDLER-STABILIZATION
- Goal: Continue EFF-004 with behavior-preserving handler stabilization by replacing inline closures in mobile tabs/tool panel and bookmark editor controls with shared callbacks.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF005-PHASE4-CONTROL-BASESTYLE-CONSOLIDATION
- Goal: Continue EFF-005 with behavior-preserving CSS deduplication by consolidating shared neutral control declarations and merging duplicated bookmark name input sizing rules.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF005-PHASE5-MEDIA-GUTTER-DEDUP
- Goal: Continue EFF-005 with behavior-preserving media-query cleanup by consolidating repeated mobile horizontal gutter declarations in the `max-width: 960px` block.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF006-PHASE1-OVERLAP-RULE-CLEANUP
- Goal: Start EFF-006 with behavior-preserving overlap cleanup by removing redundant base/mobile CSS declarations that do not affect computed layout or rendering.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF006-PHASE2-NONMEDIA-DEFAULT-CLEANUP
- Goal: Continue EFF-006 with behavior-preserving cleanup by removing redundant non-media default declarations from layout shell selectors.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF006-PHASE3-ACTIVE-ACCENT-BORDER-CONSOLIDATION
- Goal: Continue EFF-006 with behavior-preserving overlap cleanup by consolidating repeated active-state accent border color declarations across control variants.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF006-PHASE4-BOOKMARK-SIZING-AND-TIDY
- Goal: Continue EFF-006 with behavior-preserving cleanup by consolidating repeated bookmark control sizing declarations and removing residual empty CSS spacing blocks.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-EFFICIENCY-EFF006-PHASE5-PADDING-OVERRIDE-FINALIZE
- Goal: Finalize EFF-006 with behavior-preserving overlap cleanup by removing bookmark control padding override churn and explicitly separating desktop/mobile padding declarations.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `docs/EFFICIENCY_AUDIT_TRACKER.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-TOOLPANEL-HEADER-HIDE-AND-SPACING-INCREASE
- Goal: On desktop home/library view, remove Tool panel title/gear header and increase spacing between topbar and carousel, plus carousel and pagination.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-LIBRARY-SORT-LENGTH-AND-EDITED-RATIO
- Goal: Add Home/Library sort modes for book length and edited ratio.
- Files modified: `components/LibraryClient.tsx`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-LIBRARY-SORT-REVERSED-DIRECTION-TOGGLE
- Goal: Add a reversible direction control so all Home/Library sort modes can be inverted.
- Files modified: `components/LibraryClient.tsx`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-LIBRARY-SORT-EXPLICIT-DIRECTION-OPTIONS-AND-STAGE-LAYOUT-FIX
- Goal: Replace separate sort direction selector with explicit ascending/descending sort options, and fix Home carousel stage/bottom layout spacing so content reaches page bottom without distortion.
- Files modified: `components/LibraryClient.tsx`, `app/globals.css`, `docs/ONBOARDING_FUNCTIONS.md`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-BOOK-EDIT-SHORT-DESCRIPTION-TEXTAREA-DESKTOP-INCREASE-MOBILE-SAFE
- Goal: Increase desktop short-description textarea size in book edit panel while keeping mobile layout safe so it does not collide with icon preview.
- Files modified: `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-HOME-BOOKCARD-DESCRIPTION-BOX-DESKTOP-INCREASE-MOBILE-ICON-SAFE
- Goal: Increase desktop description popover size on Home book card, and keep mobile popover constrained so it does not overlap the card icon area.
- Files modified: `app/globals.css`, `components/BookDashboard/BookDashboard.module.css`, `TICKETS.md`
- Commit hash: `ddf90fbe3b28274cb352cbd034a1618756278dc4` (workspace base head; no new commit created in this session)

- Ticket: ADHOC-ADMIN-PUBLIC-BOOK-VISIBILITY-PAGE-AND-FIXED-ADMIN-ID
- Goal: Set user `956eb736-0fb5-49eb-9be8-7011517b9873` as admin, add `/admin` page to list all books and toggle public visibility, and enforce visibility behavior in library listing.
- Files modified: `lib/auth/identity.ts`, `lib/types.ts`, `app/page.tsx`, `app/admin/page.tsx`, `components/LibraryClient.tsx`, `supabase/migrations/supabase_migrations_0007_books_public_visibility_admin_policy.sql`, `SPEC.md`, `SECURITY.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-USER-FORK-SAJAT-OLVASAT-AUTO-CREATE-AND-REUSE
- Goal: Implement automatic personal fork flow so opening another user's public base book creates/reuses a user-owned editable copy linked by `source_book_id`.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `lib/db/queries/books.ts`, `lib/types.ts`, `supabase/migrations/supabase_migrations_0008_books_fork_source_link.sql`, `SPEC.md`, `SECURITY.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-BOOK-ADMIN-SEPARATE-SOURCE-EDITOR-MODE
- Goal: Add a dedicated admin edit mode on `/book/[id]` for editing source provenance fields separately from book metadata.
- Files modified: `components/BookDashboard/BookDashboard.tsx`, `SPEC.md`, `SECURITY.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-UNIFIED-TEXT-BUTTON-FONT-WITH-HOME-TOPBAR-ADMIN
- Goal: Make text button typography consistent across the system by aligning shared `.btn` font rendering to the home topbar `Admin` button style.
- Files modified: `app/globals.css`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-HU-UI-ORTHOGRAPHY-ACCENTS
- Goal: Add accent marks and correct Hungarian spelling across existing Hungarian UI copy, and document the orthography rule for future UI texts.
- Files modified: `components/TopBar.tsx`, `app/upload/page.tsx`, `components/LibraryClient.tsx`, `components/GuestSessionActions.tsx`, `app/login/page.tsx`, `app/landing/page.tsx`, `app/admin/page.tsx`, `components/BookCard.tsx`, `components/BookDashboard/BookDashboard.tsx`, `DECISIONS.md`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-HOME-CAROUSEL-DESKTOP-ARROW-ONLY-NO-HOVER-AUTO-ACTIVATE
- Goal: On desktop Home/Landing carousel, stop hover/focus auto-activation so book/page changes happen only via left/right arrow controls (and keyboard arrows).
- Files modified: `components/LibraryClient.tsx`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)

- Ticket: ADHOC-GUEST-FORK-UNIQUE-CONSTRAINT-REUSE
- Goal: When guest opens a public base book, reuse existing fork if the unique user+source constraint triggers during fork creation.
- Files modified: `lib/db/queries/books.ts`, `TICKETS.md`
- Commit hash: `WORKTREE-UNCOMMITTED` (changes made in workspace; commit not created in this session)
