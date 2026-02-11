# M2 Apply Instructions

## Copy into repo
- `supabase/migrations/0001_init.sql`  (use `supabase_migrations_0001_init.sql` from this package)
- `supabase/policies/0001_rls.sql`     (use `supabase_policies_0001_rls.sql` from this package)
- `.env.example`

## Supabase dashboard
- Enable Auth → Anonymous sign-ins

## Sanity check
- Insert a book row with owner_id = current auth.uid()
- Confirm another browser/profile cannot read it
