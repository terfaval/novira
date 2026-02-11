# Novira – M2 Addendum (DB + Scaffold v0)

This addendum extends M1 planning with concrete DB schema/RLS and a minimal build scaffold plan.

## Decisions (locked for M2)
- Storage: Supabase Postgres.
- Identity: Supabase Auth **anonymous** (no email/password UI). Each browser session gets a stable `user_id` used for RLS.
- Access control: Row-Level Security on all user-owned tables (owner = `auth.uid()`).
- LLM: server-side calls only; provider abstraction to avoid lock-in (OpenAI initially supported, others later).

## Repository additions (proposed)
- `supabase/migrations/0001_init.sql` – schema + indexes + triggers
- `supabase/policies/0001_rls.sql` – RLS enablement + policies
- `.env.example` – required env vars
- Minimal Next.js scaffold (tickets) – App Router, TS

## Migration strategy
All schema changes go through new migration files (`supabase/migrations/000X_*.sql`).
Never edit old migrations once merged.
