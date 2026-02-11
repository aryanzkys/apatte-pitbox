-- Auth profiles and role model
-- Uses enum type for safe, constrained role values

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('engineer', 'pit', 'coach');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role public.app_role not null default 'coach',
  display_name text,
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_updated_at_idx on public.profiles (updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'coach',
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on auth.users to create profile

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Update role helper to read from profiles first, fallback to JWT metadata
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select case
    when auth.role() = 'service_role' then 'service_role'
    when (select role::text from public.profiles where id = auth.uid()) is not null
      then (select role::text from public.profiles where id = auth.uid())
    when (auth.jwt() -> 'app_metadata' ->> 'role') is not null then (auth.jwt() -> 'app_metadata' ->> 'role')
    when (auth.jwt() -> 'user_metadata' ->> 'role') is not null then (auth.jwt() -> 'user_metadata' ->> 'role')
    else null
  end;
$$;

-- Prevent role changes by non-service_role
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'insufficient_privilege: role changes require service_role';
  end if;
  return new;
end;
$$;

-- RLS on profiles
alter table public.profiles enable row level security;

create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_insert_service_role
on public.profiles
for insert
with check (auth.role() = 'service_role');

create policy profiles_delete_service_role
on public.profiles
for delete
using (auth.role() = 'service_role');

-- Guard role updates

drop trigger if exists prevent_role_change on public.profiles;
create trigger prevent_role_change
before update on public.profiles
for each row execute function public.prevent_role_change();
