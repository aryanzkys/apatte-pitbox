-- RLS policies for core tables
-- App role is derived from JWT app_metadata/user_metadata

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select case
    when auth.role() = 'service_role' then 'service_role'
    when (auth.jwt() -> 'app_metadata' ->> 'role') is not null then (auth.jwt() -> 'app_metadata' ->> 'role')
    when (auth.jwt() -> 'user_metadata' ->> 'role') is not null then (auth.jwt() -> 'user_metadata' ->> 'role')
    else null
  end;
$$;

create or replace function public.is_role_allowed(p_allowed text[])
returns boolean
language sql
stable
as $$
  select public.current_app_role() = any (p_allowed);
$$;

-- Enable RLS
alter table public.devices enable row level security;
alter table public.sessions enable row level security;
alter table public.telemetry_raw enable row level security;

-- devices policies
create policy devices_select_by_app_role
on public.devices
for select
using (public.is_role_allowed(array['pit','engineer','coach']));

create policy devices_write_service_role
on public.devices
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- sessions policies
create policy sessions_select_by_app_role
on public.sessions
for select
using (public.is_role_allowed(array['pit','engineer','coach']));

create policy sessions_write_engineer_or_service_role
on public.sessions
for insert
with check (
  public.is_role_allowed(array['engineer'])
  or auth.role() = 'service_role'
);

create policy sessions_update_engineer_or_service_role
on public.sessions
for update
using (
  public.is_role_allowed(array['engineer'])
  or auth.role() = 'service_role'
)
with check (
  public.is_role_allowed(array['engineer'])
  or auth.role() = 'service_role'
);

-- telemetry_raw policies
create policy telemetry_raw_select_by_app_role
on public.telemetry_raw
for select
using (public.is_role_allowed(array['pit','engineer','coach']));

create policy telemetry_raw_insert_service_role
on public.telemetry_raw
for insert
with check (auth.role() = 'service_role');
