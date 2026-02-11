# TICKETS — M3 (Scaffold + Library)

## M3-001 — Next.js scaffold + basic routing
Acceptance:
- `npm run dev` works
- `/` shows Library view
- `/upload` reachable
- `/book/[id]` reachable
- lint + build pass

## M3-002 — Supabase anon bootstrap
Acceptance:
- On first visit, anonymous identity is created (no UI login)
- Subsequent visits reuse session
- RLS-based isolation works (books belong to user)

## M3-003 — Library list UI
Acceptance:
- Cards show: title + author
- Accordion reveals: description + status + progress
- Empty state guides toward upload

## M3-004 — Create Book row (Upload stub)
Acceptance:
- `/upload` can insert a new `books` row with status=uj, progress=0
- After insert, user can open `/book/{id}`

## M3-005 — LLM route stub
Acceptance:
- POST `/api/llm` returns 501 with message
- No secrets in client bundle
