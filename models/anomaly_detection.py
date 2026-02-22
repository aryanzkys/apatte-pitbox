"""
Anomaly Detection System
Problem: Detect abnormal conditions (mechanical failure, sensor malfunction, unusual track)
Algorithm: Hybrid - Multiple approaches for different anomalies
Target Metrics: Recall >95%, Precision >80%, Lead time >60 seconds
Methods: One-Class SVM, Statistical Thresholding, FFT Analysis, Isolation Forest
"""

from sklearn.svm import OneClassSVM
from sklearn.ensemble import IsolationForest
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
import joblib


def train_anomaly_detector(
    X_train: pd.DataFrame,
    model_path: str = None,
    contamination: float = 0.05
) -> Dict[str, Any]:
    """
    Train Hybrid Anomaly Detection System
    
    Args:
        X_train: Training features (7 features)
                - vibration_rms, vibration_fft_50hz, vibration_fft_100hz
                - motor_temp, battery_cell_temp_max, wheel_speed_variance, current_draw
        model_path: Optional path to save ensemble model
        contamination: Expected proportion of anomalies (5%)
    
    Returns:
        Dictionary with multiple detector models:
        - one_class_svm: For vibration pattern anomalies
        - isolation_forest: For multi-dimensional outliers
        - z_score_params: For statistical thresholding
    """
    from sklearn.svm import OneClassSVM
    from sklearn.ensemble import IsolationForest
    import numpy as np
    
    print("[+] Training Hybrid Anomaly Detection System...")
    
    # 1. One-Class SVM for vibration patterns
    print("  [+] Training One-Class SVM for vibration anomalies...")
    vibration_cols = ["vibration_rms", "vibration_fft_50hz", "vibration_fft_100hz"]
    X_vibration = X_train[vibration_cols].fillna(0)
    
    svm_model = OneClassSVM(
        kernel="rbf",
        nu=contamination,
        gamma="auto"
    )
    svm_model.fit(X_vibration)
    
    # 2. Isolation Forest for multi-dimensional outliers
    print("  [+] Training Isolation Forest for multi-dimensional anomalies...")
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42
    )
    iso_forest.fit(X_train)
    
    # 3. Statistical parameters for thresholding
    print("  [+] Calculating statistical parameters...")
    z_score_params = {}
    for col in X_train.columns:
        if X_train[col].dtype in [np.float64, np.float32, np.int64, np.int32]:
            z_score_params[col] = {
                "mean": float(X_train[col].mean()),
                "std": float(X_train[col].std()),
                "min": float(X_train[col].min()),
                "max": float(X_train[col].max())
            }
    
    ensemble = {
        "one_class_svm": svm_model,
        "isolation_forest": iso_forest,
        "z_score_params": z_score_params,
        "contamination": contamination
    }
    
    if model_path:
        joblib.dump(ensemble, model_path)
        print(f"[+] Anomaly Detection ensemble saved to {model_path}")
    
    return ensemble


def predict_anomaly(
    ensemble: Dict[str, Any],
    X_test: pd.DataFrame,
    vibration_signal: np.ndarray = None
) -> Dict[str, Any]:
    """
    Detect anomalies using ensemble methods
    
    Args:
        ensemble: Ensemble dict from train_anomaly_detector
        X_test: Test features
        vibration_signal: Optional raw vibration signal for advanced FFT analysis
    
    Returns:
        Dictionary containing:
        - anomaly_detected: Boolean
        - anomaly_type: Type of anomaly detected
        - severity: LOW/MEDIUM/CRITICAL
        - confidence: Detection confidence (0-1)
        - action_recommend: Recommended action
    """
    import pandas as pd
    import numpy as np
    
    if isinstance(X_test, pd.Series):
        X_test = X_test.to_frame().T
    
    anomaly_detected = False
    anomaly_type = "NONE"
    severity = "LOW"
    confidence = 0.0
    evidence = []
    
    # 1. One-Class SVM detection (vibration)
    vibration_cols = ["vibration_rms", "vibration_fft_50hz", "vibration_fft_100hz"]
    X_vibration = X_test[vibration_cols].fillna(0)
    svm_pred = ensemble["one_class_svm"].predict(X_vibration)[0]  # -1 for anomaly, 1 for normal
    
    if svm_pred == -1:
        anomaly_detected = True
        anomaly_type = "VIBRATION_PATTERN"
        severity = "MEDIUM"
        confidence = max(confidence, 0.7)
        evidence.append("SVM detected vibration anomaly")
    
    # 2. Isolation Forest detection (multi-dimensional)
    iso_pred = ensemble["isolation_forest"].predict(X_test)[0]  # -1 for anomaly, 1 for normal
    iso_score = ensemble["isolation_forest"].score_samples(X_test)[0]  # Lower = more anomalous
    
    if iso_pred == -1:
        anomaly_detected = True
        if not anomaly_type or anomaly_type == "NONE":
            anomaly_type = "MULTI_DIMENSIONAL"
        confidence = max(confidence, abs(iso_score) / 10.0)  # Normalize
        evidence.append("Isolation Forest detected multi-dimensional anomaly")
    
    # 3. Statistical thresholding
    z_score_anomalies = _check_z_score_anomalies(X_test, ensemble["z_score_params"])
    if z_score_anomalies:
        anomaly_detected = True
        anomaly_type = z_score_anomalies["type"]
        severity = z_score_anomalies["severity"]
        confidence = max(confidence, z_score_anomalies["confidence"])
        evidence.extend(z_score_anomalies["evidence"])
    
    # 4. Specific pattern detection
    specific_anomalies = _detect_specific_patterns(X_test)
    if specific_anomalies:
        anomaly_detected = True
        anomaly_type = specific_anomalies["type"]
        severity = specific_anomalies["severity"]
        confidence = max(confidence, specific_anomalies["confidence"])
        evidence.extend(specific_anomalies["evidence"])
    
    # Generate recommendation
    action_recommend = _generate_anomaly_action(anomaly_type, severity, evidence)
    
    return {
        "anomaly_detected": bool(anomaly_detected),
        "anomaly_type": anomaly_type,
        "severity": severity,
        "confidence": float(np.clip(confidence, 0.0, 1.0)),
        "action_recommend": action_recommend,
        "evidence": evidence,
        "lead_time_estimate_seconds": 60 if anomaly_detected else 0
    }


def _check_z_score_anomalies(
    X_test: pd.DataFrame,
    z_score_params: Dict[str, Dict[str, float]]
) -> Dict[str, Any]:
    """
    Check for statistical anomalies using z-scores
    
    Anomaly threshold: |z| > 3 (99.7% confidence)
    """
    import pandas as pd
    import numpy as np
    
    anomalies = []
    
    for col in X_test.columns:
        if col not in z_score_params:
            continue
        
        params = z_score_params[col]
        value = X_test[col].iloc[0]
        
        if params["std"] > 0:
            z_score = abs((value - params["mean"]) / params["std"])
            
            if z_score > 3:
                anomalies.append({
                    "column": col,
                    "z_score": float(z_score),
                    "value": float(value)
                })
    
    if anomalies:
        # Find most significant anomaly
        main_anom = max(anomalies, key=lambda x: x["z_score"])
        
        return {
            "detected": True,
            "type": f"STATISTICAL_{main_anom['column'].upper()}",
            "severity": "HIGH" if main_anom["z_score"] > 5 else "MEDIUM",
            "confidence": min(main_anom["z_score"] / 5.0, 1.0),
            "evidence": [f"{a['column']}: z={a['z_score']:.2f}" for a in anomalies]
        }
    
    return None


def _detect_specific_patterns(X_test: pd.DataFrame) -> Dict[str, Any]:
    """
    Detect specific physical anomalies
    
    Patterns:
    - Bearing failure: FFT 50Hz spike
    - Overheating: Temp ramp
    - Electrical: Current surge
    - Slip/Lock: Wheel speed variance
    """
    import pandas as pd
    import numpy as np
    
    detections = []
    
    # Bearing failure (50Hz resonance)
    if "vibration_fft_50hz" in X_test.columns:
        fft_50hz = X_test["vibration_fft_50hz"].iloc[0]
        if fft_50hz > 100:  # Threshold (device-specific)
            detections.append({
                "type": "BEARING_UNBALANCE",
                "severity": "HIGH",
                "confidence": 0.85,
                "evidence": f"FFT 50Hz spike: {fft_50hz:.1f}"
            })
    
    # Motor overheating
    if "motor_temp" in X_test.columns:
        motor_temp = X_test["motor_temp"].iloc[0]
        if motor_temp > 90:
            detections.append({
                "type": "MOTOR_OVERHEAT",
                "severity": "CRITICAL" if motor_temp > 100 else "HIGH",
                "confidence": 0.9,
                "evidence": f"Motor temp: {motor_temp:.1f}°C"
            })
    
    # Battery overheating
    if "battery_cell_temp_max" in X_test.columns:
        batt_temp = X_test["battery_cell_temp_max"].iloc[0]
        if batt_temp > 60:
            detections.append({
                "type": "BATTERY_OVERHEAT",
                "severity": "HIGH",
                "confidence": 0.85,
                "evidence": f"Battery cell temp: {batt_temp:.1f}°C"
            })
    
    # Wheel slip/lock detection
    if "wheel_speed_variance" in X_test.columns:
        wheel_var = X_test["wheel_speed_variance"].iloc[0]
        if wheel_var > 50:
            detections.append({
                "type": "WHEEL_SLIP_LOCK",
                "severity": "MEDIUM",
                "confidence": 0.75,
                "evidence": f"Wheel variance: {wheel_var:.1f}"
            })
    
    # Electrical anomaly (current surge)
    if "current_draw" in X_test.columns:
        current = X_test["current_draw"].iloc[0]
        if current > 200:  # Threshold
            detections.append({
                "type": "CURRENT_SURGE",
                "severity": "HIGH",
                "confidence": 0.8,
                "evidence": f"Current draw: {current:.1f}A"
            })
    
    if detections:
        # Return most severe detection
        main = max(detections, key=lambda x: {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1}.get(x["severity"], 0))
        return {
            "detected": True,
            "type": main["type"],
            "severity": main["severity"],
            "confidence": main["confidence"],
            "evidence": [main["evidence"]]
        }
    
    return None


def _generate_anomaly_action(
    anomaly_type: str,
    severity: str,
    evidence: List[str]
) -> str:
    """
    Generate recommended action based on anomaly type
    """
    
    recommendations = {
        "BEARING_UNBALANCE": {
            "CRITICAL": "🛑 STOP: Bearing failure imminent. Limp into pits.",
            "HIGH": "⚠ Slow to 20 km/h, reduce cornering. Inspect front bearing in pits.",
            "MEDIUM": "⚠ Reduce speed 10%, monitor bearing temp closely."
        },
        "MOTOR_OVERHEAT": {
            "CRITICAL": "🛑 EMERGENCY: Motor shutdown risk. Reduce power to 50%, pit immediately.",
            "HIGH": "⚠ Reduce throttle to 75%, increase coast ratio, pit stop if continues.",
            "MEDIUM": "⚠ Monitor motor temp, avoid full throttle."
        },
        "BATTERY_OVERHEAT": {
            "CRITICAL": "🛑 Battery at risk. Reduce power 50%, pit immediately for cooling.",
            "HIGH": "⚠ Increase coast ratio +10%, reduce speed, monitor cell temp.",
            "MEDIUM": "⚠ Maintain current speed, increase ventilation."
        },
        "CURRENT_SURGE": {
            "CRITICAL": "🛑 Electrical failure risk. Check motor connection, pit immediately.",
            "HIGH": "⚠ Unplug non-essential load, monitor power draw.",
            "MEDIUM": "⚠ Monitor current, reduce speed if continues."
        },
        "WHEEL_SLIP_LOCK": {
            "CRITICAL": "🛑 Loss of traction. Slow down, pit for tire inspection.",
            "HIGH": "⚠ Adjust tire pressure, reduce speed, increase coast.",
            "MEDIUM": "⚠ Check tire pressure, ready for adjustment."
        },
        "MULTI_DIMENSIONAL": {
            "CRITICAL": "🛑 Multiple anomalies detected. Pit immediately for diagnosis.",
            "HIGH": "⚠ Multiple parameters abnormal. pit stop recommended.",
            "MEDIUM": "⚠ Several metrics outside normal range. Monitor closely."
        }
    }
    
    default_actions = {
        "CRITICAL": "🛑 Anomaly confidence high. Pit immediately for inspection.",
        "HIGH": "⚠ Stop and pit for troubleshooting recommended.",
        "MEDIUM": "📊 Monitor continuously, pit if condition worsens."
    }
    
    if anomaly_type in recommendations:
        return recommendations[anomaly_type].get(severity, default_actions[severity])
    else:
        return default_actions.get(severity, "⚠ Anomaly detected. Monitor system.")


def load_anomaly_detector(model_path: str) -> Dict[str, Any]:
    """
    Load pre-trained Anomaly Detection ensemble from disk
    
    Args:
        model_path: Path to saved ensemble
    
    Returns:
        Loaded ensemble
    """
    import joblib
    
    ensemble = joblib.load(model_path)
    print(f"[+] Anomaly Detection ensemble loaded from {model_path}")
    return ensemble


def calculate_anomaly_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray
) -> Dict[str, float]:
    """
    Calculate anomaly detection metrics with priority on recall
    
    Args:
        y_true: Ground truth (1 = anomaly, 0 = normal)
        y_pred: Predictions (1 = anomaly, 0 = normal)
    
    Returns:
        Metrics dictionary
    """
    from sklearn.metrics import recall_score, precision_score, f1_score, roc_auc_score
    import numpy as np
    
    recall = recall_score(y_true, y_pred, zero_division=0)
    precision = precision_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    if len(np.unique(y_true)) > 1:
        try:
            auc = roc_auc_score(y_true, y_pred)
        except:
            auc = 0.0
    else:
        auc = 0.0
    
    return {
        "Recall": float(recall),
        "Precision": float(precision),
        "F1": float(f1),
        "AUC": float(auc)
    }
