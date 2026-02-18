export type MetricsSnapshot = {
  ts: string;
  counters: Record<string, number>;
  gauges: Record<string, number | string | boolean | null>;
  rates: Record<string, number>;
};

type CounterName =
  | "mqtt_messages_total"
  | "mqtt_messages_valid_total"
  | "mqtt_messages_invalid_total"
  | "deadletter_total"
  | "db_inserts_total"
  | "db_insert_batches_total"
  | "db_insert_fail_total"
  | "db_insert_retry_total";

type GaugeName =
  | "buffer_size"
  | "last_flush_at"
  | "last_db_success_at"
  | "mqtt_connected"
  | "mqtt_last_event_at"
  | "last_db_error_at";

export class Metrics {
  private counters: Record<CounterName, number> = {
    mqtt_messages_total: 0,
    mqtt_messages_valid_total: 0,
    mqtt_messages_invalid_total: 0,
    deadletter_total: 0,
    db_inserts_total: 0,
    db_insert_batches_total: 0,
    db_insert_fail_total: 0,
    db_insert_retry_total: 0
  };

  private gauges: Record<GaugeName, number | string | boolean | null> = {
    buffer_size: 0,
    last_flush_at: null,
    last_db_success_at: null,
    mqtt_connected: false,
    mqtt_last_event_at: null,
    last_db_error_at: null
  };

  private rates: Record<string, number> = {
    msg_per_sec: 0
  };

  private messagesThisSecond = 0;
  private rateSamples: number[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastDbError: string | null = null;

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const sample = this.messagesThisSecond;
      this.messagesThisSecond = 0;
      this.rateSamples.push(sample);
      if (this.rateSamples.length > 5) this.rateSamples.shift();
      const avg = this.rateSamples.reduce((sum, val) => sum + val, 0) / this.rateSamples.length;
      this.rates.msg_per_sec = Number.isFinite(avg) ? avg : 0;
    }, 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  inc(name: CounterName, by = 1): void {
    this.counters[name] += by;
  }

  setGauge(name: GaugeName, value: number | string | boolean | null): void {
    this.gauges[name] = value;
  }

  markMessageReceived(valid: boolean): void {
    this.messagesThisSecond += 1;
    if (valid) {
      this.counters.mqtt_messages_valid_total += 1;
    } else {
      this.counters.mqtt_messages_invalid_total += 1;
    }
  }

  markDbInsert(rowsInserted: number): void {
    this.counters.db_inserts_total += rowsInserted;
  }

  markDbFlushStart(): void {
    this.counters.db_insert_batches_total += 1;
    this.gauges.last_flush_at = new Date().toISOString();
  }

  markDbFlushRetry(): void {
    this.counters.db_insert_retry_total += 1;
  }

  markDbFlushFail(errorMessage?: string): void {
    this.counters.db_insert_fail_total += 1;
    this.lastDbError = errorMessage ?? this.lastDbError;
    this.gauges.last_db_error_at = new Date().toISOString();
  }

  markDbFlushSuccess(): void {
    this.gauges.last_db_success_at = new Date().toISOString();
  }

  markDeadletter(count = 1): void {
    this.counters.deadletter_total += count;
  }

  getGauge(name: GaugeName): number | string | boolean | null {
    return this.gauges[name];
  }

  getLastDbError(): string | null {
    return this.lastDbError;
  }

  snapshot(): MetricsSnapshot {
    return {
      ts: new Date().toISOString(),
      counters: { ...this.counters },
      gauges: { ...this.gauges },
      rates: { ...this.rates }
    };
  }
}
