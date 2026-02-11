# Row Level Security (RLS)

## Summary
RLS is enabled on core tables: devices, sessions, telemetry_raw.
Roles are derived from JWT metadata:
- app_metadata.role (preferred)
- user_metadata.role (fallback)

Supported read roles:
- pit
- engineer
- coach

Write access:
- devices: service_role only
- telemetry_raw: service_role only
- sessions: engineer or service_role

## Why Studio can bypass RLS
Supabase Studio uses the service role key, which bypasses RLS. To test RLS,
use anon or user tokens from the client.

## Verify locally
1) Start Supabase:
   - pnpm supabase:start
2) Create a user in Auth (Studio) and set app_metadata.role = "pit".
3) Fetch an access token for that user.

### A) Anonymous (should fail)
Use the anon key without a user token:

curl "http://localhost:54321/rest/v1/telemetry_raw?select=*" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>"

Expected: 401 or permission denied.

### B) Authenticated pit role (should succeed)
Use the user JWT in Authorization:

curl "http://localhost:54321/rest/v1/telemetry_raw?select=*" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>"

Expected: 200 and rows (if any exist).
