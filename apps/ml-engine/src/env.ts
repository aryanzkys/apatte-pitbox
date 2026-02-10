import { z, baseEnvSchema, loadEnv } from "@apatte/env";

const envSchema = baseEnvSchema;

export type MlEngineEnv = z.infer<typeof envSchema>;

export const env = loadEnv(envSchema, process.env);

export const validateEnv = (): MlEngineEnv => env;
