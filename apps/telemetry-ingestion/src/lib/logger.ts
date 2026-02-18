import * as fs from "node:fs";
import * as path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export type Logger = {
  log: (level: LogLevel, msg: string, fields?: LogFields) => void;
  child: (extraFields: LogFields) => Logger;
};

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const readVersion = (): string | undefined => {
  try {
    const pkgPath = path.resolve(__dirname, "../../package.json");
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version;
  } catch {
    return undefined;
  }
};

const SERVICE_NAME = "telemetry-ingestion";
const VERSION = readVersion();

const toLevel = (value: string | undefined): LogLevel => {
  const normalized = String(value || "info").toLowerCase();
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
    return normalized;
  }
  return "info";
};

const CURRENT_LEVEL = toLevel(process.env.LOG_LEVEL);

const safeStringify = (value: unknown): string => {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === "object" && val !== null) {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    return val;
  });
};

const buildLogger = (baseFields: LogFields = {}): Logger => {
  const logFn = (level: LogLevel, msg: string, fields: LogFields = {}) => {
    if (LEVEL_RANK[level] < LEVEL_RANK[CURRENT_LEVEL]) return;

    const entry = {
      ts: new Date().toISOString(),
      level,
      msg,
      service: SERVICE_NAME,
      pid: process.pid,
      ...(VERSION ? { version: VERSION } : {}),
      ...baseFields,
      ...fields
    };

    try {
      console.log(safeStringify(entry));
    } catch {
      console.log(
        safeStringify({
          ts: entry.ts,
          level,
          msg,
          service: SERVICE_NAME,
          pid: process.pid,
          ...(VERSION ? { version: VERSION } : {})
        })
      );
    }
  };

  return {
    log: logFn,
    child: (extraFields: LogFields) => buildLogger({ ...baseFields, ...extraFields })
  };
};

export const logger = buildLogger();

export const log = logger.log;
export const child = logger.child;
