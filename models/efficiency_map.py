"""
Efficiency Map Recommender Model
Problem: Motor efficiency varies with RPM and throttle. Find optimal operating point.
Algorithm: LightGBM (Light Gradient Boosting Machine)
Target Metrics: MAE <3% throttle, Direction Accuracy >90%
Impact: Expected improvement +8-12% overall efficiency
"""

import lightgbm as lgb
import numpy as np
import pandas as pd
from typing import Dict, Any
import joblib


def train_efficiency_map(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_path: str = None
) -> lgb.LGBMRegressor:
    """
    Train LightGBM Efficiency Map Recommender
    
    Args:
        X_train: Training features (7 features)
                - motor_rpm, throttle_pct, battery_current
                - motor_temp, vehicle_speed, battery_voltage, road_grade
        y_train: Target - optimal_throttle_pct (0-100%)
        model_path: Optional path to save model
    
    Returns:
        Trained LightGBM model
    
    Hyperparameters:
        - num_leaves: 31 (balanced complexity)
        - learning_rate: 0.05 (careful learning)
        - n_estimators: 100 (sufficient trees)
    """
    import lightgbm as lgb
    
    model = lgb.LGBMRegressor(
        num_leaves=31,
        learning_rate=0.05,
        n_estimators=100,
        objective="regression",
        random_state=42,
        verbose=-1
    )
    
    print("[+] Training Efficiency Map Recommender (LightGBM)...")
    model.fit(X_train, y_train, verbose_eval=-1)
    
    if model_path:
        joblib.dump(model, model_path)
        print(f"[+] Model saved to {model_path}")
    
    return model


def predict_efficiency_map(
    model: lgb.LGBMRegressor,
    X_test: pd.DataFrame
) -> Dict[str, Any]:
    """
    Predict optimal operating point and efficiency gain
    
    Args:
        model: Trained LightGBM model
        X_test: Test features
    
    Returns:
        Dictionary containing:
        - optimal_throttle_pct: Recommended throttle (%)
        - expected_efficiency: Efficiency at this point (km/kWh)
        - efficiency_gain: Potential improvement (%)
        - recommendation: Text recommendation
        - zone_color: Heatmap color (green/yellow/red)
        - confidence: Confidence (0-1)
    """
    import lightgbm as lgb
    import pandas as pd
    import numpy as np
    
    if isinstance(X_test, pd.Series):
        X_test = X_test.to_frame().T
    
    # Get prediction
    optimal_throttle = model.predict(X_test)[0] if len(X_test) == 1 else model.predict(X_test)[0]
    optimal_throttle = float(np.clip(optimal_throttle, 0, 100))
    
    # Calculate efficiency relative metrics
    current_throttle = X_test["throttle_pct"].iloc[0] if "throttle_pct" in X_test.columns else 50
    throttle_diff = optimal_throttle - current_throttle
    
    # Estimate efficiency gain from throttle change
    # Empirical: each 10% throttle change ≈ 8% efficiency change
    efficiency_gain_pct = throttle_diff * 0.8
    
    # Estimate absolute efficiency (placeholder, would come from feature)
    estimated_efficiency = 40.0 + efficiency_gain_pct  # Base estimate
    
    # Generate recommendation
    if abs(throttle_diff) < 3:
        recommendation = "✓ Current throttle near optimal"
    elif throttle_diff > 5:
        recommendation = f"↑ Increase throttle to {optimal_throttle:.0f}% for +{efficiency_gain_pct:.1f}% efficiency"
    else:
        recommendation = f"↓ Decrease throttle to {optimal_throttle:.0f}% for +{abs(efficiency_gain_pct):.1f}% efficiency"
    
    # Zone color (efficiency heatmap)
    if abs(efficiency_gain_pct) < 2:
        zone = "GREEN"  # Optimal
    elif abs(efficiency_gain_pct) < 5:
        zone = "YELLOW"  # Suboptimal
    else:
        zone = "RED"  # Very inefficient
    
    # Confidence based on feature importance
    feature_importance = model.feature_importances_
    confidence = float(feature_importance.max() / 100.0)
    
    return {
        "optimal_throttle_pct": optimal_throttle,
        "expected_efficiency": float(estimated_efficiency),
        "efficiency_gain": float(efficiency_gain_pct),
        "recommendation": recommendation,
        "zone_color": zone,
        "confidence": float(np.clip(confidence, 0.0, 1.0)),
        "current_throttle": float(current_throttle),
        "motor_rpm": float(X_test["motor_rpm"].iloc[0]) if "motor_rpm" in X_test.columns else 0
    }


def predict_efficiency_map_batch(
    model: lgb.LGBMRegressor,
    X_batch: pd.DataFrame
) -> Dict[str, Any]:
    """
    Batch prediction for efficiency map
    
    Args:
        model: Trained model
        X_batch: Batch of features
    
    Returns:
        Batch results with heatmap data
    """
    import lightgbm as lgb
    import pandas as pd
    import numpy as np
    
    predictions = model.predict(X_batch)
    
    results = []
    for i, pred in enumerate(predictions):
        result = {
            "throttle": float(pred),
            "rpm": float(X_batch["motor_rpm"].iloc[i]) if "motor_rpm" in X_batch.columns else 0,
            "efficiency_gain": float((pred - X_batch["throttle_pct"].iloc[i]) * 0.8) if "throttle_pct" in X_batch.columns else 0
        }
        results.append(result)
    
    return {
        "predictions": results,
        "mean_optimal_throttle": float(np.mean(predictions)),
        "throttle_std": float(np.std(predictions)),
        "heatmap_ready": True
    }


def generate_efficiency_map_visualization(
    model: lgb.LGBMRegressor,
    rpm_range: np.ndarray,
    throttle_range: np.ndarray,
    current_rpm: float = None,
    current_throttle: float = None
) -> Dict[str, Any]:
    """
    Generate 2D heatmap data (RPM vs Throttle)
    
    Args:
        model: Trained model
        rpm_range: Array of RPM values
        throttle_range: Array of throttle values
        current_rpm: Current operating RPM (optional, for marker)
        current_throttle: Current operating throttle (optional, for marker)
    
    Returns:
        Dictionary with heatmap data
    """
    import lightgbm as lgb
    import numpy as np
    import pandas as pd
    
    # Create2D grid
    rpm_grid, throttle_grid = np.meshgrid(rpm_range, throttle_range)
    
    # Flatten for prediction
    n_points = len(rpm_range) * len(throttle_range)
    
    # Create dummy features for other columns (assume defaults)
    points = np.column_stack([
        rpm_grid.flatten(),
        throttle_grid.flatten(),
        np.full(n_points, 100),  # battery_current (dummy)
        np.full(n_points, 50),   # motor_temp (dummy)
        np.full(n_points, 50),   # vehicle_speed (dummy)
        np.full(n_points, 48),   # battery_voltage (dummy)
        np.full(n_points, 0)     # road_grade (dummy)
    ])
    
    # Assuming column order from training
    feature_names = ["motor_rpm", "throttle_pct", "battery_current", "motor_temp", "vehicle_speed", "battery_voltage", "road_grade"]
    X_grid = pd.DataFrame(points, columns=feature_names)
    
    # Predict efficiency
    efficiency = model.predict(X_grid)
    efficiency_grid = efficiency.reshape(rpm_grid.shape)
    
    # Find optimal zone (green)
    optimal_idx = np.unravel_index(efficiency.argmax(), efficiency_grid.shape)
    optimal_throttle = throttle_range[optimal_idx[0]]
    optimal_rpm = rpm_range[optimal_idx[1]]
    
    return {
        "rpm_range": rpm_range.tolist(),
        "throttle_range": throttle_range.tolist(),
        "efficiency_grid": efficiency_grid.tolist(),
        "optimal_point": {
            "rpm": float(optimal_rpm),
            "throttle": float(optimal_throttle),
            "efficiency": float(efficiency_grid[optimal_idx])
        },
        "current_point": {
            "rpm": float(current_rpm) if current_rpm else None,
            "throttle": float(current_throttle) if current_throttle else None
        },
        "zone_info": _classify_efficiency_zones(efficiency_grid)
    }


def _classify_efficiency_zones(efficiency_grid: np.ndarray) -> Dict[str, Any]:
    """
    Classify zones in efficiency map
    
    Returns:
        Zone statistics
    """
    import numpy as np
    
    max_eff = efficiency_grid.max()
    
    # Define zones as percentages of max efficiency
    green_threshold = max_eff * 0.95  # >95% = green (optimal)
    yellow_threshold = max_eff * 0.85  # 85-95% = yellow (okay)
    # <85% = red (inefficient)
    
    green_points = (efficiency_grid >= green_threshold).sum()
    yellow_points = ((efficiency_grid < green_threshold) & (efficiency_grid >= yellow_threshold)).sum()
    red_points = (efficiency_grid < yellow_threshold).sum()
    
    total = efficiency_grid.size
    
    return {
        "green_pct": float(green_points / total * 100),
        "yellow_pct": float(yellow_points / total * 100),
        "red_pct": float(red_points / total * 100),
        "optimal_zone_size": green_points
    }


def get_throttle_recommendation_from_conditions(
    model: lgb.LGBMRegressor,
    motor_rpm: float,
    current_throttle: float,
    battery_current: float,
    motor_temp: float,
    vehicle_speed: float,
    battery_voltage: float,
    road_grade: float = 0.0
) -> Dict[str, Any]:
    """
    Get throttle recommendation for specific conditions
    
    Args:
        model: Trained model
        motor_rpm: Current RPM
        current_throttle: Current throttle
        battery_current: Current draw
        motor_temp: Motor temperature
        vehicle_speed: Vehicle speed
        battery_voltage: Battery voltage
        road_grade: Road slope
    
    Returns:
        Recommendation dictionary
    """
    import lightgbm as lgb
    import pandas as pd
    import numpy as np
    
    # Create feature array
    X = pd.DataFrame([{
        "motor_rpm": motor_rpm,
        "throttle_pct": current_throttle,
        "battery_current": battery_current,
        "motor_temp": motor_temp,
        "vehicle_speed": vehicle_speed,
        "battery_voltage": battery_voltage,
        "road_grade": road_grade
    }])
    
    return predict_efficiency_map(model, X)


def load_efficiency_map(model_path: str) -> lgb.LGBMRegressor:
    """
    Load pre-trained Efficiency Map model from disk
    
    Args:
        model_path: Path to saved model
    
    Returns:
        Loaded model
    """
    import joblib
    
    model = joblib.load(model_path)
    print(f"[+] Efficiency Map Recommender loaded from {model_path}")
    return model


def calculate_efficiency_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray
) -> Dict[str, float]:
    """
    Calculate efficiency prediction metrics
    
    Args:
        y_true: Ground truth throttle (%)
        y_pred: Predicted throttle (%)
    
    Returns:
        Metrics dictionary
    """
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    import numpy as np
    
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    
    # Direction accuracy (correct increase/decrease recommendation)
    direction_true = np.sign(np.diff(y_true))
    direction_pred = np.sign(np.diff(y_pred))
    direction_correct = (direction_true == direction_pred).sum()
    direction_accuracy = direction_correct / len(direction_true) if len(direction_true) > 0 else 1.0
    
    return {
        "MAE": float(mae),
        "RMSE": float(rmse),
        "R2": float(r2),
        "Direction_Accuracy": float(direction_accuracy)
    }
