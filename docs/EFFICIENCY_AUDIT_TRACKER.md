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
| EFF-001 | Split `BookDashboard.tsx` into focused subcomponents | 3646-line component with mixed responsibilities | backlog | P0 | First target for render-cost and maintenance reduction |
| EFF-002 | Memoization audit (`useMemo`, `useCallback`, memo boundaries) | High probability of avoidable rerenders in dashboard tree | backlog | P0 | Measure before/after with React Profiler |
| EFF-003 | Normalize heavy derived state into selectors/hooks | Repeated local derivations likely in large view logic | backlog | P1 | Prefer predictable, testable hook boundaries |
| EFF-004 | Event handler stability pass | Many interactive controls/hover actions | backlog | P1 | Reduce function churn for list rows/blocks |

### WS-2 CSS + Layout Efficiency

| ID | Item | Current signal | Status | Priority | Notes |
|---|---|---|---|---|---|
| EFF-005 | Modularize dashboard stylesheet by panel/feature | 1289-line module CSS file | backlog | P0 | Split by concern: shell/panels/cards/mobile/actions |
| EFF-006 | Remove duplicated/overlapping style rules | Frequent UI iteration indicates possible rule accumulation | backlog | P1 | Keep behavior identical while reducing cascade weight |
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

## Done Criteria For This Audit Program

- P0 items are either `done` or explicitly `deferred` with rationale.
- At least one measurable render-time or interaction-latency win is documented.
- No security baseline regression.
- No regression in loading/empty/error state behavior.
