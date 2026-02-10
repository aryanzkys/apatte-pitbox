import { z, baseEnvSchema, loadEnv } from "@apatte/env";

const envSchema = baseEnvSchema.extend({
  MQTT_BROKER_URL: z.string().url(),
  TELEMETRY_TOPIC_PREFIX: z.string().default("apatte"),
  INGESTION_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  INGESTION_FLUSH_MS: z.coerce.number().int().positive().default(250)
});

export type TelemetryIngestionEnv = z.infer<typeof envSchema>;

export const env = loadEnv(envSchema, process.env);

export const validateEnv = (): TelemetryIngestionEnv => env;
