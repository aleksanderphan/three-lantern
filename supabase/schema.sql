-- Run in the Supabase SQL editor. One row in `sites` per subdomain uuid.
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  title text,
  expires_at date        -- last day the site is live (UTC); null = never expires
);
-- Existing projects: add the column and keep the default site (all-zero uuid) from ever expiring.
alter table sites add column if not exists expires_at date;
alter table sites drop constraint if exists default_site_never_expires;
alter table sites add constraint default_site_never_expires
  check (id <> '00000000-0000-0000-0000-000000000000' or expires_at is null);

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
-- Public lanterns of an expired site are hidden at the database, so expiry can't be bypassed in the
-- browser. The site row stays readable (title + date) so the page can say it has expired; signed-in
-- admins read everything through the write policies below.
drop policy if exists "public read lanterns" on lanterns;
create policy "public read lanterns" on lanterns for select using (
  exists (select 1 from sites s where s.id = lanterns.site_id and (s.expires_at is null or s.expires_at >= current_date))
);

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

-- Hard limit: at most 10 photos (lanterns) per site, whatever client writes them.
create or replace function enforce_lantern_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from lanterns where site_id = new.site_id) >= 10 then
    raise exception 'A site can have at most 10 photos';
  end if;
  return new;
end $$;
drop trigger if exists lantern_limit on lanterns;
create trigger lantern_limit before insert on lanterns for each row execute function enforce_lantern_limit();

-- Photos: create a public bucket named "photos" (Storage -> New bucket -> Public),
-- then upload to <site uuid>/<file>.webp and <site uuid>/thumbs/<file>.webp.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;
