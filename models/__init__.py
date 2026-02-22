"""Models package - All 8 ML models with individual functions"""

from kerangka_ml.models.energy_predictor import (
    train_energy_predictor,
    predict_energy,
    energy_fallback_prediction,
    load_energy_predictor
)

from kerangka_ml.models.racing_line import (
    train_racing_line,
    predict_racing_line,
    load_racing_line
)

from kerangka_ml.models.h2_purge import (
    train_h2_purge_scheduler,
    predict_h2_purge,
    load_h2_purge_scheduler
)

from kerangka_ml.models.fatigue_detector import (
    train_fatigue_detector,
    predict_fatigue,
    load_fatigue_detector
)

from kerangka_ml.models.anomaly_detection import (
    train_anomaly_detector,
    predict_anomaly,
    load_anomaly_detector
)

from kerangka_ml.models.efficiency_map import (
    train_efficiency_map,
    predict_efficiency_map,
    load_efficiency_map
)

from kerangka_ml.models.slip_coast import (
    train_slip_coast_optimizer,
    predict_slip_coast,
    load_slip_coast_optimizer
)

from kerangka_ml.models.rank_predictor import (
    train_rank_predictor,
    predict_podium_probability,
    load_rank_predictor
)

__all__ = [
    # Energy Predictor
    "train_energy_predictor",
    "predict_energy",
    "energy_fallback_prediction",
    "load_energy_predictor",
    
    # Racing Line
    "train_racing_line",
    "predict_racing_line",
    "load_racing_line",
    
    # H2 Purge
    "train_h2_purge_scheduler",
    "predict_h2_purge",
    "load_h2_purge_scheduler",
    
    # Fatigue
    "train_fatigue_detector",
    "predict_fatigue",
    "load_fatigue_detector",
    
    # Anomaly
    "train_anomaly_detector",
    "predict_anomaly",
    "load_anomaly_detector",
    
    # Efficiency
    "train_efficiency_map",
    "predict_efficiency_map",
    "load_efficiency_map",
    
    # Slip & Coast
    "train_slip_coast_optimizer",
    "predict_slip_coast",
    "load_slip_coast_optimizer",
    
    # Rank
    "train_rank_predictor",
    "predict_podium_probability",
    "load_rank_predictor"
]
