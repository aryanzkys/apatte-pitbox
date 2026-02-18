import { env } from "../env";
import { writeDeadLetter } from "../deadletter/deadletter";
import { ensureDevicesExist } from "../db/devices";
import { getSupabaseAdminClient } from "../db/supabase";
import { toTelemetryRow } from "../db/telemetry";
import type { Logger } from "../lib/logger";
import type { AnyEnvelope } from "../validation/telemetry-v1";
import type { Metrics } from "../observability/metrics";

export type TelemetryBatcherOptions = {
  batchSize: number;
  flushMs: number;
  maxRetries: number;
  retryBaseMs: number;
  ingestSource?: string;
  metrics: Metrics;
  logger: Logger;
};

type BufferedItem = { topic: string; envlp: AnyEnvelope };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isTransientError = (error: { message?: string; status?: number } | null): boolean => {
  if (!error) return false;
  const status = error.status ?? 0;
  if (status === 0 || status >= 500) return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("network") || msg.includes("fetch") || msg.includes("timeout");
};

export class TelemetryBatcher {
  private buffer: BufferedItem[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing = false;
  private stopped = false;
  private readonly batchSize: number;
  private readonly flushMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly ingestSource: string;
  private readonly metrics: Metrics;
  private readonly logger: Logger;

  constructor(options: TelemetryBatcherOptions) {
    this.batchSize = options.batchSize;
    this.flushMs = options.flushMs;
    this.maxRetries = options.maxRetries;
    this.retryBaseMs = options.retryBaseMs;
    this.ingestSource = options.ingestSource ?? "telemetry-ingestion";
    this.metrics = options.metrics;
    this.logger = options.logger;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.buffer.length > 0) {
        void this.flush("interval");
      }
    }, this.flushMs);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush("shutdown");
  }

  enqueue(item: BufferedItem): void {
    if (this.stopped) return;
    this.buffer.push(item);
    this.metrics.setGauge("buffer_size", this.buffer.length);
    if (this.buffer.length >= this.batchSize) {
      void this.flush("size");
    }
  }

  private async flush(reason: "interval" | "size" | "shutdown"): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;

    this.flushing = true;
    const snapshot = this.buffer;
    this.buffer = [];
    this.metrics.setGauge("buffer_size", 0);

    const bufferedCount = snapshot.length;
    this.metrics.markDbFlushStart();
    this.logger.log("info", "batch_flush_start", {
      reason,
      buffered_count: bufferedCount
    });

    try {
      const deviceUids = snapshot.map(item => item.envlp.device_uid);
      const deviceMap = await ensureDevicesExist(deviceUids);

      const rows = [] as ReturnType<typeof toTelemetryRow>[];
      const missingDeviceItems: BufferedItem[] = [];

      for (const item of snapshot) {
        const deviceId = deviceMap.get(item.envlp.device_uid);
        if (!deviceId) {
          missingDeviceItems.push(item);
          continue;
        }
        rows.push(
          toTelemetryRow({
            topic: item.topic,
            envlp: item.envlp,
            deviceId,
            ingestSource: this.ingestSource
          })
        );
      }

      if (missingDeviceItems.length > 0) {
        await this.writeDeadLetters(missingDeviceItems, "Device id missing after upsert");
      }

      if (rows.length === 0) {
        this.logger.log("warn", "batch_flush_failed", {
          reason,
          buffered_count: bufferedCount,
          flushed_count: bufferedCount,
          inserted_count: 0,
          failed_count: missingDeviceItems.length,
          retry_attempt: 0,
          error: "no_valid_rows"
        });
        this.metrics.markDbFlushFail("no_valid_rows");
        return;
      }

      const client = getSupabaseAdminClient();
      let lastError: { message?: string; status?: number } | null = null;

      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        const result = await client.from("telemetry_raw").insert(rows);
        if (!result.error) {
          this.metrics.markDbInsert(rows.length);
          this.metrics.markDbFlushSuccess();
          this.logger.log("info", "batch_flush_success", {
            reason,
            buffered_count: bufferedCount,
            flushed_count: rows.length,
            inserted_count: rows.length,
            failed_count: missingDeviceItems.length,
            retry_attempt: attempt
          });
          return;
        }
        lastError = result.error;
        const transient = isTransientError({
          message: result.error.message,
          status: result.status
        });

        if (attempt > 0) {
          this.metrics.markDbFlushRetry();
          this.logger.log("warn", "batch_flush_retry", {
            reason,
            buffered_count: bufferedCount,
            flushed_count: rows.length,
            inserted_count: 0,
            failed_count: rows.length + missingDeviceItems.length,
            retry_attempt: attempt,
            status: result.status,
            error: result.error.message,
            error_code: result.error.code
          });
        } else {
          this.logger.log("warn", "batch_flush_failed", {
            reason,
            buffered_count: bufferedCount,
            flushed_count: rows.length,
            inserted_count: 0,
            failed_count: rows.length + missingDeviceItems.length,
            retry_attempt: attempt,
            status: result.status,
            error: result.error.message,
            error_code: result.error.code
          });
        }

        const shouldRetry = transient && attempt < this.maxRetries;
        if (!shouldRetry) {
          break;
        }

        const jitter = Math.floor(Math.random() * 100);
        const waitMs = this.retryBaseMs * 2 ** attempt + jitter;
        await sleep(waitMs);
      }

      if (lastError) {
        this.metrics.markDbFlushFail(lastError.message);
      }
      await this.writeDeadLetters(snapshot, lastError?.message ?? "DB insert failed");
    } catch (error) {
      this.metrics.markDbFlushFail(error instanceof Error ? error.message : String(error));
      this.logger.log("error", "batch_flush_failed", {
        reason,
        buffered_count: bufferedCount,
        flushed_count: bufferedCount,
        inserted_count: 0,
        failed_count: bufferedCount,
        retry_attempt: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      await this.writeDeadLetters(snapshot, "Batch flush exception");
    } finally {
      this.flushing = false;
      if (this.buffer.length >= this.batchSize) {
        void this.flush("size");
      }
    }
  }

  private async writeDeadLetters(items: BufferedItem[], reason: string): Promise<void> {
    if (items.length === 0) return;
    this.metrics.markDeadletter(items.length);
    await Promise.all(
      items.map(item =>
        writeDeadLetter(
          {
            received_at: new Date().toISOString(),
            topic: item.topic,
            payload_text: JSON.stringify(item.envlp),
            error_code: "DB_INSERT_FAILED",
            error_message: reason
          },
          { path: env.DEADLETTER_PATH, maxBytes: env.DEADLETTER_MAX_BYTES }
        )
      )
    );
  }
}
