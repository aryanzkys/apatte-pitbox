import { z, loadEnv } from "@apatte/env";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_DASHBOARD_STALE_S: z.coerce.number().int().positive().default(5),
  NEXT_PUBLIC_REALTIME_ENABLED: z
    .preprocess(value => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      return value;
    }, z.boolean())
    .default(true),
  NEXT_PUBLIC_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000)
});

export type WebDashboardEnv = z.infer<typeof envSchema>;

const rawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DASHBOARD_STALE_S: process.env.NEXT_PUBLIC_DASHBOARD_STALE_S,
  NEXT_PUBLIC_REALTIME_ENABLED: process.env.NEXT_PUBLIC_REALTIME_ENABLED,
  NEXT_PUBLIC_POLL_INTERVAL_MS: process.env.NEXT_PUBLIC_POLL_INTERVAL_MS
};

export const env = loadEnv(envSchema, rawEnv);

export const validateEnv = (): WebDashboardEnv => env;
