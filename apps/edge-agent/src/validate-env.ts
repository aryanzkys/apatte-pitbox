import path from "node:path";
import { loadDotenv } from "@apatte/env";

loadDotenv(path.resolve(process.cwd(), "../../.env"));

const run = async (): Promise<void> => {
  const { validateEnv } = await import("./env.js");
  validateEnv();
  console.log("env ok");
};

run().catch(error => {
  console.error("env validation failed", error);
  process.exit(1);
});
