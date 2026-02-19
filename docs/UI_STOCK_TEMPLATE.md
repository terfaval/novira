# UI/Design Stock Template

This repo keeps a single source of design truth inside `app/globals.css` plus the small shared components in `app/` and `components/`. Reusing Novira’s UI stocks in other agents means copying the same CSS tokens + layout shells, then wiring the same component patterns (TopBar/ShellTopBar, LibraryClient + BookCard, Hero sections, etc.). This document lists the tokens, shells, primitives, and behaviors worth reusing before you start project-specific wiring.

## Theme tokens

All tokens live in `:root` (with dark-mode overrides and two background images) so other repos can mirror the palette with the same names:

| Token | Example value | Purpose |
| --- | --- | --- |
| `--bg`, `--text`, `--muted`, `--panel`, `--panel-2`, `--input-bg` | `#fbf2df`, `#2f3655`, `rgba(47, 54, 85, 0.72)`, `rgba(47, 54, 85, 0.06)` | Background/text/panel shades |
| `--line`, `--focus-ring`, `--shadow` | light neutral lines, focus glow, drop shadow helpers |
| `--book-card-*`, `--book-cover-*`, `--active-*` | Book card background, border, per-book spine focus & cover backgrounds |
| `--page-bg-image`, `--page-scrim` | Responsive background art for mobile/desktop, also flipped in dark mode |
| `--brand-ink`, `--brand-paper`, `--brand-accent` | Core brand ink, paper, and soft accent color used in badges, dots, and favorite marks |

The theme adjusts via `prefers-color-scheme: dark` and clamps on `min-width` media queries for desktop background art.

## Typography

- Display font: `Spectral` (weights 500/600/700) mapped to `--font-display`.
- Body font: `Source Serif 4` (weights 400/600) mapped to `--font-body`.
- HTML/body stack falls back to `Source Serif Pro`, `"Times New Roman"`, `Georgia`.
- Display headings (`.h1`, `.landing-hero-title`, `.landing-final-statement`, etc.) switch to `var(--font-display)` while surrounding copy uses the serif body stack.

## Layout shells

- `main` is capped to `--shell-main-max` (1120px) with side padding `--shell-side-pad`, so other repos should wrap content in the same shell before layering.
- **Home layout**:
  - `body:has(.home-page-shell)` + `main:has(.home-page-shell)` remove overflow and padding while the layered structure uses `.home-layer-top` (top fixed bar), `.home-layer-main` (carousel stage), and `.home-layer-plus` (floating `+` button). `.home-guest-actions`, `.home-auth-actions`, `.home-plus-button` are the reusable Surf/CTA micro-components.
  - `LibraryClient` lives inside `.library-layout` within `.library-carousel-shell`.
- **Landing layout**:
  - `landing-page-shell` is the outer stack with `landing-layer-top`, `landing-container`, and `landing-main` (grid with large gaps).
  - Reuse `.landing-hero`, `.landing-pillar-card`, `.landing-audience-card`, `.landing-works`, `.landing-how`, and `.landing-final-cta` when you need a marketing re-cap.
  - The login overlay uses `.landing-login-overlay` + `.landing-login-card` with form fields styled via `.landing-login-field/.input` and `.landing-login-actions`.
- **Auth wireframe**:
  - Reuse `.auth-wireframe-shell`, `.auth-wireframe-card`, `.auth-wireframe-field`, `.auth-wireframe-actions`, `.auth-wireframe-error` for centered sign-up/login forms plus helper text.

## UI primitives

- `.btn`: pill buttons with `border-radius: 14px`, panel background, subtle border, `cursor: pointer`. Use for primary CTAs and action controls.
- `.input`: rounded inputs/selects with matching background, border, and padding; forms on landing, library toolbar, and login overlay reuse this class.
- `.card`: panel with `border-radius: 16px`, soft border, drop shadow, and background tone, used for empty states, login cards, and `BookCard`.
- `.stack`, `.row`, `.home-topbar-logo`, `.home-topbar-copy` for flex stacks and top-bar alignment.
- `.badge`, `.status-pin`, `.status-pin-dot`, `.progress`, `.book-year` etc. for meta display.

## Library surface

- `LibraryClient` orchestrates the carousel, filters, pagination, and mobile tool overlay; key design pieces:
  - `.library-layout` grid with `.library-prototype-tools` toolbar (desktop) and a matching filter grid `.library-tools-grid` for mobile/docked panels.
  - `.library-carousel-shell`, `.library-carousel-stage`, `.library-carousel-track`, `.library-carousel-item` with `.is-active`/`.is-inactive` states to control book-card vs. spine displays.
  - Desktop navigation uses arrow buttons (`.carousel-arrow`) + dots (`.carousel-dot`), while mobile hides arrows and stacks items vertically (`@media (max-width: 720px)` rules, `.library-carousel-item.is-active` fills 60% height, inactive ones shrink to spines).
  - `.carousel-pagination` rotates to a vertical indicator in mobile and stays horizontal on desktop.
  - Mobile tools use popup fab (`.mobile-tools-fab`), backdrop, and `.mobile-tools-sheet` to house the same filter grid.
  - The carousel honors `prefers-reduced-motion` and uses hover-tuned transitions (`.library-carousel-item::before` and `smooth transition` block at end of `globals.css`).

## Book card/spine pattern

- `BookCard` renders two states:
  - Active card: `.book-card`, `.book-cover`, `.book-title`, `.book-author`, `.details`, `.progress`, `.status-pin`. Covers load SVGs via `BookCoverIcon` (fallback to `covers/SVG/icon_default.svg`).
  - Inactive spine: `.book-spine`, `.book-spine-author-line`, `.book-spine-title-line`, `.book-spine-icon`.
- Favorite metadata: `BookCard` and the spine show optional star marks via the shared `Icon` component mapped to lucide `Star`.
- Progress: Numeric percent plus `.progress` bar shown when status not `"ready"`.
- Details: `<details>`/`<summary>` pair with `.book-accordion-trigger`; `BookCard` stops propagation so accordion clicks don’t navigate away.
- Status pin uses `statusMeta` colors to reinforce `status-pin` accent.

## Components to reuse

1. **`ShellTopBar` / `TopBar`** – integrates home/landing branding, toggles subtitle, and accepts `middleSlot`/`rightSlot` for CTA/buttons.
2. **`LibraryClient`** – ready-to-use carousel plus filtering UI (hooks into Supabase here; in other repos you can replace data fetching with mocks while keeping the same markup and CSS classes).
3. **`BookCard` / `BookCoverIcon`** – card/spine visuals with built-in favorites, description accordion, progress, and SVG cover loading.
4. **`GuestSessionActions`** – pair of buttons for login/guest cleanup; reuses the `.btn` style with optional class overrides.
5. **`LibraryEmpty`** – friendly empty-state prompt with CTA.

## Icons & assets

- All UI icons go through `src/ui/icons/Icon.tsx`, which maps named tokens (`"add"`, `"favorite"`, `"admin"`, `"student"`, etc.) to `lucide-react` icons. For reuse, import `Icon` and pick a name from `IconName`.
- Backgrounds live under `/background/desktop_default.png` and `/background/mobile_default.png`.
- Book covers rely on `/covers/SVG/<slug>.svg` plus PNG fallbacks defined in CSS tokens.

## Interaction patterns

- Library carousel responds to keyboard (left/right arrows) unless focus is inside inputs; `LibraryClient` also debounces hover via timers so cards don’t flip instantly.
- `BookCard` uses pointer events plus `onKeyDown` for Enter/Space to mimic button behavior.
- Landing login uses overlay (`.landing-login-overlay`) with click-away dismiss unless a busy action is running.
- Mobile fallback: `.mobile-tools-fab` toggles `.mobile-tools-sheet`; `.landing-cta-row` and `.landing-login-actions` collapse to grid on small screens.
- Respect `prefers-reduced-motion` inside `globals.css` near the bottom and avoid hover animations when that mode is active.

## Responsive notes

- The hero, carousel, and pill sections rearrange with media queries:
  - Pillar grids go to single-column under 720px, while landing rows wrap at 1080px for two columns.
  - Carousel disables transitions below 720px and stacks spines vertically; `.carousel-arrow` is hidden while pagination rotates.
  - `home-layer-main` uses `100dvh` and `padding-block: 84px 24px` to keep hero/tracks centered.

Reuse this document as a starter for copying Novira’s shells; platform-specific data (Supabase tables, API tokens) stays separate, so new agents can swap only the data layer while keeping the UI stock intact.
