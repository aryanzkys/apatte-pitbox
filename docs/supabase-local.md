# Supabase Local Development

## Prerequisites
- Docker
- Supabase CLI

## Steps
1) Copy .env.example to .env
2) Run:
   - pnpm supabase:start
3) Fetch keys:
   - pnpm supabase:status
   - Copy the anon and service role keys into .env
4) Open Supabase Studio:
   - http://localhost:54323

## Migrations
- Apply migrations locally:
  - pnpm supabase:reset
- Verify tables:
  - Supabase Studio → Table Editor

## Time-series data
- See docs/timeseries.md for partitioning strategy and examples.

## RLS
- See docs/rls.md for policies and local verification steps.

## Auth roles
- See docs/auth-roles.md for profiles and role management.

## Reset + Seed (One Command)
- pnpm db:reset

Seeds include:
- Device: ESP32-DEV-01
- Session: Dev Session 1
- ~10 telemetry points

Set a user role (after signup):
- select public.set_user_role_by_email('your@email.com','pit');

## Verify seed
- In Studio Table Editor:
   - devices has ESP32-DEV-01
   - sessions has Dev Session 1
   - telemetry_raw has ~10 rows
- Helper function exists:
   - select public.set_user_role_by_email('your@email.com','pit');

## Troubleshooting
- Ports in use: stop the conflicting service or adjust ports in supabase/config.toml
- Docker not running: start Docker Desktop and retry
- Reset DB:
  - pnpm supabase:reset
