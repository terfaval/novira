# SECURITY — M3 Addendum

- Anonymous identity required before any DB reads/writes.
- DB access occurs via Supabase client with RLS.
- No LLM provider key is used in M3.
- API route exists only as stub (501).
