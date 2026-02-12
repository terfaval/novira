# AGENTS.md — Novira (Source of Truth)

Rules for the development agent (Codex). Purpose: prevent scope drift and documentation contradictions.

## Prime Directive
Do not implement features while documentation is inconsistent.
If conflicts exist, resolve them via the documentation alignment ticket before writing code.

## Source of Truth (read order)
1) SPEC.md
2) TICKETS.md
3) DECISIONS.md
4) SECURITY.md
5) docs/ and strategy/ (memos; must not override higher-priority docs)

If a lower-priority document conflicts with a higher-priority document,
the higher-priority document wins and the conflict must be resolved.

## Folder Map
- docs/ : operational memos (e.g., MEK import positioning)
- strategy/ : canonical models (e.g., canonical text model)
- legal/ : legal baseline and demo corpus (do not modify unless ticketed)
- EXPORTS/ : immutable milestone snapshots

## Scope Control
- Work only within the active ticket.
- No refactors outside ticket scope.
- No “nice-to-have” changes unless explicitly ticketed.
- Do not modify legal/* unless explicitly instructed.

## Ticket Handling (Important)

If a task references a ticket ID that does not exist in TICKETS.md:

- Do not block execution.
- Treat the provided task description as the temporary ticket definition.
- Proceed with implementation within the described scope.
- After completion, append a short entry to TICKETS.md under:

  "Implemented (Ad-hoc)"

  including:
  - Ticket name / ID used in prompt
  - One-line goal
  - Files modified
  - Commit hash

Lack of a predefined ticket must not prevent implementation.


## Commit Discipline
- Keep docs-only commits separate from feature commits.
- Do not use `git add .` during scoped tickets.
- Prefer explicit staging:
  - git add SPEC.md TICKETS.md DECISIONS.md AGENTS.md
