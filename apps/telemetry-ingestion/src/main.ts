import mqtt from "mqtt";
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

healthServer.server.listen(env.INGESTION_HTTP_PORT, () => {
  logger.log("info", "http_listening", { port: env.INGESTION_HTTP_PORT });
});

const subscribeTopics: Array<{ topic: string; qos: 0 | 1 }> = [
  { topic: `${prefix}/v1/+/telemetry`, qos: 0 },
  { topic: `${prefix}/v1/+/status`, qos: 1 },
  { topic: `${prefix}/v1/+/event`, qos: 1 }
];

client.on("connect", () => {
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
  logger.log("info", "mqtt_reconnect");
});

client.on("offline", () => {
  metrics.setGauge("mqtt_connected", false);
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  logger.log("warn", "mqtt_offline");
});

client.on("close", () => {
  metrics.setGauge("mqtt_connected", false);
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  logger.log("warn", "mqtt_close");
});

client.on("error", error => {
  metrics.setGauge("mqtt_last_event_at", new Date().toISOString());
  logger.log("error", "mqtt_error", { error: error.message });
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
