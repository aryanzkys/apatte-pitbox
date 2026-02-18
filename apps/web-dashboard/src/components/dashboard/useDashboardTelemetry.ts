"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { env } from "@/env";
import { subscribeLatestTelemetry } from "@/lib/telemetry/realtime";
import {
  applyRowToVM,
  buildVMFromRow,
  createEmptyVM,
  type DashboardTelemetryVM,
  type TelemetryRow
} from "@/lib/telemetry/view-model";

export type DashboardTelemetryState = {
  vm: DashboardTelemetryVM;
  error: string | null;
  realtimeActive: boolean;
};

const DASHBOARD_STALE_S = Number(env.NEXT_PUBLIC_DASHBOARD_STALE_S ?? 5);
const REALTIME_ENABLED = env.NEXT_PUBLIC_REALTIME_ENABLED ?? true;
const POLL_INTERVAL_MS = Number(env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 1000);

const isStale = (ts: string | null, staleSeconds: number) => {
  if (!ts) return true;
  const time = Date.parse(ts);
  if (Number.isNaN(time)) return true;
  return Date.now() - time > staleSeconds * 1000;
};

export const useDashboardTelemetry = (): DashboardTelemetryState => {
  const router = useRouter();
  const [state, setState] = useState<DashboardTelemetryState>({
    vm: createEmptyVM(),
    error: null,
    realtimeActive: false
  });

  const latestRef = useRef<DashboardTelemetryVM>(createEmptyVM());
  const updateTimer = useRef<NodeJS.Timeout | null>(null);
  const pollingTimer = useRef<NodeJS.Timeout | null>(null);
  const realtimeRef = useRef<{ unsubscribe: () => void } | null>(null);
  const pendingVm = useRef<DashboardTelemetryVM | null>(null);
  const realtimeActiveRef = useRef(false);

  const scheduleUpdate = (nextVm: DashboardTelemetryVM) => {
    pendingVm.current = nextVm;
    if (updateTimer.current) return;
    updateTimer.current = setTimeout(() => {
      const vm = pendingVm.current ?? nextVm;
      pendingVm.current = null;
      latestRef.current = vm;
      setState(prev => ({ ...prev, vm }));
      updateTimer.current = null;
    }, 100);
  };

  const applyRow = (row: TelemetryRow) => {
    const next = applyRowToVM(latestRef.current, row, { staleSeconds: DASHBOARD_STALE_S });
    scheduleUpdate(next);
  };

  const fetchLatest = async () => {
    const res = await fetch("/api/telemetry/latest", { credentials: "include" });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    const vm = buildVMFromRow(data?.latest ?? null, {
      staleSeconds: DASHBOARD_STALE_S,
      previous: latestRef.current
    });
    scheduleUpdate(vm);
    setState(prev => ({ ...prev, error: null }));
  };

  useEffect(() => {
    let mounted = true;

    fetchLatest().catch(err => {
      if (!mounted) return;
      setState(prev => ({ ...prev, error: String(err) }));
    });

    if (REALTIME_ENABLED) {
      realtimeRef.current = subscribeLatestTelemetry({
        onRow: row => {
          if (!mounted) return;
          applyRow(row);
        },
        onStatus: status => {
          if (!mounted) return;
          if (status === "subscribed") {
            realtimeActiveRef.current = true;
            setState(prev => ({ ...prev, realtimeActive: true }));
          }
          if (status === "error" || status === "closed") {
            realtimeActiveRef.current = false;
            setState(prev => ({ ...prev, realtimeActive: false }));
          }
        },
        onError: message => {
          if (!mounted) return;
          setState(prev => ({ ...prev, error: message }));
        }
      });
    }

    pollingTimer.current = setInterval(() => {
      if (!mounted) return;
      if (realtimeActiveRef.current) return;
      fetchLatest().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    const onlineTimer = setInterval(() => {
      if (!mounted) return;
      const vm = latestRef.current;
      const next = { ...vm, systemOnline: !isStale(vm.updatedAt, DASHBOARD_STALE_S) };
      scheduleUpdate(next);
    }, 1000);

    return () => {
      mounted = false;
      realtimeActiveRef.current = false;
      realtimeRef.current?.unsubscribe();
      if (pollingTimer.current) clearInterval(pollingTimer.current);
      if (updateTimer.current) clearTimeout(updateTimer.current);
      clearInterval(onlineTimer);
    };
  }, []);

  return state;
};
