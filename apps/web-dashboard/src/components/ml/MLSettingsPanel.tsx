"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Database, Play, Save, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type TrainingConfig = {
  global_enabled: boolean;
  online_learning_enabled: boolean;
  retrain_between_attempts: boolean;
  synthetic_data_enabled: boolean;
  transfer_learning_enabled: boolean;
  models: Record<string, boolean>;
};

type TrainingStatus = {
  last_run_at: number | null;
  completed_models: number;
  result: string;
  details: string[];
};

type MapItem = {
  id: string;
  name: string;
  code: string;
  fileName: string;
  fileType: string;
  featureCount: number;
  uploadedAt: string;
};

type MapState = {
  maps: MapItem[];
  activeMapId: string | null;
};

const MAP_STORAGE_KEY = "nextDashboardMapConfig";

const DEFAULT_CONFIG: TrainingConfig = {
  global_enabled: true,
  online_learning_enabled: false,
  retrain_between_attempts: true,
  synthetic_data_enabled: true,
  transfer_learning_enabled: true,
  models: {
    energy: true,
    racing_line: true,
    h2_purge: true,
    fatigue: true,
    anomaly: true,
    efficiency: true,
    slip_coast: true,
    rank: true
  }
};

const MODEL_LABELS: Record<string, string> = {
  energy: "Energy Finish Predictor",
  racing_line: "Racing Line Optimizer",
  h2_purge: "H2 Purge Scheduler",
  fatigue: "Driver Fatigue Detector",
  anomaly: "Anomaly Detection System",
  efficiency: "Efficiency Map Recommender",
  slip_coast: "Slip & Coasting Optimizer",
  rank: "Cross-Vehicle Rank Predictor"
};

const createDefaultMapState = (): MapState => {
  const map: MapItem = {
    id: "map-brasilia-default",
    name: "Brasília Circuit",
    code: "brasilia",
    fileName: "default-layout.geojson",
    fileType: "geojson",
    featureCount: 1,
    uploadedAt: new Date().toISOString()
  };
  return { maps: [map], activeMapId: map.id };
};

const readMaps = (): MapState => {
  if (typeof window === "undefined") return createDefaultMapState();
  try {
    const raw = localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return createDefaultMapState();
    const parsed = JSON.parse(raw) as MapState;
    if (!parsed.maps?.length) return createDefaultMapState();
    const firstMap = parsed.maps[0];
    return {
      maps: parsed.maps,
      activeMapId: parsed.activeMapId ?? (firstMap ? firstMap.id : null)
    };
  } catch {
    return createDefaultMapState();
  }
};

const saveMaps = (state: MapState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(state));
};

const syncActiveMapToBackend = async (map: MapItem) => {
  await fetch("/api/ml/maps/active", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: map.id,
      name: map.name,
      code: map.code
    })
  });
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function MLSettingsPanel() {
  const [config, setConfig] = useState<TrainingConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [healthText, setHealthText] = useState("Checking backend...");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const [mapState, setMapState] = useState<MapState>(createDefaultMapState());
  const [trackName, setTrackName] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [mapMessage, setMapMessage] = useState("");

  const enabledCount = useMemo(
    () => Object.values(config.models).filter(Boolean).length,
    [config.models]
  );

  const loadState = async () => {
    const [healthRes, cfgRes, statusRes] = await Promise.allSettled([
      fetch("/api/ml/health", { cache: "no-store" }),
      fetch("/api/ml/training/config", { cache: "no-store" }),
      fetch("/api/ml/training/status", { cache: "no-store" })
    ]);

    if (healthRes.status === "fulfilled" && healthRes.value.ok) {
      const payload = await healthRes.value.json();
      setHealthText(`Mode=${payload.mode} • models_loaded=${payload.models_loaded}`);
    } else {
      setHealthText("Backend unavailable");
    }

    if (cfgRes.status === "fulfilled" && cfgRes.value.ok) {
      const payload = await cfgRes.value.json();
      if (payload?.training_config) {
        setConfig({ ...DEFAULT_CONFIG, ...payload.training_config });
      }
    }

    if (statusRes.status === "fulfilled" && statusRes.value.ok) {
      const payload = await statusRes.value.json();
      if (payload?.training_status) {
        setStatus(payload.training_status);
      }
    }
  };

  useEffect(() => {
    setMapState(readMaps());
    loadState().catch(() => undefined);
  }, []);

  const saveTrainingConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/ml/training/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error("Failed to save config");
      await loadState();
    } finally {
      setSaving(false);
    }
  };

  const runTraining = async () => {
    setRunning(true);
    try {
      const activeModels = Object.keys(config.models).filter(key => config.models[key]);
      const response = await fetch("/api/ml/training/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model_keys: activeModels,
          retrain_between_attempts: config.retrain_between_attempts,
          online_learning_enabled: config.online_learning_enabled
        })
      });
      if (!response.ok) throw new Error("Failed to run training");
      await loadState();
    } finally {
      setRunning(false);
    }
  };

  const updateModel = (key: string, value: boolean) => {
    setConfig(prev => ({ ...prev, models: { ...prev.models, [key]: value } }));
  };

  const handleUploadMap = async () => {
    const name = trackName.trim();
    const code = slugify(trackCode || name);

    if (!name || !code || !trackFile) {
      setMapMessage("Isi nama, code, dan file map terlebih dahulu.");
      return;
    }

    let featureCount = 0;
    if (["geojson", "json"].includes((trackFile.name.split(".").pop() || "").toLowerCase())) {
      try {
        const text = await trackFile.text();
        const parsed = JSON.parse(text);
        featureCount = Array.isArray(parsed?.features) ? parsed.features.length : 0;
      } catch {
        setMapMessage("GeoJSON tidak valid.");
        return;
      }
    }

    const next: MapItem = {
      id: `map-${code}-${Date.now()}`,
      name,
      code,
      fileName: trackFile.name,
      fileType: (trackFile.name.split(".").pop() || "").toLowerCase(),
      featureCount,
      uploadedAt: new Date().toISOString()
    };

    const existing = mapState.maps.find(m => m.code === code);
    const maps = existing
      ? mapState.maps.map(m => (m.code === code ? { ...next, id: m.id } : m))
      : [...mapState.maps, next];

    const updated: MapState = {
      maps,
      activeMapId: mapState.activeMapId ?? (existing?.id || next.id)
    };

    setMapState(updated);
    saveMaps(updated);
    setMapMessage(`Map ${name} tersimpan.`);
    setTrackFile(null);
  };

  const setActiveMap = (id: string) => {
    const updated = { ...mapState, activeMapId: id };
    setMapState(updated);
    saveMaps(updated);
    const active = updated.maps.find(item => item.id === id);
    if (active) {
      syncActiveMapToBackend(active).catch(() => undefined);
    }
    setMapMessage("Active map diperbarui.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> ML Backend Health
            </CardTitle>
            <Badge variant="outline">Node.js → FastAPI</Badge>
          </div>
          <CardDescription>{healthText}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Training Controls</CardTitle>
            <Badge variant={enabledCount >= 6 ? "success" : "warning"}>{enabledCount}/8 enabled</Badge>
          </div>
          <CardDescription>On/Off training pipeline sesuai dokumentasi ML v2.0.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleRow
              label="Global Training"
              checked={config.global_enabled}
              onChange={v => setConfig(prev => ({ ...prev, global_enabled: v }))}
            />
            <ToggleRow
              label="Online Learning"
              checked={config.online_learning_enabled}
              onChange={v => setConfig(prev => ({ ...prev, online_learning_enabled: v }))}
            />
            <ToggleRow
              label="Retrain Between Attempts"
              checked={config.retrain_between_attempts}
              onChange={v => setConfig(prev => ({ ...prev, retrain_between_attempts: v }))}
            />
            <ToggleRow
              label="Synthetic Data"
              checked={config.synthetic_data_enabled}
              onChange={v => setConfig(prev => ({ ...prev, synthetic_data_enabled: v }))}
            />
            <ToggleRow
              label="Transfer Learning"
              checked={config.transfer_learning_enabled}
              onChange={v => setConfig(prev => ({ ...prev, transfer_learning_enabled: v }))}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(config.models).map(modelKey => (
              <ToggleRow
                key={modelKey}
                label={MODEL_LABELS[modelKey] ?? modelKey}
                checked={Boolean(config.models[modelKey])}
                onChange={v => updateModel(modelKey, v)}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={saveTrainingConfig} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Sync Config"}
            </Button>
            <Button variant="secondary" onClick={runTraining} disabled={running || !config.global_enabled}>
              <Play className="h-4 w-4" /> {running ? "Running..." : "Run Training"}
            </Button>
          </div>

          {status ? (
            <div className="mt-4 rounded border border-border-dark bg-background-dark/40 p-3 text-xs text-white/70 space-y-1">
              <div>Result: {status.result}</div>
              <div>Completed Models: {status.completed_models}</div>
              <div>
                Last Run: {status.last_run_at ? new Date(status.last_run_at * 1000).toLocaleString("id-ID") : "-"}
              </div>
              {status.details?.length ? (
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {status.details.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-accent-electric" /> Track Map Manager
            </CardTitle>
            <Badge variant="outline">Overview sync</Badge>
          </div>
          <CardDescription>Upload map layout dan pilih map aktif yang akan muncul di overview dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Track Name" value={trackName} onChange={e => setTrackName(e.target.value)} />
            <Input placeholder="Track Code" value={trackCode} onChange={e => setTrackCode(e.target.value)} />
            <Input type="file" accept=".geojson,.json,.gpx,.kml" onChange={e => setTrackFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="mt-3">
            <Button variant="secondary" onClick={handleUploadMap}>
              <Upload className="h-4 w-4" /> Upload Map
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {mapState.maps.map(map => (
              <div key={map.id} className="rounded border border-border-dark bg-background-dark/40 p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-white/70">
                  <div className="font-semibold text-white">{map.name} ({map.code})</div>
                  <div>{map.fileName} • features={map.featureCount || "-"}</div>
                </div>
                <div className="flex items-center gap-2">
                  {mapState.activeMapId === map.id ? <Badge variant="success">Active</Badge> : null}
                  <Button
                    size="sm"
                    variant={mapState.activeMapId === map.id ? "secondary" : "outline"}
                    onClick={() => setActiveMap(map.id)}
                  >
                    Set Active
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {mapMessage ? <p className="mt-3 text-xs text-white/60">{mapMessage}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded border border-border-dark bg-background-dark/30 px-3 py-2 flex items-center justify-between gap-3">
      <span className="text-xs text-white/80">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
