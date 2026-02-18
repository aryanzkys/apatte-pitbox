# Telemetry Ingestion

Intended purpose:
- Ingest real-time telemetry streams from on-track systems
- Normalize and validate incoming telemetry payloads
- Buffer and forward to storage/streaming backends

## Local run
1) Start dependencies:
	- pnpm supabase:start
	- pnpm supabase:status (copy service_role key)
	- docker compose -f infra/docker-compose.yml up --build
	- Or: pnpm infra up

2) Run ingestion:
	- Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/telemetry-ingestion/.env
	- Set MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD (if not defaults)
	- pnpm --filter @apatte/telemetry-ingestion dev

## Test with Mosquitto tools
Publish a test message:
- mosquitto_pub -h localhost -p 1883 -u apatte -P apatte-dev -t apatte/v1/esp32-dev-01/telemetry -m '{"v":1,"msg_id":"esp32-dev-01-1739763005123-1042","ts":"2026-02-17T10:30:05.123Z","device_uid":"esp32-dev-01","session_id":null,"type":"telemetry","data":{"metrics":{"pack_voltage_v":48.7,"pack_current_a":12.4,"inverter_temp_c":41.2,"speed_mps":11.9}},"meta":{"fw":"pitbox-fw-0.3.2","seq":1042,"sent_ms":1739763005123,"tags":["core"]}}'

Expected:
- Console logs a validated_message entry with topic, device_uid, msg_id, and ts.

Invalid example (missing msg_id):
- mosquitto_pub -h localhost -p 1883 -u apatte -P apatte-dev -t apatte/v1/esp32-dev-01/telemetry -m '{"v":1,"ts":"2026-02-17T10:30:05.123Z","device_uid":"esp32-dev-01","session_id":null,"type":"telemetry","data":{"metrics":{"pack_voltage_v":48.7}}}'

Dead-letter output:
- Default path: var/deadletter.ndjson
- Tail the file: tail -f var/deadletter.ndjson

## Health + metrics
Health:
- curl http://localhost:8081/healthz

Metrics (JSON):
- curl http://localhost:8081/metrics

Notes:
- msg_per_sec is a rolling 5-second average of processed messages.
- Set LOG_LEVEL=debug to see per-message logs (default: info).

## Batch insert validation (100 messages)
Shell (bash/zsh):
- for i in $(seq 1 100); do mosquitto_pub -h localhost -p 1883 -u apatte -P apatte-dev -t apatte/v1/esp32-dev-01/telemetry -m '{"v":1,"msg_id":"esp32-dev-01-1739763005123-'"$i"'","ts":"2026-02-18T10:30:05.123Z","device_uid":"esp32-dev-01","session_id":null,"type":"telemetry","data":{"metrics":{"pack_voltage_v":48.7,"pack_current_a":12.4,"inverter_temp_c":41.2,"speed_mps":11.9}},"meta":{"fw":"pitbox-fw-0.3.2","seq":'"$i"',"sent_ms":1739763005123,"tags":["core"]}}'; done

PowerShell:
- 1..100 | ForEach-Object { mosquitto_pub -h localhost -p 1883 -u apatte -P apatte-dev -t apatte/v1/esp32-dev-01/telemetry -m ("{\"v\":1,\"msg_id\":\"esp32-dev-01-1739763005123-$($_)\",\"ts\":\"2026-02-18T10:30:05.123Z\",\"device_uid\":\"esp32-dev-01\",\"session_id\":null,\"type\":\"telemetry\",\"data\":{\"metrics\":{\"pack_voltage_v\":48.7,\"pack_current_a\":12.4,\"inverter_temp_c\":41.2,\"speed_mps\":11.9}},\"meta\":{\"fw\":\"pitbox-fw-0.3.2\",\"seq\":$($_),\"sent_ms\":1739763005123,\"tags\":[\"core\"]}}" ) }

Verify rows exist:
- Supabase Studio Table Editor -> public.telemetry_raw
- Or SQL: select count(*) from public.telemetry_raw;
