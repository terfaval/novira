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

## Ticket 4A' acceptance mapping
- Desktop split layout: `renderWorkbenchDesktop` in `BookDashboard.tsx`.
- Mobile single + toggle/stacked: `renderMobileContent` and control row in `BookDashboard.tsx`.
- Reader default at 100% accepted: `applyViewDefaults` in `BookDashboard.tsx`.
- Completion in header: `progressRow` in `BookDashboard.tsx`.
- Status + accept button per block: `BlockControls` in `BookDashboard.tsx`.
- No LLM logic: accept path only promotes existing translated text (`lib/db/queries/books.ts`).
