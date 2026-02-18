import { z, baseEnvSchema, loadEnv } from "@apatte/env";

const booleanFromEnv = z.preprocess(value => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

const envSchema = baseEnvSchema.extend({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SUPABASE_URL: z
    .string()
    .min(1)
    .refine(value => /^https?:\/\//.test(value), {
      message: "SUPABASE_URL must start with http:// or https://"
    }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MQTT_BROKER_URL: z
    .string()
    .min(1)
    .refine(value => /^(mqtt|ws|wss):\/\//.test(value), {
      message: "MQTT_BROKER_URL must start with mqtt://, ws://, or wss://"
    }),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_CLIENT_ID: z.string().optional(),
  TELEMETRY_TOPIC_PREFIX: z.string().default("apatte"),
  DEADLETTER_PATH: z.string().default("var/deadletter.ndjson"),
  DEADLETTER_MAX_BYTES: z.coerce.number().int().positive().default(4096),
  INGESTION_HTTP_PORT: z.coerce.number().int().positive().default(8081),
  HEALTH_DB_STALE_S: z.coerce.number().int().positive().default(60),
  HEALTH_MQTT_REQUIRED: booleanFromEnv.default(true),
  INGESTION_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  INGESTION_FLUSH_MS: z.coerce.number().int().positive().default(250),
  INGESTION_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  INGESTION_RETRY_BASE_MS: z.coerce.number().int().positive().default(250)
});

export type TelemetryIngestionEnv = z.infer<typeof envSchema>;

const rawEnv = {
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL,
  MQTT_USERNAME: process.env.MQTT_USERNAME,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD,
  MQTT_CLIENT_ID: process.env.MQTT_CLIENT_ID,
  TELEMETRY_TOPIC_PREFIX: process.env.TELEMETRY_TOPIC_PREFIX,
  DEADLETTER_PATH: process.env.DEADLETTER_PATH,
  DEADLETTER_MAX_BYTES: process.env.DEADLETTER_MAX_BYTES,
  INGESTION_HTTP_PORT: process.env.INGESTION_HTTP_PORT,
  HEALTH_DB_STALE_S: process.env.HEALTH_DB_STALE_S,
  HEALTH_MQTT_REQUIRED: process.env.HEALTH_MQTT_REQUIRED,
  INGESTION_BATCH_SIZE: process.env.INGESTION_BATCH_SIZE,
  INGESTION_FLUSH_MS: process.env.INGESTION_FLUSH_MS,
  INGESTION_MAX_RETRIES: process.env.INGESTION_MAX_RETRIES,
  INGESTION_RETRY_BASE_MS: process.env.INGESTION_RETRY_BASE_MS
};

export const env = loadEnv(envSchema, rawEnv);

export const validateEnv = (): TelemetryIngestionEnv => env;
