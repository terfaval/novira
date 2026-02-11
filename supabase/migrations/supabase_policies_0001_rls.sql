-- 0001_rls.sql
-- Novira (M2) – RLS enablement + policies

alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.blocks enable row level security;
alter table public.style_profiles enable row level security;
alter table public.variants enable row level security;
alter table public.notes enable row level security;
alter table public.jobs enable row level security;

-- BOOKS
drop policy if exists "books_select_own" on public.books;
create policy "books_select_own" on public.books for select using (owner_id = auth.uid());
drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own" on public.books for insert with check (owner_id = auth.uid());
drop policy if exists "books_update_own" on public.books;
create policy "books_update_own" on public.books for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own" on public.books for delete using (owner_id = auth.uid());

-- CHAPTERS
drop policy if exists "chapters_select_own" on public.chapters;
create policy "chapters_select_own" on public.chapters for select using (owner_id = auth.uid());
drop policy if exists "chapters_insert_own" on public.chapters;
create policy "chapters_insert_own" on public.chapters for insert with check (owner_id = auth.uid());
drop policy if exists "chapters_update_own" on public.chapters;
create policy "chapters_update_own" on public.chapters for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "chapters_delete_own" on public.chapters;
create policy "chapters_delete_own" on public.chapters for delete using (owner_id = auth.uid());

-- BLOCKS
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks for select using (owner_id = auth.uid());
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert with check (owner_id = auth.uid());
drop policy if exists "blocks_update_own" on public.blocks;
create policy "blocks_update_own" on public.blocks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete using (owner_id = auth.uid());

-- STYLE PROFILES
drop policy if exists "style_profiles_select_own" on public.style_profiles;
create policy "style_profiles_select_own" on public.style_profiles for select using (owner_id = auth.uid());
drop policy if exists "style_profiles_insert_own" on public.style_profiles;
create policy "style_profiles_insert_own" on public.style_profiles for insert with check (owner_id = auth.uid());
drop policy if exists "style_profiles_update_own" on public.style_profiles;
create policy "style_profiles_update_own" on public.style_profiles for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "style_profiles_delete_own" on public.style_profiles;
create policy "style_profiles_delete_own" on public.style_profiles for delete using (owner_id = auth.uid());

-- VARIANTS
drop policy if exists "variants_select_own" on public.variants;
create policy "variants_select_own" on public.variants for select using (owner_id = auth.uid());
drop policy if exists "variants_insert_own" on public.variants;
create policy "variants_insert_own" on public.variants for insert with check (owner_id = auth.uid());
drop policy if exists "variants_update_own" on public.variants;
create policy "variants_update_own" on public.variants for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "variants_delete_own" on public.variants;
create policy "variants_delete_own" on public.variants for delete using (owner_id = auth.uid());

-- NOTES
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes for select using (owner_id = auth.uid());
drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes for insert with check (owner_id = auth.uid());
drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes for delete using (owner_id = auth.uid());

-- JOBS
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs for select using (owner_id = auth.uid());
drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs for insert with check (owner_id = auth.uid());
drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own" on public.jobs for delete using (owner_id = auth.uid());

-- Reminder: the client must set owner_id = auth.uid() on inserts.
