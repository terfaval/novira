-- 0002_upload_books.sql
-- Align books table and upload storage for D-014 (HTML/RTF/DOCX local upload)

alter table public.books add column if not exists user_id uuid;
alter table public.books add column if not exists author text;
alter table public.books add column if not exists description text;
alter table public.books add column if not exists source_filename text;
alter table public.books add column if not exists source_mime text;
alter table public.books add column if not exists source_size_bytes bigint;
alter table public.books add column if not exists source_storage_path text;
alter table public.books add column if not exists status text;
alter table public.books add column if not exists error_message text;

-- Backfill legacy rows (created before this migration) to satisfy new not-null rules.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'books'
      and column_name = 'owner_id'
  ) then
    execute $sql$
      update public.books
      set user_id = owner_id
      where user_id is null
        and owner_id is not null
    $sql$;
  end if;
end $$;

update public.books
set source_filename = 'unknown'
where source_filename is null;

update public.books
set source_mime = case source_format
  when 'html' then 'text/html'
  when 'rtf' then 'application/rtf'
  when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  else 'application/octet-stream'
end
where source_mime is null;

update public.books
set source_size_bytes = 0
where source_size_bytes is null;

update public.books
set source_storage_path = ''
where source_storage_path is null;

update public.books
set status = 'processing'
where status is null;

-- Replace older source_format checks with D-014 allowed formats.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'books'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%source_format%'
  loop
    execute format('alter table public.books drop constraint %I', r.conname);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'books'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.books drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.books
  add constraint books_source_format_check
  check (source_format in ('html', 'rtf', 'docx'));

alter table public.books
  add constraint books_status_check
  check (status in ('processing', 'ready', 'failed'));

alter table public.books alter column user_id set not null;
alter table public.books alter column source_format set not null;
alter table public.books alter column source_filename set not null;
alter table public.books alter column source_mime set not null;
alter table public.books alter column source_size_bytes set not null;
alter table public.books alter column source_storage_path set not null;
alter table public.books alter column status set default 'processing';
alter table public.books alter column status set not null;
alter table public.books alter column created_at set default now();
alter table public.books alter column created_at set not null;
alter table public.books alter column updated_at set default now();
alter table public.books alter column updated_at set not null;

create index if not exists books_user_id_idx on public.books(user_id);

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own" on public.books
  for select using (user_id = auth.uid());

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own" on public.books
  for insert with check (user_id = auth.uid());

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own" on public.books
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own" on public.books
  for delete using (user_id = auth.uid());

-- Storage bucket and object policies for upload sources.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,
  1073741824,
  array[
    'text/html',
    'application/xhtml+xml',
    'application/rtf',
    'text/rtf',
    'application/x-rtf',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sources_select_own" on storage.objects;
create policy "sources_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sources'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "sources_insert_own" on storage.objects;
create policy "sources_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sources'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "sources_update_own" on storage.objects;
create policy "sources_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'sources'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'sources'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "sources_delete_own" on storage.objects;
create policy "sources_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sources'
    and split_part(name, '/', 1) = auth.uid()::text
  );

notify pgrst, 'reload schema';
