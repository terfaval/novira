alter table public.books
  add column if not exists source_book_id uuid references public.books(id) on delete set null;

create index if not exists books_source_book_id_idx on public.books(source_book_id);

create unique index if not exists books_user_source_book_unique_idx
  on public.books(user_id, source_book_id)
  where source_book_id is not null;
