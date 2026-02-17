alter table public.books
  add column if not exists is_favorite boolean not null default false;

create index if not exists books_user_favorite_idx
  on public.books(user_id, is_favorite, updated_at desc);
