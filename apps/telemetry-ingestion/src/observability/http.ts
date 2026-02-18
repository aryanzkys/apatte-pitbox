import * as http from "node:http";
import type { Server } from "node:http";
import type { TelemetryIngestionEnv } from "../env";
import type { Logger } from "../lib/logger";
import type { Metrics } from "./metrics";

export type HealthServer = {
  server: Server;
  stop: () => Promise<void>;
};

const writeJson = (res: http.ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
};

const isFresh = (timestamp: string | boolean | number | null, staleSeconds: number): boolean => {
  if (typeof timestamp !== "string") return false;
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= staleSeconds * 1000;
};

export const createHealthServer = (opts: {
  metrics: Metrics;
  env: TelemetryIngestionEnv;
  logger: Logger;
}): HealthServer => {
  const { metrics, env, logger } = opts;

  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";

    if (req.method === "GET" && url === "/healthz") {
      const mqttConnected = Boolean(metrics.getGauge("mqtt_connected"));
      const dbConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
      const lastDbSuccess = metrics.getGauge("last_db_success_at");
      const dbFresh = isFresh(lastDbSuccess, env.HEALTH_DB_STALE_S);
      const mqttRequired = env.HEALTH_MQTT_REQUIRED;

      const ok = (mqttRequired ? mqttConnected : true) && dbConfigured && dbFresh;

      const body = {
        status: ok ? "ok" : "degraded",
        uptime_s: Math.floor(process.uptime()),
        mqtt: {
          connected: mqttConnected,
          broker_url: env.MQTT_BROKER_URL,
          last_event: metrics.getGauge("mqtt_last_event_at")
        },
        db: {
          configured: dbConfigured,
          last_success_at: lastDbSuccess,
          last_error: metrics.getLastDbError() || undefined
        },
        buffer: {
          size: metrics.getGauge("buffer_size")
        },
        ts: new Date().toISOString()
      };

      writeJson(res, 200, body);
      return;
    }

    if (req.method === "GET" && url === "/metrics") {
      writeJson(res, 200, metrics.snapshot());
      return;
    }

    if (req.method === "GET" && url === "/") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("telemetry-ingestion alive");
      return;
    }

    writeJson(res, 404, { error: "not_found" });
  });

  server.on("error", err => {
    logger.log("error", "http_server_error", { error: err.message });
  });

  const stop = async () =>
    new Promise<void>(resolve => {
      server.close(() => resolve());
    });

  return { server, stop };
};
