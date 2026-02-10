import path from "node:path";
import { loadDotenv } from "@apatte/env";

loadDotenv(path.resolve(process.cwd(), "../../.env"));

const run = async (): Promise<void> => {
  const { validateEnv } = await import("./env");
  validateEnv();
  console.log("env ok");
};

await run();
