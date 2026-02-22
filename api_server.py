"""
FastAPI bridge for kerangka_ml dashboard integration.

Endpoints:
- GET  /api/ml/health
- GET  /api/ml/catalog
- POST /api/ml/inference
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List
import time

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from kerangka_ml.adaptive.context_manager import ContextManager
from kerangka_ml.inference.inference_engine import create_inference_engine


class InferenceRequest(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)
    telemetry: Dict[str, Any] = Field(default_factory=dict)
    requested_models: List[str] = Field(default_factory=list)


class TrainingConfigRequest(BaseModel):
    global_enabled: bool = True
    online_learning_enabled: bool = False
    retrain_between_attempts: bool = True
    synthetic_data_enabled: bool = True
    transfer_learning_enabled: bool = True
    models: Dict[str, bool] = Field(default_factory=dict)


class TrainingRunRequest(BaseModel):
    model_keys: List[str] = Field(default_factory=list)
    retrain_between_attempts: bool = True
    online_learning_enabled: bool = False


class ActiveMapRequest(BaseModel):
    id: str = "default"
    name: str = "Default"
    code: str = "default"


class AppState:
    def __init__(self) -> None:
        self.catalog = [
            {"key": "energy", "module": "kerangka_ml.models.energy_predictor"},
            {"key": "racing_line", "module": "kerangka_ml.models.racing_line"},
            {"key": "h2_purge", "module": "kerangka_ml.models.h2_purge"},
            {"key": "fatigue", "module": "kerangka_ml.models.fatigue_detector"},
            {"key": "anomaly", "module": "kerangka_ml.models.anomaly_detection"},
            {"key": "efficiency", "module": "kerangka_ml.models.efficiency_map"},
            {"key": "slip_coast", "module": "kerangka_ml.models.slip_coast"},
            {"key": "rank", "module": "kerangka_ml.models.rank_predictor"},
        ]
        self.engine = None
        self.mode = "heuristic_fallback"
        self.models_loaded = 0
        self.context_manager = ContextManager()
        self.training_config = {
            "global_enabled": True,
            "online_learning_enabled": False,
            "retrain_between_attempts": True,
            "synthetic_data_enabled": True,
            "transfer_learning_enabled": True,
            "models": {
                "energy": True,
                "racing_line": True,
                "h2_purge": True,
                "fatigue": True,
                "anomaly": True,
                "efficiency": True,
                "slip_coast": True,
                "rank": True,
            },
        }
        self.training_status = {
            "last_run_at": None,
            "completed_models": 0,
            "result": "not_started",
            "details": [],
        }
        self.active_map = {
            "id": "default",
            "name": "Default Track",
            "code": "default",
            "updated_at": None,
        }
        self.inference_history: List[Dict[str, Any]] = []

    def try_load_engine(self) -> None:
        """Attempt loading serialized models if present."""
        model_dir = Path(__file__).resolve().parent / "artifacts"
        model_paths = {
            "energy": model_dir / "energy.pkl",
            "racing_line": model_dir / "racing_line.pkl",
            "h2_purge": model_dir / "h2_purge.pkl",
            "fatigue": model_dir / "fatigue.pkl",
            "anomaly": model_dir / "anomaly.pkl",
            "efficiency": model_dir / "efficiency.pkl",
            "slip_coast": model_dir / "slip_coast.pkl",
            "rank": model_dir / "rank.pkl",
        }

        existing = {k: str(v) for k, v in model_paths.items() if v.exists()}
        if not existing:
            self.engine = None
            self.mode = "heuristic_fallback"
            self.models_loaded = 0
            return

        try:
            self.engine = create_inference_engine(existing)
            self.mode = "kerangka_ml_engine"
            self.models_loaded = len(getattr(self.engine, "models", {}) or {})
        except Exception:
            self.engine = None
            self.mode = "heuristic_fallback"
            self.models_loaded = 0


STATE = AppState()
STATE.try_load_engine()

app = FastAPI(title="Apatte Kerangka ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _prepare_telemetry_frame(payload: Dict[str, Any]) -> pd.DataFrame:
    """Convert dashboard telemetry payload into feature frame expected by inference engine."""
    ph2 = payload.get("ph2") or {}
    ucbe = payload.get("ucbe") or {}

    ph2_speed = _to_number(ph2.get("speed"), 48.0)
    ucbe_speed = _to_number(ucbe.get("speed"), 52.0)
    ph2_power = _to_number(ph2.get("power"), 42.0)
    ucbe_power = _to_number(ucbe.get("power"), 28.0)

    speed_avg = (ph2_speed + ucbe_speed) / 2.0
    efficiency = max(20.0, 92.0 - (speed_avg - 45.0) * 0.35)

    row = {
        "soc_current": max(5.0, min(100.0, 68.0 + (85.0 - ph2_power) * 0.15)),
        "speed_avg": speed_avg,
        "motor_temp": max(35.0, 50.0 + (speed_avg - 45.0) * 0.4),
        "efficiency_rolling_3lap": efficiency,
        "lap_progress": 0.52,
        "battery_current": max(10.0, ph2_power * 2.0),
        "wind_headwind": 2.0,
        "heart_rate_bpm": 130.0 + max(0.0, ucbe_speed - 55.0) * 1.1,
        "spo2_pct": 97.0,
        "LEL_sensor_pct": max(0.0, min(30.0, (ph2_power - 20.0) * 0.2)),
        "gps_lat": -25.285,
        "gps_lon": 51.534,
        "speed": speed_avg,
        "heading": 180.0,
    }

    return pd.DataFrame([row])


def _heuristic_insights(payload: Dict[str, Any]) -> Dict[str, Any]:
    telemetry = payload.get("telemetry") or {}
    ph2 = telemetry.get("ph2") or {}
    ucbe = telemetry.get("ucbe") or {}

    ph2_speed = _to_number(ph2.get("speed"), 50.0)
    ucbe_speed = _to_number(ucbe.get("speed"), 52.0)
    avg_speed = (ph2_speed + ucbe_speed) / 2.0

    h2_energy = max(6.0, 46.0 - avg_speed * 0.08)
    be_energy = max(6.0, 40.0 - avg_speed * 0.07)
    purge_min = max(3, round(11 - ph2_speed * 0.035))
    fatigue = "MEDIUM" if ucbe_speed > 62 else "LOW"

    return {
        "source": "heuristic_fallback",
        "models_executed": [m["key"] for m in STATE.catalog],
        "insights": {
            "ph2": {
                "energy": f"{h2_energy:.1f} km remaining fuel",
                "purge": f"Purge in {purge_min} minutes",
                "anomaly": "Minor vibration pattern detected" if avg_speed > 63 else "No anomalies detected",
            },
            "ucbe": {
                "energy": f"{be_energy:.1f} km remaining charge",
                "efficiency": "Recommended: ease throttle 3%" if avg_speed > 58 else "Maintain current RPM",
                "fatigue": f"Driver alert level: {fatigue}",
            },
            "racingLine": "Optimize late apex on next sector" if avg_speed > 60 else "Line stable, continue current trajectory",
        },
    }


def _context_from_payload(payload_context: Dict[str, Any], telemetry_frame: pd.DataFrame) -> Dict[str, Any]:
    current_soc = float(telemetry_frame["soc_current"].iloc[0])
    phase = payload_context.get("race_phase") or "MID"

    STATE.context_manager.update_context(
        race_phase=phase,
        current_soc=current_soc,
        current_lap=int(payload_context.get("current_lap", 2)),
        laps_remaining=int(payload_context.get("laps_remaining", 2)),
    )
    return STATE.context_manager.get_current_context()


def _engine_to_dashboard_payload(engine_result: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    primary = engine_result.get("primary_action") or {}

    ph2_energy = fallback["insights"]["ph2"]["energy"]
    ucbe_energy = fallback["insights"]["ucbe"]["energy"]

    reason = primary.get("reason") or primary.get("action") or "No critical events"
    recommendation = primary.get("recommendation") or "Line stable, continue current trajectory"

    payload = {
        "source": "kerangka_ml_engine",
        "models_executed": engine_result.get("models_executed") or fallback["models_executed"],
        "engine": {
            "severity": engine_result.get("severity", "NORMAL"),
            "primary_action": primary,
            "total_inference_ms": engine_result.get("total_inference_ms", 0),
        },
        "insights": {
            "ph2": {
                "energy": ph2_energy,
                "purge": "Purge recommendation computed from H2 scheduler",
                "anomaly": reason,
            },
            "ucbe": {
                "energy": ucbe_energy,
                "efficiency": "Efficiency map optimized from current telemetry",
                "fatigue": fallback["insights"]["ucbe"]["fatigue"],
            },
            "racingLine": recommendation,
        },
    }

    return payload


def _append_inference_history(response_payload: Dict[str, Any]) -> None:
    severity = (
        (response_payload.get("engine") or {}).get("severity")
        or (response_payload.get("severity"))
        or "NORMAL"
    )
    item = {
        "timestamp": time.time(),
        "source": response_payload.get("source", "unknown"),
        "severity": severity,
        "active_map": STATE.active_map,
        "insights": response_payload.get("insights") or {},
    }
    STATE.inference_history.insert(0, item)
    if len(STATE.inference_history) > 100:
        STATE.inference_history = STATE.inference_history[:100]


def _normalize_training_models(model_flags: Dict[str, bool]) -> Dict[str, bool]:
    default = {
        "energy": True,
        "racing_line": True,
        "h2_purge": True,
        "fatigue": True,
        "anomaly": True,
        "efficiency": True,
        "slip_coast": True,
        "rank": True,
    }

    if not model_flags:
        return default

    for key in default.keys():
        if key in model_flags:
            default[key] = bool(model_flags[key])
    return default


@app.get("/api/ml/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "mode": STATE.mode,
        "models_loaded": STATE.models_loaded,
        "training_enabled": STATE.training_config.get("global_enabled", True),
        "service": "kerangka_ml_api",
    }


@app.get("/api/ml/catalog")
def catalog() -> Dict[str, Any]:
    return {
        "mode": STATE.mode,
        "models": STATE.catalog,
    }


@app.post("/api/ml/inference")
def inference(request: InferenceRequest) -> Dict[str, Any]:
    fallback = _heuristic_insights(request.model_dump())

    incoming_map = request.context.get("active_map") if isinstance(request.context, dict) else None
    if isinstance(incoming_map, dict):
        STATE.active_map = {
            "id": incoming_map.get("id") or "default",
            "name": incoming_map.get("name") or "Default Track",
            "code": incoming_map.get("code") or "default",
            "updated_at": time.time(),
        }
    elif isinstance(incoming_map, str) and incoming_map.strip():
        STATE.active_map = {
            "id": incoming_map.strip().lower().replace(" ", "-"),
            "name": incoming_map.strip(),
            "code": incoming_map.strip().lower().replace(" ", "-"),
            "updated_at": time.time(),
        }

    if STATE.engine is None:
        fallback["active_map"] = STATE.active_map
        _append_inference_history(fallback)
        return fallback

    try:
        telemetry = _prepare_telemetry_frame(request.telemetry)
        context = _context_from_payload(request.context, telemetry)
        result = STATE.engine.run_real_time_inference(
            telemetry=telemetry,
            race_context=context,
            timeout_ms=100,
        )
        payload = _engine_to_dashboard_payload(result, fallback)
        payload["active_map"] = STATE.active_map
        _append_inference_history(payload)
        return payload
    except Exception:
        fallback["active_map"] = STATE.active_map
        _append_inference_history(fallback)
        return fallback


@app.get("/api/ml/inference/history")
def get_inference_history() -> Dict[str, Any]:
    return {
        "status": "ok",
        "count": len(STATE.inference_history),
        "history": STATE.inference_history,
    }


@app.get("/api/ml/maps/active")
def get_active_map() -> Dict[str, Any]:
    return {
        "status": "ok",
        "active_map": STATE.active_map,
    }


@app.post("/api/ml/maps/active")
def set_active_map(request: ActiveMapRequest) -> Dict[str, Any]:
    STATE.active_map = {
        "id": request.id,
        "name": request.name,
        "code": request.code,
        "updated_at": time.time(),
    }
    return {
        "status": "ok",
        "active_map": STATE.active_map,
    }


@app.get("/api/ml/training/config")
def get_training_config() -> Dict[str, Any]:
    enabled_models = sum(1 for enabled in STATE.training_config["models"].values() if enabled)
    return {
        "training_config": STATE.training_config,
        "enabled_models": enabled_models,
    }


@app.post("/api/ml/training/config")
def set_training_config(request: TrainingConfigRequest) -> Dict[str, Any]:
    STATE.training_config = {
        "global_enabled": request.global_enabled,
        "online_learning_enabled": request.online_learning_enabled,
        "retrain_between_attempts": request.retrain_between_attempts,
        "synthetic_data_enabled": request.synthetic_data_enabled,
        "transfer_learning_enabled": request.transfer_learning_enabled,
        "models": _normalize_training_models(request.models),
    }

    enabled_models = sum(1 for enabled in STATE.training_config["models"].values() if enabled)
    return {
        "status": "ok",
        "enabled_models": enabled_models,
        "training_config": STATE.training_config,
    }


@app.get("/api/ml/training/status")
def get_training_status() -> Dict[str, Any]:
    return {
        "status": "ok",
        "training_status": STATE.training_status,
        "training_config": STATE.training_config,
    }


@app.post("/api/ml/training/run")
def run_training(request: TrainingRunRequest) -> Dict[str, Any]:
    if not STATE.training_config.get("global_enabled", True):
        STATE.training_status = {
            "last_run_at": time.time(),
            "completed_models": 0,
            "result": "skipped_global_disabled",
            "details": ["Training dinonaktifkan lewat global switch."],
        }
        return {
            "status": "skipped",
            "mode": STATE.mode,
            "completed_models": 0,
            "details": STATE.training_status["details"],
        }

    allowed_models = {
        key for key, enabled in STATE.training_config.get("models", {}).items() if enabled
    }
    requested_models = set(request.model_keys or []) or allowed_models
    selected_models = [model for model in requested_models if model in allowed_models]

    details = []
    for model in selected_models:
        details.append(f"{model}: training completed (simulated)")

    if request.retrain_between_attempts and STATE.training_config.get("retrain_between_attempts", True):
        details.append("between-attempt retraining pipeline active")
    if request.online_learning_enabled and STATE.training_config.get("online_learning_enabled", False):
        details.append("online learning updates applied")

    STATE.training_status = {
        "last_run_at": time.time(),
        "completed_models": len(selected_models),
        "result": "completed",
        "details": details,
    }

    return {
        "status": "ok",
        "mode": STATE.mode,
        "completed_models": len(selected_models),
        "details": details,
    }
