-- Kancelio public notary directory.
-- Public listing data and protected contact data are deliberately separated.

create extension if not exists unaccent with schema extensions;

create table if not exists public.notary_offices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 160),
  city text not null check (char_length(city) between 2 and 100),
  services text[] not null default '{}',
  website text check (website is null or char_length(website) <= 300),
  public_latitude double precision check (public_latitude is null or public_latitude between -90 and 90),
  public_longitude double precision check (public_longitude is null or public_longitude between -180 and 180),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id),
  check (cardinality(services) between 1 and 20),
  check (
    services <@ array[
      'sale', 'donation', 'power', 'will', 'mortgage', 'inheritance',
      'marital', 'company', 'certification'
    ]::text[]
  )
);

create table if not exists public.notary_office_contacts (
  office_id uuid primary key references public.notary_offices(id) on delete cascade,
  street_address text not null check (char_length(street_address) between 3 and 220),
  postal_code text not null check (postal_code ~ '^[0-9]{2}-[0-9]{3}$'),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text check (phone is null or char_length(phone) between 6 and 40),
  updated_at timestamptz not null default now()
);

create index if not exists notary_offices_city_idx
  on public.notary_offices (lower(city));
create index if not exists notary_offices_services_idx
  on public.notary_offices using gin (services);
create index if not exists notary_offices_published_idx
  on public.notary_offices (is_published) where is_published;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notary_offices_updated_at on public.notary_offices;
create trigger set_notary_offices_updated_at
before update on public.notary_offices
for each row execute function public.set_updated_at();

drop trigger if exists set_notary_office_contacts_updated_at on public.notary_office_contacts;
create trigger set_notary_office_contacts_updated_at
before update on public.notary_office_contacts
for each row execute function public.set_updated_at();

alter table public.notary_offices enable row level security;
alter table public.notary_office_contacts enable row level security;

drop policy if exists "Owners can read their office" on public.notary_offices;
create policy "Owners can read their office"
on public.notary_offices for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can create their office" on public.notary_offices;
create policy "Owners can create their office"
on public.notary_offices for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update their office" on public.notary_offices;
create policy "Owners can update their office"
on public.notary_offices for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their office" on public.notary_offices;
create policy "Owners can delete their office"
on public.notary_offices for delete to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can read their contacts" on public.notary_office_contacts;
create policy "Owners can read their contacts"
on public.notary_office_contacts for select to authenticated
using (
  exists (
    select 1 from public.notary_offices office
    where office.id = office_id and office.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can create their contacts" on public.notary_office_contacts;
create policy "Owners can create their contacts"
on public.notary_office_contacts for insert to authenticated
with check (
  exists (
    select 1 from public.notary_offices office
    where office.id = office_id and office.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can update their contacts" on public.notary_office_contacts;
create policy "Owners can update their contacts"
on public.notary_office_contacts for update to authenticated
using (
  exists (
    select 1 from public.notary_offices office
    where office.id = office_id and office.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.notary_offices office
    where office.id = office_id and office.owner_id = (select auth.uid())
  )
);

revoke all on public.notary_offices from anon;
revoke all on public.notary_office_contacts from anon;
grant select, insert, update, delete on public.notary_offices to authenticated;
grant select, insert, update, delete on public.notary_office_contacts to authenticated;

-- The only anonymous search surface returns safe, non-contact columns.
create or replace function public.search_notary_offices(
  p_city text default null,
  p_service text default null
)
returns table (
  id uuid,
  name text,
  city text,
  services text[],
  website text,
  public_latitude double precision,
  public_longitude double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    office.id,
    office.name,
    office.city,
    office.services,
    office.website,
    office.public_latitude,
    office.public_longitude
  from public.notary_offices office
  where office.is_published
    and (
      nullif(trim(p_city), '') is null
      or extensions.unaccent(lower(office.city))
        like '%' || extensions.unaccent(lower(trim(p_city))) || '%'
    )
    and (
      nullif(trim(p_service), '') is null
      or trim(p_service) = any(office.services)
    )
  order by office.name
  limit 50;
$$;

revoke all on function public.search_notary_offices(text, text) from public;
grant execute on function public.search_notary_offices(text, text) to anon, authenticated;
