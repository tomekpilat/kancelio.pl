-- Private client case workspace and granular directory services.

alter table public.notary_offices
  drop constraint if exists notary_offices_services_check;

alter table public.notary_offices
  add constraint notary_offices_services_check check (
    services <@ array[
      'sale', 'donation', 'power', 'will', 'mortgage', 'inheritance',
      'inheritance_rejection', 'occasional_lease', 'preliminary_sale',
      'marital', 'company', 'certification'
    ]::text[]
  );

create table if not exists public.client_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_type text not null check (
    case_type in (
      'inheritance_rejection', 'occasional_lease', 'preliminary_sale',
      'sale', 'donation', 'power', 'will'
    )
  ),
  title text not null check (char_length(title) between 3 and 120),
  city text check (city is null or char_length(city) between 2 and 100),
  completed_items text[] not null default '{}',
  status text not null default 'preparing' check (status in ('preparing', 'ready', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(completed_items) <= 30)
);

create index if not exists client_cases_owner_idx
  on public.client_cases (owner_id, updated_at desc);

drop trigger if exists set_client_cases_updated_at on public.client_cases;
create trigger set_client_cases_updated_at
before update on public.client_cases
for each row execute function public.set_updated_at();

alter table public.client_cases enable row level security;

drop policy if exists "Clients can read their cases" on public.client_cases;
create policy "Clients can read their cases"
on public.client_cases for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Clients can create their cases" on public.client_cases;
create policy "Clients can create their cases"
on public.client_cases for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Clients can update their cases" on public.client_cases;
create policy "Clients can update their cases"
on public.client_cases for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Clients can delete their cases" on public.client_cases;
create policy "Clients can delete their cases"
on public.client_cases for delete to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.client_cases from anon;
grant select, insert, update, delete on public.client_cases to authenticated;
