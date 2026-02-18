"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useDashboardTelemetry, type DashboardTelemetryState } from "./useDashboardTelemetry";

type PanelState = {
  notificationsOpen: boolean;
  settingsOpen: boolean;
  toggleNotifications: () => void;
  toggleSettings: () => void;
  closeAll: () => void;
};

type LiveContextValue = DashboardTelemetryState & PanelState;

const LiveContext = createContext<LiveContextValue | null>(null);

const useLiveContext = () => {
  const ctx = useContext(LiveContext);
  if (!ctx) {
    throw new Error("DashboardLive components must be wrapped in DashboardLiveProvider");
  }
  return ctx;
};

export const DashboardLiveProvider = ({ children }: { children: React.ReactNode }) => {
  const telemetry = useDashboardTelemetry();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const value = useMemo<LiveContextValue>(
    () => ({
      ...telemetry,
      notificationsOpen,
      settingsOpen,
      toggleNotifications: () => setNotificationsOpen(prev => !prev),
      toggleSettings: () => setSettingsOpen(prev => !prev),
      closeAll: () => {
        setNotificationsOpen(false);
        setSettingsOpen(false);
      }
    }),
    [telemetry, notificationsOpen, settingsOpen]
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
};

const formatNumber = (value: number | null, decimals = 1) => {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toFixed(decimals);
};

const formatInteger = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "-";
  return Math.round(value).toString();
};

const formatPercent = (value: number | null, decimals = 1) => {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(decimals)}%`;
};

const formatLapText = (current: number | null, total: number | null) => {
  const currentText = current === null ? "-" : Math.round(current).toString();
  const totalText = total === null ? "-" : Math.round(total).toString();
  return `Lap ${currentText}/${totalText}`;
};

export const SystemStatusBadge = () => {
  const { vm } = useLiveContext();
  const online = vm.systemOnline;
  return (
    <div className="flex items-center px-3 py-1 bg-primary/20 rounded border border-primary/40">
      <span
        className={`size-2 rounded-full mr-2 ${online ? "bg-green-500 animate-pulse" : "bg-slate-500"}`}
      ></span>
      <span className="text-xs font-bold text-primary">
        SYSTEM: {online ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
};

export const NotificationButton = () => {
  const { toggleNotifications } = useLiveContext();
  return (
    <button
      onClick={toggleNotifications}
      className="flex items-center justify-center rounded-lg h-9 w-9 bg-border-dark hover:bg-primary transition-colors"
      aria-label="Notifications"
      type="button"
    >
      <span className="material-symbols-outlined text-[20px]">notifications</span>
    </button>
  );
};

export const SettingsButton = () => {
  const { toggleSettings } = useLiveContext();
  return (
    <button
      onClick={toggleSettings}
      className="flex items-center justify-center rounded-lg h-9 w-9 bg-border-dark hover:bg-primary transition-colors"
      aria-label="Settings"
      type="button"
    >
      <span className="material-symbols-outlined text-[20px]">settings</span>
    </button>
  );
};

export const SpeedValue = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const value = vehicle === "phH2" ? vm.phH2.speedKph : vm.ucBe.speedKph;
  return <>{formatNumber(value, 1)}</>;
};

export const SpeedDelta = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const value = vehicle === "phH2" ? vm.phH2.speedDeltaPct : vm.ucBe.speedDeltaPct;
  if (value === null || Number.isNaN(value)) return <>-</>;
  const isUp = value >= 0;
  return (
    <span className={isUp ? "text-green-500" : "text-critical"}>
      {formatPercent(Math.abs(value), 1)} {isUp ? "↑" : "↓"}
    </span>
  );
};

export const SpeedDeltaBadge = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const value = vehicle === "phH2" ? vm.phH2.speedDeltaPct : vm.ucBe.speedDeltaPct;
  if (value === null || Number.isNaN(value)) {
    return <div className="mt-2 text-xs font-bold text-slate-500">-</div>;
  }
  const isUp = value >= 0;
  return (
    <div className={`mt-2 text-xs font-bold ${isUp ? "text-green-500" : "text-critical"}`}>
      {formatPercent(Math.abs(value), 1)} {isUp ? "↑" : "↓"}
    </div>
  );
};

export const EfficiencyValue = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const value = vehicle === "phH2" ? vm.phH2.efficiency : vm.ucBe.efficiency;
  return <>{formatInteger(value)}</>;
};

export const TankValue = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const value = vehicle === "phH2" ? vm.phH2.tankPct : vm.ucBe.tankPct;
  return <>{formatInteger(value)}</>;
};

export const TempValue = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const value = vehicle === "phH2" ? vm.phH2.tempC : vm.ucBe.tempC;
  return <>{formatInteger(value)}</>;
};

export const VoltageValue = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const value = vehicle === "phH2" ? vm.phH2.voltageV : vm.ucBe.voltageV;
  return <>{formatNumber(value, 1)}</>;
};

export const LapText = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const target = vehicle === "phH2" ? vm.phH2 : vm.ucBe;
  return <>{formatLapText(target.lapCurrent, target.lapTotal)}</>;
};

export const ProgressBar = ({
  vehicle,
  kind,
  className
}: {
  vehicle: "phH2" | "ucBe";
  kind: "lap" | "efficiency" | "tank" | "soc";
  className: string;
}) => {
  const { vm } = useLiveContext();
  const target = vehicle === "phH2" ? vm.phH2 : vm.ucBe;
  const value =
    kind === "lap"
      ? target.lapProgressPct
      : kind === "efficiency"
        ? target.efficiency
        : target.tankPct;
  const percent = value !== null ? Math.max(0, Math.min(100, value)) : 0;
  return <div className={className} style={{ width: `${percent}%` }}></div>;
};

export const SectorBars = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const target = vehicle === "phH2" ? vm.phH2 : vm.ucBe;
  const base = vehicle === "phH2" ? "bg-accent-hydrogen" : "bg-accent-electric";
  const opacities = ["/40", "/60", "", "/50", "/80"];
  return (
    <>
      {target.sectorPerformance.map((value, index) => (
        <div
          key={`${vehicle}-sector-${index}`}
          className={`w-4 ${base}${opacities[index] ?? "/40"} rounded-t`}
          style={{ height: `${value ?? 0}%` }}
        ></div>
      ))}
    </>
  );
};

export const MapStat = ({ kind }: { kind: "finish" | "track" | "wind" }) => {
  const { vm } = useLiveContext();
  if (kind === "finish") return <>{vm.map.estimatedFinish ?? "-"}</>;
  if (kind === "track") return <>{vm.map.trackTempC !== null ? `${formatNumber(vm.map.trackTempC, 1)}°C` : "-"}</>;
  return (
    <>
      {vm.map.windSpeedKph !== null
        ? `${formatNumber(vm.map.windSpeedKph, 1)} km/h ${vm.map.windDirection ?? ""}`.trim()
        : "-"}
    </>
  );
};

export const AlertsTicker = () => {
  const { vm } = useLiveContext();
  const alerts = vm.alerts;

  return (
    <>
      {alerts.map((alert, index) => {
        const levelClass =
          alert.level === "critical"
            ? "text-critical animate-pulse"
            : alert.level === "warning"
              ? "text-warning"
              : "text-slate-400 opacity-50";
        const borderClass =
          alert.level === "critical"
            ? "border-critical"
            : alert.level === "warning"
              ? "border-warning"
              : "border-slate-700";

        return (
          <div key={`alert-${index}`} className={`flex items-center gap-2 ${levelClass}`}>
            <span className={`text-[10px] font-bold px-2 py-0.5 border ${borderClass} rounded`}>
              {alert.time ?? "--:--"}
            </span>
            <span className="text-sm font-medium">{alert.message ?? "-"}</span>
          </div>
        );
      })}
    </>
  );
};

export const MLStrategistText = ({ vehicle }: { vehicle: "phH2" | "ucBe" }) => {
  const { vm } = useLiveContext();
  const text = vehicle === "phH2" ? vm.mlStrategist.phH2 : vm.mlStrategist.ucBe;
  return <>{text ?? "-"}</>;
};

export const MLStrategistPrediction = () => {
  const { vm } = useLiveContext();
  return <>{vm.mlStrategist.predictedFinish ?? "-"}</>;
};

export const ComponentRow = ({ index }: { index: number }) => {
  const { vm } = useLiveContext();
  const row = vm.componentStatus[index];
  const loadPct = row?.loadPct ?? null;
  const mode = row?.mode ?? "-";
  const barClass = row?.vehicle === "PH-H2" ? "bg-warning" : "bg-accent-electric";
  const modeClass =
    mode === "WARNING"
      ? "bg-warning/20 text-warning"
      : mode === "ACTIVE"
        ? "bg-primary/20 text-primary"
        : "bg-primary/20 text-primary";

  return (
    <>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-24 h-1 bg-border-dark rounded-full">
            <div
              className={`h-full ${barClass}`}
              style={{ width: `${loadPct ?? 0}%` }}
            ></div>
          </div>
          <span>{loadPct === null ? "-" : `${Math.round(loadPct)}%`}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${modeClass}`}>
          {mode}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500 font-mono">{row?.telemetryId ?? "-"}</td>
      <td className="px-4 py-3 text-slate-500 italic">{row?.lastSync ?? "-"}</td>
    </>
  );
};

export const ErrorBanner = () => {
  const { error } = useLiveContext();
  if (!error) return null;
  return (
    <div className="absolute top-16 right-6 z-20 bg-critical/20 border border-critical px-3 py-2 rounded text-xs">
      {error}
    </div>
  );
};

export const Panels = () => {
  const { notificationsOpen, settingsOpen, closeAll } = useLiveContext();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-30 ${
          notificationsOpen || settingsOpen ? "block" : "hidden"
        }`}
        onClick={closeAll}
      ></div>
      <div
        className={`fixed top-20 right-6 z-40 w-80 glass-panel p-4 rounded-xl ${
          notificationsOpen ? "block" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Notifications</h4>
          <button className="text-xs text-slate-400" onClick={closeAll} type="button">
            Close
          </button>
        </div>
        <div className="text-xs text-slate-400">No new notifications.</div>
      </div>
      <div
        className={`fixed top-20 right-6 z-40 w-80 glass-panel p-4 rounded-xl ${
          settingsOpen ? "block" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Settings</h4>
          <button className="text-xs text-slate-400" onClick={closeAll} type="button">
            Close
          </button>
        </div>
        <div className="text-xs text-slate-400">Settings panel placeholder.</div>
      </div>
    </>
  );
};
