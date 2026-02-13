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

## Non-goals
- No LLM generation or provider logic in this ticket.
- No schema migrations in this ticket.
