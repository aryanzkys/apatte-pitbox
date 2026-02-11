create extension if not exists "pgcrypto";

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  device_uid text not null unique,
  device_type text not null default 'esp32',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists devices_is_active_idx on public.devices (is_active);
create index if not exists devices_created_at_idx on public.devices (created_at);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  status text not null default 'idle',
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  constraint sessions_status_check check (status in ('idle', 'prestart', 'running', 'paused', 'completed', 'aborted')),
  constraint sessions_ended_after_started_check check (ended_at is null or started_at is null or ended_at >= started_at)
);

create index if not exists sessions_status_idx on public.sessions (status);
create index if not exists sessions_started_at_idx on public.sessions (started_at desc);
create index if not exists sessions_created_at_idx on public.sessions (created_at desc);

create table if not exists public.telemetry_raw (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  ts timestamptz not null,
  device_id uuid not null references public.devices(id) on delete restrict,
  session_id uuid references public.sessions(id) on delete set null,
  topic text not null default '',
  payload jsonb not null,
  metrics jsonb not null default '{}'::jsonb,
  ingest_source text not null default 'ingestion',
  message_id text,
  checksum text,
  is_valid boolean not null default true,
  validation_errors jsonb not null default '[]'::jsonb,
  constraint telemetry_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint telemetry_metrics_object_check check (jsonb_typeof(metrics) = 'object'),
  constraint telemetry_validation_errors_array_check check (jsonb_typeof(validation_errors) = 'array')
);

create index if not exists telemetry_raw_device_ts_idx on public.telemetry_raw (device_id, ts desc);
create index if not exists telemetry_raw_session_ts_idx on public.telemetry_raw (session_id, ts desc) where session_id is not null;
create index if not exists telemetry_raw_ts_idx on public.telemetry_raw (ts desc);
create index if not exists telemetry_raw_device_created_at_idx on public.telemetry_raw (device_id, created_at desc);
