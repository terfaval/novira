-- 0011_shared_source_model.sql
-- Shared source books with user-scoped overrides (uploader-owned canonical)

alter table public.books
  add column if not exists is_source boolean not null default true;

update public.books
set is_source = false
where source_book_id is not null
  and is_source = true;

-- Books policies
drop policy if exists "books_select_own" on public.books;
drop policy if exists "books_select_admin" on public.books;
drop policy if exists "books_insert_own" on public.books;
drop policy if exists "books_update_own" on public.books;
drop policy if exists "books_update_admin" on public.books;
drop policy if exists "books_delete_own" on public.books;

create policy "books_select_shared_or_own" on public.books
  for select using (
    auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
    or owner_id = auth.uid()
    or user_id = auth.uid()
    or (is_public = true and status = 'ready' and is_source = true)
  );

create policy "books_insert_uploader_owned" on public.books
  for insert with check (
    owner_id = auth.uid()
    and user_id = auth.uid()
  );

create policy "books_update_owner_or_admin" on public.books
  for update using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  )
  with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "books_delete_owner_or_admin" on public.books
  for delete using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

-- Chapters policies
drop policy if exists "chapters_select_own" on public.chapters;
drop policy if exists "chapters_insert_own" on public.chapters;
drop policy if exists "chapters_update_own" on public.chapters;
drop policy if exists "chapters_delete_own" on public.chapters;

create policy "chapters_select_shared_or_own" on public.chapters
  for select using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
    or exists (
      select 1 from public.books b
      where b.id = book_id
        and b.is_public = true
        and b.status = 'ready'
        and b.is_source = true
    )
  );

create policy "chapters_insert_owner_or_admin" on public.chapters
  for insert with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "chapters_update_owner_or_admin" on public.chapters
  for update using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  )
  with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "chapters_delete_owner_or_admin" on public.chapters
  for delete using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

-- Blocks policies
drop policy if exists "blocks_select_own" on public.blocks;
drop policy if exists "blocks_insert_own" on public.blocks;
drop policy if exists "blocks_update_own" on public.blocks;
drop policy if exists "blocks_delete_own" on public.blocks;

create policy "blocks_select_shared_or_own" on public.blocks
  for select using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
    or exists (
      select 1 from public.books b
      where b.id = book_id
        and b.is_public = true
        and b.status = 'ready'
        and b.is_source = true
    )
  );

create policy "blocks_insert_owner_or_admin" on public.blocks
  for insert with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "blocks_update_owner_or_admin" on public.blocks
  for update using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  )
  with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "blocks_delete_owner_or_admin" on public.blocks
  for delete using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

-- Footnotes policies (shared with source books)
drop policy if exists "footnotes_select_own" on public.footnotes;
drop policy if exists "footnotes_insert_own" on public.footnotes;
drop policy if exists "footnotes_update_own" on public.footnotes;
drop policy if exists "footnotes_delete_own" on public.footnotes;

create policy "footnotes_select_shared_or_own" on public.footnotes
  for select using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
    or exists (
      select 1 from public.books b
      where b.id = book_id
        and b.is_public = true
        and b.status = 'ready'
        and b.is_source = true
    )
  );

create policy "footnotes_insert_owner_or_admin" on public.footnotes
  for insert with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "footnotes_update_owner_or_admin" on public.footnotes
  for update using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  )
  with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "footnotes_delete_owner_or_admin" on public.footnotes
  for delete using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

-- Footnote anchors policies (shared with source books)
drop policy if exists "footnote_anchors_select_own" on public.footnote_anchors;
drop policy if exists "footnote_anchors_insert_own" on public.footnote_anchors;
drop policy if exists "footnote_anchors_update_own" on public.footnote_anchors;
drop policy if exists "footnote_anchors_delete_own" on public.footnote_anchors;

create policy "footnote_anchors_select_shared_or_own" on public.footnote_anchors
  for select using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
    or exists (
      select 1 from public.books b
      where b.id = book_id
        and b.is_public = true
        and b.status = 'ready'
        and b.is_source = true
    )
  );

create policy "footnote_anchors_insert_owner_or_admin" on public.footnote_anchors
  for insert with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "footnote_anchors_update_owner_or_admin" on public.footnote_anchors
  for update using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  )
  with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "footnote_anchors_delete_owner_or_admin" on public.footnote_anchors
  for delete using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

-- Variants policies (user overrides)
drop policy if exists "variants_select_own" on public.variants;
drop policy if exists "variants_insert_own" on public.variants;
drop policy if exists "variants_update_own" on public.variants;
drop policy if exists "variants_delete_own" on public.variants;

create policy "variants_select_owner_or_admin" on public.variants
  for select using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "variants_insert_owner_on_visible_book" on public.variants
  for insert with check (
    owner_id = auth.uid()
    and (
      auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
      or exists (
        select 1 from public.books b
        where b.id = book_id
          and (
            b.owner_id = auth.uid()
            or b.user_id = auth.uid()
            or (b.is_public = true and b.status = 'ready' and b.is_source = true)
          )
      )
    )
  );

create policy "variants_update_owner_or_admin" on public.variants
  for update using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  )
  with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "variants_delete_owner_or_admin" on public.variants
  for delete using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

-- Notes policies (user overrides)
drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_owner_or_admin" on public.notes
  for select using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "notes_insert_owner_on_visible_book" on public.notes
  for insert with check (
    owner_id = auth.uid()
    and (
      auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
      or exists (
        select 1 from public.books b
        where b.id = book_id
          and (
            b.owner_id = auth.uid()
            or b.user_id = auth.uid()
            or (b.is_public = true and b.status = 'ready' and b.is_source = true)
          )
      )
    )
  );

create policy "notes_update_owner_or_admin" on public.notes
  for update using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  )
  with check (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

create policy "notes_delete_owner_or_admin" on public.notes
  for delete using (
    owner_id = auth.uid()
    or auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873'
  );

notify pgrst, 'reload schema';
