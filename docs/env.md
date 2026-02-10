# Environment Variables

## Overview
Apatte Pitbox uses environment variables to configure apps and services. All env
keys are UPPER_SNAKE_CASE. Do not commit secrets to the repo.

## Global vs app-specific
Global (shared across apps):
- NODE_ENV
- LOG_LEVEL

App-specific:
- web-dashboard: SUPABASE_URL, SUPABASE_ANON_KEY
- telemetry-ingestion: MQTT_BROKER_URL, TELEMETRY_TOPIC_PREFIX, INGESTION_BATCH_SIZE, INGESTION_FLUSH_MS
- edge-agent: MQTT_BROKER_URL, MQTT_CLIENT_ID
- ml-engine: no app-specific required vars today

## Local workflow
1) Copy the safe template to .env:
   - cp .env.local.example .env
2) Run:
   - pnpm install
   - pnpm dev

Apps will fail fast if required variables are missing.

## Production workflow
- Set environment variables in the hosting platform (e.g., Netlify, Vercel, or container runtime).
- For edge deployments, use device-specific env files or secrets management.
- For CI, use encrypted secrets provided by the CI system.

## Variable reference
| Name | Required for | Example | Notes |
| --- | --- | --- | --- |
| NODE_ENV | All apps | development | Optional, default development |
| LOG_LEVEL | All apps | info | Optional, default info |
| SUPABASE_URL | web-dashboard | http://localhost:54321 | Required for dashboard runtime |
| SUPABASE_ANON_KEY | web-dashboard | anon-placeholder | Required for dashboard runtime |
| SUPABASE_SERVICE_ROLE_KEY | server-side only | (empty) | DO NOT expose to client |
| MQTT_BROKER_URL | telemetry-ingestion, edge-agent | mqtt://localhost:1883 | Required for ingestion/edge |
| MQTT_USERNAME | telemetry-ingestion, edge-agent | (empty) | Optional |
| MQTT_PASSWORD | telemetry-ingestion, edge-agent | (empty) | Optional |
| MQTT_CLIENT_ID | telemetry-ingestion, edge-agent | apatte-local | Optional |
| TELEMETRY_TOPIC_PREFIX | telemetry-ingestion | apatte | Optional, default apatte |
| INGESTION_BATCH_SIZE | telemetry-ingestion | 200 | Optional, default 200 |
| INGESTION_FLUSH_MS | telemetry-ingestion | 250 | Optional, default 250 |
| WEB_PORT | web-dashboard | 3000 | Optional |
| INGESTION_PORT | telemetry-ingestion | 4000 | Optional |
| EDGE_PORT | edge-agent | 5000 | Optional |
