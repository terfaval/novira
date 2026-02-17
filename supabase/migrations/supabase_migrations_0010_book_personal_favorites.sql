create table if not exists public.book_favorites (
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists book_favorites_book_id_idx on public.book_favorites(book_id);
create index if not exists book_favorites_created_at_idx on public.book_favorites(created_at desc);

alter table public.book_favorites enable row level security;

drop policy if exists "book_favorites_select_own" on public.book_favorites;
create policy "book_favorites_select_own" on public.book_favorites
  for select using (user_id = auth.uid());

drop policy if exists "book_favorites_insert_own" on public.book_favorites;
create policy "book_favorites_insert_own" on public.book_favorites
  for insert with check (user_id = auth.uid());

drop policy if exists "book_favorites_delete_own" on public.book_favorites;
create policy "book_favorites_delete_own" on public.book_favorites
  for delete using (user_id = auth.uid());

notify pgrst, 'reload schema';
