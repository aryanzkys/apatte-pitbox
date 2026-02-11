-- Sample data insert + query plan inspection

insert into public.devices (name, device_uid, device_type)
values ('ESP32-01', 'dev-esp32-01', 'esp32')
returning id;

insert into public.sessions (name, status, started_at)
values ('Attempt 1 - Test Run', 'running', now())
returning id;

-- Replace with returned IDs if running manually
-- Example assumes variables for illustration only
-- \set device_id '00000000-0000-0000-0000-000000000000'
-- \set session_id '00000000-0000-0000-0000-000000000000'

insert into public.telemetry_raw (ts, device_id, session_id, topic, payload, metrics)
select
  now() - (i || ' seconds')::interval,
  (select id from public.devices where device_uid = 'dev-esp32-01'),
  (select id from public.sessions where name = 'Attempt 1 - Test Run'),
  'apatte/test',
  jsonb_build_object('v', i),
  jsonb_build_object('speed', i)
from generate_series(1, 50) as s(i);

explain (analyze, buffers)
select *
from public.telemetry_raw
where device_id = (select id from public.devices where device_uid = 'dev-esp32-01')
  and ts between now() - interval '2 minutes' and now()
order by ts desc
limit 10;
