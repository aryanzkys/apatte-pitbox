import type { Logger } from "../lib/logger";
import { writeDeadLetter } from "../deadletter/deadletter";
import { assertTopicMatchesDeviceUid, validateEnvelope, type ValidationErr } from "../validation/validate";
import type { AnyEnvelope } from "../validation/telemetry-v1";
import type { Metrics } from "../observability/metrics";

type MessageArgs = {
  topic: string;
  payload: Buffer;
  prefix: string;
  deadletterPath: string;
  deadletterMaxBytes: number;
  metrics: Metrics;
  logger: Logger;
};

const parseDeviceUidFromTopic = (topic: string, prefix: string): string | null => {
  const parts = topic.split("/");
  if (parts.length < 4) return null;
  if (parts[0] !== prefix || parts[1] !== "v1") return null;
  return parts[2] || null;
};

export const handleMqttMessage = async ({
  topic,
  payload,
  prefix,
  deadletterPath,
  deadletterMaxBytes,
  metrics,
  logger
}: MessageArgs): Promise<AnyEnvelope | null> => {
  const payloadText = payload.toString("utf-8");
  const deviceUidFromTopic = parseDeviceUidFromTopic(topic, prefix);

  logger.log("debug", "message_received", {
    topic,
    bytes: payload.length
  });

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    metrics.markMessageReceived(false);
    metrics.markDeadletter(1);
    logger.log("warn", "message_dead_lettered", {
      topic,
      error_code: "INVALID_JSON",
      error_message: "Invalid JSON"
    });
    await writeDeadLetter(
      {
        received_at: new Date().toISOString(),
        topic,
        payload_text: payloadText,
        error_code: "INVALID_JSON",
        error_message: "Invalid JSON"
      },
      { path: deadletterPath, maxBytes: deadletterMaxBytes }
    );
    return null;
  }

  const validationResult = validateEnvelope(parsed);
  if (!validationResult.ok) {
    const err = (validationResult as ValidationErr).error;
    metrics.markMessageReceived(false);
    metrics.markDeadletter(1);
    logger.log("warn", "message_dead_lettered", {
      topic,
      error_code: err.code,
      error_message: err.message
    });
    await writeDeadLetter(
      {
        received_at: new Date().toISOString(),
        topic,
        payload_text: payloadText,
        error_code: err.code,
        error_message: err.message,
        issues: err.issues
      },
      { path: deadletterPath, maxBytes: deadletterMaxBytes }
    );
    return null;
  }

  const envelope = validationResult.value;
  const deviceUid = String(envelope.device_uid);
  const mismatch = assertTopicMatchesDeviceUid(deviceUidFromTopic || "", deviceUid);
  if (mismatch) {
    metrics.markMessageReceived(false);
    metrics.markDeadletter(1);
    logger.log("warn", "message_dead_lettered", {
      topic,
      error_code: mismatch.error.code,
      error_message: mismatch.error.message
    });
    await writeDeadLetter(
      {
        received_at: new Date().toISOString(),
        topic,
        payload_text: payloadText,
        error_code: mismatch.error.code,
        error_message: mismatch.error.message
      },
      { path: deadletterPath, maxBytes: deadletterMaxBytes }
    );
    return null;
  }

  metrics.markMessageReceived(true);

  logger.log("debug", "message_validated", {
    topic,
    type: envelope.type,
    device_uid: deviceUid,
    msg_id: envelope.msg_id,
    ts: envelope.ts,
    bytes: payload.length
  });
  return envelope;
};
