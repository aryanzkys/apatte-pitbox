import type { AnyEnvelope } from "../validation/telemetry-v1";

export type TelemetryInsertRow = {
  ts: string;
  device_id: string;
  session_id: string | null;
  topic: string;
  payload: unknown;
  metrics: unknown;
  ingest_source: string;
  is_valid: boolean;
  validation_errors: unknown;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeSessionId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  return UUID_REGEX.test(value) ? value : null;
};

export const toTelemetryRow = (args: {
  topic: string;
  envlp: AnyEnvelope;
  deviceId: string;
  ingestSource?: string;
}): TelemetryInsertRow => {
  const { topic, envlp, deviceId, ingestSource } = args;
  const metrics = envlp.type === "telemetry" && envlp.data?.metrics ? envlp.data.metrics : {};

  return {
    ts: envlp.ts,
    device_id: deviceId,
    session_id: normalizeSessionId(envlp.session_id),
    topic,
    payload: envlp,
    metrics,
    ingest_source: ingestSource ?? "telemetry-ingestion",
    is_valid: true,
    validation_errors: []
  };
};
