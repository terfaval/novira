alter table public.books add column if not exists is_public boolean not null default false;

create index if not exists books_is_public_idx on public.books(is_public);

drop policy if exists "books_select_admin" on public.books;
create policy "books_select_admin" on public.books
  for select
  using (auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873');

drop policy if exists "books_update_admin" on public.books;
create policy "books_update_admin" on public.books
  for update
  using (auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873')
  with check (auth.uid()::text = '956eb736-0fb5-49eb-9be8-7011517b9873');
