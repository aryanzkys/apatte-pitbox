"""
Context Manager - Manages race context and state
Tracks: race phase, SOC, position, weather, track conditions, etc.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import time


class RacePhase(Enum):
    """Race phase enumeration"""
    PRACTICE = "PRACTICE"
    EARLY = "EARLY"      # Lap 1-2
    MID = "MID"           # Lap 3
    LATE = "LATE"         # Lap 4
    FINISH = "FINISH"
    UNKNOWN = "UNKNOWN"


class TrackCondition(Enum):
    """Track condition enumeration"""
    DRY = "DRY"
    WET = "WET"
    RAIN = "RAIN"
    STRONG_WIND = "STRONG_WIND"
    UNKNOWN = "UNKNOWN"


@dataclass
class RaceContext:
    """
    Race context data class
    """
    race_phase: str = "UNKNOWN"
    current_lap: int = 0
    laps_remaining: int = 0
    current_soc: float = 100.0
    soc_target: float = 5.0
    track_condition: str = "UNKNOWN"
    weather_factor: float = 1.0
    current_rank: int = 0
    ranking_confidence: float = 0.0
    vehicle_status: str = "NORMAL"
    driver_status: str = "NORMAL"
    pit_stop_planned: bool = False
    pit_stop_eta: int = 0
    timestamp: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class ContextManager:
    """
    Manages race context and state throughout race
    """
    
    def __init__(self):
        """Initialize context manager"""
        self.context = RaceContext()
        self.history = []
        self.state_changes = []
        print("[+] Context Manager initialized")
    
    def update_context(self, **kwargs) -> None:
        """
        Update race context
        
        Args:
            **kwargs: Context parameters to update
        """
        old_context = asdict(self.context).copy()
        
        for key, value in kwargs.items():
            if hasattr(self.context, key):
                setattr(self.context, key, value)
        
        # Track changes
        self.context.timestamp = time.time()
        self._record_state_change(old_context, asdict(self.context))
    
    def _record_state_change(
        self,
        old_state: Dict[str, Any],
        new_state: Dict[str, Any]
    ) -> None:
        """Record significant state changes"""
        changes = {}
        for key in old_state:
            if old_state[key] != new_state[key]:
                changes[key] = {
                    "old": old_state[key],
                    "new": new_state[key]
                }
        
        if changes:
            self.state_changes.append({
                "timestamp": time.time(),
                "changes": changes
            })
    
    def determine_race_phase(
        self,
        current_lap: int,
        total_laps: int = 4
    ) -> str:
        """
        Determine current race phase
        
        Args:
            current_lap: Current lap number
            total_laps: Total laps in race (usually 4)
        
        Returns:
            Race phase string
        """
        
        if current_lap == 0:
            phase = "PRACTICE"
        elif current_lap <= 2:
            phase = "EARLY"
        elif current_lap == 3:
            phase = "MID"
        elif current_lap == total_laps:
            phase = "LATE"
        elif current_lap > total_laps:
            phase = "FINISH"
        else:
            phase = "UNKNOWN"
        
        self.update_context(race_phase=phase)
        return phase
    
    def assess_track_condition(
        self,
        wind_speed: float,
        rain_intensity: float,
        track_grip: float
    ) -> str:
        """
        Assess track condition from weather data
        
        Args:
            wind_speed: Wind speed in m/s
            rain_intensity: Rain intensity (0-1)
            track_grip: Estimated grip level (0-1)
        
        Returns:
            Track condition string
        """
        
        if rain_intensity > 0.5:
            condition = "RAIN"
            weather_factor = 0.85
        elif rain_intensity > 0.2:
            condition = "WET"
            weather_factor = 0.90
        elif wind_speed > 8:
            condition = "STRONG_WIND"
            weather_factor = 0.92
        else:
            condition = "DRY"
            weather_factor = 1.0
        
        self.update_context(
            track_condition=condition,
            weather_factor=weather_factor
        )
        return condition
    
    def update_soc_and_eta(
        self,
        current_soc: float,
        remaining_distance: float,
        current_efficiency: float,
        battery_capacity: float = 10.0
    ) -> Dict[str, Any]:
        """
        Calculate estimated energy and predict finish
        
        Args:
            current_soc: Current SOC (%)
            remaining_distance: Distance to finish (km)
            current_efficiency: Current efficiency (km/kWh)
            battery_capacity: Battery capacity (kWh)
        
        Returns:
            Energy prediction dictionary
        """
        
        energy_remaining = (current_soc / 100.0) * battery_capacity
        energy_needed = remaining_distance / current_efficiency
        
        will_finish = energy_needed <= energy_remaining
        margin = energy_remaining - energy_needed
        margin_pct = (margin / battery_capacity) * 100 if battery_capacity > 0 else 0
        
        self.update_context(current_soc=current_soc)
        
        return {
            "will_finish": will_finish,
            "energy_margin_kwh": float(margin),
            "energy_margin_pct": float(margin_pct),
            "energy_needed": float(energy_needed),
            "energy_remaining": float(energy_remaining)
        }
    
    def estimate_final_rank(
        self,
        our_efficiency: float,
        competitor_efficiencies: list,
        confidence: float = 0.7
    ) -> Dict[str, Any]:
        """
        Estimate final rank based on efficiency
        
        Args:
            our_efficiency: Our estimated efficiency
            competitor_efficiencies: List of competitor efficiencies
            confidence: Confidence in prediction (0-1)
        
        Returns:
            Rank prediction dictionary
        """
        
        better_count = sum(1 for eff in competitor_efficiencies if eff < our_efficiency)
        predicted_rank = better_count + 1
        
        self.update_context(
            current_rank=predicted_rank,
            ranking_confidence=confidence
        )
        
        return {
            "predicted_rank": predicted_rank,
            "podium_chance": predicted_rank <= 3,
            "confidence": confidence
        }
    
    def get_adaptive_parameters(self) -> Dict[str, Any]:
        """
        Get context-aware adaptive parameters
        
        Returns:
            Parameters for adaptive behavior
        """
        
        context = asdict(self.context)
        
        # Map context to aggressive levels
        phase = context["race_phase"]
        soc = context["current_soc"]
        
        # Determine aggressiveness matrix entry
        if phase in ["PRACTICE", "EARLY"]:
            aggressiveness = "MODERATE"
            safety_margin = 1.5
        elif phase == "MID":
            if soc > 25:
                aggressiveness = "MODERATE"
                safety_margin = 1.5
            elif soc > 15:
                aggressiveness = "BALANCED"
                safety_margin = 1.3
            else:
                aggressiveness = "CONSERVATIVE"
                safety_margin = 1.8
        else:  # LATE
            if soc > 15:
                aggressiveness = "MODERATE"
                safety_margin = 1.3
            elif soc > 8:
                aggressiveness = "CONSERVATIVE"
                safety_margin = 2.0
            else:
                aggressiveness = "SURVIVAL"
                safety_margin = 3.0
        
        return {
            "aggressiveness": aggressiveness,
            "safety_margin": safety_margin,
            "phase": phase,
            "soc": soc,
            "track_condition": context["track_condition"],
            "weather_factor": context["weather_factor"]
        }
    
    def get_current_context(self) -> Dict[str, Any]:
        """Get current context as dictionary"""
        return self.context.to_dict()
    
    def get_context_history(self) -> list:
        """Get historical context changes"""
        return self.state_changes
    
    def plan_pit_stop(
        self,
        reason: str,
        estimated_eta_seconds: int
    ) -> Dict[str, Any]:
        """
        Plan pit stop
        
        Args:
            reason: Reason for pit stop
            estimated_eta_seconds: ETA for pit stop
        
        Returns:
            Pit stop plan
        """
        
        self.update_context(
            pit_stop_planned=True,
            pit_stop_eta=estimated_eta_seconds
        )
        
        return {
            "pit_planned": True,
            "reason": reason,
            "eta_seconds": estimated_eta_seconds,
            "planned_actions": _get_pit_actions(reason)
        }
    
    def execute_pit_stop(self, actions_completed: list) -> Dict[str, Any]:
        """
        Execute pit stop
        
        Args:
            actions_completed: List of completed actions
        
        Returns:
            Pit stop summary
        """
        
        self.update_context(pit_stop_planned=False, pit_stop_eta=0)
        
        return {
            "pit_completed": True,
            "actions_completed": actions_completed,
            "timestamp": time.time()
        }


def _get_pit_actions(reason: str) -> list:
    """Get recommended pit actions based on reason"""
    
    pit_actions = {
        "TIRE_PRESSURE": [
            "Check tire pressure on all wheels",
            "Adjust pressure to optimal ±0.1 bar",
            "Test handling after adjustment"
        ],
        "ENERGY_STRATEGY": [
            "Analyze efficiency trends",
            "Adjust driver throttle strategy",
            "Brief driver on track sections"
        ],
        "MECHANICAL": [
            "Inspect motor connections",
            "Check battery parameters",
            "Verify all sensors",
            "Tighten any loose components"
        ],
        "DRIVER_REST": [
            "Driver takes 5-minute rest",
            "Rehydration and cooling",
            "Fatigue assessment",
            "Driver change if needed"
        ],
        "EVALUATION": [
            "Full system diagnostic",
            "Review telemetry data",
            "Plan strategy adjustment",
            "Check weather forecast"
        ]
    }
    
    return pit_actions.get(reason, ["General pit stop"])


def simulate_race_progression(
    start_lap: int = 1,
    end_lap: int = 4,
    initial_soc: float = 100.0,
    target_soc: float = 5.0,
    efficiency: float = 40.0
) -> Dict[str, Any]:
    """
    Simulate race progression through laps
    
    Args:
        start_lap: Starting lap
        end_lap: Ending lap
        initial_soc: Initial SOC
        target_soc: Minimum required SOC
        efficiency: Estimated efficiency (km/kWh)
    
    Returns:
        Simulated race progression
    """
    
    manager = ContextManager()
    progression = []
    
    soc_per_lap = (initial_soc - target_soc) / (end_lap - start_lap + 1)
    
    for lap in range(start_lap, end_lap + 1):
        current_soc = initial_soc - (lap - start_lap) * soc_per_lap
        laps_remaining = end_lap - lap + 1
        
        manager.determine_race_phase(lap, end_lap)
        
        progression.append({
            "lap": lap,
            "soc": float(current_soc),
            "laps_remaining": laps_remaining,
            "phase": manager.context.race_phase
        })
    
    return {
        "simulation": progression,
        "final_soc": float(current_soc),
        "status": "FINISHED" if current_soc >= target_soc else "DNF"
    }
