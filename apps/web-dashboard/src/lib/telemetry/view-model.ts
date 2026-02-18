import { METRIC_KEYS, VEHICLE_HINTS } from "./metric-keys";

export type TelemetryRow = {
  ts: string | null;
  topic?: string | null;
  metrics?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
};

export type VehicleTelemetryVM = {
  speedKph: number | null;
  speedDeltaPct: number | null;
  efficiency: number | null;
  tankPct: number | null;
  tempC: number | null;
  voltageV: number | null;
  lapCurrent: number | null;
  lapTotal: number | null;
  lapProgressPct: number | null;
  sectorPerformance: Array<number | null>;
};

export type DashboardTelemetryVM = {
  updatedAt: string | null;
  systemOnline: boolean;
  phH2: VehicleTelemetryVM;
  ucBe: VehicleTelemetryVM;
  map: {
    estimatedFinish: string | null;
    trackTempC: number | null;
    windSpeedKph: number | null;
    windDirection: string | null;
  };
  alerts: Array<{
    time: string | null;
    message: string | null;
    level: "critical" | "warning" | "info";
  }>;
  mlStrategist: {
    ucBe: string | null;
    phH2: string | null;
    predictedFinish: string | null;
  };
  componentStatus: Array<{
    name: string;
    vehicle: "PH-H2" | "UC-BE";
    loadPct: number | null;
    mode: "OPTIMAL" | "WARNING" | "ACTIVE" | null;
    telemetryId: string | null;
    lastSync: string | null;
  }>;
};

export type BuildVmOptions = {
  staleSeconds?: number;
  now?: number;
  previous?: DashboardTelemetryVM;
};

const DEFAULT_VEHICLE: VehicleTelemetryVM = {
  speedKph: null,
  speedDeltaPct: null,
  efficiency: null,
  tankPct: null,
  tempC: null,
  voltageV: null,
  lapCurrent: null,
  lapTotal: null,
  lapProgressPct: null,
  sectorPerformance: [null, null, null, null, null]
};

export const createEmptyVM = (): DashboardTelemetryVM => ({
  updatedAt: null,
  systemOnline: false,
  phH2: { ...DEFAULT_VEHICLE },
  ucBe: { ...DEFAULT_VEHICLE },
  map: {
    estimatedFinish: null,
    trackTempC: null,
    windSpeedKph: null,
    windDirection: null
  },
  alerts: [
    { time: null, message: null, level: "critical" },
    { time: null, message: null, level: "warning" },
    { time: null, message: null, level: "info" }
  ],
  mlStrategist: {
    ucBe: null,
    phH2: null,
    predictedFinish: null
  },
  componentStatus: [
    {
      name: "Power Distribution Unit",
      vehicle: "UC-BE",
      loadPct: null,
      mode: null,
      telemetryId: null,
      lastSync: null
    },
    {
      name: "Fuel Cell Stack B",
      vehicle: "PH-H2",
      loadPct: null,
      mode: null,
      telemetryId: null,
      lastSync: null
    },
    {
      name: "Motor Controller",
      vehicle: "UC-BE",
      loadPct: null,
      mode: null,
      telemetryId: null,
      lastSync: null
    }
  ]
});

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getMetric = (metrics: Record<string, unknown>, keys: readonly string[]): number | null => {
  for (const key of keys) {
    if (key in metrics) {
      const value = toNumber(metrics[key]);
      if (value !== null) return value;
    }
  }
  return null;
};

const getMetricString = (metrics: Record<string, unknown>, keys: readonly string[]): string | null => {
  for (const key of keys) {
    if (key in metrics) {
      const value = metrics[key];
      if (typeof value === "string" && value.trim() !== "") return value;
    }
  }
  return null;
};

const warned = new Set<string>();
const warnMissing = (key: string, message: string) => {
  if (process.env.NODE_ENV === "production") return;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
};

const normalizeVehicle = (row: TelemetryRow): "phH2" | "ucBe" | "unknown" => {
  const payload = row.payload ?? {};
  const deviceUid = typeof payload.device_uid === "string" ? payload.device_uid.toLowerCase() : "";
  const topic = (row.topic ?? "").toLowerCase();
  const haystack = `${deviceUid} ${topic}`;

  if (VEHICLE_HINTS.phH2.some(hint => haystack.includes(hint))) return "phH2";
  if (VEHICLE_HINTS.ucBe.some(hint => haystack.includes(hint))) return "ucBe";
  return "unknown";
};

const computeProgress = (current: number | null, total: number | null): number | null => {
  if (current === null || total === null) return null;
  if (total <= 0) return null;
  return Math.min(100, Math.max(0, (current / total) * 100));
};

const computeOnline = (updatedAt: string | null, staleSeconds: number): boolean => {
  if (!updatedAt) return false;
  const ts = Date.parse(updatedAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= staleSeconds * 1000;
};

export const applyRowToVM = (
  current: DashboardTelemetryVM,
  row: TelemetryRow,
  options: BuildVmOptions = {}
): DashboardTelemetryVM => {
  const payloadMetrics = (row.payload as { data?: { metrics?: Record<string, unknown> } } | null)?.data
    ?.metrics;
  const metrics = (row.metrics ?? payloadMetrics ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    phH2: { ...current.phH2 },
    ucBe: { ...current.ucBe },
    map: { ...current.map },
    alerts: current.alerts.map(alert => ({ ...alert })),
    mlStrategist: { ...current.mlStrategist },
    componentStatus: current.componentStatus.map(item => ({ ...item }))
  };

  if (row.ts) {
    next.updatedAt = row.ts;
  }

  const vehicle = normalizeVehicle(row);
  const target = vehicle === "ucBe" ? next.ucBe : vehicle === "phH2" ? next.phH2 : null;

  if (target) {
    const speedKph = getMetric(metrics, METRIC_KEYS.speed_kph) ??
      (() => {
        const mps = getMetric(metrics, METRIC_KEYS.speed_mps);
        return mps !== null ? mps * 3.6 : null;
      })();

    if (speedKph !== null) {
      const prev = vehicle === "ucBe" ? current.ucBe.speedKph : current.phH2.speedKph;
      target.speedKph = speedKph;
      if (prev !== null && prev !== 0) {
        target.speedDeltaPct = ((speedKph - prev) / prev) * 100;
      }
    }
    if (speedKph === null) {
      warnMissing("speed", "Telemetry metrics missing speed_kph or speed_mps.");
    }
  }

  if (target) {
    const deltaPct = getMetric(metrics, METRIC_KEYS.speed_delta_pct);
    if (deltaPct !== null) {
      target.speedDeltaPct = deltaPct;
    }
  }

  if (target) {
    const lapCurrent = getMetric(metrics, METRIC_KEYS.lap_current);
    const lapTotal = getMetric(metrics, METRIC_KEYS.lap_total);
    if (lapCurrent !== null) target.lapCurrent = lapCurrent;
    if (lapTotal !== null) target.lapTotal = lapTotal;
    target.lapProgressPct = computeProgress(target.lapCurrent, target.lapTotal);
    if (lapCurrent === null && lapTotal === null) {
      warnMissing("lap", "Telemetry metrics missing lap_current/lap_total.");
    }
  }

  if (target && vehicle === "phH2") {
    target.efficiency = getMetric(metrics, METRIC_KEYS.fuel_eff_km_m3);
    target.tankPct = getMetric(metrics, METRIC_KEYS.hydrogen_tank_pct);
    if (target.efficiency === null) {
      warnMissing("fuel_efficiency", "Telemetry metrics missing fuel efficiency for PH-H2.");
    }
    if (target.tankPct === null) {
      warnMissing("hydrogen_tank", "Telemetry metrics missing hydrogen tank % for PH-H2.");
    }
  }

  if (target && vehicle === "ucBe") {
    target.efficiency = getMetric(metrics, METRIC_KEYS.energy_eff_km_kwh);
    target.tankPct = getMetric(metrics, METRIC_KEYS.battery_soc_pct);
    if (target.efficiency === null) {
      warnMissing("energy_efficiency", "Telemetry metrics missing energy efficiency for UC-BE.");
    }
    if (target.tankPct === null) {
      warnMissing("battery_soc", "Telemetry metrics missing battery SOC % for UC-BE.");
    }
  }

  if (target) {
    const tempC = getMetric(metrics, METRIC_KEYS.temp_c);
    if (tempC !== null) target.tempC = tempC;
    if (tempC === null) {
      warnMissing("temp_c", "Telemetry metrics missing temp_c.");
    }

    const voltageV = getMetric(metrics, METRIC_KEYS.voltage_v);
    if (voltageV !== null) target.voltageV = voltageV;
    if (voltageV === null) {
      warnMissing("voltage_v", "Telemetry metrics missing voltage_v.");
    }
  }

  if (target) {
    const sectors = [
      getMetric(metrics, METRIC_KEYS.sector_1_pct),
      getMetric(metrics, METRIC_KEYS.sector_2_pct),
      getMetric(metrics, METRIC_KEYS.sector_3_pct),
      getMetric(metrics, METRIC_KEYS.sector_4_pct),
      getMetric(metrics, METRIC_KEYS.sector_5_pct)
    ];
    if (sectors.some(value => value !== null)) {
      target.sectorPerformance = sectors;
    }
  }

  const estimatedFinish = getMetricString(metrics, METRIC_KEYS.estimated_finish);
  if (estimatedFinish) next.map.estimatedFinish = estimatedFinish;
  const trackTemp = getMetric(metrics, METRIC_KEYS.track_temp_c);
  if (trackTemp !== null) next.map.trackTempC = trackTemp;
  const windSpeed = getMetric(metrics, METRIC_KEYS.wind_speed_kph);
  if (windSpeed !== null) next.map.windSpeedKph = windSpeed;
  const windDir = getMetricString(metrics, METRIC_KEYS.wind_dir);
  if (windDir) next.map.windDirection = windDir;

  const alertMessage = getMetricString(metrics, METRIC_KEYS.alert_message);
  const alertLevel = getMetricString(metrics, METRIC_KEYS.alert_level);
  const alertTime = getMetricString(metrics, METRIC_KEYS.alert_time);
  if (alertMessage) {
    next.alerts[0] = {
      time: alertTime ?? null,
      message: alertMessage,
      level: alertLevel === "warning" || alertLevel === "info" ? alertLevel : "critical"
    };
  }

  const ucbeAdvice = getMetricString(metrics, METRIC_KEYS.ml_ucbe_advice);
  const phh2Advice = getMetricString(metrics, METRIC_KEYS.ml_phh2_advice);
  const predictedFinish = getMetricString(metrics, METRIC_KEYS.ml_predicted_finish);
  if (ucbeAdvice) next.mlStrategist.ucBe = ucbeAdvice;
  if (phh2Advice) next.mlStrategist.phH2 = phh2Advice;
  if (predictedFinish) next.mlStrategist.predictedFinish = predictedFinish;

  const [pdu, fuel, motor] = next.componentStatus;
  if (pdu) {
    const pduLoad = getMetric(metrics, METRIC_KEYS.component_pdu_load_pct);
    const pduMode = getMetricString(metrics, METRIC_KEYS.component_pdu_mode);
    const pduId = getMetricString(metrics, METRIC_KEYS.component_pdu_id);
    const pduSync = getMetricString(metrics, METRIC_KEYS.component_pdu_last_sync);
    if (pduLoad !== null) pdu.loadPct = pduLoad;
    if (pduMode) pdu.mode = pduMode as DashboardTelemetryVM["componentStatus"][number]["mode"];
    if (pduId) pdu.telemetryId = pduId;
    if (pduSync) pdu.lastSync = pduSync;
  }

  if (fuel) {
    const fuelLoad = getMetric(metrics, METRIC_KEYS.component_fuelcell_load_pct);
    const fuelMode = getMetricString(metrics, METRIC_KEYS.component_fuelcell_mode);
    const fuelId = getMetricString(metrics, METRIC_KEYS.component_fuelcell_id);
    const fuelSync = getMetricString(metrics, METRIC_KEYS.component_fuelcell_last_sync);
    if (fuelLoad !== null) fuel.loadPct = fuelLoad;
    if (fuelMode) fuel.mode = fuelMode as DashboardTelemetryVM["componentStatus"][number]["mode"];
    if (fuelId) fuel.telemetryId = fuelId;
    if (fuelSync) fuel.lastSync = fuelSync;
  }

  if (motor) {
    const motorLoad = getMetric(metrics, METRIC_KEYS.component_motor_load_pct);
    const motorMode = getMetricString(metrics, METRIC_KEYS.component_motor_mode);
    const motorId = getMetricString(metrics, METRIC_KEYS.component_motor_id);
    const motorSync = getMetricString(metrics, METRIC_KEYS.component_motor_last_sync);
    if (motorLoad !== null) motor.loadPct = motorLoad;
    if (motorMode) motor.mode = motorMode as DashboardTelemetryVM["componentStatus"][number]["mode"];
    if (motorId) motor.telemetryId = motorId;
    if (motorSync) motor.lastSync = motorSync;
  }

  const staleSeconds = options.staleSeconds ?? 5;
  next.systemOnline = computeOnline(next.updatedAt, staleSeconds);

  return next;
};

export const buildVMFromRow = (row: TelemetryRow | null, options: BuildVmOptions = {}): DashboardTelemetryVM => {
  const base = createEmptyVM();
  if (!row) return base;
  const next = applyRowToVM(base, row, options);
  if (options.previous) {
    const merged = { ...options.previous, ...next };
    return { ...merged, systemOnline: next.systemOnline };
  }
  return next;
};
