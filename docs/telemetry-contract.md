# Telemetry Contract (MQTT v1)

This document defines the single shared contract for MQTT topic naming and JSON payload shape used by Apatte Pitbox telemetry producers and consumers.

Scope:
- Device publish format
- Ingestion validation rules
- UI field expectations

## 1) Topic hierarchy

Base pattern:
- apatte/v1/<device_uid>/<channel>

Segments:
- apatte: fixed namespace
- v1: contract version namespace
- <device_uid>: must match devices.device_uid (stable firmware identifier)
- <channel>: one of telemetry, status, event, cmd

Required minimal topics:
- apatte/v1/<device_uid>/telemetry
- apatte/v1/<device_uid>/status
- apatte/v1/<device_uid>/event

Optional extension topics:
- apatte/v1/<device_uid>/telemetry/<stream>
- <stream> can be: core, power, gps, temps

Examples:
- apatte/v1/esp32-dev-01/telemetry
- apatte/v1/esp32-dev-01/telemetry/core
- apatte/v1/esp32-dev-01/status
- apatte/v1/esp32-dev-01/event

## 2) QoS and retain policy

Recommended defaults:
- telemetry: QoS 0 (default) or QoS 1, retain=false
- status: QoS 1, retain=true
- event: QoS 1, retain=false

Tradeoffs:
- QoS 0 minimizes latency and broker load for high-frequency streams.
- QoS 1 improves delivery assurance for critical state/event messages.
- retain=true on status provides last-known device state immediately to new subscribers.

## 3) Topic naming rules

Rules:
- lowercase only
- no spaces
- hyphen allowed in device_uid
- recommended max topic length: 128 chars
- device_uid must be stable over device lifetime

Valid examples:
- apatte/v1/ph-h2-ecu-01/telemetry
- apatte/v1/uc-be-ctrl-02/status

Invalid examples:
- Apatte/v1/device 01/telemetry
- apatte/v1/device_uid/Telemetry

## 4) Common envelope (required for all channels)

Root must be a JSON object.

Required top-level fields:
- v: number (must be 1)
- msg_id: string (unique per device message)
- ts: string (RFC3339/ISO8601 with timezone)
- device_uid: string
- session_id: string | null
- type: "telemetry" | "status" | "event"
- data: object
- meta: object (optional, defaults to {})

Meta fields (optional):
- fw: string (firmware version)
- seq: number (monotonic sequence)
- sent_ms: number (device epoch ms)
- tags: string[]

Message id guidance:
- required
- length <= 64
- recommended format: <device_uid>-<epoch_ms>-<seq>

## 5) Channel-specific data contracts

### 5.1 Telemetry (type="telemetry")

data object:
- metrics: object (required)
- flags: object (optional; boolean values)
- gps: object (optional)
- errors: array (optional)

Metrics naming:
- metric keys must be snake_case
- include unit suffix in key name where applicable

Unit suffix conventions:
- _v, _a, _w, _c, _kpa, _mps, _pct, _wh, _mah, _deg, _rad, _ms

Telemetry metric minimum set (at least one stream should include):
- pack_voltage_v
- pack_current_a
- stack_temp_c (or inverter_temp_c)
- speed_mps (or gps.speed_mps)

gps object (if present):
- lat: number
- lon: number
- alt_m: number | null
- speed_mps: number | null
- heading_deg: number | null
- hdop: number | null

### 5.2 Status (type="status")

data object:
- state: "booting" | "ready" | "running" | "fault" | "offline"
- uptime_s: number
- rssi_dbm: number | null
- battery_pct: number | null
- last_error: string | null
- health: object (optional)

### 5.3 Event (type="event")

data object:
- name: string
- severity: "info" | "warn" | "critical"
- message: string
- context: object (optional)

## 6) Validation rules

Ingestion validators must enforce:
- v must equal 1
- type must match topic channel:
  - .../telemetry => type="telemetry"
  - .../status => type="status"
  - .../event => type="event"
- device_uid in payload must equal topic <device_uid>
- ts must parse as timestamptz
- msg_id required and length <= 64
- data must be object
- if type=telemetry, data.metrics must be object
- if present, meta must be object
- root must not be array

Top-level field policy:
- recommended strict set: [v, msg_id, ts, device_uid, session_id, type, data, meta]
- additional top-level fields should be rejected or accepted with warning (team decision per validator mode)

## 7) Compatibility strategy

Versioning rules:
- breaking changes require version bump (v2, v3, ...)
- additive fields are allowed within v1
- field removals/renames are breaking

Deprecation guidance:
- keep deprecated keys available for a transition window (target: N months, to be finalized)

## 8) Examples

### 8.1 Telemetry example
Topic:
- apatte/v1/esp32-dev-01/telemetry/core

Payload:
```json
{
  "v": 1,
  "msg_id": "esp32-dev-01-1739763005123-1042",
  "ts": "2026-02-17T10:30:05.123Z",
  "device_uid": "esp32-dev-01",
  "session_id": "5d7845f8-34fd-4e98-b4a6-1b1234aa7789",
  "type": "telemetry",
  "data": {
    "metrics": {
      "pack_voltage_v": 48.7,
      "pack_current_a": 12.4,
      "inverter_temp_c": 41.2,
      "speed_mps": 11.9
    },
    "flags": {
      "regen_active": true,
      "sensor_fault": false
    },
    "gps": {
      "lat": -8.8923,
      "lon": 116.3011,
      "alt_m": 14.2,
      "speed_mps": 11.9,
      "heading_deg": 87.5,
      "hdop": 0.9
    },
    "errors": []
  },
  "meta": {
    "fw": "pitbox-fw-0.3.2",
    "seq": 1042,
    "sent_ms": 1739763005123,
    "tags": ["car-a", "core"]
  }
}
```

### 8.2 Status example
Topic:
- apatte/v1/esp32-dev-01/status

Payload:
```json
{
  "v": 1,
  "msg_id": "esp32-dev-01-1739763010000-1043",
  "ts": "2026-02-17T10:30:10.000Z",
  "device_uid": "esp32-dev-01",
  "session_id": null,
  "type": "status",
  "data": {
    "state": "running",
    "uptime_s": 8642,
    "rssi_dbm": -66,
    "battery_pct": 88.5,
    "last_error": null,
    "health": {
      "sensor_ok": true,
      "storage_ok": true
    }
  },
  "meta": {
    "fw": "pitbox-fw-0.3.2",
    "seq": 1043,
    "sent_ms": 1739763010000,
    "tags": ["heartbeat"]
  }
}
```

### 8.3 Event example
Topic:
- apatte/v1/esp32-dev-01/event

Payload:
```json
{
  "v": 1,
  "msg_id": "esp32-dev-01-1739763012455-1044",
  "ts": "2026-02-17T10:30:12.455Z",
  "device_uid": "esp32-dev-01",
  "session_id": "5d7845f8-34fd-4e98-b4a6-1b1234aa7789",
  "type": "event",
  "data": {
    "name": "FAULT",
    "severity": "warn",
    "message": "Inverter temperature crossed warning threshold",
    "context": {
      "inverter_temp_c": 75.1,
      "threshold_c": 72.0,
      "sector": "S3"
    }
  },
  "meta": {
    "fw": "pitbox-fw-0.3.2",
    "seq": 1044,
    "sent_ms": 1739763012455,
    "tags": ["thermal", "fault"]
  }
}
```

## 9) Single source of truth usage plan

How code will use this contract:
- Ingestion service:
  - parse topic and envelope
  - validate envelope + channel schema
  - write raw message into telemetry_raw.payload
  - write normalized metrics map into telemetry_raw.metrics
- UI:
  - consume consistent field names from realtime DB rows or MQTT bridge (future)
  - render channel-specific views without field remapping per device

Planned mirroring targets:
- packages/types for TypeScript interfaces
- optional JSON Schema at docs/schema/telemetry.v1.json

## 10) Cross-links

- [Environment variables](env.md)
- [Time-series storage strategy](timeseries.md)
- [Auth roles](auth-roles.md)
