"""
Utility Functions - Data Validation, Aggregation, Helpers
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional


def validate_telemetry(telemetry: pd.DataFrame) -> bool:
    """
    Validate telemetry data completeness
    
    Args:
        telemetry: Telemetry DataFrame or dict
    
    Returns:
        True if valid, False otherwise
    """
    # If dict, convert to simple validation
    if isinstance(telemetry, dict):
        required_keys = ["soc_current", "speed_avg", "motor_temp"]
        return all(k in telemetry for k in required_keys)
    
    # If DataFrame, check for NaN values and basic stats
    if isinstance(telemetry, pd.DataFrame):
        # Allow some NaN but not all
        if telemetry.isnull().all().any():
            return False
        
        # Check numeric types
        numeric_cols = telemetry.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            return False
        
        return True
    
    return False


def normalize_features(
    X: pd.DataFrame,
    mean_dict: Optional[Dict[str, float]] = None,
    std_dict: Optional[Dict[str, float]] = None
) -> Tuple[pd.DataFrame, Dict[str, float], Dict[str, float]]:
    """
    Normalize features using z-score normalization
    
    Args:
        X: Features DataFrame
        mean_dict: Optional pre-calculated means
        std_dict: Optional pre-calculated stds
    
    Returns:
        Tuple of (normalized_X, means, stds)
    """
    import pandas as pd
    import numpy as np
    
    if mean_dict is None:
        mean_dict = X.mean().to_dict()
    if std_dict is None:
        std_dict = X.std().to_dict()
    
    X_norm = X.copy()
    
    for col in X_norm.columns:
        if col in mean_dict and col in std_dict:
            if std_dict[col] > 0:
                X_norm[col] = (X_norm[col] - mean_dict[col]) / std_dict[col]
    
    return X_norm, mean_dict, std_dict


def fill_missing_features(
    X: pd.DataFrame,
    fill_value: str = "mean"
) -> pd.DataFrame:
    """
    Fill missing values in feature DataFrame
    
    Args:
        X: Features DataFrame
        fill_value: "mean", "median", "ffill", or numeric value
    
    Returns:
        DataFrame with filled values
    """
    import pandas as pd
    
    X_filled = X.copy()
    
    if fill_value == "mean":
        X_filled = X_filled.fillna(X_filled.mean())
    elif fill_value == "median":
        X_filled = X_filled.fillna(X_filled.median())
    elif fill_value == "ffill":
        X_filled = X_filled.fillna(method="ffill").fillna(method="bfill")
    else:
        X_filled = X_filled.fillna(fill_value)
    
    return X_filled


def aggregate_telemetry(
    telemetry_samples: pd.DataFrame,
    window_seconds: int = 10
) -> Dict[str, float]:
    """
    Aggregate telemetry over a time window
    
    Args:
        telemetry_samples: Multiple telemetry samples with timestamp
        window_seconds: Aggregation window size
    
    Returns:
        Aggregated features dictionary
    """
    import pandas as pd
    import numpy as np
    
    aggregates = {}
    
    for col in telemetry_samples.columns:
        if col == "timestamp":
            continue
        
        values = telemetry_samples[col].dropna()
        
        if len(values) == 0:
            continue
        
        # Multiple aggregations
        aggregates[f"{col}_mean"] = float(values.mean())
        aggregates[f"{col}_std"] = float(values.std())
        aggregates[f"{col}_min"] = float(values.min())
        aggregates[f"{col}_max"] = float(values.max())
        aggregates[f"{col}_last"] = float(values.iloc[-1])
    
    return aggregates


def create_feature_dict(
    **kwargs
) -> pd.DataFrame:
    """
    Create feature DataFrame from keyword arguments
    
    Usage: create_feature_dict(soc_current=85, speed_avg=35, motor_temp=45)
    """
    import pandas as pd
    
    return pd.DataFrame([kwargs])


def flatten_nested_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '_') -> Dict:
    """
    Flatten nested dictionary
    
    Args:
        d: Nested dictionary
        parent_key: Parent key prefix
        sep: Separator
    
    Returns:
        Flattened dictionary
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_nested_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def calculate_rolling_stats(
    data: np.ndarray,
    window: int = 5
) -> Dict[str, np.ndarray]:
    """
    Calculate rolling statistics
    
    Args:
        data: 1D array of values
        window: Window size
    
    Returns:
        Dictionary with rolling_mean, rolling_std, rolling_min, rolling_max
    """
    import numpy as np
    import pandas as pd
    
    s = pd.Series(data)
    
    return {
        "rolling_mean": s.rolling(window).mean().values,
        "rolling_std": s.rolling(window).std().values,
        "rolling_min": s.rolling(window).min().values,
        "rolling_max": s.rolling(window).max().values
    }


def clip_outliers(
    data: np.ndarray,
    n_std: float = 3.0
) -> np.ndarray:
    """
    Clip outliers using standard deviation method
    
    Args:
        data: Array of values
        n_std: Number of std deviations to clip
    
    Returns:
        Clipped array
    """
    import numpy as np
    
    mean = np.mean(data)
    std = np.std(data)
    
    lower = mean - n_std * std
    upper = mean + n_std * std
    
    return np.clip(data, lower, upper)


def interpolate_missing_time_series(
    df: pd.DataFrame,
    timestamp_col: str = "timestamp",
    method: str = "linear"
) -> pd.DataFrame:
    """
    Interpolate missing values in time series
    
    Args:
        df: DataFrame with timestamp column
        timestamp_col: Name of timestamp column
        method: "linear", "nearest", "zero", "slinear", etc.
    
    Returns:
        DataFrame with interpolated values
    """
    import pandas as pd
    
    df_sorted = df.sort_values(timestamp_col)
    
    # Set index to timestamp for interpolation
    df_interp = df_sorted.set_index(timestamp_col)
    df_interp = df_interp.interpolate(method=method)
    
    return df_interp.reset_index()
