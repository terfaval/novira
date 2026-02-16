-- Add book publication-year columns for editable/persisted original edition year.

alter table public.books add column if not exists publication_year int;
alter table public.books add column if not exists year int;

create index if not exists books_publication_year_idx on public.books(publication_year);
create index if not exists books_year_idx on public.books(year);

notify pgrst, 'reload schema';
