-- Marketing readiness: trusted profiles, public profile pages and moderation.

begin;

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins administrator
    where administrator.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

alter table public.specialist_profiles
  add column if not exists slug text,
  add column if not exists moderation_status text not null default 'pending',
  add column if not exists moderation_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.notary_offices
  add column if not exists slug text,
  add column if not exists moderation_status text not null default 'pending',
  add column if not exists moderation_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.specialist_profiles
  drop constraint if exists specialist_profiles_moderation_status_check;
alter table public.specialist_profiles
  add constraint specialist_profiles_moderation_status_check
  check (moderation_status in ('pending', 'verified', 'rejected'));

alter table public.notary_offices
  drop constraint if exists notary_offices_moderation_status_check;
alter table public.notary_offices
  add constraint notary_offices_moderation_status_check
  check (moderation_status in ('pending', 'verified', 'rejected'));

update public.specialist_profiles
set slug = trim(both '-' from regexp_replace(
  lower(extensions.unaccent(name || '-' || city)), '[^a-z0-9]+', '-', 'g'
)) || '-' || left(replace(id::text, '-', ''), 8)
where slug is null;

update public.notary_offices
set slug = trim(both '-' from regexp_replace(
  lower(extensions.unaccent(name || '-' || city)), '[^a-z0-9]+', '-', 'g'
)) || '-' || left(replace(id::text, '-', ''), 8)
where slug is null;

alter table public.specialist_profiles alter column slug set not null;
alter table public.notary_offices alter column slug set not null;

create unique index if not exists specialist_profiles_slug_idx
on public.specialist_profiles (slug);
create unique index if not exists notary_offices_slug_idx
on public.notary_offices (slug);
create index if not exists specialist_profiles_verified_idx
on public.specialist_profiles (moderation_status, is_published, lower(city));
create index if not exists notary_offices_verified_idx
on public.notary_offices (moderation_status, is_published, lower(city));

create or replace function public.protect_directory_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  administrator boolean := public.is_platform_admin();
  public_changed boolean := false;
begin
  if current_setting('kancelio.contact_changed', true) = 'on' then return new; end if;

  if tg_op = 'INSERT' then
    if new.slug is null or trim(new.slug) = '' then
      new.slug := trim(both '-' from regexp_replace(
        lower(extensions.unaccent(new.name || '-' || new.city)), '[^a-z0-9]+', '-', 'g'
      )) || '-' || left(replace(new.id::text, '-', ''), 8);
    end if;
    if not administrator then
      new.moderation_status := 'pending';
      new.moderation_note := null;
      new.verified_at := null;
      new.verified_by := null;
    end if;
    return new;
  end if;

  new.slug := old.slug;
  if administrator then return new; end if;

  public_changed := (
    to_jsonb(new) - array[
      'moderation_status', 'moderation_note', 'verified_at', 'verified_by',
      'slug', 'updated_at', 'created_at', 'owner_id', 'is_published'
    ]::text[]
  ) is distinct from (
    to_jsonb(old) - array[
      'moderation_status', 'moderation_note', 'verified_at', 'verified_by',
      'slug', 'updated_at', 'created_at', 'owner_id', 'is_published'
    ]::text[]
  );

  if public_changed then
    new.moderation_status := 'pending';
    new.moderation_note := null;
    new.verified_at := null;
    new.verified_by := null;
  else
    new.moderation_status := old.moderation_status;
    new.moderation_note := old.moderation_note;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_specialist_profile_moderation on public.specialist_profiles;
create trigger protect_specialist_profile_moderation
before insert or update on public.specialist_profiles
for each row execute function public.protect_directory_moderation();

drop trigger if exists protect_notary_office_moderation on public.notary_offices;
create trigger protect_notary_office_moderation
before insert or update on public.notary_offices
for each row execute function public.protect_directory_moderation();

create or replace function public.reset_verification_after_contact_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() then return new; end if;
  perform set_config('kancelio.contact_changed', 'on', true);
  if tg_table_name = 'specialist_contacts' then
    update public.specialist_profiles
    set moderation_status = 'pending', moderation_note = null,
        verified_at = null, verified_by = null
    where id = new.profile_id and moderation_status <> 'pending';
  else
    update public.notary_offices
    set moderation_status = 'pending', moderation_note = null,
        verified_at = null, verified_by = null
    where id = new.office_id and moderation_status <> 'pending';
  end if;
  perform set_config('kancelio.contact_changed', 'off', true);
  return new;
end;
$$;

drop trigger if exists reset_specialist_verification_after_contact_change on public.specialist_contacts;
create trigger reset_specialist_verification_after_contact_change
after insert or update on public.specialist_contacts
for each row execute function public.reset_verification_after_contact_change();

drop trigger if exists reset_office_verification_after_contact_change on public.notary_office_contacts;
create trigger reset_office_verification_after_contact_change
after insert or update on public.notary_office_contacts
for each row execute function public.reset_verification_after_contact_change();

-- Replace public search surfaces so only reviewed profiles are promoted.
drop function if exists public.search_specialists(text, text, text, text);
create function public.search_specialists(
  p_city text default null,
  p_profession text default null,
  p_case_type text default null,
  p_stage text default null
)
returns table (
  id uuid,
  slug text,
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
  public_longitude double precision,
  is_verified boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with directory as (
    select
      profile.id, profile.slug, 'specialist'::text as source_type, profile.name,
      profile.profession, profile.city, profile.services, profile.case_types,
      profile.stages, profile.bio, profile.website, profile.remote_available,
      profile.public_latitude, profile.public_longitude, true as is_verified
    from public.specialist_profiles profile
    where profile.is_published and profile.moderation_status = 'verified'
    union all
    select
      office.id, office.slug, 'notary'::text, office.name, 'notary'::text,
      office.city, office.services, office.services,
      array['documents', 'transaction']::text[], null::text, office.website, false,
      office.public_latitude, office.public_longitude, true
    from public.notary_offices office
    where office.is_published and office.moderation_status = 'verified'
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

drop function if exists public.search_notary_offices(text, text);
create function public.search_notary_offices(
  p_city text default null,
  p_service text default null
)
returns table (
  id uuid,
  slug text,
  name text,
  city text,
  services text[],
  website text,
  public_latitude double precision,
  public_longitude double precision,
  is_verified boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    office.id, office.slug, office.name, office.city, office.services,
    office.website, office.public_latitude, office.public_longitude, true
  from public.notary_offices office
  where office.is_published
    and office.moderation_status = 'verified'
    and (
      nullif(trim(p_city), '') is null
      or extensions.unaccent(lower(office.city)) like '%' || extensions.unaccent(lower(trim(p_city))) || '%'
    )
    and (nullif(trim(p_service), '') is null or trim(p_service) = any(office.services))
  order by office.name
  limit 50;
$$;

revoke all on function public.search_notary_offices(text, text) from public;
grant execute on function public.search_notary_offices(text, text) to anon, authenticated;

create or replace function public.get_public_specialist_profile(p_slug text)
returns table (
  id uuid,
  slug text,
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
  public_longitude double precision,
  verified_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id, profile.slug, 'specialist'::text, profile.name, profile.profession,
    profile.city, profile.services, profile.case_types, profile.stages, profile.bio,
    profile.website, profile.remote_available, profile.public_latitude,
    profile.public_longitude, profile.verified_at
  from public.specialist_profiles profile
  where profile.slug = trim(p_slug)
    and profile.is_published
    and profile.moderation_status = 'verified'
  union all
  select
    office.id, office.slug, 'notary'::text, office.name, 'notary'::text,
    office.city, office.services, office.services,
    array['documents', 'transaction']::text[], null::text, office.website, false,
    office.public_latitude, office.public_longitude, office.verified_at
  from public.notary_offices office
  where office.slug = trim(p_slug)
    and office.is_published
    and office.moderation_status = 'verified'
  limit 1;
$$;

revoke all on function public.get_public_specialist_profile(text) from public;
grant execute on function public.get_public_specialist_profile(text) to anon, authenticated;

create or replace function public.admin_list_directory_profiles(p_status text default null)
returns table (
  id uuid,
  source_type text,
  slug text,
  name text,
  profession text,
  city text,
  services text[],
  case_types text[],
  stages text[],
  bio text,
  website text,
  remote_available boolean,
  contact_email text,
  contact_phone text,
  contact_address text,
  is_published boolean,
  moderation_status text,
  moderation_note text,
  created_at timestamptz,
  updated_at timestamptz,
  verified_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select * from (
    select
      profile.id, 'specialist'::text, profile.slug, profile.name, profile.profession,
      profile.city, profile.services, profile.case_types, profile.stages, profile.bio,
      profile.website, profile.remote_available, contact.email, contact.phone,
      concat_ws(', ', contact.street_address, contact.postal_code),
      profile.is_published, profile.moderation_status,
      profile.moderation_note, profile.created_at, profile.updated_at, profile.verified_at
    from public.specialist_profiles profile
    left join public.specialist_contacts contact on contact.profile_id = profile.id
    union all
    select
      office.id, 'notary'::text, office.slug, office.name, 'notary'::text,
      office.city, office.services, office.services,
      array['documents', 'transaction']::text[], null::text, office.website, false,
      contact.email, contact.phone, concat_ws(', ', contact.street_address, contact.postal_code),
      office.is_published, office.moderation_status,
      office.moderation_note, office.created_at, office.updated_at, office.verified_at
    from public.notary_offices office
    left join public.notary_office_contacts contact on contact.office_id = office.id
  ) directory
  where nullif(trim(p_status), '') is null or directory.moderation_status = trim(p_status)
  order by
    case directory.moderation_status when 'pending' then 0 when 'rejected' then 1 else 2 end,
    directory.updated_at desc;
end;
$$;

revoke all on function public.admin_list_directory_profiles(text) from public;
grant execute on function public.admin_list_directory_profiles(text) to authenticated;

create or replace function public.admin_set_directory_moderation(
  p_source_type text,
  p_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_status not in ('pending', 'verified', 'rejected') then raise exception 'Invalid status'; end if;

  if p_source_type = 'specialist' then
    update public.specialist_profiles
    set moderation_status = p_status,
        moderation_note = nullif(trim(p_note), ''),
        verified_at = case when p_status = 'verified' then now() else null end,
        verified_by = case when p_status = 'verified' then (select auth.uid()) else null end
    where id = p_id;
  elsif p_source_type = 'notary' then
    update public.notary_offices
    set moderation_status = p_status,
        moderation_note = nullif(trim(p_note), ''),
        verified_at = case when p_status = 'verified' then now() else null end,
        verified_by = case when p_status = 'verified' then (select auth.uid()) else null end
    where id = p_id;
  else
    raise exception 'Invalid source type';
  end if;
end;
$$;

revoke all on function public.admin_set_directory_moderation(text, uuid, text, text) from public;
grant execute on function public.admin_set_directory_moderation(text, uuid, text, text) to authenticated;

create or replace function public.admin_directory_readiness(p_city text default null)
returns table (
  city text,
  verified_profiles bigint,
  verified_professions bigint,
  target_profiles integer,
  is_ready boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  with verified_directory as (
    select profile.city, profile.profession
    from public.specialist_profiles profile
    where profile.is_published and profile.moderation_status = 'verified'
    union all
    select office.city, 'notary'::text
    from public.notary_offices office
    where office.is_published and office.moderation_status = 'verified'
  )
  select
    verified_directory.city,
    count(*)::bigint,
    count(distinct verified_directory.profession)::bigint,
    15,
    count(*) >= 15
  from verified_directory
  where nullif(trim(p_city), '') is null
    or lower(verified_directory.city) = lower(trim(p_city))
  group by verified_directory.city
  order by count(*) desc, verified_directory.city;
end;
$$;

revoke all on function public.admin_directory_readiness(text) from public;
grant execute on function public.admin_directory_readiness(text) to authenticated;

commit;
