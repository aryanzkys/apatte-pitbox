"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type MapItem = {
  id: string;
  name: string;
  code: string;
  fileName: string;
};

type MapState = {
  maps: MapItem[];
  activeMapId: string | null;
};

const MAP_STORAGE_KEY = "nextDashboardMapConfig";

export function ActiveMapBadge() {
  const [mapLabel, setMapLabel] = useState("No active map");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MAP_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MapState;
      const active = parsed.maps?.find(item => item.id === parsed.activeMapId);
      if (active) {
        setMapLabel(`${active.name} (${active.code})`);
      }
    } catch {
      // no-op
    }
  }, []);

  return <Badge variant="outline">Active map: {mapLabel}</Badge>;
}
