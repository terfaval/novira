-- Add external-source provenance metadata for URL-based imports.

alter table public.books add column if not exists source_name text;
alter table public.books add column if not exists source_url text;
alter table public.books add column if not exists source_retrieved_at timestamptz;
alter table public.books add column if not exists source_license_url text;
alter table public.books add column if not exists source_original_sha256 text;
alter table public.books add column if not exists source_work_id text;

create index if not exists books_source_name_idx on public.books(source_name);
create index if not exists books_source_work_id_idx on public.books(source_work_id);
create index if not exists books_source_original_sha256_idx on public.books(source_original_sha256);

-- External source snapshots may store ZIP payloads.
update storage.buckets
set allowed_mime_types = array[
  'text/html',
  'application/xhtml+xml',
  'application/rtf',
  'text/rtf',
  'application/x-rtf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip'
]
where id = 'sources';

notify pgrst, 'reload schema';
