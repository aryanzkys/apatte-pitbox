"""
Racing Line Optimizer Model
Problem: Determine optimal racing line that minimizes energy (NOT minimum time)
Algorithm: K-Nearest Neighbors + Dynamic Time Warping (KNN-DTW)
Target Metrics: DTW distance <5m, Lap time improvement +2%
Key: No training needed - just store best lap trajectory
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
import joblib
from scipy.spatial.distance import euclidean


def train_racing_line(
    practice_laps: pd.DataFrame,
    efficiency_column: str = "efficiency_km_per_kwh",
    model_path: str = None
) -> Dict[str, Any]:
    """
    "Train" Racing Line Optimizer by selecting best lap
    
    Args:
        practice_laps: DataFrame with columns:
                      - gps_lat, gps_lon: GPS coordinates
                      - speed: Speed (km/h)
                      - heading: Direction (0-360°)
                      - timestamp: Timestamp
                      - efficiency: Efficiency (km/kWh)
                      - lap_id: Lap identifier
        efficiency_column: Name of efficiency column
        model_path: Optional path to save best lap trajectory
    
    Returns:
        Dictionary containing:
        - best_lap_id: ID of best lap
        - best_lap_efficiency: Efficiency of best lap
        - best_trajectory: GPS trajectory of best lap
        - model: Callable model object
    """
    import pandas as pd
    import numpy as np
    
    print("[+] Training Racing Line Optimizer...")
    
    # Group by lap and calculate lap efficiency
    if "lap_id" not in practice_laps.columns:
        # Assume lap_id can be inferred from timestamp or sequence
        practice_laps["lap_id"] = 0
    
    lap_stats = practice_laps.groupby("lap_id").agg({
        efficiency_column: ["mean", "max", "std"],
        "gps_lat": "count"
    }).round(4)
    
    # Select best lap by mean efficiency
    best_lap_id = lap_stats[efficiency_column]["mean"].idxmax()
    best_lap_data = practice_laps[practice_laps["lap_id"] == best_lap_id].copy()
    
    best_efficiency = best_lap_data[efficiency_column].mean()
    
    # Extract trajectory
    trajectory = {
        "gps_lat": best_lap_data["gps_lat"].values,
        "gps_lon": best_lap_data["gps_lon"].values,
        "speed": best_lap_data["speed"].values,
        "heading": best_lap_data["heading"].values,
        "timestamp": best_lap_data["timestamp"].values if "timestamp" in best_lap_data.columns else None,
        "lap_id": best_lap_id
    }
    
    model = {
        "best_lap_id": best_lap_id,
        "best_lap_efficiency": float(best_efficiency),
        "best_trajectory": trajectory,
        "num_points": len(trajectory["gps_lat"])
    }
    
    if model_path:
        joblib.dump(model, model_path)
        print(f"[+] Racing Line Model saved to {model_path}")
    
    print(f"[+] Best lap selected: {best_lap_id} (Efficiency: {best_efficiency:.2f} km/kWh)")
    
    return model


def predict_racing_line(
    model: Dict[str, Any],
    current_position: Dict[str, float]
) -> Dict[str, Any]:
    """
    Predict optimal racing line and deviation from best lap
    
    Args:
        model: Model dict from train_racing_line
        current_position: Dictionary with:
                        - gps_lat, gps_lon: Current GPS position
                        - speed: Current speed (km/h)
                        - heading: Current heading (0-360°)
    
    Returns:
        Dictionary containing:
        - deviation_meters: Distance from optimal line (m)
        - speed_deviation: Speed difference from best lap (km/h)
        - sector_time_diff: Time difference per sector (seconds)
        - recommendation: Text recommendation
        - confidence: Confidence score (0-1)
    """
    import numpy as np
    from scipy.spatial.distance import euclidean
    
    best_trajectory = model["best_trajectory"]
    
    # Find nearest point in best trajectory using Euclidean distance
    lat_best = best_trajectory["gps_lat"]
    lon_best = best_trajectory["gps_lon"]
    
    current_lat = current_position["gps_lat"]
    current_lon = current_position["gps_lon"]
    
    # Convert GPS to approximate meters (rough conversion)
    # 1 degree ≈ 111 km
    distances = []
    for i in range(len(lat_best)):
        lat_diff = (lat_best[i] - current_lat) * 111000
        lon_diff = (lon_best[i] - current_lon) * 111000 * np.cos(np.radians(current_lat))
        dist = np.sqrt(lat_diff**2 + lon_diff**2)
        distances.append(dist)
    
    distances = np.array(distances)
    nearest_idx = np.argmin(distances)
    deviation_meters = float(distances[nearest_idx])
    
    # Speed deviation
    best_speed_at_pos = best_trajectory["speed"][nearest_idx]
    current_speed = current_position["speed"]
    speed_deviation = float(current_speed - best_speed_at_pos)
    
    # Confidence based on deviation
    # Less than 5m = high confidence
    deviation_confidence = 1.0 - min(deviation_meters / 10.0, 1.0)
    
    # Generate recommendation
    recommendation = _generate_racing_line_recommendation(
        deviation_meters,
        speed_deviation,
        nearest_idx,
        len(lat_best)
    )
    
    return {
        "deviation_meters": deviation_meters,
        "speed_deviation": speed_deviation,
        "sector_time_diff": abs(speed_deviation) * 0.1,  # Approximation
        "recommendation": recommendation,
        "confidence": float(deviation_confidence),
        "nearest_waypoint_idx": nearest_idx,
        "progress_pct": float(nearest_idx / len(lat_best) * 100)
    }


def _generate_racing_line_recommendation(
    deviation: float,
    speed_dev: float,
    position_idx: int,
    total_points: int
) -> str:
    """
    Generate text recommendation based on deviation analysis
    
    Args:
        deviation: Distance from optimal line (m)
        speed_dev: Speed difference (km/h)
        position_idx: Current position in trajectory
        total_points: Total waypoints
    
    Returns:
        Text recommendation
    """
    
    if deviation < 2.0 and abs(speed_dev) < 2.0:
        return "✓ Perfect line - maintain current racing line"
    
    if deviation > 10.0:
        if speed_dev > 0:
            return "⚠ Too far off line and too fast - reduce speed and correct path"
        else:
            return "⚠ Too far off line - adjust position to optimal line"
    
    if speed_dev > 5.0:
        return "⚠ Running faster than optimal - reduce throttle for efficiency"
    
    if speed_dev < -5.0:
        return "↑ Running slower than optimal - increase speed slightly"
    
    return "✓ Good alignment with optimal line"


def racing_line_batch_analysis(
    model: Dict[str, Any],
    position_history: pd.DataFrame
) -> Dict[str, Any]:
    """
    Analyze lap performance against racing line
    
    Args:
        model: Racing line model
        position_history: Historical position data with columns:
                        - gps_lat, gps_lon, speed, heading
    
    Returns:
        Analysis summary
    """
    import pandas as pd
    import numpy as np
    
    results = []
    for idx, row in position_history.iterrows():
        current_pos = {
            "gps_lat": row["gps_lat"],
            "gps_lon": row["gps_lon"],
            "speed": row["speed"],
            "heading": row["heading"]
        }
        result = predict_racing_line(model, current_pos)
        results.append(result)
    
    deviation_array = np.array([r["deviation_meters"] for r in results])
    speed_dev_array = np.array([r["speed_deviation"] for r in results])
    
    return {
        "mean_deviation": float(deviation_array.mean()),
        "max_deviation": float(deviation_array.max()),
        "mean_speed_deviation": float(speed_dev_array.mean()),
        "points_near_optimal": int((deviation_array < 5).sum()),
        "lap_efficiency_estimate": f"{(len(results) - deviation_array.sum()) / len(results) * 100:.1f}%"
    }


def load_racing_line(model_path: str) -> Dict[str, Any]:
    """
    Load pre-trained Racing Line model from disk
    
    Args:
        model_path: Path to saved model
    
    Returns:
        Loaded model
    """
    import joblib
    
    model = joblib.load(model_path)
    print(f"[+] Racing Line Model loaded from {model_path}")
    return model


# DTW-inspired similarity metric (simplified version)
def calculate_trajectory_similarity(
    trajectory_1: Dict[str, np.ndarray],
    trajectory_2: Dict[str, np.ndarray],
    use_speed_weight: bool = True
) -> float:
    """
    Calculate similarity between two trajectories
    Uses simplified DTW-like distance metric
    
    Args:
        trajectory_1: First trajectory dict
        trajectory_2: Second trajectory dict
        use_speed_weight: Whether to weight GPS distance by speed difference
    
    Returns:
        Similarity score (0-1, 1 is identical)
    """
    import numpy as np
    
    lat1 = trajectory_1["gps_lat"]
    lon1 = trajectory_1["gps_lon"]
    speed1 = trajectory_1["speed"]
    
    lat2 = trajectory_2["gps_lat"]
    lon2 = trajectory_2["gps_lon"]
    speed2 = trajectory_2["speed"]
    
    # Normalize lengths
    min_len = min(len(lat1), len(lat2))
    lat1 = lat1[:min_len]
    lon1 = lon1[:min_len]
    speed1 = speed1[:min_len]
    
    lat2 = lat2[:min_len]
    lon2 = lon2[:min_len]
    speed2 = speed2[:min_len]
    
    # Calculate position distance (in degrees, converted to km)
    lat_diff = (lat1 - lat2) * 111  # 1 degree ≈ 111 km
    lon_diff = (lon1 - lon2) * 111
    pos_dist = np.sqrt(lat_diff**2 + lon_diff**2)
    
    # Optional: weight by speed difference
    if use_speed_weight:
        speed_diff = np.abs(speed1 - speed2)
        weighted_dist = pos_dist + (speed_diff * 0.1)
    else:
        weighted_dist = pos_dist
    
    # Convert to similarity (lower distance = higher similarity)
    similarity = 1.0 / (1.0 + weighted_dist.mean())
    
    return float(np.clip(similarity, 0.0, 1.0))
