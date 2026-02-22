"""
H₂ Purge Scheduler Model
Problem: Hydrogen accumulates in fuel cell, need smart purging
Algorithm: Hybrid XGBoost + Physics Rules
Target Metrics: Efficiency +5-8% improvement
Safety Rules: LEL >25% = EMERGENCY PURGE
"""

import xgboost as xgb
import numpy as np
import pandas as pd
from typing import Dict, Any
import joblib


def train_h2_purge_scheduler(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_path: str = None
) -> xgb.XGBClassifier:
    """
    Train H₂ Purge Scheduler with XGBoost
    
    Args:
        X_train: Training features (7 features)
                - LEL_sensor_pct, h2_tank_pressure, fuel_cell_temp
                - h2_flow_rate, time_since_last_purge, ambient_humidity, lap_progress
        y_train: Target - purge_recommend (0: Wait, 1: Purge, 2: Optimal)
        model_path: Optional path to save model
    
    Returns:
        Trained XGBoost classifier
    
    Classification:
        0 = WAIT (LEL < 20%)
        1 = PURGE_RECOMMENDED (20% <= LEL < 25%)
        2 = OPTIMAL_TIMING (model recommends right now)
    """
    import xgboost as xgb
    
    model = xgb.XGBClassifier(
        n_estimators=50,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        n_jobs=4,
        random_state=42,
        verbosity=0
    )
    
    print("[+] Training H₂ Purge Scheduler...")
    model.fit(X_train, y_train, verbose=False)
    
    if model_path:
        joblib.dump(model, model_path)
        print(f"[+] Model saved to {model_path}")
    
    return model


def predict_h2_purge(
    model: xgb.XGBClassifier,
    X_test: pd.DataFrame,
    LEL_sensor_pct: float
) -> Dict[str, Any]:
    """
    Predict optimal H₂ purge action with safety overrides
    
    Args:
        model: Trained XGBoost classifier
        X_test: Test features
        LEL_sensor_pct: Lower Explosive Limit sensor reading (0-100%)
    
    Returns:
        Dictionary containing:
        - purge_recommend: "EMERGENCY_PURGE", "PURGE_NOW", "WAIT", or "OPTIMAL_TIMING"
        - optimal_duration: Purge duration in seconds
        - predicted_efficiency_post: Expected efficiency after purge
        - confidence: Model confidence (0-1)
        - reason: Explanation
    """
    import xgboost as xgb
    import pandas as pd
    
    # Safety rules override (hard limits)
    if LEL_sensor_pct > 25:
        return {
            "purge_recommend": "EMERGENCY_PURGE",
            "optimal_duration": 45,  # Full purge
            "predicted_efficiency_post": 0.0,  # Unknown during emergency
            "confidence": 1.0,
            "reason": f"EMERGENCY: LEL at {LEL_sensor_pct:.1f}% - PURGE NOW for safety",
            "severity": "CRITICAL"
        }
    
    # Handle single row vs batch
    if isinstance(X_test, pd.Series):
        X_test = X_test.to_frame().T
    
    # Get ML prediction
    prediction = model.predict(X_test)[0] if len(X_test) == 1 else model.predict(X_test)[0]
    prediction_proba = model.predict_proba(X_test)[0] if len(X_test) == 1 else model.predict_proba(X_test)[0]
    
    confidence = float(prediction_proba.max())
    
    # Map prediction classes to actions
    if LEL_sensor_pct > 20:
        # Alert but use ML to refine timing
        if prediction == 2:  # Optimal timing
            action = "PURGE_NOW"
            duration = 30
        else:
            action = "PURGE_CONSIDER"
            duration = 25
    else:
        # Safe zone - purely ML based
        if prediction == 1:
            action = "PURGE_RECOMMENDED"
            duration = 20
        else:
            action = "WAIT"
            duration = 0
    
    # Predict efficiency post-purge (rough estimate)
    if duration > 0:
        efficiency_improvement = 0.05 + (0.03 * (LEL_sensor_pct / 25.0))  # 5-8% improvement
        # This would be actual efficiency from features, using placeholder
        predicted_post_efficiency = 1.0 + efficiency_improvement
    else:
        predicted_post_efficiency = 1.0
    
    return {
        "purge_recommend": action,
        "optimal_duration": int(duration),
        "predicted_efficiency_post": float(predicted_post_efficiency),
        "confidence": float(confidence),
        "LEL_current": float(LEL_sensor_pct),
        "reason": f"LEL {LEL_sensor_pct:.1f}% - {action}",
        "severity": _assess_h2_severity(LEL_sensor_pct)
    }


def _assess_h2_severity(LEL_pct: float) -> str:
    """
    Assess severity level based on LEL percentage
    
    Args:
        LEL_pct: LEL sensor reading (0-100%)
    
    Returns:
        Severity level
    """
    if LEL_pct > 25:
        return "CRITICAL"
    elif LEL_pct > 20:
        return "HIGH"
    elif LEL_pct > 15:
        return "MEDIUM"
    else:
        return "LOW"


def h2_purge_physics_model(
    LEL_sensor: float,
    h2_tank_pressure: float,
    fuel_cell_temp: float,
    h2_flow_rate: float,
    time_since_purge: float
) -> Dict[str, Any]:
    """
    Physics-based H₂ purge calculation (deterministic component)
    
    Formula:
        h2_accumulation_rate = h2_flow_rate * (1 - purge_efficiency)
        LEL_rise_rate = h2_accumulation_rate / tank_volume
        hours_to_critical = (25 - LEL_current) / LEL_rise_rate
    
    Args:
        LEL_sensor: Current LEL reading (%)
        h2_tank_pressure: Tank pressure (bar)
        fuel_cell_temp: FC temperature (°C)
        h2_flow_rate: Flow rate (L/min)
        time_since_purge: Seconds since last purge
    
    Returns:
        Physics-based recommendation
    """
    import numpy as np
    
    # Constants (typical fuel cell system)
    TANK_VOLUME = 5.0  # liters
    PURGE_EFFICIENCY = 0.85  # 85% purge efficiency
    
    # Calculate accumulation
    h2_accumulation = h2_flow_rate * (1 - PURGE_EFFICIENCY) * time_since_purge / 60.0
    lel_rise = (h2_accumulation / TANK_VOLUME) * 100.0
    
    # Temperature compensation (hotter = accumulates faster)
    temp_factor = 1.0 + (fuel_cell_temp - 25.0) / 100.0
    adjusted_lel = LEL_sensor + (lel_rise * temp_factor)
    
    # Pressure compensation
    pressure_factor = h2_tank_pressure / 30.0  # Normalized to 30 bar
    adjusted_lel = adjusted_lel * pressure_factor
    
    # Time to critical (25% LEL)
    if (lel_rise * temp_factor * pressure_factor) > 0:
        time_to_critical = max(0, (25.0 - adjusted_lel) / (lel_rise * temp_factor * pressure_factor))
    else:
        time_to_critical = 999  # Won't reach
    
    return {
        "adjusted_LEL": float(adjusted_lel),
        "accumulation_rate": float(lel_rise * temp_factor * pressure_factor),
        "time_to_critical_minutes": float(time_to_critical),
        "physics_recommendation": "URGENT" if adjusted_lel > 20 else "MONITOR"
    }


def estimate_optimal_purge_duration(
    LEL_sensor: float,
    h2_flow_rate: float,
    target_LEL: float = 10.0
) -> int:
    """
    Estimate optimal purge duration based on LEL reduction target
    
    Args:
        LEL_sensor: Current LEL (%)
        h2_flow_rate: H₂ flow rate (L/min)
        target_LEL: Target LEL to reach (%)
    
    Returns:
        Recommended purge duration in seconds
    """
    import numpy as np
    
    if LEL_sensor <= target_LEL:
        return 0
    
    # Empirical model: each minute of purging reduces LEL by ~1.5%
    # at nominal h2_flow_rate of 0.5 L/min
    PURGE_EFFICIENCY_PER_MIN = 1.5
    flow_adjustment = h2_flow_rate / 0.5
    
    delta_LEL = LEL_sensor - target_LEL
    minutes_needed = delta_LEL / (PURGE_EFFICIENCY_PER_MIN * flow_adjustment)
    
    seconds = max(10, int(np.ceil(minutes_needed * 60)))
    
    return min(seconds, 60)  # Cap at 60 seconds


def load_h2_purge_scheduler(model_path: str) -> xgb.XGBClassifier:
    """
    Load pre-trained H₂ Purge Scheduler model from disk
    
    Args:
        model_path: Path to saved model
    
    Returns:
        Loaded model
    """
    import joblib
    
    model = joblib.load(model_path)
    print(f"[+] H₂ Purge Scheduler loaded from {model_path}")
    return model


def hybrid_h2_purge_decision(
    model: xgb.XGBClassifier,
    X_test: pd.DataFrame,
    physics_override: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Hybrid decision combining ML prediction and physics rules
    
    Args:
        model: Trained XGBoost model
        X_test: Features
        physics_override: Physics calculation results
    
    Returns:
        Final hybrid recommendation
    """
    import pandas as pd
    
    # Get ML prediction
    ml_result = predict_h2_purge(model, X_test, physics_override["adjusted_LEL"])
    
    # Check physics conflict
    if physics_override["physics_recommendation"] == "URGENT" and ml_result["purge_recommend"] == "WAIT":
        # Physics says urgent but ML says wait - trust physics
        ml_result["purge_recommend"] = "PURGE_RECOMMENDED"
        ml_result["reason"] += " [Physics override]"
        ml_result["confidence"] = min(ml_result["confidence"], 0.8)
    
    return ml_result
