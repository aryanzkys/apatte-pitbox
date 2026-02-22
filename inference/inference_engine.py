"""
Inference Engine - Real-time Multi-Model Orchestration
Combines all 8 ML models with:
- Priority cascade
- Context-aware behavior
- Fallback systems
- <100ms total inference time
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
import time


class InferenceEngine:
    """
    Central inference orchestrator for all 8 ML models
    """
    
    def __init__(self, models: Dict[str, Any]):
        """
        Initialize inference engine with trained models
        
        Args:
            models: Dictionary containing all 8 trained models
                   Keys: energy, racing_line, h2_purge, fatigue, anomaly, efficiency, slip_coast, rank
        """
        self.models = models
        self.inference_times = {}
        self.priority_order = [
            "anomaly",      # 1. Safety first
            "fatigue",      # 2. Driver health
            "energy",       # 3. DNF prevention
            "h2_purge",     # 4. Vehicle health (if H2)
            "racing_line",  # 5. Performance optimization
            "slip_coast",   # 6. Traction control
            "efficiency",   # 7. Efficiency
            "rank"          # 8. Strategizing
        ]
        print("[+] Inference Engine initialized with 8 models")
    
    def run_real_time_inference(
        self,
        telemetry: pd.DataFrame,
        race_context: Dict[str, Any],
        timeout_ms: int = 100
    ) -> Dict[str, Any]:
        """
        Run all models in real-time with priority cascade
        
        Args:
            telemetry: Current telemetry data (must contain all feature columns)
            race_context: Context dict with: race_phase, soc%, laps_remaining, etc.
            timeout_ms: Max inference time budget (100ms default)
        
        Returns:
            Orchestrated predictions with priority-based recommendations
        """
        from kerangka_ml.utils.data_validators import validate_telemetry
        from kerangka_ml.adaptive.priority_cascade import apply_priority_cascade
        
        start_time = time.time()
        
        # Validate input
        is_valid = validate_telemetry(telemetry)
        if not is_valid:
            return self._generate_fallback_response("Invalid telemetry")
        
        results = {}
        inference_budget = timeout_ms / 1000.0
        
        # Priority cascade: Execute in order until timeout or all done
        for model_name in self.priority_order:
            if (time.time() - start_time) > inference_budget:
                print(f"[!] Inference timeout reached at model: {model_name}")
                break
            
            model_start = time.time()
            
            # Load model and run inference
            if model_name == "anomaly":
                result = self._run_anomaly_inference(telemetry)
            elif model_name == "fatigue":
                result = self._run_fatigue_inference(telemetry)
            elif model_name == "energy":
                result = self._run_energy_inference(telemetry)
            elif model_name == "h2_purge":
                result = self._run_h2_purge_inference(telemetry)
            elif model_name == "racing_line":
                result = self._run_racing_line_inference(telemetry)
            elif model_name == "slip_coast":
                result = self._run_slip_coast_inference(telemetry)
            elif model_name == "efficiency":
                result = self._run_efficiency_inference(telemetry)
            elif model_name == "rank":
                result = self._run_rank_inference(telemetry)
            else:
                result = None
            
            if result:
                results[model_name] = result
                self.inference_times[model_name] = time.time() - model_start
        
        # Apply priority cascade logic
        final_decision = apply_priority_cascade(results, race_context)
        
        # Add timing info
        final_decision["total_inference_ms"] = (time.time() - start_time) * 1000
        final_decision["models_executed"] = list(results.keys())
        
        return final_decision
    
    def _run_anomaly_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run anomaly detection"""
        try:
            from kerangka_ml.models.anomaly_detection import predict_anomaly
            
            ensemble = self.models.get("anomaly")
            if ensemble is None:
                return None
            
            result = predict_anomaly(ensemble, telemetry)
            return result
        except Exception as e:
            print(f"[!] Anomaly inference error: {e}")
            return None
    
    def _run_fatigue_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run fatigue detection"""
        try:
            from kerangka_ml.models.fatigue_detector import predict_fatigue
            
            model = self.models.get("fatigue")
            if model is None:
                return None
            
            hr = telemetry.get("heart_rate_bpm", None)
            spo2 = telemetry.get("spo2_pct", None)
            
            result = predict_fatigue(model, telemetry, hr, spo2)
            return result
        except Exception as e:
            print(f"[!] Fatigue inference error: {e}")
            return None
    
    def _run_energy_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run energy prediction"""
        try:
            from kerangka_ml.models.energy_predictor import predict_energy
            
            model = self.models.get("energy")
            if model is None:
                return None
            
            result = predict_energy(model, telemetry)
            return result
        except Exception as e:
            print(f"[!] Energy inference error: {e}")
            return None
    
    def _run_h2_purge_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run H2 purge prediction"""
        try:
            from kerangka_ml.models.h2_purge import predict_h2_purge
            
            model = self.models.get("h2_purge")
            if model is None:
                return None
            
            lel = telemetry.get("LEL_sensor_pct", 0) if isinstance(telemetry, dict) else telemetry["LEL_sensor_pct"].iloc[0]
            result = predict_h2_purge(model, telemetry, lel)
            return result
        except Exception as e:
            print(f"[!] H2 Purge inference error: {e}")
            return None
    
    def _run_racing_line_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run racing line prediction"""
        try:
            from kerangka_ml.models.racing_line import predict_racing_line
            
            model = self.models.get("racing_line")
            if model is None:
                return None
            
            if isinstance(telemetry, dict):
                current_pos = telemetry
            else:
                current_pos = {
                    "gps_lat": telemetry["gps_lat"].iloc[0] if "gps_lat" in telemetry.columns else 0,
                    "gps_lon": telemetry["gps_lon"].iloc[0] if "gps_lon" in telemetry.columns else 0,
                    "speed": telemetry["speed"].iloc[0] if "speed" in telemetry.columns else 0,
                    "heading": telemetry["heading"].iloc[0] if "heading" in telemetry.columns else 0
                }
            
            result = predict_racing_line(model, current_pos)
            return result
        except Exception as e:
            print(f"[!] Racing Line inference error: {e}")
            return None
    
    def _run_slip_coast_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run slip & coast prediction"""
        try:
            from kerangka_ml.models.slip_coast import predict_slip_coast
            
            model = self.models.get("slip_coast")
            if model is None:
                return None
            
            result = predict_slip_coast(model, telemetry)
            return result
        except Exception as e:
            print(f"[!] Slip & Coast inference error: {e}")
            return None
    
    def _run_efficiency_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run efficiency map prediction"""
        try:
            from kerangka_ml.models.efficiency_map import predict_efficiency_map
            
            model = self.models.get("efficiency")
            if model is None:
                return None
            
            result = predict_efficiency_map(model, telemetry)
            return result
        except Exception as e:
            print(f"[!] Efficiency inference error: {e}")
            return None
    
    def _run_rank_inference(self, telemetry: pd.DataFrame) -> Optional[Dict]:
        """Run rank prediction"""
        try:
            from kerangka_ml.models.rank_predictor import predict_podium_probability
            
            model = self.models.get("rank")
            if model is None:
                return None
            
            # Need efficiency from features
            our_efficiency = 1050.0  # Placeholder - would come from telemetry
            result = predict_podium_probability(model, our_efficiency)
            return result
        except Exception as e:
            print(f"[!] Rank inference error: {e}")
            return None
    
    def _generate_fallback_response(self, reason: str) -> Dict[str, Any]:
        """Generate safe fallback response"""
        return {
            "status": "FALLBACK",
            "reason": reason,
            "recommendations": [
                "Monitor systems manually",
                "Reduce speed to safe level",
                "Pit for inspection if needed"
            ],
            "models_executed": []
        }
    
    def get_inference_stats(self) -> Dict[str, Any]:
        """Get inference timing statistics"""
        return {
            "inference_times_ms": {k: v * 1000 for k, v in self.inference_times.items()},
            "total_time_ms": sum(v * 1000 for v in self.inference_times.values()),
            "avg_model_time_ms": np.mean([v * 1000 for v in self.inference_times.values()]) if self.inference_times else 0,
            "models_available": len(self.models)
        }


def create_inference_engine(model_paths: Dict[str, str]) -> InferenceEngine:
    """
    Factory function to load all models and create inference engine
    
    Args:
        model_paths: Dict mapping model names to file paths
    
    Returns:
        Ready-to-use InferenceEngine
    """
    from kerangka_ml.models.energy_predictor import load_energy_predictor
    from kerangka_ml.models.racing_line import load_racing_line
    from kerangka_ml.models.h2_purge import load_h2_purge_scheduler
    from kerangka_ml.models.fatigue_detector import load_fatigue_detector
    from kerangka_ml.models.anomaly_detection import load_anomaly_detector
    from kerangka_ml.models.efficiency_map import load_efficiency_map
    from kerangka_ml.models.slip_coast import load_slip_coast_optimizer
    from kerangka_ml.models.rank_predictor import load_rank_predictor
    
    print("[+] Loading all models...")
    
    models = {}
    
    for model_name, path in model_paths.items():
        try:
            if model_name == "energy":
                models["energy"] = load_energy_predictor(path)
            elif model_name == "racing_line":
                models["racing_line"] = load_racing_line(path)
            elif model_name == "h2_purge":
                models["h2_purge"] = load_h2_purge_scheduler(path)
            elif model_name == "fatigue":
                models["fatigue"] = load_fatigue_detector(path)
            elif model_name == "anomaly":
                models["anomaly"] = load_anomaly_detector(path)
            elif model_name == "efficiency":
                models["efficiency"] = load_efficiency_map(path)
            elif model_name == "slip_coast":
                models["slip_coast"] = load_slip_coast_optimizer(path)
            elif model_name == "rank":
                models["rank"] = load_rank_predictor(path)
        except Exception as e:
            print(f"[!] Failed to load {model_name}: {e}")
    
    return InferenceEngine(models)
