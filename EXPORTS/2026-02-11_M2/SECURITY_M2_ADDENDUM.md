# SECURITY – M2 Addendum (DB + Anonymous Identity)

- No email/password UI.
- Supabase anonymous sign-in on first load.
- `auth.uid()` is the sole identity.
- Every row stores `owner_id` = `auth.uid()`.
- RLS policies enforce per-owner isolation for select/insert/update/delete.

LLM keys are server-side only.
