# Infra

This folder contains deployment and operational assets, including:
- Dockerfiles and container build assets
- Compose or local orchestration files
- Monitoring/observability configuration
- Edge provisioning and bootstrap scripts

Principle: infrastructure as code with reproducible environments.

## Local Docker (MQTT + Telemetry Ingestion)
Run:
- docker compose -f infra/docker-compose.yml up --build

Stop:
- docker compose -f infra/docker-compose.yml down

Ports:
- Mosquitto: 1883
- Telemetry ingestion: 8081

Environment:
- Defaults are embedded in the compose file.
- To override, copy infra/.env.example to infra/.env and edit values.
- For Supabase inserts, set SUPABASE_SERVICE_ROLE_KEY from:
	- pnpm supabase:status

Notes:
- Mosquitto requires username/password (dev-only credentials).

## MQTT auth (dev)
Test publish:
- mosquitto_pub -h localhost -p 1883 -u apatte -P apatte-dev -t apatte/test -m "hello"

Test subscribe:
- mosquitto_sub -h localhost -p 1883 -u apatte -P apatte-dev -t apatte/# -v

Expected: publish should appear in the subscriber output. Anonymous connections should fail.
