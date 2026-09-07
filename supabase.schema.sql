-- Before running this file, replace every tekinyusufselim@gmail.com value
-- with the exact email address of your Supabase admin user.

create table if not exists public.magazines (
  id uuid primary key default gen_random_uuid(),
  publication_type text not null default 'magazine' check (publication_type in ('magazine', 'book')),
  title text not null,
  description text not null,
  cover_url text not null,
  cover_path text not null,
  cover_file_name text,
  content_url text not null,
  content_path text not null,
  content_file_name text,
  content_file_type text,
  content_file_size bigint,
  category text not null,
  issue_number text,
  volume text,
  page_count integer,
  language text,
  tags text[] not null default '{}',
  features jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.magazines enable row level security;

drop policy if exists "Published magazines are public" on public.magazines;
drop policy if exists "Admin can read all magazines" on public.magazines;
drop policy if exists "Admin can insert magazines" on public.magazines;
drop policy if exists "Admin can update magazines" on public.magazines;
drop policy if exists "Admin can delete magazines" on public.magazines;

create policy "Published magazines are public"
on public.magazines
for select
using (status = 'published');

create policy "Admin can read all magazines"
on public.magazines
for select
to authenticated
using (auth.email() = '"Your mail"@gmail.com');

create policy "Admin can insert magazines"
on public.magazines
for insert
to authenticated
with check (auth.email() = '"Your mail"@gmail.com');

create policy "Admin can update magazines"
on public.magazines
for update
to authenticated
using (auth.email() = '"Your mail"@gmail.com')
with check (auth.email() = '"Your mail"@gmail.com');

create policy "Admin can delete magazines"
on public.magazines
for delete
to authenticated
using (auth.email() = '"Your mail"@gmail.com');

insert into storage.buckets (id, name, public)
values ('publications', 'publications', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Publication files are public" on storage.objects;
drop policy if exists "Admin can upload publication files" on storage.objects;
drop policy if exists "Admin can update publication files" on storage.objects;
drop policy if exists "Admin can delete publication files" on storage.objects;

create policy "Publication files are public"
on storage.objects
for select
using (bucket_id = 'publications');

create policy "Admin can upload publication files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'publications'
  and auth.email() = '"Your mail"@gmail.com'
);

create policy "Admin can update publication files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'publications'
  and auth.email() = '"Your Mail"@gmail.com'
)
with check (
  bucket_id = 'publications'
  and auth.email() = '"Your mail"@gmail.com'
);

create policy "Admin can delete publication files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'publications'
  and auth.email() = '"Your mail"@gmail.com'
);
