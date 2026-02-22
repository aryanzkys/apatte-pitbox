"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useDashboardLive } from "@/components/dashboard/DashboardLive";

type InferenceResponse = {
  source?: string;
  engine?: {
    severity?: string;
    total_inference_ms?: number;
  };
  insights?: {
    ph2?: {
      energy?: string;
      purge?: string;
      anomaly?: string;
    };
    ucbe?: {
      energy?: string;
      efficiency?: string;
      fatigue?: string;
    };
    racingLine?: string;
  };
};

type InferenceHistoryItem = {
  timestamp: number;
  source: string;
  severity: string;
};

type MapState = {
  maps: Array<{ id: string; name: string; code: string }>;
  activeMapId: string | null;
};

type ActiveMap = { id: string; name: string; code: string };

const MAP_STORAGE_KEY = "nextDashboardMapConfig";

const getActiveMap = (): ActiveMap => {
  if (typeof window === "undefined") {
    return { id: "default", name: "Default Track", code: "default" };
  }
  try {
    const raw = localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return { id: "default", name: "Default Track", code: "default" };
    const parsed = JSON.parse(raw) as MapState;
    const active = parsed.maps?.find(item => item.id === parsed.activeMapId);
    return active
      ? { id: active.id, name: active.name, code: active.code }
      : { id: "default", name: "Default Track", code: "default" };
  } catch {
    return { id: "default", name: "Default Track", code: "default" };
  }
};

export function MLInferenceInsight() {
  const { vm } = useDashboardLive();
  const [data, setData] = useState<InferenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [activeMap, setActiveMap] = useState<ActiveMap>({
    id: "default",
    name: "Default Track",
    code: "default"
  });
  const [history, setHistory] = useState<InferenceHistoryItem[]>([]);

  const lapCurrent = useMemo(() => {
    return vm.phH2.lapCurrent ?? vm.ucBe.lapCurrent ?? 1;
  }, [vm.phH2.lapCurrent, vm.ucBe.lapCurrent]);

  const lapTotal = useMemo(() => {
    return vm.phH2.lapTotal ?? vm.ucBe.lapTotal ?? 4;
  }, [vm.phH2.lapTotal, vm.ucBe.lapTotal]);

  useEffect(() => {
    setActiveMap(getActiveMap());
  }, []);

  useEffect(() => {
    let mounted = true;

    const runInference = async () => {
      if (!mounted) return;
      setRunning(true);
      try {
        const body = {
          context: {
            race_phase: lapCurrent >= lapTotal ? "LATE" : lapCurrent <= 1 ? "EARLY" : "MID",
            current_lap: lapCurrent,
            laps_remaining: Math.max(0, lapTotal - lapCurrent),
            active_map: activeMap
          },
          telemetry: {
            ph2: {
              speed: vm.phH2.speedKph ?? 50,
              power: vm.phH2.efficiency ?? 42
            },
            ucbe: {
              speed: vm.ucBe.speedKph ?? 54,
              power: vm.ucBe.efficiency ?? 30
            }
          },
          requested_models: ["energy", "racing_line", "fatigue", "anomaly"]
        };

        const response = await fetch("/api/ml/inference", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`Inference failed (${response.status})`);
        }

        const payload = (await response.json()) as InferenceResponse;
        if (!mounted) return;
        setData(payload);
        setError(null);

        const historyResponse = await fetch("/api/ml/inference/history", { cache: "no-store" });
        if (historyResponse.ok) {
          const historyPayload = await historyResponse.json();
          setHistory((historyPayload?.history ?? []).slice(0, 3));
        }
      } catch (err) {
        if (!mounted) return;
        setError(String(err));
      } finally {
        if (mounted) setRunning(false);
      }
    };

    runInference().catch(() => undefined);
    const timer = setInterval(() => {
      runInference().catch(() => undefined);
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [activeMap, lapCurrent, lapTotal, vm.phH2.speedKph, vm.phH2.efficiency, vm.ucBe.speedKph, vm.ucBe.efficiency]);

  const severity = data?.engine?.severity ?? "NORMAL";
  const severityVariant =
    severity === "CRITICAL" ? "critical" : severity === "WARNING" ? "warning" : "success";

  return (
    <div className="p-2 bg-background-dark/40 rounded border border-border-dark text-[10px] leading-relaxed space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/70 uppercase tracking-wide">ML Inference Live</span>
        <Badge variant={severityVariant}>{severity}</Badge>
      </div>
      <div className="text-white/60">Map aktif: {activeMap.name} ({activeMap.code})</div>
      <div>
        <span className="text-accent-electric font-bold">UC-BE:</span>{" "}
        {data?.insights?.ucbe?.efficiency ?? "Waiting insight..."}
      </div>
      <div>
        <span className="text-accent-hydrogen font-bold">PH-H2:</span>{" "}
        {data?.insights?.ph2?.purge ?? "Waiting insight..."}
      </div>
      <div>
        <span className="text-primary font-bold">Racing Line:</span>{" "}
        {data?.insights?.racingLine ?? "Waiting insight..."}
      </div>
      <div className="text-white/50">
        Source: {data?.source ?? "-"} · {running ? "updating..." : "fresh"}
      </div>
      {history.length ? (
        <div className="pt-1 border-t border-border-dark/60 space-y-1">
          <div className="text-white/60 uppercase tracking-wide">History</div>
          {history.map((item, index) => (
            <div key={`${item.timestamp}-${index}`} className="text-white/50">
              {new Date(item.timestamp * 1000).toLocaleTimeString("id-ID")} · {item.severity} · {item.source}
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="text-critical">{error}</div> : null}
    </div>
  );
}
