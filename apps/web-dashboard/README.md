# Web Dashboard

Supabase Auth login UI for the Apatte Pitbox dashboard.

## Local setup
1) Start Supabase:
	- pnpm supabase:start
	- pnpm supabase:status (copy anon key)
2) Set env vars in .env:
	- NEXT_PUBLIC_SUPABASE_URL
	- NEXT_PUBLIC_SUPABASE_ANON_KEY
3) Run the dashboard:
	- pnpm --filter @apatte/web-dashboard dev

Open:
- http://localhost:3000/login

Create a user in Supabase Studio Auth and log in with email/password.
