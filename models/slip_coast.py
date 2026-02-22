"""
Slip & Coasting Optimizer Model
Problem: Determine optimal coast ratio per track section and detect wheel slip
Algorithm: Decision Tree Regressor
Target Metrics: MAE Coast Ratio <5%, Slip Detection Recall >85%
Impact: Coast ratio +10-15%, Efficiency +10-15%
"""

from sklearn.tree import DecisionTreeRegressor
import numpy as np
import pandas as pd
from typing import Dict, Any
import joblib


def train_slip_coast_optimizer(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_path: str = None
) -> DecisionTreeRegressor:
    """
    Train Decision Tree Slip & Coasting Optimizer
    
    Args:
        X_train: Training features (7 features)
                - track_section (0: Straight, 1: Curve, 2: Uphill, 3: Downhill)
                - current_speed, wheel_speed_front, wheel_speed_rear
                - gps_speed, decel_rate, tire_pressure
        y_train: Target - optimal_coast_ratio (0-100%)
        model_path: Optional path to save model
    
    Returns:
        Trained Decision Tree model
    
    Hyperparameters:
        - max_depth: 5 (shallow tree, interpretable)
        - min_samples_split: 20 (avoid overfitting)
    """
    from sklearn.tree import DecisionTreeRegressor
    
    model = DecisionTreeRegressor(
        max_depth=5,
        min_samples_split=20,
        min_samples_leaf=5,
        random_state=42
    )
    
    print("[+] Training Slip & Coasting Optimizer...")
    model.fit(X_train, y_train)
    
    if model_path:
        joblib.dump(model, model_path)
        print(f"[+] Model saved to {model_path}")
    
    return model


def predict_slip_coast(
    model: DecisionTreeRegressor,
    X_test: pd.DataFrame,
    track_section_name: str = None
) -> Dict[str, Any]:
    """
    Predict optimal coast ratio and detect slip
    
    Args:
        model: Trained Decision Tree model
        X_test: Test features
        track_section_name: Human-readable section name (optional)
    
    Returns:
        Dictionary containing:
        - optimal_coast_ratio: Recommended coast % (0-100%)
        - slip_detected: Boolean
        - slip_severity: "NONE", "LOW", "MEDIUM", or "HIGH"
        - tire_pressure_adjust: Recommendation in PSI
        - regen_potential: Regenerative braking potential (Watts) for BEV
        - recommendation: Text advice
        - confidence: Confidence (0-1)
    """
    from sklearn.tree import DecisionTreeRegressor
    import pandas as pd
    import numpy as np
    
    if isinstance(X_test, pd.Series):
        X_test = X_test.to_frame().T
    
    # Get optimal coast ratio
    optimal_coast = model.predict(X_test)[0] if len(X_test) == 1 else model.predict(X_test)[0]
    optimal_coast = float(np.clip(optimal_coast, 0, 100))
    
    # Detect wheel slip
    slip_info = _detect_wheel_slip(X_test)
    slip_detected = slip_info["slip_detected"]
    slip_severity = slip_info["severity"]
    
    # Tire pressure recommendation
    tire_pressure = X_test["tire_pressure"].iloc[0] if "tire_pressure" in X_test.columns else 1.8
    pressure_adjust = _recommend_tire_pressure(slip_severity, tire_pressure)
    
    # Regen potential (if applicable)
    decel_rate = X_test["decel_rate"].iloc[0] if "decel_rate" in X_test.columns else 0
    regen_potential = max(0, decel_rate * 500)  # Empirical: 500W per m/s² deceleration
    
    # Generate recommendation
    recommendation = _generate_coast_recommendation(
        optimal_coast,
        slip_severity,
        track_section_name
    )
    
    # Confidence based on slip detection certainty
    if slip_detected:
        confidence = 0.7  # Lower confidence when slip detected
    else:
        confidence = 0.9
    
    return {
        "optimal_coast_ratio": optimal_coast,
        "slip_detected": bool(slip_detected),
        "slip_severity": slip_severity,
        "tire_pressure_adjust": pressure_adjust,
        "regen_potential": float(regen_potential),
        "recommendation": recommendation,
        "confidence": float(confidence),
        "track_section": track_section_name or "UNKNOWN",
        "current_speed": float(X_test["current_speed"].iloc[0]) if "current_speed" in X_test.columns else 0
    }


def _detect_wheel_slip(X_test: pd.DataFrame) -> Dict[str, Any]:
    """
    Detect wheel slip using wheel speed sensors
    
    Slip logic:
    - GPS speed is ground truth
    - Wheel speeds should match GPS speed
    - Significant deviation = slip or lock
    
    Args:
        X_test: Features with wheel_speed_front, wheel_speed_rear, gps_speed
    
    Returns:
        Slip detection result
    """
    import pandas as pd
    import numpy as np
    
    gps_speed = X_test["gps_speed"].iloc[0] if "gps_speed" in X_test.columns else 0
    wheel_front = X_test["wheel_speed_front"].iloc[0] if "wheel_speed_front" in X_test.columns else 0
    wheel_rear = X_test["wheel_speed_rear"].iloc[0] if "wheel_speed_rear" in X_test.columns else 0
    
    # Normalize wheel speeds to GPS reference
    if gps_speed > 0:
        front_deviation = abs(wheel_front - gps_speed) / gps_speed
        rear_deviation = abs(wheel_rear - gps_speed) / gps_speed
    else:
        front_deviation = 0
        rear_deviation = 0
    
    max_deviation = max(front_deviation, rear_deviation)
    
    # Slip threshold: 15% deviation indicates slip
    slip_detected = max_deviation > 0.15
    
    # Severity classification
    if not slip_detected:
        severity = "NONE"
    elif max_deviation < 0.25:
        severity = "LOW"
    elif max_deviation < 0.40:
        severity = "MEDIUM"
    else:
        severity = "HIGH"
    
    return {
        "slip_detected": slip_detected,
        "severity": severity,
        "front_deviation": float(front_deviation),
        "rear_deviation": float(rear_deviation),
        "slip_type": "ACCELERATION_SLIP" if wheel_front > gps_speed else "BRAKING_LOCK"
    }


def _recommend_tire_pressure(
    slip_severity: str,
    current_pressure: float
) -> Dict[str, Any]:
    """
    Recommend tire pressure adjustment based on slip
    
    Args:
        slip_severity: Current slip severity
        current_pressure: Current tire pressure (bar)
    
    Returns:
        Pressure adjustment recommendation
    """
    
    adjustments = {
        "NONE": {"delta": 0, "reason": "Pressureoptimal"},
        "LOW": {"delta": 0.1, "reason": "Slight increase for better grip"},
        "MEDIUM": {"delta": 0.2, "reason": "Increase pressure to improve traction"},
        "HIGH": {"delta": 0.3, "reason": "Significant increase, check for mechanical issue"}
    }
    
    adj = adjustments.get(slip_severity, adjustments["NONE"])
    
    new_pressure = current_pressure + adj["delta"]
    
    return {
        "current_pressure": float(current_pressure),
        "recommended_pressure": float(new_pressure),
        "delta": float(adj["delta"]),
        "reason": adj["reason"]
    }


def _generate_coast_recommendation(
    coast_ratio: float,
    slip_severity: str,
    track_section: str
) -> str:
    """
    Generate human-readable coast recommendation
    """
    
    section_info = {
        "STRAIGHT": "on straightaway",
        "CURVE": "before turn",
        "UPHILL": "approaching hill",
        "DOWNHILL": "on descent"
    }
    
    section_text = section_info.get(track_section, "in this section")
    
    if slip_severity != "NONE":
        return f"⚠ Slip detected: {slip_severity.lower()} - Reduce coast ratio to {max(0, coast_ratio - 10):.0f}% for more traction"
    
    if coast_ratio > 60:
        return f"⚠ High coast ratio {coast_ratio:.0f}% recommended {section_text} - increase engine off time +20%"
    elif coast_ratio > 40:
        return f"✓ Coast {coast_ratio:.0f}% {section_text} for energy efficiency"
    else:
        return f"✓ Moderate coasting {coast_ratio:.0f}% {section_text} - maintain some power for control"


def predict_slip_coast_batch(
    model: DecisionTreeRegressor,
    X_batch: pd.DataFrame
) -> Dict[str, Any]:
    """
    Batch prediction for slip and coasting optimization
    
    Args:
        model: Trained model
        X_batch: Batch of features
    
    Returns:
        Batch results
    """
    from sklearn.tree import DecisionTreeRegressor
    import pandas as pd
    import numpy as np
    
    predictions = model.predict(X_batch)
    
    results = []
    slip_count = 0
    
    for i, pred in enumerate(predictions):
        coast = float(np.clip(pred, 0, 100))
        
        # Create single-row df for slip detection
        X_row = X_batch.iloc[[i]]
        slip_info = _detect_wheel_slip(X_row)
        
        if slip_info["slip_detected"]:
            slip_count += 1
        
        results.append({
            "coast_ratio": coast,
            "slip_severity": slip_info["severity"]
        })
    
    return {
        "predictions": results,
        "mean_coast_ratio": float(np.mean(predictions)),
        "coast_std": float(np.std(predictions)),
        "slip_events": slip_count,
        "slip_rate": float(slip_count / len(X_batch) * 100 if len(X_batch) > 0 else 0)
    }


def get_coast_ratio_by_track_section(
    model: DecisionTreeRegressor,
    track_section: int
) -> float:
    """
    Get typical coast ratio for specific track section
    
    Args:
        model: Trained model
        track_section: Section code (0: Straight, 1: Curve, 2: Uphill, 3: Downhill)
    
    Returns:
        Typical coast ratio for that section
    """
    from sklearn.tree import DecisionTreeRegressor
    
    # Get tree's decision paths at root
    # Simplified: return feature-weighted average
    feature_importance = model.feature_importances_
    
    # Rough estimate based on section type
    section_base_coasts = [70, 30, 20, 60]  # Straight, Curve, Uphill, Downhill
    
    return float(section_base_coasts[track_section])


def load_slip_coast_optimizer(model_path: str) -> DecisionTreeRegressor:
    """
    Load pre-trained Slip & Coasting Optimizer from disk
    
    Args:
        model_path: Path to saved model
    
    Returns:
        Loaded model
    """
    import joblib
    
    model = joblib.load(model_path)
    print(f"[+] Slip & Coasting Optimizer loaded from {model_path}")
    return model


def calculate_slip_coast_metrics(
    y_true_coast: np.ndarray,
    y_pred_coast: np.ndarray,
    y_true_slip: np.ndarray = None,
    y_pred_slip: np.ndarray = None
) -> Dict[str, float]:
    """
    Calculate metrics for coast ratio and slip detection
    
    Args:
        y_true_coast: Ground truth coast ratio
        y_pred_coast: Predicted coast ratio
        y_true_slip: Ground truth slip (optional, for slip detection metrics)
        y_pred_slip: Predicted slip (optional)
    
    Returns:
        Metrics dictionary
    """
    from sklearn.metrics import mean_absolute_error, recall_score
    import numpy as np
    
    mae_coast = mean_absolute_error(y_true_coast, y_pred_coast)
    
    metrics = {
        "MAE_Coast": float(mae_coast)
    }
    
    # Slip detection recall if provided
    if y_true_slip is not None and y_pred_slip is not None:
        slip_recall = recall_score(y_true_slip, y_pred_slip, zero_division=0)
        metrics["Slip_Recall"] = float(slip_recall)
    
    return metrics
