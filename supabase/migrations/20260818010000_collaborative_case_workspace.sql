-- Collaborative, end-to-end client cases with assignments and private files.

begin;

create table if not exists public.client_case_participants (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (char_length(email) between 3 and 254),
  display_name text not null check (char_length(display_name) between 2 and 80),
  role text not null default 'collaborator' check (role in ('owner', 'collaborator')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  invite_token uuid,
  invite_expires_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (
    (status = 'active' and user_id is not null) or
    (status = 'pending' and user_id is null and invite_token is not null)
  )
);

create unique index if not exists client_case_participants_case_email_idx
  on public.client_case_participants (case_id, lower(email));
create unique index if not exists client_case_participants_case_user_idx
  on public.client_case_participants (case_id, user_id)
  where user_id is not null;
create unique index if not exists client_case_participants_token_idx
  on public.client_case_participants (invite_token)
  where invite_token is not null;

create table if not exists public.client_case_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  template_key text,
  item_type text not null default 'document' check (item_type in ('document', 'task')),
  category text not null default 'documents' check (
    category in ('preparation', 'documents', 'transaction', 'aftercare')
  ),
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 600),
  assigned_participant_id uuid references public.client_case_participants(id) on delete set null,
  due_date date,
  completed boolean not null default false,
  is_custom boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_case_items_template_idx
  on public.client_case_items (case_id, template_key)
  where template_key is not null;
create index if not exists client_case_items_case_idx
  on public.client_case_items (case_id, category, sort_order, created_at);

drop trigger if exists set_client_case_items_updated_at on public.client_case_items;
create trigger set_client_case_items_updated_at
before update on public.client_case_items
for each row execute function public.set_updated_at();

create table if not exists public.client_case_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  item_id uuid not null references public.client_case_items(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 10 and 700),
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists client_case_files_item_idx
  on public.client_case_files (item_id, created_at);

create or replace function public.validate_client_case_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assigned_participant_id is not null and not exists (
    select 1 from public.client_case_participants
    where id = new.assigned_participant_id and case_id = new.case_id
  ) then
    raise exception 'assignee_not_in_case';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_client_case_item on public.client_case_items;
create trigger validate_client_case_item
before insert or update on public.client_case_items
for each row execute function public.validate_client_case_item();

create or replace function public.validate_client_case_file()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.client_case_items
    where id = new.item_id and case_id = new.case_id
  ) then
    raise exception 'file_item_not_in_case';
  end if;
  if new.storage_path not like (new.case_id::text || '/' || new.item_id::text || '/%') then
    raise exception 'invalid_file_path';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_client_case_file on public.client_case_files;
create trigger validate_client_case_file
before insert or update on public.client_case_files
for each row execute function public.validate_client_case_file();

create or replace function public.is_client_case_owner(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.client_cases
    where id = target_case_id and owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_client_case_participant(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.is_client_case_owner(target_case_id) or exists (
    select 1 from public.client_case_participants
    where case_id = target_case_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

revoke all on function public.is_client_case_owner(uuid) from public;
revoke all on function public.is_client_case_participant(uuid) from public;
grant execute on function public.is_client_case_owner(uuid) to authenticated;
grant execute on function public.is_client_case_participant(uuid) to authenticated;

create or replace function public.add_owner_case_participant()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  owner_email text;
begin
  select email into owner_email from auth.users where id = new.owner_id;
  insert into public.client_case_participants (
    case_id, user_id, email, display_name, role, status, created_by, accepted_at
  ) values (
    new.id, new.owner_id, coalesce(owner_email, 'konto@kancelio.pl'),
    'Właściciel sprawy', 'owner', 'active', new.owner_id, now()
  ) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists add_owner_case_participant on public.client_cases;
create trigger add_owner_case_participant
after insert on public.client_cases
for each row execute function public.add_owner_case_participant();

insert into public.client_case_participants (
  case_id, user_id, email, display_name, role, status, created_by, accepted_at
)
select c.id, c.owner_id, coalesce(u.email, 'konto@kancelio.pl'),
       'Właściciel sprawy', 'owner', 'active', c.owner_id, c.created_at
from public.client_cases c
left join auth.users u on u.id = c.owner_id
on conflict do nothing;

create or replace function public.create_client_case_invitation(
  target_case_id uuid,
  invited_email text,
  participant_name text default 'Druga strona'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  normalized_email text := lower(trim(invited_email));
  normalized_name text := trim(participant_name);
  next_token uuid := gen_random_uuid();
  existing_id uuid;
begin
  if (select auth.uid()) is null or not public.is_client_case_owner(target_case_id) then
    raise exception 'not_allowed';
  end if;
  if normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email';
  end if;
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
    raise exception 'invalid_name';
  end if;
  if normalized_email = lower(coalesce((select email from auth.users where id = (select auth.uid())), '')) then
    raise exception 'cannot_invite_self';
  end if;

  select id into existing_id
  from public.client_case_participants
  where case_id = target_case_id and lower(email) = normalized_email;

  if existing_id is not null then
    update public.client_case_participants
    set display_name = normalized_name,
        invite_token = case when status = 'pending' then next_token else invite_token end,
        invite_expires_at = case when status = 'pending' then now() + interval '7 days' else invite_expires_at end
    where id = existing_id;
    if (select status from public.client_case_participants where id = existing_id) = 'active' then
      raise exception 'already_joined';
    end if;
  else
    insert into public.client_case_participants (
      case_id, email, display_name, role, status, invite_token,
      invite_expires_at, created_by
    ) values (
      target_case_id, normalized_email, normalized_name, 'collaborator',
      'pending', next_token, now() + interval '7 days', (select auth.uid())
    );
  end if;
  return next_token;
end;
$$;

create or replace function public.accept_client_case_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  invitation public.client_case_participants%rowtype;
  signed_in_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if (select auth.uid()) is null then raise exception 'sign_in_required'; end if;
  select * into invitation
  from public.client_case_participants
  where invite_token = invitation_token and status = 'pending'
  for update;
  if invitation.id is null then raise exception 'invalid_invitation'; end if;
  if invitation.invite_expires_at < now() then raise exception 'invitation_expired'; end if;
  if lower(invitation.email) <> signed_in_email then raise exception 'email_mismatch'; end if;

  update public.client_case_participants
  set user_id = (select auth.uid()), status = 'active', accepted_at = now(),
      invite_token = null, invite_expires_at = null
  where id = invitation.id;
  return invitation.case_id;
end;
$$;

revoke all on function public.create_client_case_invitation(uuid, text, text) from public;
revoke all on function public.accept_client_case_invitation(uuid) from public;
grant execute on function public.create_client_case_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_client_case_invitation(uuid) to authenticated;

alter table public.client_case_participants enable row level security;
alter table public.client_case_items enable row level security;
alter table public.client_case_files enable row level security;

drop policy if exists "Clients can read their cases" on public.client_cases;
drop policy if exists "Participants can read cases" on public.client_cases;
create policy "Participants can read cases"
on public.client_cases for select to authenticated
using (public.is_client_case_participant(id));

drop policy if exists "Clients can update their cases" on public.client_cases;
drop policy if exists "Owners can update cases" on public.client_cases;
create policy "Owners can update cases"
on public.client_cases for update to authenticated
using (public.is_client_case_owner(id))
with check (public.is_client_case_owner(id));

drop policy if exists "Clients can delete their cases" on public.client_cases;
drop policy if exists "Owners can delete cases" on public.client_cases;
create policy "Owners can delete cases"
on public.client_cases for delete to authenticated
using (public.is_client_case_owner(id));

drop policy if exists "Participants can read case participants" on public.client_case_participants;
create policy "Participants can read case participants"
on public.client_case_participants for select to authenticated
using (public.is_client_case_participant(case_id));
drop policy if exists "Owners can remove collaborators" on public.client_case_participants;
create policy "Owners can remove collaborators"
on public.client_case_participants for delete to authenticated
using (public.is_client_case_owner(case_id) and role = 'collaborator');

drop policy if exists "Participants can read case items" on public.client_case_items;
create policy "Participants can read case items"
on public.client_case_items for select to authenticated
using (public.is_client_case_participant(case_id));
drop policy if exists "Participants can create case items" on public.client_case_items;
create policy "Participants can create case items"
on public.client_case_items for insert to authenticated
with check (public.is_client_case_participant(case_id) and created_by = (select auth.uid()));
drop policy if exists "Participants can update case items" on public.client_case_items;
create policy "Participants can update case items"
on public.client_case_items for update to authenticated
using (public.is_client_case_participant(case_id))
with check (public.is_client_case_participant(case_id));
drop policy if exists "Participants can delete case items" on public.client_case_items;
create policy "Participants can delete case items"
on public.client_case_items for delete to authenticated
using (public.is_client_case_participant(case_id) and (created_by = (select auth.uid()) or public.is_client_case_owner(case_id)));

drop policy if exists "Participants can read case files" on public.client_case_files;
create policy "Participants can read case files"
on public.client_case_files for select to authenticated
using (public.is_client_case_participant(case_id));
drop policy if exists "Participants can create case files" on public.client_case_files;
create policy "Participants can create case files"
on public.client_case_files for insert to authenticated
with check (public.is_client_case_participant(case_id) and uploaded_by = (select auth.uid()));
drop policy if exists "Uploaders and owners can delete case files" on public.client_case_files;
create policy "Uploaders and owners can delete case files"
on public.client_case_files for delete to authenticated
using (public.is_client_case_owner(case_id) or uploaded_by = (select auth.uid()));

revoke all on public.client_case_participants from authenticated;
grant select (id, case_id, user_id, email, display_name, role, status, created_at, accepted_at)
  on public.client_case_participants to authenticated;
grant delete on public.client_case_participants to authenticated;
grant select, insert, update, delete on public.client_case_items to authenticated;
grant select, insert, delete on public.client_case_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-documents', 'case-documents', false, 10485760,
  array[
    'application/pdf', 'image/jpeg', 'image/png', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_case_file_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  case_text text := split_part(object_name, '/', 1);
begin
  if case_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  return public.is_client_case_participant(case_text::uuid);
end;
$$;

revoke all on function public.can_access_case_file_path(text) from public;
grant execute on function public.can_access_case_file_path(text) to authenticated;

drop policy if exists "Participants can read private case documents" on storage.objects;
create policy "Participants can read private case documents"
on storage.objects for select to authenticated
using (bucket_id = 'case-documents' and public.can_access_case_file_path(name));

drop policy if exists "Participants can upload private case documents" on storage.objects;
create policy "Participants can upload private case documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'case-documents' and public.can_access_case_file_path(name));
drop policy if exists "Participants can update private case documents" on storage.objects;
create policy "Participants can update private case documents"
on storage.objects for update to authenticated
using (bucket_id = 'case-documents' and public.can_access_case_file_path(name))
with check (bucket_id = 'case-documents' and public.can_access_case_file_path(name));
drop policy if exists "Participants can delete private case documents" on storage.objects;
create policy "Participants can delete private case documents"
on storage.objects for delete to authenticated
using (bucket_id = 'case-documents' and public.can_access_case_file_path(name));

commit;
