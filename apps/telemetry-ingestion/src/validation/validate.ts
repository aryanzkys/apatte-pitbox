import type { ZodIssue } from "zod";
import { AnyEnvelopeSchema } from "./telemetry-v1";
import type { AnyEnvelope } from "./telemetry-v1";

export type ValidationOk<T> = { ok: true; value: T };
export type ValidationErr = {
  ok: false;
  error: {
    code: "INVALID_JSON" | "SCHEMA_VALIDATION_FAILED" | "TOPIC_MISMATCH";
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
};

const mapIssues = (issues: ZodIssue[]) =>
  issues.map(issue => ({
    path: issue.path.join("."),
    message: issue.message
  }));

export const validateEnvelope = (input: unknown): ValidationOk<AnyEnvelope> | ValidationErr => {
  const result = AnyEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: "Envelope schema validation failed",
        issues: mapIssues(result.error.issues)
      }
    };
  }

  return { ok: true, value: result.data };
};

export const assertTopicMatchesDeviceUid = (
  topicDeviceUid: string,
  payloadDeviceUid: string
): ValidationErr | null => {
  if (!topicDeviceUid || topicDeviceUid !== payloadDeviceUid) {
    return {
      ok: false,
      error: {
        code: "TOPIC_MISMATCH",
        message: "device_uid does not match topic"
      }
    };
  }
  return null;
};

export const formatValidationError = (err: ValidationErr): string => {
  const base = `${err.error.code}: ${err.error.message}`;
  if (!err.error.issues?.length) return base;
  const details = err.error.issues
    .map(issue => `- ${issue.path}: ${issue.message}`)
    .join("\n");
  return `${base}\n${details}`;
};
