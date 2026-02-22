import mqtt from "mqtt";
import * as net from "node:net";
import { validateEnv } from "./env";
import { handleMqttMessage } from "./handlers/message";
import { child } from "./lib/logger";
import { TelemetryBatcher } from "./pipeline/batcher";
import { Metrics } from "./observability/metrics";
import { createHealthServer } from "./observability/http";

const env = validateEnv();

const logger = child({ component: "main" });
const metrics = new Metrics();
metrics.start();
const handlerLogger = child({ component: "mqtt_handler" });

const prefix = env.TELEMETRY_TOPIC_PREFIX || "apatte";
const clientId = env.MQTT_CLIENT_ID || `pitbox-ingestion-${Math.random().toString(16).slice(2)}`;
const mqttOptional = env.MQTT_OPTIONAL;
const mqttOfflineLogIntervalMs = env.MQTT_OFFLINE_LOG_INTERVAL_MS;

let lastMqttOfflineLogAt = 0;
let mqttConnectedOnce = false;

const shouldLogOfflineNow = () => {
  const now = Date.now();
  if (now - lastMqttOfflineLogAt >= mqttOfflineLogIntervalMs) {
    lastMqttOfflineLogAt = now;
    return true;
  }
  return false;
};

const isConnectionRefusedError = (errorMessage: string) => /ECONNREFUSED/i.test(errorMessage);

const batcher = new TelemetryBatcher({
  batchSize: env.INGESTION_BATCH_SIZE,
  flushMs: env.INGESTION_FLUSH_MS,
  maxRetries: env.INGESTION_MAX_RETRIES,
  retryBaseMs: env.INGESTION_RETRY_BASE_MS,
  ingestSource: "telemetry-ingestion",
  metrics,
  logger: child({ component: "batcher" })
});

batcher.start();

const client = mqtt.connect(env.MQTT_BROKER_URL, {
  username: env.MQTT_USERNAME,
  password: env.MQTT_PASSWORD,
  clientId,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 5000
});

const healthServer = createHealthServer({
  metrics,
  env,
  logger: child({ component: "http" })
});

const isPortAvailable = async (port: number): Promise<boolean> =>
  new Promise(resolve => {
    const probe = net.createServer();

    probe.once("error", () => {
      resolve(false);
    });

    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });

    probe.listen(port);
  });

const startHealthServer = async (preferredPort: number) => {
  let port = preferredPort;

  while (!(await isPortAvailable(port))) {
    logger.log("warn", "http_port_in_use", {
      requested_port: port,
      fallback_port: port + 1
    });
    port += 1;
  }

  healthServer.server.listen(port, () => {
    logger.log("info", "http_listening", { port });
  });
};

void startHealthServer(env.INGESTION_HTTP_PORT);

const subscribeTopics: Array<{ topic: string; qos: 0 | 1 }> = [
  { topic: `${prefix}/v1/+/telemetry`, qos: 0 },
  { topic: `${prefix}/v1/+/status`, qos: 1 },
  { topic: `${prefix}/v1/+/event`, qos: 1 }
];

client.on("connect", () => {
  mqttConnectedOnce = true;
  metrics.setGauge("mqtt_connected", true);
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  logger.log("info", "mqtt_connected", {
    broker: env.MQTT_BROKER_URL,
    client_id: clientId
  });

  subscribeTopics.forEach(({ topic, qos }) => {
    client.subscribe(topic, { qos }, err => {
      if (err) {
        logger.log("warn", "mqtt_subscribe_failed", { topic, qos, error: err.message });
        return;
      }
      logger.log("info", "mqtt_subscribed", { topic, qos });
    });
  });
});

client.on("message", async (topic, payload) => {
  try {
    metrics.inc("mqtt_messages_total");
    const result = await handleMqttMessage({
      topic,
      payload,
      prefix,
      deadletterPath: env.DEADLETTER_PATH,
      deadletterMaxBytes: env.DEADLETTER_MAX_BYTES,
      metrics,
      logger: handlerLogger
    });
    if (result) {
      batcher.enqueue({ topic, envlp: result });
    }
  } catch (error) {
    logger.log("error", "mqtt_message_handler_failed", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

client.on("reconnect", () => {
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  if (!mqttOptional || shouldLogOfflineNow()) {
    logger.log("info", "mqtt_reconnect", {
      mqtt_optional: mqttOptional,
      connected_once: mqttConnectedOnce
    });
  }
});

client.on("offline", () => {
  metrics.setGauge("mqtt_connected", false);
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  if (!mqttOptional || shouldLogOfflineNow()) {
    logger.log("warn", "mqtt_offline", {
      mqtt_optional: mqttOptional,
      connected_once: mqttConnectedOnce
    });
  }
});

client.on("close", () => {
  metrics.setGauge("mqtt_connected", false);
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  if (!mqttOptional || shouldLogOfflineNow()) {
    logger.log("warn", "mqtt_close", {
      mqtt_optional: mqttOptional,
      connected_once: mqttConnectedOnce
    });
  }
});

client.on("error", error => {
  const refused = isConnectionRefusedError(error.message);
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  if (mqttOptional && refused) {
    if (shouldLogOfflineNow()) {
      logger.log("warn", "mqtt_unavailable_optional", {
        error: error.message,
        mqtt_optional: true,
        reconnecting: true,
        connected_once: mqttConnectedOnce
      });
    }
    return;
  }

  logger.log("error", "mqtt_error", {
    error: error.message,
    mqtt_optional: mqttOptional,
    connected_once: mqttConnectedOnce
  });
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.log("info", "mqtt_shutdown", { signal });
  client.end(true, async () => {
    await healthServer.stop();
    metrics.stop();
    await batcher.stop();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
