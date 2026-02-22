"""
Energy Finish Predictor Model
Problem: Predict whether vehicle will finish race with sufficient State of Charge (SOC)
Algorithm: XGBoost Regression
Target Metrics: MAE <2% SOC, RMSE <3% SOC, R² >0.85, DNF Prevention Recall >95%
"""

import xgboost as xgb
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any
import joblib


def train_energy_predictor(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_path: str = None
) -> xgb.XGBRegressor:
    """
    Train XGBoost Energy Predictor Model
    
    Args:
        X_train: Training features (7 features)
                - soc_current, speed_avg, efficiency_rolling_3lap
                - lap_progress, motor_temp, battery_current, wind_headwind
        y_train: Target - predicted_final_soc (0-100)
        model_path: Optional path to save trained model
    
    Returns:
        Trained XGBoost model
    
    Hyperparameters:
        - n_estimators: 50 (fast training)
        - max_depth: 4 (prevent overfitting)
        - learning_rate: 0.1
        - subsample: 0.8 (regularization)
        - colsample_bytree: 0.8 (regularization)
        - reg_alpha: 0.1 (L1)
        - reg_lambda: 1.0 (L2)
    """
    import xgboost as xgb
    
    model = xgb.XGBRegressor(
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
    
    print("[+] Training Energy Predictor...")
    model.fit(X_train, y_train, verbose=False)
    
    if model_path:
        joblib.dump(model, model_path)
        print(f"[+] Model saved to {model_path}")
    
    return model


def predict_energy(
    model: xgb.XGBRegressor,
    X_test: pd.DataFrame
) -> Dict[str, Any]:
    """
    Predict final SOC and generate recommendations
    
    Args:
        model: Trained XGBoost model
        X_test: Test features (can be single sample or batch)
    
    Returns:
        Dictionary containing:
        - predicted_final_soc: Predicted SOC at finish (%)
        - confidence: Model confidence (0-1)
        - will_finish: Boolean (True if predicted_final_soc > 5%)
        - margin: Safety margin (%)
        - raw_prediction: Raw model output
    """
    import xgboost as xgb
    import pandas as pd
    
    # Handle single row vs batch
    if isinstance(X_test, pd.Series):
        X_test = X_test.to_frame().T
    
    # Make prediction
    raw_prediction = model.predict(X_test)[0] if len(X_test) == 1 else model.predict(X_test)
    
    # Calculate confidence (inverse of prediction uncertainty)
    # Using booster's get_score for feature importance weighting
    confidence = _calculate_confidence(model, X_test, raw_prediction)
    
    # Determine if will finish
    will_finish = raw_prediction > 5.0
    
    # Calculate safety margin
    margin = raw_prediction - 5.0  # 5% is minimum to finish
    
    return {
        "predicted_final_soc": float(raw_prediction),
        "confidence": float(confidence),
        "will_finish": bool(will_finish),
        "margin": float(margin),
        "raw_prediction": float(raw_prediction)
    }


def predict_energy_batch(
    model: xgb.XGBRegressor,
    X_batch: pd.DataFrame
) -> Dict[str, Any]:
    """
    Batch prediction for multiple samples
    
    Args:
        model: Trained XGBoost model
        X_batch: Batch of test features
    
    Returns:
        Dictionary with batch results
    """
    import xgboost as xgb
    
    predictions = model.predict(X_batch)
    confidences = []
    
    for pred in predictions:
        conf = _calculate_confidence(model, X_batch, pred)
        confidences.append(conf)
    
    will_finish = predictions > 5.0
    margins = predictions - 5.0
    
    return {
        "predicted_final_soc": predictions.tolist(),
        "confidence": confidences,
        "will_finish": will_finish.tolist(),
        "margin": margins.tolist(),
        "mean_confidence": float(np.mean(confidences))
    }


def _calculate_confidence(
    model: xgb.XGBRegressor,
    X: pd.DataFrame,
    prediction: float
) -> float:
    """
    Calculate model confidence score (0-1)
    Based on: feature importance distribution + prediction magnitude
    
    Args:
        model: Trained model
        X: Input features
        prediction: Model prediction
    
    Returns:
        Confidence score (0-1)
    """
    import numpy as np
    
    # Base confidence from prediction magnitude
    # Higher SOC margin = higher confidence
    soc_confidence = 1.0 - abs(prediction - 50.0) / 100.0  # Peak at 50%
    
    # Feature importance weight
    feature_importance = model.feature_importances_
    feature_importance = feature_importance / feature_importance.sum()
    
    # Higher importance sum = more decisive features = higher confidence
    importance_confidence = float(np.sum(feature_importance[:3]))  # Top 3 features
    
    # Combine: 60% from feature importance, 40% from prediction
    confidence = (0.6 * importance_confidence) + (0.4 * min(soc_confidence, 1.0))
    
    return float(np.clip(confidence, 0.0, 1.0))


def energy_fallback_prediction(
    soc_current: float,
    laps_remaining: float,
    avg_energy_per_lap: float,
    battery_capacity: float = 10.0
) -> Dict[str, Any]:
    """
    Physics-based fallback prediction when ML confidence < 0.75
    
    Formula:
        energy_available = (soc_current / 100) * battery_capacity
        energy_needed = laps_remaining * avg_energy_per_lap
        will_finish = energy_available > energy_needed
    
    Args:
        soc_current: Current battery percentage (0-100)
        laps_remaining: Number of laps left
        avg_energy_per_lap: Average energy consumption per lap (kWh)
        battery_capacity: Total battery capacity (kWh)
    
    Returns:
        Fallback prediction result
    """
    import numpy as np
    
    energy_available = (soc_current / 100.0) * battery_capacity
    energy_needed = laps_remaining * avg_energy_per_lap
    
    if energy_needed > 0:
        final_soc = (energy_available - energy_needed) / battery_capacity * 100.0
    else:
        final_soc = soc_current
    
    will_finish = final_soc > 5.0
    margin = final_soc - 5.0
    
    return {
        "predicted_final_soc": max(0.0, float(final_soc)),
        "confidence": 0.7,  # Fixed low confidence for fallback
        "will_finish": bool(will_finish),
        "margin": float(margin),
        "method": "physics_fallback"
    }


def load_energy_predictor(model_path: str) -> xgb.XGBRegressor:
    """
    Load pre-trained Energy Predictor model from disk
    
    Args:
        model_path: Path to saved model
    
    Returns:
        Loaded model
    """
    import joblib
    
    model = joblib.load(model_path)
    print(f"[+] Energy Predictor loaded from {model_path}")
    return model


# Validation metrics
def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculate validation metrics
    
    Args:
        y_true: Ground truth values
        y_pred: Predicted values
    
    Returns:
        Dictionary with MAE, RMSE, R² metrics
    """
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    
    # DNF Prevention Recall
    # Consider prediction as "DNF risk" if predicted_final_soc <= 5%
    dnf_risk_pred = y_pred <= 5.0
    dnf_risk_true = y_true <= 5.0
    
    if dnf_risk_true.sum() > 0:
        dnf_recall = (dnf_risk_pred & dnf_risk_true).sum() / dnf_risk_true.sum()
    else:
        dnf_recall = 1.0
    
    return {
        "MAE": float(mae),
        "RMSE": float(rmse),
        "R2": float(r2),
        "DNF_Recall": float(dnf_recall)
    }
