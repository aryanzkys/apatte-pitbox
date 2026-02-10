import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

export { z };

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export const formatZodError = (error: z.ZodError): string => {
  const lines = error.issues.map(issue => {
    const path = issue.path.join(".") || "(root)";
    return `- ${path}: ${issue.message}`;
  });

  return `Invalid environment variables:\n${lines.join("\n")}`;
};

export const loadEnv = <T extends z.ZodTypeAny>(
  schema: T,
  rawEnv: Record<string, string | undefined>
): z.infer<T> => {
  const parsed = schema.safeParse(rawEnv);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
};

export const loadDotenv = (envPath: string): void => {
  dotenvConfig({ path: envPath });
};
