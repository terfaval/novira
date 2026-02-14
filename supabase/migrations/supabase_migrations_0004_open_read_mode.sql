-- 0004_open_read_mode.sql
-- Temporary open-read mode for OSS/demo environments:
-- keep RLS enabled, but allow SELECT across shared content tables.

-- BOOKS
drop policy if exists "books_select_own" on public.books;
drop policy if exists "books_select_open" on public.books;
create policy "books_select_open" on public.books
  for select using (true);

-- CHAPTERS
drop policy if exists "chapters_select_own" on public.chapters;
drop policy if exists "chapters_select_open" on public.chapters;
create policy "chapters_select_open" on public.chapters
  for select using (true);

-- BLOCKS
drop policy if exists "blocks_select_own" on public.blocks;
drop policy if exists "blocks_select_open" on public.blocks;
create policy "blocks_select_open" on public.blocks
  for select using (true);

-- VARIANTS
drop policy if exists "variants_select_own" on public.variants;
drop policy if exists "variants_select_open" on public.variants;
create policy "variants_select_open" on public.variants
  for select using (true);

-- NOTES
drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_select_open" on public.notes;
create policy "notes_select_open" on public.notes
  for select using (true);

-- FOOTNOTES
drop policy if exists "footnotes_select_own" on public.footnotes;
drop policy if exists "footnotes_select_open" on public.footnotes;
create policy "footnotes_select_open" on public.footnotes
  for select using (true);

-- FOOTNOTE ANCHORS
drop policy if exists "footnote_anchors_select_own" on public.footnote_anchors;
drop policy if exists "footnote_anchors_select_open" on public.footnote_anchors;
create policy "footnote_anchors_select_open" on public.footnote_anchors
  for select using (true);

notify pgrst, 'reload schema';
