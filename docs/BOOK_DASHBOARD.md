# Book Dashboard (Ticket 4A')

## Scope
This ticket adds the Book Dashboard base behavior for `/book/[id]`:
- Workbench mode (validation workflow)
- Reader mode (translated-first when fully accepted)
- Completion progress in header
- Mobile and desktop layouts with loading/error handling

## Data contract
- Source tables: `books`, `blocks`, `chapters`, `variants`
- Completion formula: `acceptedBlocks / totalBlocks`
- Accepted block rule: block has at least one `variants.status = 'accepted'`

## UX decisions
- Reader is the default only when completion is 100%.
- Workbench is always reachable, even after full completion.
- Mobile supports `single` and `stacked` panel modes.
- Desktop workbench supports optional synchronized scrolling.
- Reader button is disabled at `0%` completion and visually promoted as primary at `100%`.

## Workflow refinements (Ticket 4B-Refinement)
- Accept guard is two-layer:
  - UI: `Elfogad` disabled with tooltip when no acceptable translated variant exists.
  - Backend: accept mutation aborts unless a non-rejected source variant exists for the block.
- Each block card has a narrow left status stripe:
  - `draft`: neutral
  - `accepted`: subtle green
  - `rejected`: subtle red marker
- Completion row emphasizes `%` and keeps `accepted/total` as secondary metadata.

## Workbench generation flow (Ticket 5A-2)
- Every Workbench block card has a `Generalas` action.
- Client call: `POST /api/llm` with `translate_block`, `bookId`, `blockId`, and bearer token from anon session.
- During request: block-level in-flight button state (`Generalas...`).
- Success path: dashboard reload in current view, translated panel shows the latest draft (so `hasAcceptableVariant` can become true).
- `Elfogad` enablement remains the existing 4B guard (no auto-accept).
- Error messaging (HU):
  - `429`: clear rate-limit guidance
  - `400`: clear request/block validation guidance
  - `500+`: temporary service failure guidance

## Inline notes in edited panel (Ad-hoc)
- If the importer recognized original footnotes, edited blocks highlight detected markers in-text (`[N]`) with hover tooltip text.
- In edited text, users can manually select a span and request note generation (`Jegyzet kerese`).
- Generated note is stored in `notes` with block-level anchors (`anchor_start`, `anchor_end`).
- Saved anchored spans are rendered with dotted underline and hover tooltip.
- Suggested note tooltip includes quick decisions: `✓` (approve/save) or `X` (dismiss).
- LLM call uses `POST /api/llm` with `action=generate_note` and current block context.

## Non-goals
- No batch generation, background jobs, or auto-accept in dashboard flow.
- No schema migrations in this ticket.
