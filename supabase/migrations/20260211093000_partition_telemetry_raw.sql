-- Partition telemetry_raw by event timestamp (ts) using weekly range partitions.
-- Note: This migration assumes a clean reset in early stage.

create extension if not exists "pgcrypto";

-- Drop unpartitioned table if it exists (early-stage, safe on clean reset)
drop table if exists public.telemetry_raw cascade;

create table public.telemetry_raw (
  id bigint generated always as identity,
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
  constraint telemetry_raw_pk primary key (id, ts),
  constraint telemetry_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint telemetry_metrics_object_check check (jsonb_typeof(metrics) = 'object'),
  constraint telemetry_validation_errors_array_check check (jsonb_typeof(validation_errors) = 'array')
) partition by range (ts);

-- Parent indexes (propagate to partitions)
create index if not exists telemetry_raw_device_ts_idx on public.telemetry_raw (device_id, ts desc);
create index if not exists telemetry_raw_session_ts_idx on public.telemetry_raw (session_id, ts desc);
create index if not exists telemetry_raw_ts_idx on public.telemetry_raw (ts desc);

-- Default partition for out-of-range or late-arriving data
create table if not exists public.telemetry_raw_default
  partition of public.telemetry_raw default;

-- Helper to create a weekly partition if it does not exist
create or replace function public.create_telemetry_partition(
  p_start timestamptz,
  p_end timestamptz
) returns void as $$
begin
  execute format(
    'create table if not exists public.telemetry_raw_%s partition of public.telemetry_raw for values from (%L) to (%L)'
    , to_char(p_start, 'YYYYMMDD'), p_start, p_end
  );
end;
$$ language plpgsql;

-- Create a fixed set of weekly partitions for local/dev (2026-01-01 through 2026-04-01)
select public.create_telemetry_partition('2026-01-01'::timestamptz, '2026-01-08'::timestamptz);
select public.create_telemetry_partition('2026-01-08'::timestamptz, '2026-01-15'::timestamptz);
select public.create_telemetry_partition('2026-01-15'::timestamptz, '2026-01-22'::timestamptz);
select public.create_telemetry_partition('2026-01-22'::timestamptz, '2026-01-29'::timestamptz);
select public.create_telemetry_partition('2026-01-29'::timestamptz, '2026-02-05'::timestamptz);
select public.create_telemetry_partition('2026-02-05'::timestamptz, '2026-02-12'::timestamptz);
select public.create_telemetry_partition('2026-02-12'::timestamptz, '2026-02-19'::timestamptz);
select public.create_telemetry_partition('2026-02-19'::timestamptz, '2026-02-26'::timestamptz);
select public.create_telemetry_partition('2026-02-26'::timestamptz, '2026-03-05'::timestamptz);
select public.create_telemetry_partition('2026-03-05'::timestamptz, '2026-03-12'::timestamptz);
select public.create_telemetry_partition('2026-03-12'::timestamptz, '2026-03-19'::timestamptz);
select public.create_telemetry_partition('2026-03-19'::timestamptz, '2026-03-26'::timestamptz);
select public.create_telemetry_partition('2026-03-26'::timestamptz, '2026-04-02'::timestamptz);
