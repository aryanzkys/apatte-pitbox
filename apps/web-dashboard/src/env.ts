import { z, baseEnvSchema, loadEnv } from "@apatte/env";

const envSchema = baseEnvSchema.extend({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1)
});

export type WebDashboardEnv = z.infer<typeof envSchema>;

export const env = loadEnv(envSchema, process.env);

export const validateEnv = (): WebDashboardEnv => env;
