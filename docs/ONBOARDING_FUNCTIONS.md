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
| SYS-01 | System | Anonymous identity | Required for all protected DB/API actions | no |
| SYS-02 | System | Rate limiting on LLM routes | Protects generation endpoints with limits/retry guidance | no |
| SYS-03 | System | Footnote extraction/anchoring | Detects/imports footnotes and anchors `[[fn:N]]` | no |

## First-Visit Onboarding Route (Editorial-Only)

### Route design principles
- Keep steps linear and short.
- Show only one new concept per step.
- Prefer contextual hints over long modal text.
- Focus strictly on editor actions.

### Onboarding path (first visitor)

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

## Recommended implementation hooks (for future ticket)

- Persist onboarding progress per user/session.
- Support step gating by route (`/book/[id]`).
- Add "replay onboarding" from an editor-visible control.
- Keep content versioned (`onboarding_version`) to re-show changed flows when needed.