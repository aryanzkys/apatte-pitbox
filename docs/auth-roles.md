# Auth Roles

## Roles
- engineer: can operate and manage sessions (race ops)
- pit: pit-wall operator (read telemetry)
- coach: read-only (default)

Default role: coach (least privilege).

## Profiles table
Profiles are created automatically on signup via a trigger on auth.users.
Each profile is linked to auth.users(id).

## How authorization works
RLS uses public.current_app_role(), which resolves:
1) service_role
2) profiles.role (preferred)
3) JWT app_metadata.role or user_metadata.role (fallback)

## Promote a user (local dev)
Option A: SQL in Studio (service role context)

update public.profiles
set role = 'engineer'
where id = '<user_uuid>';

Option B: Supabase Auth UI
- Update app_metadata.role to "engineer" (fallback path only).

## Notes
- Users can update their own display_name and avatar_url.
- Role changes are restricted to service_role via trigger.
