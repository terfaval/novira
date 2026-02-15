# BookDashboard Components

This folder contains the Ticket 4A' Book Dashboard UI.

## Entities
- `BookDashboard.tsx`: main client UI for `/book/[id]`.
- `BookDashboard.module.css`: responsive layout and panel styling.
- `types.ts`: view-state type aliases used by route and component state.

## View model
- `completion`: accepted/total counters derived from `variants.status = accepted`.
- `viewState`: `"workbench"` (validation mode) or `"reader"` (read-only translated-first mode).
- `panelMode`: `"single"` or `"stacked"` mobile panel layout.
- `activePanel`: current single-panel selection (`original` or `translated`) on mobile.
- `workflowStatus`: per-block status stripe (`draft` / `accepted` / `rejected`).

## Ticket 4A' acceptance mapping
- Desktop split layout: `renderWorkbenchDesktop` in `BookDashboard.tsx`.
- Mobile single + toggle/stacked: `renderMobileContent` and control row in `BookDashboard.tsx`.
- Reader default at 100% accepted: `applyViewDefaults` in `BookDashboard.tsx`.
- Completion in header: `progressRow` in `BookDashboard.tsx`.
- Status + accept button per block: `BlockControls` in `BookDashboard.tsx`.
- 4A baseline had no LLM generation; 5A-2 adds block-level draft generation via `/api/llm`.

## Ticket 4B-Refinement workflow notes
- Accept guard: action is disabled in UI when no acceptable variant exists; backend verifies source variant exists before insert.
- Status stripe: every block card has a left stripe by workflow state, updated immediately after accept reload.
- Completion emphasis: `%` headline + width-based progress bar (`0%` empty, `100%` full).
- Reader state: disabled at `0%`, highlighted as primary at `100%`, default view switches to Reader at full completion.

## Ticket 5A-2 Book-level generation hook
- Workbench mode now shows `Generalas` on each block card (both original and translated panel cards).
- `Generalas` calls `POST /api/llm` with `action=translate_block` and the current `bookId` + `blockId`.
- Request uses Supabase session access token in `Authorization: Bearer ...`.
- On success, dashboard data reloads in-place (`keepCurrentView`) so latest draft text appears in translated panel.
- Accept guard remains unchanged from 4B: `Elfogad` requires a non-rejected variant with non-empty text.
- Error handling:
  - `429`: user-friendly HU rate-limit message
  - `400`: user-friendly HU invalid-request message
  - `500+`: user-friendly HU temporary-service message

## Inline note behavior (Ad-hoc)
- Edited block can display imported footnote-based note suggestions directly on the referenced word/phrase with a system-generated inline marker and tooltip.
- User can select any edited text span and trigger note generation.
- Generated note is saved as anchored record in `notes` and rendered as dotted underline + tooltip.
- Suggested note tooltip supports `approve` (save as inline note) and `dismiss`.
- Tooltip opens above the highlighted word, while remaining horizontally centered to the panel and near full panel width.
- Imported footnote numbering prefixes are stripped from suggestion text before display and save.

## Block merge behavior (Ad-hoc)
- Edited panel renders an inline hover action between neighboring blocks: `Blokkok osszevonasa`.
- Merge action concatenates neighboring blocks' `original_text`, deletes the second block, then re-numbers `block_index` within the chapter.
- `Elfogad` action button is rendered only when the block already has an acceptable generated variant (`hasAcceptableVariant`).
