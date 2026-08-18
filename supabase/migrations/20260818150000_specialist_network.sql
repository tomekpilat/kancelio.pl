-- Multi-profession directory connected to client case types and process stages.

begin;

create table if not exists public.specialist_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 160),
  profession text not null check (profession in (
    'lawyer', 'real_estate_agent', 'property_valuator', 'technical_inspector',
    'mortgage_broker', 'tax_advisor', 'energy_auditor', 'surveyor',
    'insurance_agent', 'property_manager', 'moving_company', 'translator', 'mediator'
  )),
  city text not null check (char_length(city) between 2 and 100),
  bio text check (bio is null or char_length(bio) <= 900),
  services text[] not null default '{}',
  case_types text[] not null default '{}',
  stages text[] not null default '{}',
  website text check (website is null or char_length(website) <= 300),
  remote_available boolean not null default false,
  public_latitude double precision check (public_latitude is null or public_latitude between -90 and 90),
  public_longitude double precision check (public_longitude is null or public_longitude between -180 and 180),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id),
  check (cardinality(services) between 1 and 12),
  check (cardinality(case_types) between 1 and 7),
  check (cardinality(stages) between 1 and 4),
  check (case_types <@ array[
    'sale', 'preliminary_sale', 'occasional_lease', 'inheritance_rejection',
    'donation', 'power', 'will'
  ]::text[]),
  check (stages <@ array['preparation', 'documents', 'transaction', 'aftercare']::text[])
);

create table if not exists public.specialist_contacts (
  profile_id uuid primary key references public.specialist_profiles(id) on delete cascade,
  street_address text check (street_address is null or char_length(street_address) between 3 and 220),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{2}-[0-9]{3}$'),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text check (phone is null or char_length(phone) between 6 and 40),
  updated_at timestamptz not null default now()
);

create index if not exists specialist_profiles_city_idx on public.specialist_profiles (lower(city));
create index if not exists specialist_profiles_profession_idx on public.specialist_profiles (profession);
create index if not exists specialist_profiles_case_types_idx on public.specialist_profiles using gin (case_types);
create index if not exists specialist_profiles_stages_idx on public.specialist_profiles using gin (stages);
create index if not exists specialist_profiles_published_idx on public.specialist_profiles (is_published) where is_published;

drop trigger if exists set_specialist_profiles_updated_at on public.specialist_profiles;
create trigger set_specialist_profiles_updated_at
before update on public.specialist_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_specialist_contacts_updated_at on public.specialist_contacts;
create trigger set_specialist_contacts_updated_at
before update on public.specialist_contacts
for each row execute function public.set_updated_at();

alter table public.specialist_profiles enable row level security;
alter table public.specialist_contacts enable row level security;

drop policy if exists "Owners can read their specialist profile" on public.specialist_profiles;
create policy "Owners can read their specialist profile"
on public.specialist_profiles for select to authenticated
using ((select auth.uid()) = owner_id);
drop policy if exists "Owners can create their specialist profile" on public.specialist_profiles;
create policy "Owners can create their specialist profile"
on public.specialist_profiles for insert to authenticated
with check ((select auth.uid()) = owner_id);
drop policy if exists "Owners can update their specialist profile" on public.specialist_profiles;
create policy "Owners can update their specialist profile"
on public.specialist_profiles for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
drop policy if exists "Owners can delete their specialist profile" on public.specialist_profiles;
create policy "Owners can delete their specialist profile"
on public.specialist_profiles for delete to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can read their specialist contacts" on public.specialist_contacts;
create policy "Owners can read their specialist contacts"
on public.specialist_contacts for select to authenticated
using (exists (
  select 1 from public.specialist_profiles profile
  where profile.id = profile_id and profile.owner_id = (select auth.uid())
));
drop policy if exists "Owners can create their specialist contacts" on public.specialist_contacts;
create policy "Owners can create their specialist contacts"
on public.specialist_contacts for insert to authenticated
with check (exists (
  select 1 from public.specialist_profiles profile
  where profile.id = profile_id and profile.owner_id = (select auth.uid())
));
drop policy if exists "Owners can update their specialist contacts" on public.specialist_contacts;
create policy "Owners can update their specialist contacts"
on public.specialist_contacts for update to authenticated
using (exists (
  select 1 from public.specialist_profiles profile
  where profile.id = profile_id and profile.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.specialist_profiles profile
  where profile.id = profile_id and profile.owner_id = (select auth.uid())
));

revoke all on public.specialist_profiles from anon;
revoke all on public.specialist_contacts from anon;
grant select, insert, update, delete on public.specialist_profiles to authenticated;
grant select, insert, update, delete on public.specialist_contacts to authenticated;

-- One anonymous search surface for new profiles and the existing notary directory.
create or replace function public.search_specialists(
  p_city text default null,
  p_profession text default null,
  p_case_type text default null,
  p_stage text default null
)
returns table (
  id uuid,
  source_type text,
  name text,
  profession text,
  city text,
  services text[],
  case_types text[],
  stages text[],
  bio text,
  website text,
  remote_available boolean,
  public_latitude double precision,
  public_longitude double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with directory as (
    select
      profile.id, 'specialist'::text as source_type, profile.name, profile.profession,
      profile.city, profile.services, profile.case_types, profile.stages, profile.bio,
      profile.website, profile.remote_available, profile.public_latitude, profile.public_longitude
    from public.specialist_profiles profile
    where profile.is_published
    union all
    select
      office.id, 'notary'::text, office.name, 'notary'::text, office.city,
      office.services, office.services,
      array['documents', 'transaction']::text[], null::text, office.website, false,
      office.public_latitude, office.public_longitude
    from public.notary_offices office
    where office.is_published
  )
  select directory.*
  from directory
  where (
      nullif(trim(p_city), '') is null
      or extensions.unaccent(lower(directory.city)) like '%' || extensions.unaccent(lower(trim(p_city))) || '%'
      or directory.remote_available
    )
    and (nullif(trim(p_profession), '') is null or directory.profession = trim(p_profession))
    and (nullif(trim(p_case_type), '') is null or trim(p_case_type) = any(directory.case_types))
    and (nullif(trim(p_stage), '') is null or trim(p_stage) = any(directory.stages))
  order by
    case when nullif(trim(p_city), '') is not null and extensions.unaccent(lower(directory.city)) = extensions.unaccent(lower(trim(p_city))) then 0 else 1 end,
    directory.name
  limit 80;
$$;

revoke all on function public.search_specialists(text, text, text, text) from public;
grant execute on function public.search_specialists(text, text, text, text) to anon, authenticated;

commit;
