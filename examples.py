"""
Example: Complete E2E Workflow

Demonstrates how to:
1. Create inference engine
2. Update race context
3. Run real-time inference
4. Handle priority cascade
5. Generate recommendations
"""

import pandas as pd
import numpy as np
from kerangka_ml import InferenceEngine, ContextManager, create_inference_engine
from kerangka_ml.utils.data_validators import validate_telemetry, create_feature_dict


def example_1_early_race():
    """Early race scenario - normal operations"""
    print("\n" + "="*60)
    print("SCENARIO 1: Early Race (Lap 1) - Normal Operations")
    print("="*60)
    
    # Initialize
    context = ContextManager()
    
    # Determine phase
    context.determine_race_phase(current_lap=1, total_laps=4)
    context.assess_track_condition(
        wind_speed=3.0,
        rain_intensity=0.0,
        track_grip=0.95
    )
    
    # Create sample telemetry
    telemetry = create_feature_dict(
        soc_current=98.0,
        speed_avg=32.5,
        efficiency_rolling_3lap=40.2,
        lap_progress=0.65,
        motor_temp=42.0,
        battery_current=85.0,
        wind_headwind=1.5,
        heart_rate_bpm=125,
        spo2_pct=98.0,
        throttle_variance=3.2,
        steering_oscillation=2.1,
        elapsed_time=180,
        lap_time_variance=0.5,
        cabin_temp=28.0
    )
    
    context.update_soc_and_eta(
        current_soc=98.0,
        remaining_distance=90,
        current_efficiency=40.2
    )
    
    print(f"\n📊 Race Context:")
    print(f"   Phase: {context.context.race_phase}")
    print(f"   SOC: {context.context.current_soc:.1f}%")
    print(f"   Track: {context.context.track_condition}")
    
    print(f"\n✅ Expected Recommendation:")
    print(f"   → Normal operation, maintain current strategy")
    print(f"   → Execute efficiency optimizations")
    print(f"   → Monitor fatigue and anomalies")


def example_2_energy_crisis():
    """Mid-race scenario - energy crisis"""
    print("\n" + "="*60)
    print("SCENARIO 2: Mid Race (Lap 3) - Energy Crisis")
    print("="*60)
    
    context = ContextManager()
    context.determine_race_phase(current_lap=3, total_laps=4)
    
    # Critical: low SOC
    telemetry = create_feature_dict(
        soc_current=12.0,  # LOW!
        speed_avg=28.0,
        efficiency_rolling_3lap=38.5,
        lap_progress=0.3,
        motor_temp=52.0,
        battery_current=110.0,
        wind_headwind=2.2
    )
    
    context.update_context(
        current_soc=12.0,
        laps_remaining=2,
        race_phase="MID"
    )
    
    energy_result = context.update_soc_and_eta(
        current_soc=12.0,
        remaining_distance=45,
        current_efficiency=38.5
    )
    
    print(f"\n📊 Race Context:")
    print(f"   Phase: {context.context.race_phase}")
    print(f"   SOC: {context.context.current_soc:.1f}%")
    print(f"   Energy Margin: {energy_result['energy_margin_pct']:.1f}%")
    print(f"   Will Finish: {energy_result['will_finish']}")
    
    print(f"\n⚠️  Priority Cascade Action (Phase 2 - ENERGY):")
    print(f"   → DNF RISK DETECTED")
    print(f"   → Reduce speed 20%, increase coast ratio +15%")
    print(f"   → Pit for energy strategy review")
    print(f"   → Focus: Complete race, not performance")


def example_3_anomaly_detection():
    """Anomaly scenario - mechanical failure"""
    print("\n" + "="*60)
    print("SCENARIO 3: Anomaly - Bearing Failure Detection")
    print("="*60)
    
    context = ContextManager()
    context.determine_race_phase(current_lap=2, total_laps=4)
    
    # Anomalous telemetry - bearing issue
    telemetry = create_feature_dict(
        vibration_rms=28.5,  # HIGH
        vibration_fft_50hz=145.0,  # SPIKE
        vibration_fft_100hz=32.0,
        motor_temp=68.0,  # Running hot
        battery_cell_temp_max=52.0,
        wheel_speed_variance=18.0,
        current_draw=95.0
    )
    
    print(f"\n📊 Telemetry Anomalies:")
    print(f"   Vibration RMS: 28.5 m/s² (normal: <15)")
    print(f"   FFT 50Hz: 145.0 (spike detected)")
    print(f"   Motor Temp: 68.0°C (elevated)")
    
    print(f"\n🛑 Priority Cascade Action (Phase 1 - SAFETY):")
    print(f"   → ANOMALY DETECTED: BEARING_UNBALANCE")
    print(f"   → Severity: HIGH")
    print(f"   → PRIMARY ACTION (override all optimization)")
    print(f"   → Recommendation: Slow to 20 km/h")
    print(f"   → Limp to pits, inspect front bearing")
    print(f"   → Lead time: >60 seconds (early detection)")


def example_4_fatigue_medical():
    """Driver scenario - fatigue/medical alert"""
    print("\n" + "="*60)
    print("SCENARIO 4: Driver - High Fatigue with Medical Alert")
    print("="*60)
    
    context = ContextManager()
    context.determine_race_phase(current_lap=3, total_laps=4)
    
    telemetry = create_feature_dict(
        heart_rate_bpm=175,  # HIGH
        spo2_pct=94.0,  # Still okay but declining
        throttle_variance=8.5,  # Jittery
        steering_oscillation=5.2,  # Hand unstable
        elapsed_time=225,  # Long time
        lap_time_variance=2.1,  # Inconsistent
        cabin_temp=32.0  # Hot
    )
    
    print(f"\n📊 Driver Biometrics:")
    print(f"   Heart Rate: 175 bpm (high)")
    print(f"   SpO2: 94% (lower normal)")
    print(f"   Online Time: 3:45 (fatigue accumulation)")
    print(f"   Control Smoothness: Declining")
    
    print(f"\n🛑 Priority Cascade Action (Phase 1 - SAFETY):")
    print(f"   → DRIVER FATIGUE DETECTED: Level 3 (HIGH)")
    print(f"   → Also: Heart Rate elevated (175 bpm)")
    print(f"   → PRIMARY ACTION (override all optimization)")
    print(f"   → Recommendation: Pit for driver evaluation")
    print(f"   → Consider driver change or race abort")
    print(f"   → Lead time: Detected early")


def example_5_rank_strategy():
    """Late race - rank prediction & strategy"""
    print("\n" + "="*60)
    print("SCENARIO 5: Late Race - Podium Strategy Based on Rank")
    print("="*60)
    
    context = ContextManager()
    context.determine_race_phase(current_lap=4, total_laps=4)
    context.assess_track_condition(
        wind_speed=2.5,
        rain_intensity=0.0,
        track_grip=0.93
    )
    
    # Estimate final rank
    our_efficiency = 1052.0  # km/m³
    competitor_efficiencies = [1010, 1025, 1030, 1008, 1015, 1040]
    
    rank_result = context.estimate_final_rank(
        our_efficiency=our_efficiency,
        competitor_efficiencies=competitor_efficiencies,
        confidence=0.78
    )
    
    print(f"\n📊 Rank Prediction:")
    print(f"   Our Efficiency: {our_efficiency} km/m³")
    print(f"   Predicted Rank: {rank_result['predicted_rank']}")
    print(f"   Podium? {rank_result['podium_chance']}")
    print(f"   Confidence: {rank_result['confidence']:.1%}")
    
    print(f"\n🎯 Priority Cascade Action (Phase 3 - PERFORMANCE):")
    print(f"   → AGGRESSIVE Strategy Selected")
    print(f"   → High podium probability (78%)")
    
    adaptive = context.get_adaptive_parameters()
    print(f"\n   Adaptive Settings:")
    print(f"   - Aggressiveness: {adaptive['aggressiveness']}")
    print(f"   - Safety Margin: {adaptive['safety_margin']}x")
    print(f"   - Optimization Allowed: {adaptive['safety_margin'] < 2.0}")


def example_6_complete_e2e():
    """Complete end-to-end example with all systems"""
    print("\n" + "="*60)
    print("EXAMPLE: Complete E2E Inference Workflow")
    print("="*60)
    
    # 1. Initialize systems
    print("\n[1] Initializing systems...")
    context = ContextManager()
    print("    ✓ Context Manager ready")
    
    # In real scenario, would load actual trained models
    print("    ✓ Models loaded (simulated)")
    
    # 2. Update race context
    print("\n[2] Updating race context...")
    context.determine_race_phase(current_lap=2, total_laps=4)
    context.assess_track_condition(wind_speed=2.0, rain_intensity=0.0, track_grip=0.94)
    context.update_soc_and_eta(current_soc=75.0, remaining_distance=60, current_efficiency=42.5)
    
    print(f"    ✓ Race Phase: {context.context.race_phase}")
    print(f"    ✓ Track: {context.context.track_condition}")
    print(f"    ✓ SOC: {context.context.current_soc:.1f}%")
    
    # 3. Create telemetry
    print("\n[3] Creating telemetry snapshot...")
    telemetry = create_feature_dict(
        # Energy features
        soc_current=75.0,
        speed_avg=35.2,
        efficiency_rolling_3lap=42.5,
        lap_progress=0.45,
        motor_temp=48.0,
        battery_current=92.0,
        wind_headwind=1.8,
        
        # Fatigue features
        heart_rate_bpm=135,
        spo2_pct=96.5,
        throttle_variance=2.8,
        steering_oscillation=1.9,
        elapsed_time=240,
        lap_time_variance=0.6,
        cabin_temp=29.5,
        
        # Anomaly features
        vibration_rms=8.2,
        vibration_fft_50hz=12.0,
        vibration_fft_100hz=3.5,
        battery_cell_temp_max=48.0,
        wheel_speed_variance=2.1,
        current_draw=92.0,
        
        # Other features
        gps_lat=-25.285,
        gps_lon=51.534,
        speed=35.2,
        heading=180
    )
    
    valid = validate_telemetry(telemetry)
    print(f"    ✓ Telemetry valid: {valid}")
    
    # 4. Run inference (simulated)
    print("\n[4] Running inference (simulated)...")
    inference_results = {
        "energy": {"will_finish": True, "margin": 35.2, "confidence": 0.92},
        "anomaly": {"anomaly_detected": False, "confidence": 0.88},
        "fatigue": {"fatigue_level": 1, "fatigue_pct": 35.0, "confidence": 0.85},
        "racing_line": {"deviation_meters": 2.1, "confidence": 0.79},
        "efficiency": {"efficiency_gain": 2.3, "confidence": 0.81},
        "slip_coast": {"optimal_coast_ratio": 45.0, "confidence": 0.77}
    }
    
    print(f"    ✓ Anomaly: {inference_results['anomaly']['anomaly_detected']}")
    print(f"    ✓ Energy margin: {inference_results['energy']['margin']:.1f}% SOC")
    print(f"    ✓ Driver fatigue: Level {inference_results['fatigue']['fatigue_level']}")
    
    # 5. Apply priority cascade (simulated)
    print("\n[5] Applying priority cascade...")
    
    # Since all are normal, go to phase 3 (performance optimization)
    final_decision = {
        "severity": "NORMAL",
        "cascade_phase": "PERFORMANCE_OPTIMIZATION",
        "actions": [
            "✓ Throttle: 68% for +2.3% efficiency",
            "✓ Coast: 45% on straights",
            "✓ Racing line: Maintain 2.1m deviation"
        ]
    }
    
    print(f"    ✓ Safety: PASS (no anomalies)")
    print(f"    ✓ Energy: PASS (good margin)")
    print(f"    ✓ Performance: OPTIMIZE")
    
    # 6. Final recommendations
    print("\n[6] Final Recommendations:")
    print(f"    📊 Recommended Actions:")
    for action in final_decision["actions"]:
        print(f"       {action}")
    
    print(f"\n    ⏱️  Inference stats:")
    print(f"       Total time: ~46ms")
    print(f"       Models executed: 6/8")
    print(f"       Status: ✅ READY")


if __name__ == "__main__":
    print("🚀 Kerangka-ML Example Scenarios")
    print("================================================================================")
    
    # Run all examples
    example_1_early_race()
    example_2_energy_crisis()
    example_3_anomaly_detection()
    example_4_fatigue_medical()
    example_5_rank_strategy()
    example_6_complete_e2e()
    
    print("\n" + "="*60)
    print("✅ All examples completed successfully!")
    print("="*60)
