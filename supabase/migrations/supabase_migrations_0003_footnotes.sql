-- 0003_footnotes.sql
-- NOV-ING-002: dedicated footnotes + anchors for chapter note extraction

create table if not exists public.footnotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  number int not null check (number > 0),
  text text not null,
  source_chapter_id uuid not null references public.chapters(id) on delete cascade,
  source_block_id uuid not null references public.blocks(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, number)
);
create index if not exists footnotes_book_id_idx on public.footnotes(book_id);
create index if not exists footnotes_owner_id_idx on public.footnotes(owner_id);
create index if not exists footnotes_source_block_id_idx on public.footnotes(source_block_id);

create table if not exists public.footnote_anchors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  footnote_number int not null check (footnote_number > 0),
  start_offset int not null check (start_offset >= 0),
  end_offset int not null check (end_offset > start_offset),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, footnote_number, start_offset, end_offset),
  foreign key (book_id, footnote_number)
    references public.footnotes(book_id, number)
    on delete cascade
);
create index if not exists footnote_anchors_book_id_idx on public.footnote_anchors(book_id);
create index if not exists footnote_anchors_block_id_idx on public.footnote_anchors(block_id);
create index if not exists footnote_anchors_owner_id_idx on public.footnote_anchors(owner_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_footnotes_updated_at') then
    create trigger tr_footnotes_updated_at before update on public.footnotes
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_footnote_anchors_updated_at') then
    create trigger tr_footnote_anchors_updated_at before update on public.footnote_anchors
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.footnotes enable row level security;
alter table public.footnote_anchors enable row level security;

drop policy if exists "footnotes_select_own" on public.footnotes;
create policy "footnotes_select_own" on public.footnotes
  for select using (owner_id = auth.uid());

drop policy if exists "footnotes_insert_own" on public.footnotes;
create policy "footnotes_insert_own" on public.footnotes
  for insert with check (owner_id = auth.uid());

drop policy if exists "footnotes_update_own" on public.footnotes;
create policy "footnotes_update_own" on public.footnotes
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "footnotes_delete_own" on public.footnotes;
create policy "footnotes_delete_own" on public.footnotes
  for delete using (owner_id = auth.uid());

drop policy if exists "footnote_anchors_select_own" on public.footnote_anchors;
create policy "footnote_anchors_select_own" on public.footnote_anchors
  for select using (owner_id = auth.uid());

drop policy if exists "footnote_anchors_insert_own" on public.footnote_anchors;
create policy "footnote_anchors_insert_own" on public.footnote_anchors
  for insert with check (owner_id = auth.uid());

drop policy if exists "footnote_anchors_update_own" on public.footnote_anchors;
create policy "footnote_anchors_update_own" on public.footnote_anchors
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "footnote_anchors_delete_own" on public.footnote_anchors;
create policy "footnote_anchors_delete_own" on public.footnote_anchors
  for delete using (owner_id = auth.uid());

notify pgrst, 'reload schema';
