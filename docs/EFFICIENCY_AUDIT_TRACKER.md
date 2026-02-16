# Efficiency Audit Tracker (Manual Governance)

Date: 2026-02-15
Status: Active
Owner: Product + Engineering

## Goal

Create one central, manually maintained audit board for performance and efficiency refactor opportunities.
This is a one-time/batch audit process with periodic manual updates, not continuous automated enforcement.

## Audit Mode (Manual, Not Continuous)

- No continuous guard/check runner is required.
- Review cadence: run a focused audit pass when major UI/backend changes land, or at least once per sprint.
- Each item is moved through explicit statuses in this file.

## Status Legend

- `backlog`: identified, not yet scoped
- `ready`: scoped and implementation-ready
- `in_progress`: active implementation
- `blocked`: waiting on decision/dependency
- `done`: implemented and verified
- `deferred`: accepted, intentionally postponed

## Baseline Snapshot (2026-02-15)

- `components/BookDashboard/BookDashboard.tsx`: 3646 lines
- `components/BookDashboard/BookDashboard.module.css`: 1289 lines
- `app/globals.css`: 991 lines
- Highest immediate efficiency risk is concentrated in Book Dashboard render/state/CSS complexity.

## Workstreams

### WS-1 Rendering + React State Efficiency

| ID | Item | Current signal | Status | Priority | Notes |
|---|---|---|---|---|---|
| EFF-001 | Split `BookDashboard.tsx` into focused subcomponents | 3646-line component with mixed responsibilities | in_progress | P0 | Phase-6 done: reduced chapter-level callback prop fan-out via typed `chapterSectionHandlers` bundle and stable cancel callback. |
| EFF-002 | Memoization audit (`useMemo`, `useCallback`, memo boundaries) | High probability of avoidable rerenders in dashboard tree | in_progress | P0 | Phase-3 done: stabilized panel shell callbacks (`onSwap`, `onBodyScroll`, `onBodyClick`) and removed inline handler churn in `renderDashboardPanel`. |
| EFF-003 | Normalize heavy derived state into selectors/hooks | Repeated local derivations likely in large view logic | in_progress | P1 | Phase-3 done: consolidated chapter/note navigator derivations into memoized `navigatorDerived` selector. |
| EFF-004 | Event handler stability pass | Many interactive controls/hover actions | in_progress | P1 | Phase-2 done: stabilized mobile tool panel, mobile tab, and bookmark editor interactions by replacing inline closures with shared callback handlers. |

### WS-2 CSS + Layout Efficiency

| ID | Item | Current signal | Status | Priority | Notes |
|---|---|---|---|---|---|
| EFF-005 | Modularize dashboard stylesheet by panel/feature | 1289-line module CSS file | in_progress | P0 | Phase-5 done: reduced mobile media-query duplication by consolidating shared horizontal gutter rules for `.header` and `.main`. |
| EFF-006 | Remove duplicated/overlapping style rules | Frequent UI iteration indicates possible rule accumulation | done | P1 | Phase-5 done: finalized overlap cleanup by removing desktop/mobile bookmark control padding override churn; no further safe dedup items identified in this pass. |
| EFF-007 | Optimize expensive visual effects | Potential costly shadows/filters during scroll/hover | backlog | P2 | Validate with Performance panel |

### WS-3 Data + API Efficiency

| ID | Item | Current signal | Status | Priority | Notes |
|---|---|---|---|---|---|
| EFF-008 | Audit `/api/llm` payload size and request frequency | Generation endpoints can amplify latency/cost | backlog | P1 | Add practical payload guard metrics |
| EFF-009 | Audit dashboard query payload overfetch | `lib/db/queries/books.ts` is among larger core files | backlog | P1 | Verify only required fields are selected |
| EFF-010 | Batch/parallelization review for dashboard data fetch | Potential serial dependencies in load path | backlog | P2 | Focus on first meaningful paint |

### WS-4 Asset + Bundle Efficiency

| ID | Item | Current signal | Status | Priority | Notes |
|---|---|---|---|---|---|
| EFF-011 | Image/SVG delivery audit for covers/backgrounds | Many static assets under `public/covers` and `public/background` | backlog | P2 | Confirm compression and sizing strategy |
| EFF-012 | Client bundle dependency audit on book route | Complex dashboard + UI controls | backlog | P1 | Check avoidable client imports |

### WS-5 Reliability-Efficiency Cross Checks

| ID | Item | Current signal | Status | Priority | Notes |
|---|---|---|---|---|---|
| EFF-013 | Ensure loading/empty/error states stay intact after refactors | Required baseline UX behavior | backlog | P0 | Efficiency work cannot regress UX recovery paths |
| EFF-014 | Ensure security guardrails remain unchanged | Server-side keys/RLS/rate-limit constraints | backlog | P0 | No efficiency change may bypass existing controls |

## Execution Template (Copy For Each Started Item)

```md
### EFF-XXX - <Title>
- Date opened:
- Owner:
- Scope:
- Files in scope:
- Non-goals:
- Risks:
- Validation:
  - lint:
  - build:
  - manual checks:
- Outcome:
```

## Progress Log

- 2026-02-15: Tracker initialized with first-pass backlog from repository baseline.
- 2026-02-15: EFF-001/EFF-002 phase-1 started in `BookDashboard.tsx` (memoized `BlockCard`, removed per-render fallback `new Set()` allocation for dismissed suggestions).
- 2026-02-15: EFF-001 phase-2 completed in `BookDashboard.tsx` (extracted shared `ChapterBlockList` to centralize duplicated chapter block rendering).
- 2026-02-15: EFF-002 phase-2 completed in `BookDashboard.tsx` (memoized leaf UI components in chapter/block render paths to reduce unnecessary rerenders).
- 2026-02-15: EFF-001 phase-3 completed in `BookDashboard.tsx` (extracted `DashboardPanelShell` to centralize panel title/swap/body/error wrapper duplication).
- 2026-02-15: EFF-001 phase-4 completed in `BookDashboard.tsx` (extracted `ChapterSection` to centralize repeated chapter-level composition used by both panels).
- 2026-02-15: EFF-001 phase-5 completed in `BookDashboard.tsx` (introduced `renderDashboardPanel` helper to unify panel-level render branches and reduce duplication).
- 2026-02-15: EFF-001 phase-6 completed in `BookDashboard.tsx` (reduced callback prop fan-out in chapter rendering by bundling handlers in `chapterSectionHandlers`).
- 2026-02-15: EFF-002 phase-3 completed in `BookDashboard.tsx` (stabilized panel shell callbacks in `renderDashboardPanel` by replacing inline handlers with `useCallback` references).
- 2026-02-15: EFF-003 phase-1 completed in `BookDashboard.tsx` (normalized dashboard-level derived state into memoized `dashboardDerived` selector and removed per-render completion fallback object allocation).
- 2026-02-15: EFF-003 phase-2 completed in `BookDashboard.tsx` (consolidated bookmark-related derived calculations into memoized `bookmarkDerived` selector).
- 2026-02-15: EFF-003 phase-3 completed in `BookDashboard.tsx` (consolidated chapter progress and note navigator derived calculations into memoized `navigatorDerived` selector).
- 2026-02-15: EFF-004 phase-1 completed in `BookDashboard.tsx` (stabilized chapter/note/bookmark navigator event handlers by removing per-item inline closures in mapped rows).
- 2026-02-15: EFF-004 phase-2 completed in `BookDashboard.tsx` (stabilized mobile page tabs, mobile tool panel actions, and bookmark editor actions via shared `useCallback` handlers and `data-*` dispatch where applicable).
- 2026-02-15: EFF-005 phase-1 started in `BookDashboard.module.css` (merged identical bookmark style blocks and removed empty `.progressTrackComplete {}` rule).
- 2026-02-15: EFF-005 phase-2 completed in `BookDashboard.module.css` (merged repeated `mobilePageTabs`, list-grid, active-highlight, fill, and mobile layout grid rule blocks).
- 2026-02-15: EFF-005 phase-3 completed in `BookDashboard.module.css` (consolidated shared scrollbar rules and unified desktop/mobile bookmark control base styles to reduce duplicated declarations).
- 2026-02-15: EFF-005 phase-4 completed in `BookDashboard.module.css` (consolidated repeated neutral control declarations and merged bookmark name input sizing rules for desktop/mobile variants).
- 2026-02-15: EFF-005 phase-5 completed in `BookDashboard.module.css` (consolidated shared mobile horizontal gutter declarations for `.header` and `.main` inside the `max-width: 960px` media query).
- 2026-02-15: EFF-006 phase-1 completed in `BookDashboard.module.css` (removed overlapping/redundant declarations from `.header` base styles and `max-width: 960px` mobile overrides while preserving behavior).
- 2026-02-15: EFF-006 phase-2 completed in `BookDashboard.module.css` (removed redundant non-media defaults from `.header`, `.main`, and `.desktopStage` declarations without changing behavior).
- 2026-02-15: EFF-006 phase-3 completed in `BookDashboard.module.css` (grouped repeated active-state accent border color declarations across `activeToggle`, bookmark, mobile tool, and mobile tab variants).
- 2026-02-15: EFF-006 phase-4 completed in `BookDashboard.module.css` (grouped shared bookmark control sizing declarations and removed residual empty spacing blocks without behavior changes).
- 2026-02-15: EFF-006 phase-5 completed in `BookDashboard.module.css` (removed bookmark control padding override churn by splitting desktop/mobile padding declarations into their dedicated selector blocks); EFF-006 moved to `done`.

## Done Criteria For This Audit Program

- P0 items are either `done` or explicitly `deferred` with rationale.
- At least one measurable render-time or interaction-latency win is documented.
- No security baseline regression.
- No regression in loading/empty/error state behavior.
