"""
Driver Fatigue Detector Model
Problem: Detect driver fatigue before performance drops or safety risk
Algorithm: Random Forest Classifier (Multi-class)
Target Metrics: Accuracy >85%, Recall for High Fatigue >90%
Safety Rules: SpO2 <90% = HYPOXIA RISK, HR >180 = MEDICAL CONCERN
"""

from sklearn.ensemble import RandomForestClassifier
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
import joblib


def train_fatigue_detector(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_path: str = None
) -> RandomForestClassifier:
    """
    Train Random Forest Driver Fatigue Detector
    
    Args:
        X_train: Training features (7 features)
                - heart_rate_bpm, spo2_pct, throttle_variance
                - steering_oscillation, elapsed_time, lap_time_variance, cabin_temp
        y_train: Target - fatigue_level (0: None, 1: Low, 2: Medium, 3: High)
        model_path: Optional path to save model
    
    Returns:
        Trained Random Forest classifier
    
    Classification:
        0 = None (0-25%)
        1 = Low (26-50%)
        2 = Medium (51-75%)
        3 = High (76-100%)
    """
    from sklearn.ensemble import RandomForestClassifier
    
    model = RandomForestClassifier(
        n_estimators=50,
        max_depth=8,
        min_samples_leaf=5,
        n_jobs=2,
        random_state=42,
        verbose=0
    )
    
    print("[+] Training Driver Fatigue Detector...")
    model.fit(X_train, y_train)
    
    if model_path:
        joblib.dump(model, model_path)
        print(f"[+] Model saved to {model_path}")
    
    return model


def predict_fatigue(
    model: RandomForestClassifier,
    X_test: pd.DataFrame,
    heart_rate: float = None,
    spo2_pct: float = None
) -> Dict[str, Any]:
    """
    Predict driver fatigue level with medical safety checks
    
    Args:
        model: Trained Random Forest model
        X_test: Test features
        heart_rate: Optional heart rate for safety check
        spo2_pct: Optional blood oxygen for safety check
    
    Returns:
        Dictionary containing:
        - fatigue_level: 0=None, 1=Low, 2=Medium, 3=High
        - fatigue_pct: 0-100%
        - action: Recommended action
        - confidence: Model confidence (0-1)
        - medical_alert: Safety alerts if any
    """
    from sklearn.ensemble import RandomForestClassifier
    import pandas as pd
    import numpy as np
    
    # Critical safety checks first
    medical_alerts = []
    
    if spo2_pct is not None and spo2_pct < 90:
        medical_alerts.append({
            "severity": "CRITICAL",
            "alert": "HYPOXIA_RISK",
            "value": spo2_pct,
            "action": "IMMEDIATE_ALERT: Check oxygen, open ventilation"
        })
    
    if heart_rate is not None and heart_rate > 180:
        medical_alerts.append({
            "severity": "HIGH",
            "alert": "HIGH_HR",
            "value": heart_rate,
            "action": "MEDICAL_CONCERN: Elevated heart rate, monitor closely"
        })
    
    # Handle single row vs batch
    if isinstance(X_test, pd.Series):
        X_test = X_test.to_frame().T
    
    # Get ML prediction
    prediction = model.predict(X_test)[0] if len(X_test) == 1 else model.predict(X_test)[0]
    prediction_proba = model.predict_proba(X_test)[0] if len(X_test) == 1 else model.predict_proba(X_test)[0]
    
    confidence = float(prediction_proba.max())
    
    # Convert to percentage (0-100)
    # Each class covers ~25% range
    class_to_pct = {0: 12.5, 1: 37.5, 2: 62.5, 3: 87.5}
    fatigue_pct = float(class_to_pct[prediction])
    
    # Add uncertainty to percentage
    uncertainty = (1.0 - confidence) * 25
    fatigue_pct = fatigue_pct + uncertainty
    
    # Determine action based on level
    actions = {
        0: "✓ Normal operation - monitor routine",
        1: "⚠ Low fatigue - monitor closely, suggest rest after lap",
        2: "⚠ Medium fatigue - warning alert, recommend pit stop for evaluation",
        3: "🚨 High fatigue - recommend race abort or driver change"
    }
    
    # Override with critical medical alerts
    if medical_alerts:
        action = "🚨 MEDICAL ALERT - " + medical_alerts[0]["action"]
        # Auto-escalate fatigue level for medical reasons
        if spo2_pct is not None and spo2_pct < 90:
            prediction = 3
            fatigue_pct = 100
    else:
        action = actions[prediction]
    
    return {
        "fatigue_level": int(prediction),
        "fatigue_pct": float(np.clip(fatigue_pct, 0, 100)),
        "action": action,
        "confidence": float(confidence),
        "medical_alerts": medical_alerts,
        "level_names": ["None", "Low", "Medium", "High"][prediction]
    }


def predict_fatigue_batch(
    model: RandomForestClassifier,
    X_batch: pd.DataFrame,
    heart_rate_col: str = None,
    spo2_col: str = None
) -> Dict[str, Any]:
    """
    Batch fatigue prediction for multiple samples
    
    Args:
        model: Trained model
        X_batch: Batch of test features
        heart_rate_col: Optional HR column name
        spo2_col: Optional SpO2 column name
    
    Returns:
        Batch results
    """
    from sklearn.ensemble import RandomForestClassifier
    import pandas as pd
    
    predictions = model.predict(X_batch)
    prediction_probas = model.predict_proba(X_batch)
    
    fatigue_pcts = []
    confidences = []
    medical_alerts_list = []
    
    for i, (pred, proba) in enumerate(zip(predictions, prediction_probas)):
        conf = float(proba.max())
        class_to_pct = {0: 12.5, 1: 37.5, 2: 62.5, 3: 87.5}
        fatigue_pct = class_to_pct[pred] + (1.0 - conf) * 25
        
        confidences.append(conf)
        fatigue_pcts.append(np.clip(fatigue_pct, 0, 100))
        
        # Check medical alerts
        alerts = []
        if spo2_col and X_batch[spo2_col].iloc[i] < 90:
            alerts.append("HYPOXIA_RISK")
        if heart_rate_col and X_batch[heart_rate_col].iloc[i] > 180:
            alerts.append("HIGH_HR")
        
        medical_alerts_list.append(alerts)
    
    return {
        "fatigue_levels": predictions.tolist(),
        "fatigue_pcts": fatigue_pcts,
        "confidences": confidences,
        "mean_fatigue": float(np.mean(fatigue_pcts)),
        "max_fatigue": float(np.max(fatigue_pcts)),
        "medical_alerts": medical_alerts_list,
        "critical_count": sum(1 for alerts in medical_alerts_list if len(alerts) > 0)
    }


def _calculate_throttle_smoothness(throttle_history: np.ndarray) -> float:
    """
    Calculate throttle variance (control smoothness)
    
    Args:
        throttle_history: Array of throttle values (0-100%)
    
    Returns:
        Variance score (higher = less smooth)
    """
    import numpy as np
    
    if len(throttle_history) < 2:
        return 0.0
    
    # Calculate rate of change
    throttle_diff = np.abs(np.diff(throttle_history))
    variance = float(np.std(throttle_diff))
    
    return variance


def _calculate_steering_oscillation(steering_history: np.ndarray) -> float:
    """
    Calculate steering oscillation (hand steadiness)
    
    Args:
        steering_history: Array of steering angles (degrees)
    
    Returns:
        Oscillation score (higher = more oscillation)
    """
    import numpy as np
    
    if len(steering_history) < 2:
        return 0.0
    
    # Calculate steering angle changes
    steering_diff = np.abs(np.diff(steering_history))
    oscillation = float(np.std(steering_diff))
    
    return oscillation


def estimate_fatigue_level_from_sensors(
    heart_rate: float,
    spo2_pct: float,
    throttle_variance: float,
    steering_oscillation: float,
    elapsed_time_minutes: float,
    lap_time_variance: float,
    cabin_temp: float
) -> Dict[str, Any]:
    """
    Estimate fatigue level using physics/heuristics (fallback)
    
    Args:
        heart_rate: Heart rate (bpm)
        spo2_pct: Blood oxygen (%)
        throttle_variance: Throttle control variance
        steering_oscillation: Steering control variance
        elapsed_time_minutes: Minutes in race
        lap_time_variance: Consistency variance
        cabin_temp: Cabin temperature (°C)
    
    Returns:
        Estimated fatigue components
    """
    import numpy as np
    
    fatigue_score = 0.0
    
    # HR contribution (max at 150 bpm, danger >180)
    hr_normalized = np.clip(heart_rate / 150.0, 0.0, 2.0) * 25
    fatigue_score += hr_normalized
    
    # SpO2 contribution (should be >95%, drops with fatigue)
    spo2_normalized = (100.0 - spo2_pct) * 2  # 5% drop = 10 points
    fatigue_score += spo2_normalized
    
    # Control smoothness (fatigue causes jitter)
    control_score = (throttle_variance + steering_oscillation) * 2
    fatigue_score += np.clip(control_score, 0, 25)
    
    # Time factor (fatigue accumulates)
    time_fatigue = (elapsed_time_minutes / 120.0) * 15  # Over 2 hours accumulates
    fatigue_score += time_fatigue
    
    # Performance consistency (fatigue causes variance)
    consistency_score = np.clip(lap_time_variance / 2.0, 0, 15)
    fatigue_score += consistency_score
    
    # Heat stress (high cabin temp)
    heat_score = max(0, (cabin_temp - 25) * 0.5)
    fatigue_score += heat_score
    
    fatigue_pct = float(np.clip(fatigue_score, 0, 100))
    
    # Convert to level
    if fatigue_pct < 25:
        level = 0
    elif fatigue_pct < 50:
        level = 1
    elif fatigue_pct < 75:
        level = 2
    else:
        level = 3
    
    return {
        "estimated_fatigue_pct": fatigue_pct,
        "estimated_level": level,
        "hr_contribution": float(hr_normalized),
        "spo2_contribution": float(spo2_normalized),
        "control_contribution": float(control_score),
        "time_contribution": float(time_fatigue),
        "consistency_contribution": float(consistency_score),
        "heat_contribution": float(heat_score)
    }


def load_fatigue_detector(model_path: str) -> RandomForestClassifier:
    """
    Load pre-trained Fatigue Detector model from disk
    
    Args:
        model_path: Path to saved model
    
    Returns:
        Loaded model
    """
    import joblib
    
    model = joblib.load(model_path)
    print(f"[+] Fatigue Detector loaded from {model_path}")
    return model


# Validation metrics
def calculate_fatigue_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray
) -> Dict[str, float]:
    """
    Calculate validation metrics with focus on high fatigue recall
    
    Args:
        y_true: Ground truth
        y_pred: Predictions
    
    Returns:
        Metrics dictionary
    """
    from sklearn.metrics import accuracy_score, recall_score, precision_score, f1_score
    import numpy as np
    
    accuracy = accuracy_score(y_true, y_pred)
    
    # Recall for high fatigue (level 3)
    high_fatigue_true = (y_true == 3).astype(int)
    high_fatigue_pred = (y_pred == 3).astype(int)
    
    if high_fatigue_true.sum() > 0:
        high_fatigue_recall = high_fatigue_pred[high_fatigue_true == 1].sum() / high_fatigue_true.sum()
    else:
        high_fatigue_recall = 1.0
    
    return {
        "Accuracy": float(accuracy),
        "High_Fatigue_Recall": float(high_fatigue_recall),
        "Precision_Macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "F1_Macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    }
