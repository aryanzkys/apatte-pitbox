"""
Priority Cascade - Decision-making logic based on race context
Implements: Safety > Energy > Performance
"""

from typing import Dict, List, Any
import numpy as np


def apply_priority_cascade(
    model_results: Dict[str, Any],
    race_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Apply priority cascade logic to combine all model predictions
    
    Priority Order:
    1. SAFETY (Anomaly, Fatigue, Hypoxia)
    2. ENERGY (DNF prevention)
    3. PERFORMANCE (Optimization)
    
    Args:
        model_results: Dict with predictions from all models
        race_context: Dict with race_phase, soc%, laps_remaining, etc.
    
    Returns:
        Combined decision with actions
    """
    
    actions = []
    severity_level = "NORMAL"
    
    # Phase 1: SAFETY checks (HARD STOPS)
    safety_action = _check_safety_constraints(model_results, race_context)
    if safety_action:
        actions.append(safety_action)
        severity_level = safety_action.get("severity", "WARNING")
        
        # If critical, stop here - don't consider other optimizations
        if severity_level in ["CRITICAL", "EMERGENCY"]:
            return {
                "primary_action": safety_action,
                "actions": [safety_action],
                "reason": "SAFETY OVERRIDE",
                "severity": severity_level
            }
    
    # Phase 2: ENERGY checks (DNF prevention)
    energy_action = _check_energy_constraints(model_results, race_context)
    if energy_action:
        actions.append(energy_action)
        if energy_action.get("severity") in ["CRITICAL", "HIGH"]:
            severity_level = "WARNING"
    
    # Phase 3: PERFORMANCE optimization (if safe)
    performance_action = _recommend_performance_optimization(
        model_results,
        race_context,
        safety_action,
        energy_action
    )
    if performance_action:
        actions.append(performance_action)
    
    # Consolidate into single recommendation
    primary_action = actions[0] if actions else {"action": "NORMAL_OPERATION"}
    
    return {
        "primary_action": primary_action,
        "cascade_actions": actions,
        "severity": severity_level,
        "race_context": race_context,
        "count_alerts": len([a for a in actions if a.get("severity") in ["CRITICAL", "HIGH", "WARNING"]])
    }


def _check_safety_constraints(
    model_results: Dict[str, Any],
    race_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Check SAFETY constraints (Phase 1 - Hard stops)
    
    Checks:
    - Anomalies detected
    - High fatigue
    - Medical alerts (hypoxia, high HR)
    """
    
    # Check anomalies
    anomaly = model_results.get("anomaly", {})
    if anomaly.get("anomaly_detected"):
        return {
            "action": "ANOMALY_DETECTED",
            "type": anomaly.get("anomaly_type"),
            "severity": "CRITICAL" if anomaly.get("severity") == "CRITICAL" else "HIGH",
            "recommendation": anomaly.get("action_recommend"),
            "reason": f"Anomaly: {anomaly.get('anomaly_type')}"
        }
    
    # Check fatigue
    fatigue = model_results.get("fatigue", {})
    if fatigue.get("medical_alerts"):
        alerts = fatigue.get("medical_alerts", [])
        if alerts:
            return {
                "action": "MEDICAL_ALERT",
                "severity": "CRITICAL" if alerts[0].get("severity") == "CRITICAL" else "HIGH",
                "recommendation": alerts[0].get("action"),
                "reason": alerts[0].get("alert")
            }
    
    if fatigue.get("fatigue_level") == 3:  # High fatigue
        return {
            "action": "HIGH_FATIGUE",
            "severity": "HIGH",
            "fatigue_pct": fatigue.get("fatigue_pct"),
            "recommendation": "Recommend driver rest, pit for evaluation, or abort race",
            "reason": "Driver fatigue at critical level"
        }
    
    return None


def _check_energy_constraints(
    model_results: Dict[str, Any],
    race_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Check ENERGY constraints (Phase 2 - DNF prevention)
    
    Checks:
    - Will vehicle finish race?
    - What is safety margin?
    - Should we reduce speed?
    """
    
    energy = model_results.get("energy", {})
    
    if energy.get("will_finish") == False:
        return {
            "action": "DNF_RISK",
            "severity": "CRITICAL",
            "predicted_final_soc": energy.get("predicted_final_soc"),
            "margin": energy.get("margin"),
            "recommendation": "Reduce speed 20%, maximize coasting, pit for energy strategy review",
            "reason": "Vehicle will not finish race at current pace"
        }
    
    if energy.get("margin") < 10:  # Less than 10% margin
        return {
            "action": "LOW_ENERGY_MARGIN",
            "severity": "HIGH",
            "predicted_final_soc": energy.get("predicted_final_soc"),
            "margin": energy.get("margin"),
            "recommendation": "Reduce speed 10%, increase coast ratio +15%, plan pit strategy",
            "reason": f"Energy margin only {energy.get('margin'):.1f}%, risk of DNF"
        }
    
    return None


def _recommend_performance_optimization(
    model_results: Dict[str, Any],
    race_context: Dict[str, Any],
    safety_action: Dict[str, Any],
    energy_action: Dict[str, Any]
) -> Dict[str, Any]:
    """
    PERFORMANCE optimization (Phase 3 - If safe)
    
    Only recommend if:
    - No critical safety issues
    - Sufficient energy margin
    - Context allows optimization
    """
    
    # Don't optimize if safety/energy critical
    if safety_action or energy_action:
        return None
    
    race_phase = race_context.get("race_phase", "UNKNOWN")
    
    actions = []
    
    # Performance recommendations
    racing_line = model_results.get("racing_line", {})
    if racing_line.get("confidence", 0) > 0.7:
        actions.append({
            "type": "RACING_LINE",
            "recommendation": racing_line.get("recommendation"),
            "confidence": racing_line.get("confidence")
        })
    
    efficiency = model_results.get("efficiency", {})
    if efficiency.get("efficiency_gain", 0) > 2:
        actions.append({
            "type": "THROTTLE_OPTIMIZATION",
            "recommendation": efficiency.get("recommendation"),
            "efficiency_gain": efficiency.get("efficiency_gain")
        })
    
    slip_coast = model_results.get("slip_coast", {})
    if slip_coast.get("slip_detected"):
        actions.append({
            "type": "TRACTION_CONTROL",
            "recommendation": slip_coast.get("recommendation"),
            "severity": slip_coast.get("slip_severity")
        })
    else:
        # Suggest coasting optimization
        if slip_coast.get("optimal_coast_ratio", 0) > 50:
            actions.append({
                "type": "COASTING_OPTIMIZATION",
                "recommendation": slip_coast.get("recommendation"),
                "coast_ratio": slip_coast.get("optimal_coast_ratio")
            })
    
    if not actions:
        return None
    
    return {
        "action": "PERFORMANCE_OPTIMIZATION",
        "severity": "NORMAL",
        "phase_specific_recommendations": actions,
        "race_phase": race_phase
    }


def get_aggressiveness_level(
    race_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Determine aggressiveness level based on race context
    
    Context Factors:
    - Race phase (early/mid/late)
    - SOC level
    - Competition rank
    - Lap progress
    
    Returns:
        Aggressiveness settings with safety margins
    """
    
    race_phase = race_context.get("race_phase", "UNKNOWN")
    soc = race_context.get("current_soc", 50)
    laps_remaining = race_context.get("laps_remaining", 4)
    current_rank = race_context.get("current_rank", 5)
    
    # Matrix from documentation
    if race_phase in ["EARLY", "PRACTICE"]:
        aggressiveness = "MODERATE"
        safety_margin = 1.5
        confidence_threshold = 0.7
    elif race_phase == "MID":
        if soc > 25:
            aggressiveness = "MODERATE"
            safety_margin = 1.5
            confidence_threshold = 0.7
        elif soc > 15:
            aggressiveness = "BALANCED"
            safety_margin = 1.3
            confidence_threshold = 0.75
        else:
            aggressiveness = "CONSERVATIVE"
            safety_margin = 1.8
            confidence_threshold = 0.8
    elif race_phase == "LATE":
        if soc > 15:
            aggressiveness = "MODERATE"
            safety_margin = 1.3
            confidence_threshold = 0.7
        elif soc > 8:
            aggressiveness = "CONSERVATIVE"
            safety_margin = 2.0
            confidence_threshold = 0.8
        else:
            aggressiveness = "SURVIVAL"
            safety_margin = 3.0
            confidence_threshold = 0.85
    else:
        aggressiveness = "MODERATE"
        safety_margin = 1.5
        confidence_threshold = 0.7
    
    return {
        "aggressiveness": aggressiveness,
        "safety_margin": safety_margin,
        "confidence_threshold": confidence_threshold,
        "optimization_allowed": aggressiveness != "SURVIVAL",
        "pit_recommended": aggressiveness in ["CONSERVATIVE", "SURVIVAL"] and soc < 20
    }


def prioritize_model_outputs(
    model_results: Dict[str, Any],
    max_recommendations: int = 3
) -> List[Dict[str, Any]]:
    """
    Sort model outputs by importance and return top N
    
    Priority: Safety > Actionability > Confidence
    """
    
    scored_results = []
    
    for model_name, result in model_results.items():
        if not result:
            continue
        
        # Calculate priority score
        score = 0
        
        # Safety is most important
        if model_name == "anomaly" and result.get("anomaly_detected"):
            score += 100
        elif model_name == "fatigue" and result.get("medical_alerts"):
            score += 90
        elif model_name == "energy" and not result.get("will_finish"):
            score += 80
        
        # Confidence
        score += result.get("confidence", 0) * 10
        
        # Actionability
        if result.get("recommendation"):
            score += 5
        
        scored_results.append({
            "model": model_name,
            "score": score,
            "result": result
        })
    
    # Sort by score descending
    scored_results.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top N
    return [item["result"] for item in scored_results[:max_recommendations]]
