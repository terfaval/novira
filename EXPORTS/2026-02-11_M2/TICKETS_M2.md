# TICKETS – M2 (DB + Scaffold)

## M2-01 Supabase project setup + migrations
Deliver:
- supabase/migrations/0001_init.sql
- supabase/policies/0001_rls.sql
Acceptance:
- Tables exist
- RLS active
- Anonymous auth enabled in Supabase settings

## M2-02 Next.js scaffold (App Router + TS)
Deliver:
- Minimal layout shell
- Routes: /, /import, /book/[id], /book/[id]/edit
Acceptance:
- lint + build pass

## M2-03 Anonymous session bootstrap
Deliver:
- Supabase client init
- On first load: sign in anonymously if no session
Acceptance:
- Same browser keeps access
- Different browser profile cannot read data

## M2-04 Data access layer
Deliver:
- CRUD helpers for core tables
Acceptance:
- No cross-user reads possible (RLS enforcement)

## M2-05 Minimal wireframe UI (non-final)
Deliver:
- Basic screens + empty/loading/error states
Acceptance:
- Navigation works end-to-end

## M2-06 LLM provider interface stub (server route)
Deliver:
- Server endpoint that validates env + accepts request payload
Acceptance:
- No secrets in client
- Returns clear error if missing keys
