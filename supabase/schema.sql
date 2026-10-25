-- Run in the Supabase SQL editor. One row in `sites` per subdomain uuid.
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  title text
);

create table if not exists lanterns (
  id bigint generated always as identity primary key,
  site_id uuid not null references sites(id) on delete cascade,
  image text not null,   -- object path in the storage bucket, or a full URL
  thumb text,
  text text,
  sort int not null default 0
);
create index if not exists lanterns_site_idx on lanterns (site_id, sort);

-- The publishable key ships to the browser: public read only, writes via dashboard/service role.
alter table sites enable row level security;
alter table lanterns enable row level security;
-- Postgres has no "create policy if not exists", so drop first to keep this file re-runnable.
drop policy if exists "public read sites" on sites;
create policy "public read sites" on sites for select using (true);
drop policy if exists "public read lanterns" on lanterns;
create policy "public read lanterns" on lanterns for select using (true);

-- Admin dashboard (/admin.html): any signed-in user can write. Create your admin user under
-- Authentication -> Users and disable public sign-ups (Authentication -> Sign In / Providers),
-- otherwise anyone could register and edit.
drop policy if exists "admin write sites" on sites;
create policy "admin write sites" on sites for all to authenticated using (true) with check (true);
drop policy if exists "admin write lanterns" on lanterns;
create policy "admin write lanterns" on lanterns for all to authenticated using (true) with check (true);
drop policy if exists "admin write photos" on storage.objects;
create policy "admin write photos" on storage.objects for all to authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');

-- Photos: create a public bucket named "photos" (Storage -> New bucket -> Public),
-- then upload to <site uuid>/<file>.webp and <site uuid>/thumbs/<file>.webp.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;
