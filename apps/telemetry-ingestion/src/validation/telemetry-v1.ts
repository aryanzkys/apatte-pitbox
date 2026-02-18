import { z } from "zod";

const IsoTimestamp = z.string().refine(value => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ts"
});

const MetaSchema = z
  .object({
    fw: z.string().optional(),
    seq: z.coerce.number().int().nonnegative().optional(),
    sent_ms: z.coerce.number().int().nonnegative().optional(),
    tags: z.array(z.string()).optional()
  })
  .default({});

export const EnvelopeBaseSchema = z.object({
  v: z.literal(1),
  msg_id: z.string().min(1).max(64),
  ts: IsoTimestamp,
  device_uid: z.string().min(1).max(64),
  session_id: z.string().nullable().optional(),
  type: z.enum(["telemetry", "status", "event"]),
  data: z.object({}),
  meta: MetaSchema.optional()
});

export const TelemetryDataSchema = z.object({
  metrics: z.record(z.number().refine(Number.isFinite, "Metric must be finite")),
  flags: z.record(z.boolean()).optional().default({}),
  gps: z
    .object({
      lat: z.number(),
      lon: z.number(),
      alt_m: z.number().nullable().optional(),
      speed_mps: z.number().nullable().optional(),
      heading_deg: z.number().nullable().optional(),
      hdop: z.number().nullable().optional()
    })
    .optional(),
  errors: z.array(z.string()).optional().default([])
});

export const StatusDataSchema = z.object({
  state: z.enum(["booting", "ready", "running", "fault", "offline"]),
  uptime_s: z.number().nonnegative(),
  rssi_dbm: z.number().nullable().optional(),
  battery_pct: z.number().nullable().optional(),
  last_error: z.string().nullable().optional(),
  health: z.record(z.boolean()).optional().default({})
});

export const EventDataSchema = z.object({
  name: z.string().min(1),
  severity: z.enum(["info", "warn", "critical"]),
  message: z.string().min(1),
  context: z.object({}).optional().default({})
});

export const TelemetryEnvelopeSchema = EnvelopeBaseSchema.extend({
  type: z.literal("telemetry"),
  data: TelemetryDataSchema
});

export const StatusEnvelopeSchema = EnvelopeBaseSchema.extend({
  type: z.literal("status"),
  data: StatusDataSchema
});

export const EventEnvelopeSchema = EnvelopeBaseSchema.extend({
  type: z.literal("event"),
  data: EventDataSchema
});

export const AnyEnvelopeSchema = z.discriminatedUnion("type", [
  TelemetryEnvelopeSchema,
  StatusEnvelopeSchema,
  EventEnvelopeSchema
]);

export type TelemetryEnvelope = z.infer<typeof TelemetryEnvelopeSchema>;
export type StatusEnvelope = z.infer<typeof StatusEnvelopeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type AnyEnvelope = z.infer<typeof AnyEnvelopeSchema>;
