# Netlify deployment (web-dashboard)

## Create site
1) In Netlify, select “New site from Git”.
2) Choose this repo.
3) Build settings (netlify.toml already configured):
   - Base directory: apps/web-dashboard (optional if Netlify reads netlify.toml)
  - Build command: pnpm install --frozen-lockfile && pnpm build
   - Publish directory: .next (handled by Next.js plugin)

## Environment variables
Set these in Netlify → Site configuration → Environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Optional dashboard tuning:
- NEXT_PUBLIC_DASHBOARD_STALE_S (default 5)
- NEXT_PUBLIC_REALTIME_ENABLED (default true)
- NEXT_PUBLIC_POLL_INTERVAL_MS (default 1000)

Security note:
- Do NOT set SUPABASE_SERVICE_ROLE_KEY in Netlify for the frontend.

## Supabase Auth redirects
In Supabase → Authentication → URL Configuration:
- Site URL: https://<your-site>.netlify.app
- Redirect URLs (minimum):
  - https://<your-site>.netlify.app
  - https://<your-site>.netlify.app/login
  - https://<your-site>.netlify.app/dashboard
- Optional: add Netlify preview URLs if you use preview deploys.

## Verify
1) Deploy succeeds in Netlify.
2) Open /login and sign in.
3) Navigate to /dashboard and confirm it loads.
4) Refresh /dashboard: session persists.
