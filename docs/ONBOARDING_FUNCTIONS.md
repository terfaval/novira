# Onboarding Function Inventory And Route (v2)

Date: 2026-02-15
Status: Active onboarding governance document

## Goal

This document lists current system functions and marks whether each one is included in onboarding.
Onboarding scope is editorial-only: no file-upload onboarding and no admin/tool-panel onboarding.

## Scope Rule (Editorial-Only)

Included in onboarding:
- Editor-facing functions used during text review, generation, validation, and chapter/block editing.

Excluded from onboarding by default:
- File upload flow.
- Admin/tool-panel controls.
- System/internal infrastructure functions.

## Function Inventory

Legend:
- `onboarding: yes` = included in editorial onboarding
- `onboarding: partial` = included, but not with full interaction depth
- `onboarding: no` = currently excluded from onboarding

| ID | Area | Function | Current behavior | Onboarding |
|---|---|---|---|---|
| LIB-01 | Home/Library | Library list load | Loads books after anonymous identity boot and shows loading/error/empty states | no |
| LIB-02 | Home/Library | Search filter | Filters by title/author/description | no |
| LIB-03 | Home/Library | Status filter | Filters books by status | no |
| LIB-04 | Home/Library | Sort options | Sort by updated/title/author/year | no |
| LIB-05 | Home/Library | Carousel navigation | Arrow buttons, keyboard arrows, pagination dots | no |
| LIB-06 | Home/Library | Mobile tool sheet | FAB + mobile tool panel for filters/sort | no |
| UPL-01 | Upload | Local file upload | Accepts HTML/RTF/DOCX with title/author/description metadata | no |
| UPL-02 | Upload | Validation and errors | Validates required title/file/type/size/auth and shows recovery messages | no |
| UPL-03 | Upload | Processing pipeline | Stores source, parses chapters/blocks, sets status, opens created book | no |
| BK-01 | Book dashboard | Workbench mode | Default editorial mode under incomplete progress | yes |
| BK-02 | Book dashboard | Reader mode | Available when translated state is sufficient; default at 100% completion | yes |
| BK-03 | Book dashboard | View/layout controls | Single/split desktop, single/stacked mobile, active panel switch | partial |
| BK-04 | Book dashboard | Scroll sync | Optional synchronized panel scroll in workbench | partial |
| BK-05 | Book dashboard | Block generation | `Generalas` creates draft variant via `/api/llm` | yes |
| BK-06 | Book dashboard | Block accept | `Elfogad` promotes acceptable variant to accepted state | yes |
| BK-07 | Book dashboard | Edited variant delete | Deletes current edited variant from block | partial |
| BK-08 | Book dashboard | Inline note generation | Selection-based `Jegyzet kerese` via `/api/llm` | yes |
| BK-09 | Book dashboard | Suggested note approve/dismiss | Approve saves anchored note, dismiss hides suggestion | partial |
| BK-10 | Book dashboard | Chapter title edit | Inline chapter title edit in sticky chapter header | partial |
| BK-11 | Book dashboard | Chapter delete + reindex | Deletes chapter and reorders chapter indexes | no |
| BK-12 | Book dashboard | Block merge | Merges neighboring blocks in same chapter | no |
| BK-13 | Book dashboard | Book summary generation | Generates short description for book | no |
| BK-14 | Book dashboard | Multi-bookmark (progress + important) + name + 10 color categories | User can set one progress marker and multiple important markers before edited blocks, each with label/color category; markers are listed and jumpable from activity panel/tool sheet | partial |
| BK-15 | Book dashboard | Progress alatti navigacios panel (Tartalom/Jegyzetek/Konyvjelzok) | Desktopen 3 gorgetheto blokk mutat chapter-progress + note + bookmark listat, mobilon kulon oldalfulek valthatok (Eredeti/Szerkesztett/Tartalom/Jegyzetek/Konyvjelzok) | no |
| BK-16 | Book dashboard | Blokk kezi szovegtisztitas | Szerkesztett blokkban `Kezi javitas` gomb nyit textarea szerkesztest, menteskor uj draft varians jon letre | no |
| SYS-01 | System | Anonymous identity | Required for all protected DB/API actions | no |
| SYS-02 | System | Rate limiting on LLM routes | Protects generation endpoints with limits/retry guidance | no |
| SYS-03 | System | Footnote extraction/anchoring | Detects/imports footnotes and anchors `[[fn:N]]` | no |

Onboarding follow-up (confirmation-gated):
- `ONB-BK-15` (pending): Decide whether BK-15 needs contextual popup integration in editorial onboarding.
- `ONB-BK-16` (pending): Decide whether BK-16 needs contextual popup integration in editorial onboarding.

## On-Demand Onboarding Route (Editorial-Only)

### Route design principles
- Keep steps linear and short.
- Show only one new concept per step.
- Prefer contextual hints over long modal text.
- Focus strictly on editor actions.
- Do not auto-open onboarding on route entry.

### Onboarding path (manual open from onboarding icon)

1. `Book dashboard entry`
- Show: Workbench vs Reader and completion progress meaning.
- UI: popup info anchored to mode controls and progress section.
- Completion condition: user switches mode once (if Reader enabled) or acknowledges lock reason.

2. `Block workflow`
- Show: generate -> review -> accept sequence.
- UI: popup info near block action row (`Generalas`, `Elfogad`).
- Completion condition: user runs at least one generation.

3. `Inline note workflow`
- Show: text selection -> `Jegyzet kerese` -> approve/dismiss suggestion.
- UI: popup info anchored to note action and suggestion tooltip.
- Completion condition: user performs one note action.

4. `Chapter-level editing basics`
- Show: chapter title inline edit behavior.
- UI: popup info on sticky chapter header controls.
- Completion condition: user edits and saves one chapter title, or skips.

5. `Done state`
- Show: onboarding completed and where to reopen editorial help.
- UI: final popup info with "Open help again" action.
- Completion condition: user closes final step.

## Mandatory Maintenance Rule (Onboarding Coverage)

Every new editor feature must be evaluated for onboarding integration.

Required implementation policy:
1. Feature inventory update
- Add the new editor function to this document with onboarding status.

2. Onboarding decision update
- Mark it as `yes`, `partial`, or `no`.
- If `no`, create a concrete follow-up onboarding task before release.

3. Unified popup info requirement
- If user behavior can be ambiguous or error-prone, add contextual popup info in the unified onboarding system.
- Popup must be attached to the exact editor control where the function is used.

4. Non-editor exclusion rule
- Upload/admin/system functions remain out of onboarding unless explicitly requested by product decision.

5. Done criteria for new editor feature rollout
- Feature is not fully done until onboarding integration is handled (or explicitly deferred with documented reason).

6. Confirmation-gated onboarding implementation
- For each new editor feature, the agent must explicitly evaluate onboarding inclusion.
- If inclusion is recommended, implementation is done only after explicit user confirmation.

## Recommended implementation hooks (for future ticket)

- Persist onboarding progress per user/session.
- Support step gating by route (`/book/[id]`).
- Add "replay onboarding" from an editor-visible control.
- Keep content versioned (`onboarding_version`) to re-show changed flows when needed.
## Implementation Blueprint (UI Anchors + Step Config)

Target route:
- `/book/[id]`

Implementation rule:
- Every onboarding step must target a stable UI anchor via `data-onboarding-id`.
- Avoid CSS-class-based selectors for onboarding targeting.

### Required `data-onboarding-id` anchors

| Anchor ID | UI target | Purpose |
|---|---|---|
| `onb-mode-controls` | Workbench/Reader switch controls | Mode orientation step |
| `onb-progress` | Completion progress area | Explain readiness and lock/unlock logic |
| `onb-block-actions` | Block action group container | Explain editor workflow |
| `onb-generate` | `Generalas` action | Generation step |
| `onb-accept` | `Elfogad` action | Validation/accept step |
| `onb-note-trigger` | `Jegyzet kerese` action | Note generation step |
| `onb-note-suggestion` | Suggestion tooltip (approve/dismiss) | Suggestion decision step |
| `onb-chapter-header` | Sticky chapter header actions | Chapter editing basics |
| `onb-replay` | Editor-visible help replay control | Re-open onboarding |

### Onboarding step definitions (editorial-only)

1. `step_dashboard_modes`
- Route: `/book/[id]`
- Anchor: `onb-mode-controls`
- Message: explain Workbench vs Reader.
- Complete when: user toggles mode once, or user clicks `Kovetkezo`.

2. `step_progress_meaning`
- Route: `/book/[id]`
- Anchor: `onb-progress`
- Message: explain completion percentage and Reader availability.
- Complete when: user clicks next.

3. `step_block_workflow`
- Route: `/book/[id]`
- Anchor: `onb-block-actions`
- Message: explain `Generalas -> review -> Elfogad` sequence.
- Complete when: user clicks next.

4. `step_generate`
- Route: `/book/[id]`
- Anchor: `onb-generate`
- Message: explain draft generation behavior.
- Complete when: first successful generate action happens.

5. `step_accept`
- Route: `/book/[id]`
- Anchor: `onb-accept`
- Message: explain acceptance criteria and effect.
- Complete when: one block is accepted.

6. `step_note_request`
- Route: `/book/[id]`
- Anchor: `onb-note-trigger`
- Message: explain selected-text note creation.
- Complete when: note request is sent once.

7. `step_note_decision`
- Route: `/book/[id]`
- Anchor: `onb-note-suggestion`
- Message: explain approve/dismiss decision.
- Complete when: one suggestion is approved or dismissed.

8. `step_chapter_edit`
- Route: `/book/[id]`
- Anchor: `onb-chapter-header`
- Message: explain chapter title inline edit.
- Complete when: one chapter title is saved, or user clicks `Kovetkezo`.

9. `step_done`
- Route: `/book/[id]`
- Anchor: `onb-replay`
- Message: onboarding completed; replay available anytime.
- Complete when: user closes final step.

### Suggested config shape

```ts
export type OnboardingStep = {
  id: string;
  route: "/book/[id]";
  anchorId: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  completeOn?:
    | "next"
    | "mode_toggled"
    | "generate_success"
    | "accept_success"
    | "note_requested"
    | "note_decided"
    | "chapter_saved";
  skippable: boolean;
};
```

### Suggested completion events

- `mode_toggled`
- `generate_success`
- `accept_success`
- `note_requested`
- `note_decided`
- `chapter_saved`
- `onboarding_replayed`

### Runtime behavior rules

- If an anchor is not present in the current render state, pause that step and retry after UI update.
- If a step depends on unavailable action state (for example `Elfogad` disabled), show explanatory text and allow skip.
- Only one onboarding popup may be visible at a time.
- On mobile and desktop, use the same step IDs and event model.
- Onboarding does not auto-start on page load; user opens it from the onboarding control.
- `Kovetkezo` is always active and always advances to the next step.
- `Kihagyas` stops the full onboarding flow for the current version.
- Replay always starts from `step_dashboard_modes`.
- Clicking onboarding control opens a help column with all step titles; user can pick any step and preview it.

### Minimal telemetry (optional but recommended)

- `onboarding_started`
- `onboarding_step_shown` (with `step_id`)
- `onboarding_step_completed` (with `step_id` and `reason`)
- `onboarding_completed`
- `onboarding_skipped`
