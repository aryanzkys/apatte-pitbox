import { z, baseEnvSchema, loadEnv } from "@apatte/env";

const envSchema = baseEnvSchema.extend({
  MQTT_BROKER_URL: z.string().url(),
  MQTT_CLIENT_ID: z.string().optional()
});

export type EdgeAgentEnv = z.infer<typeof envSchema>;

export const env = loadEnv(envSchema, process.env);

export const validateEnv = (): EdgeAgentEnv => env;
