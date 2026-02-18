# Web Dashboard

Supabase Auth login UI for the Apatte Pitbox dashboard.

## Local setup
1) Start Supabase:
	- pnpm supabase:start
	- pnpm supabase:status (copy anon key)
2) Set env vars in .env:
	- NEXT_PUBLIC_SUPABASE_URL
	- NEXT_PUBLIC_SUPABASE_ANON_KEY
	- NEXT_PUBLIC_DASHBOARD_STALE_S (optional, default 5)
	- NEXT_PUBLIC_REALTIME_ENABLED (optional, default true)
	- NEXT_PUBLIC_POLL_INTERVAL_MS (optional, default 1000)
3) Run the dashboard:
	- pnpm --filter @apatte/web-dashboard dev

Open:
- http://localhost:3000/login

Create a user in Supabase Studio Auth and log in with email/password.

## Role-based routes
- /dashboard (overview)
- /dashboard/engineer
- /dashboard/pit
- /dashboard/coach

Set role locally (after signup):
- select public.set_user_role_by_email('your@email.com','pit');

## Protected API testing
- Unauthorized (incognito):
	- http://localhost:3000/api/me
	- Expect 401
- Authorized (after login in same browser):
	- http://localhost:3000/api/me
	- Expect 200 JSON

Session is cookie-based, so the logged-in browser carries the token.

## Session persistence
- Cookies + SSR keep sessions alive across refresh.
- Middleware refreshes tokens on navigation.
- Client auto-refresh runs in the background.

If you see random logout:
- Clear cookies for localhost
- Check system clock accuracy
- Restart Supabase and the dev server

## Realtime telemetry
- Dashboard subscribes to Supabase Realtime INSERT events on public.telemetry_raw.
- If realtime is unavailable, it falls back to polling /api/telemetry/latest every 1s.
- Online/offline is computed from the latest telemetry timestamp and NEXT_PUBLIC_DASHBOARD_STALE_S.

## Verify realtime
1) Start Supabase and telemetry ingestion.
2) Login and open /dashboard.
3) Publish MQTT telemetry (ingestion inserts into public.telemetry_raw).
4) Confirm values update without refresh:
	- Speed changes live
	- System status flips to Offline after stale seconds
	- Metrics show “-” when missing
