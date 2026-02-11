-- 0001_init.sql
-- Novira (M2) – Initial schema v0

create extension if not exists pgcrypto;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  source_format text not null check (source_format in ('docx','epub','txt','md')),
  source_filename text,
  language_original text,
  language_target text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_owner_id_idx on public.books(owner_id);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_index int not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, chapter_index)
);
create index if not exists chapters_book_id_idx on public.chapters(book_id);
create index if not exists chapters_owner_id_idx on public.chapters(owner_id);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  block_index int not null,
  original_text text not null,
  normalized_text text,
  original_hash text not null,
  start_offset int,
  end_offset int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, block_index)
);
create index if not exists blocks_chapter_id_idx on public.blocks(chapter_id);
create index if not exists blocks_book_id_idx on public.blocks(book_id);
create index if not exists blocks_owner_id_idx on public.blocks(owner_id);

create table if not exists public.style_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid references public.books(id) on delete cascade,
  name text not null,
  description text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists style_profiles_owner_id_idx on public.style_profiles(owner_id);
create index if not exists style_profiles_book_id_idx on public.style_profiles(book_id);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  style_profile_id uuid references public.style_profiles(id) on delete set null,
  variant_index int not null default 1,
  status text not null default 'draft' check (status in ('draft','accepted','rejected')),
  text text not null,
  notes text,
  model_provider text,
  model_name text,
  prompt_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists variants_block_id_idx on public.variants(block_id);
create index if not exists variants_owner_id_idx on public.variants(owner_id);
create index if not exists variants_status_idx on public.variants(status);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  anchor_start int,
  anchor_end int,
  kind text not null default 'comment' check (kind in ('comment','lexical','cultural','historical','intertextual')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_block_id_idx on public.notes(block_id);
create index if not exists notes_owner_id_idx on public.notes(owner_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  book_id uuid references public.books(id) on delete cascade,
  type text not null check (type in ('import','chapter_summary','book_layer','generate_variant','export')),
  status text not null default 'queued' check (status in ('queued','running','done','error')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_owner_id_idx on public.jobs(owner_id);
create index if not exists jobs_book_id_idx on public.jobs(book_id);
create index if not exists jobs_status_idx on public.jobs(status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_books_updated_at') then
    create trigger tr_books_updated_at before update on public.books
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_chapters_updated_at') then
    create trigger tr_chapters_updated_at before update on public.chapters
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_blocks_updated_at') then
    create trigger tr_blocks_updated_at before update on public.blocks
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_style_profiles_updated_at') then
    create trigger tr_style_profiles_updated_at before update on public.style_profiles
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_variants_updated_at') then
    create trigger tr_variants_updated_at before update on public.variants
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_notes_updated_at') then
    create trigger tr_notes_updated_at before update on public.notes
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_jobs_updated_at') then
    create trigger tr_jobs_updated_at before update on public.jobs
    for each row execute function public.set_updated_at();
  end if;
end $$;
