-- Dev role helper function (service_role only)

create or replace function public.set_user_role_by_email(
  p_email text,
  p_role public.app_role
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'insufficient_privilege: service_role required';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    raise exception 'user_not_found: %', p_email;
  end if;

  update public.profiles
  set role = p_role
  where id = v_user_id;
end;
$$;

create table if not exists public.dev_seed_notes (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  note text not null
);
