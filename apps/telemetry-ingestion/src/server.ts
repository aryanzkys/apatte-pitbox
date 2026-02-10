import http from "node:http";
import { validateEnv } from "./env";

const env = validateEnv();

const maskedBrokerUrl = env.MQTT_BROKER_URL.replace(/:\/\/.*@/, "://***@");

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(8081, () => {
  console.log("telemetry-ingestion started", {
    port: 8081,
    broker: maskedBrokerUrl,
    topicPrefix: env.TELEMETRY_TOPIC_PREFIX
  });
});
