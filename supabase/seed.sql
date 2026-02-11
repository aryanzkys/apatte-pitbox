-- Dev-only seed data for local Supabase

-- Device
insert into public.devices (name, device_uid, device_type, is_active, metadata)
values (
	'ESP32-DEV-01',
	'esp32-dev-01',
	'esp32',
	true,
	jsonb_build_object('firmware_version', '0.1.0', 'notes', 'seed device')
)
on conflict (device_uid) do nothing;

-- Session
insert into public.sessions (name, status, notes)
values (
	'Dev Session 1',
	'idle',
	'Seeded local dev session'
);

-- Telemetry points (10 rows)
insert into public.telemetry_raw (ts, device_id, session_id, topic, payload, metrics, is_valid)
select
	now() - (i || ' seconds')::interval,
	(select id from public.devices where device_uid = 'esp32-dev-01'),
	(select id from public.sessions where name = 'Dev Session 1' order by created_at desc limit 1),
	'apatte/dev',
	jsonb_build_object('v', i, 'temp', 20 + i),
	jsonb_build_object('speed', i, 'rpm', i * 100),
	true
from generate_series(1, 10) as s(i);

-- Dev role note
insert into public.dev_seed_notes (note)
values (
	'After signing up with email pit@example.com, run: select public.set_user_role_by_email(''pit@example.com'',''pit'');'
);
