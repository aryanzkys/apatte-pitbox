"""
Cross-Vehicle Rank Predictor Model
Problem: Predict probability of podium (Top 3) vs competitors
Algorithm: Bayesian Probabilistic Model
Target Metrics: Calibration Error <0.10, Within-1-rank Accuracy >85%
No Training Required: Pure statistical calculation
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy import stats
import joblib


def train_rank_predictor(
    historical_results: pd.DataFrame,
    model_path: str = None
) -> Dict[str, Any]:
    """
    "Train" Rank Predictor by calculating competitor statistics
    
    Note: This is not ML training, but rather statistical analysis of historical data
    
    Args:
        historical_results: DataFrame with competition history
                          Columns: vehicle_name, final_efficiency, year
                          Can include: weather_conditions, track_conditions
        model_path: Optional path to save statistics
    
    Returns:
        Model dictionary with competitor statistics
    """
    import pandas as pd
    import numpy as np
    
    print("[+] Analyzing competitor statistics...")
    
    # Group by vehicle and calculate statistics
    vehicle_stats = historical_results.groupby("vehicle_name").agg({
        "final_efficiency": ["mean", "std", "min", "max", "count"]
    }).round(4)
    
    # Flatten columns
    vehicle_stats.columns = ["mean", "std", "min", "max", "count"]
    
    # Remove NaN stds
    vehicle_stats["std"] = vehicle_stats["std"].fillna(0)
    
    # Calculate percentile ranks for competition context
    all_results = historical_results["final_efficiency"].values
    
    model = {
        "vehicle_stats": vehicle_stats.to_dict(),
        "fleet_mean": float(all_results.mean()),
        "fleet_std": float(all_results.std()),
        "fleet_median": float(np.median(all_results)),
        "percentiles": {
            "top_10": float(np.percentile(all_results, 90)),
            "top_25": float(np.percentile(all_results, 75)),
            "median": float(np.percentile(all_results, 50)),
            "bottom_25": float(np.percentile(all_results, 25))
        },
        "total_vehicles": len(historical_results["vehicle_name"].unique()),
        "inference_type": "bayesian_probabilistic"
    }
    
    if model_path:
        joblib.dump(model, model_path)
        print(f"[+] Rank Predictor model saved to {model_path}")
    
    return model


def predict_podium_probability(
    model: Dict[str, Any],
    our_efficiency: float,
    goal_rank: int = 3
) -> Dict[str, Any]:
    """
    Predict probability of achieving podium (Top 3) using Bayesian approach
    
    Args:
        model: From train_rank_predictor
        our_efficiency: Our predicted final efficiency (km/m³ or km/kWh)
        goal_rank: Target rank (default 3 for podium)
    
    Returns:
        Dictionary containing:
        - podium_probability: % chance of Top 3 (0-1)
        - expected_rank: Predicted rank with confidence
        - probability_distribution: Full ranking probabilities
        - confidence_interval: 95% CI for rank
        - strategy_recommend: Run order optimization
    """
    import numpy as np
    from scipy import stats
    
    fleet_mean = model["fleet_mean"]
    fleet_std = model["fleet_std"]
    total_vehicles = model["total_vehicles"]
    
    # Bayesian calculation: P(our_efficiency > competitor)
    # Assumes each competitor follows normal distribution
    
    # Probability that we beat an average competitor
    prob_beat_avg = 1.0 - stats.norm.cdf(
        fleet_mean,
        loc=our_efficiency,
        scale=fleet_std
    )
    
    # Probability of Top 3 (beating at least total_vehicles - 3 competitors)
    # Using binomial approximation
    vehicles_to_beat = total_vehicles - goal_rank
    
    if vehicles_to_beat > 0:
        # Probability of beating exactly vehicles_to_beat or more
        prob_podium = 1.0 - stats.binom.cdf(
            vehicles_to_beat - 1,
            n=total_vehicles - 1,
            p=prob_beat_avg
        )
    else:
        prob_podium = 1.0
    
    # Expected rank (inverse of probability)
    expected_rank = 1 + (1 - prob_beat_avg) * (total_vehicles - 1)
    
    # Confidence interval using normal approximation
    rank_std = np.sqrt(expected_rank * (1 - prob_beat_avg))
    ci_lower = max(1, expected_rank - 1.96 * rank_std)
    ci_upper = min(total_vehicles, expected_rank + 1.96 * rank_std)
    
    # Generate full ranking probability distribution
    ranking_probs = _calculate_ranking_probabilities(
        our_efficiency,
        fleet_mean,
        fleet_std,
        total_vehicles
    )
    
    # Strategy recommendation
    strategy = _recommend_run_strategy(
        podium_probability=prob_podium,
        expected_rank=expected_rank,
        our_efficiency=our_efficiency,
        fleet_stats=model["percentiles"]
    )
    
    return {
        "podium_probability": float(prob_podium),
        "podium_pct": float(prob_podium * 100),
        "expected_rank": float(expected_rank),
        "rank_ci_lower": float(ci_lower),
        "rank_ci_upper": float(ci_upper),
        "probability_beat_avg_competitor": float(prob_beat_avg),
        "ranking_probabilities": ranking_probs,
        "strategy_recommend": strategy,
        "confidence": float(min(prob_podium, 1.0 - prob_podium) * 2)  # Confidence in decision
    }


def _calculate_ranking_probabilities(
    our_efficiency: float,
    fleet_mean: float,
    fleet_std: float,
    total_vehicles: int,
    rank_range: int = 10
) -> Dict[int, float]:
    """
    Calculate probability of finishing at each rank
    
    Args:
        our_efficiency: Our efficiency
        fleet_mean: Fleet average
        fleet_std: Fleet std deviation
        total_vehicles: Total competitors
        rank_range: Show probabilities for ranks 1 to rank_range
    
    Returns:
        Dictionary with rank -> probability
    """
    import numpy as np
    from scipy import stats
    
    probs = {}
    
    # Probability of beating exactly k competitors = P(rank = k+1)
    prob_beat_avg = 1.0 - stats.norm.cdf(
        fleet_mean,
        loc=our_efficiency,
        scale=fleet_std
    )
    
    for rank in range(1, min(rank_range + 1, total_vehicles + 1)):
        # P(beat exactly total_vehicles - rank competitors)
        k_beat = total_vehicles - rank
        
        if k_beat == 0:
            # First place
            prob = prob_beat_avg ** (total_vehicles - 1)
        elif k_beat == total_vehicles - 1:
            # Last place
            prob = (1 - prob_beat_avg) ** (total_vehicles - 1)
        else:
            # Middle ranks (use binomial)
            prob = stats.binom.pmf(
                k_beat,
                total_vehicles - 1,
                prob_beat_avg
            )
        
        probs[rank] = float(prob)
    
    # Normalize
    total_prob = sum(probs.values())
    if total_prob > 0:
        probs = {k: v / total_prob for k, v in probs.items()}
    
    return probs


def _recommend_run_strategy(
    podium_probability: float,
    expected_rank: float,
    our_efficiency: float,
    fleet_stats: Dict[str, float]
) -> Dict[str, Any]:
    """
    Recommend strategy based on predicted performance
    """
    
    podium_pct = podium_probability * 100
    gap_to_top10 = our_efficiency - fleet_stats["top_10"]
    
    if podium_pct > 70:
        strategy_type = "AGGRESSIVE"
        recommendation = "🎯 High win probability! Use aggressive race strategy, push efficiency hard."
        actions = [
            "Maximize throttle optimization on straights",
            "Minimize coasting to keep pace",
            "Push tire limits"
        ]
    elif podium_pct > 40:
        strategy_type = "BALANCED"
        recommendation = "⚖ Competitive position. Balanced strategy with measured risk."
        actions = [
            "Balance between speed and efficiency",
            "Watch top three closely",
            "Be ready to adjust based on competitor pace"
        ]
    elif podium_pct > 20:
        strategy_type = "CONSERVATIVE"
        recommendation = "🛡 Underdogs. Conservative approach, focus on completion and learning."
        actions = [
            "Priori efficiency over raw speed",
            "Increase coast ratio +5-10%",
            "Complete lap with stable performance"
        ]
    else:
        strategy_type = "SURVIVAL"
        recommendation = "🚨 Focus on race completion. Burn minimal energy."
        actions = [
            "Maximize coasting (60-70%)",
            "Reduce speed 10-20% vs leaders",
            "Complete race at all costs"
        ]
    
    return {
        "strategy_type": strategy_type,
        "recommendation": recommendation,
        "actions": actions,
        "podium_probability_pct": float(podium_pct),
        "efficiency_gap_to_top10": float(gap_to_top10)
    }


def predict_competitor_performance(
    model: Dict[str, Any],
    competitor_name: str,
    weather_adjustment: float = 1.0
) -> Dict[str, Any]:
    """
    Predict specific competitor's performance
    
    Args:
        model: From train_rank_predictor
        competitor_name: Name of competitor
        weather_adjustment: Adjustment factor for conditions (1.0 = normal)
    
    Returns:
        Competitor performance prediction
    """
    import numpy as np
    from scipy import stats
    
    vehicle_stats = model["vehicle_stats"]
    
    if competitor_name in vehicle_stats:
        comp_mean = vehicle_stats[competitor_name].get("mean", model["fleet_mean"])
        comp_std = vehicle_stats[competitor_name].get("std", model["fleet_std"])
    else:
        # Unknown competitor - use fleet average
        comp_mean = model["fleet_mean"]
        comp_std = model["fleet_std"]
    
    # Apply weather adjustment
    adjusted_mean = comp_mean * weather_adjustment
    
    return {
        "competitor": competitor_name,
        "predicted_efficiency": float(adjusted_mean),
        "uncertainty": float(comp_std),
        "ci_lower": float(adjusted_mean - 1.96 * comp_std),
        "ci_upper": float(adjusted_mean + 1.96 * comp_std),
        "historical_runs": int(vehicle_stats.get(competitor_name, {}).get("count", 0))
    }


def bayesian_head_to_head(
    model: Dict[str, Any],
    our_efficiency: float,
    competitor_efficiency: float,
    our_uncertainty: float = 5.0,
    competitor_uncertainty: float = 5.0
) -> Dict[str, Any]:
    """
    Calculate head-to-head probability against specific competitor
    
    Args:
        model: From train_rank_predictor
        our_efficiency: Our predicted efficiency
        competitor_efficiency: Competitor predicted efficiency
        our_uncertainty: Our confidence interval (uncertainty)
        competitor_uncertainty: Competitor uncertainty
    
    Returns:
        Head-to-head probability
    """
    import numpy as np
    from scipy import stats
    
    efficiency_diff = our_efficiency - competitor_efficiency
    combined_std = np.sqrt(our_uncertainty**2 + competitor_uncertainty**2)
    
    # P(we beat competitor) = P(our_eff > comp_eff)
    prob_we_win = 1.0 - stats.norm.cdf(
        0,
        loc=efficiency_diff,
        scale=combined_std
    )
    
    # Generate probability range
    prob_range = {
        "we_win_low": float(max(0, prob_we_win - 0.1)),
        "we_win_likely": float(prob_we_win),
        "we_win_high": float(min(1, prob_we_win + 0.1))
    }
    
    return {
        "probability_we_win": float(prob_we_win),
        "probability_we_lose": float(1 - prob_we_win),
        "probability_tie": 0.05,  # Small probability of exact tie
        "efficiency_gap": float(efficiency_diff),
        "confidence_range": prob_range,
        "winner_likely": "US" if prob_we_win > 0.5 else "COMPETITOR"
    }


def load_rank_predictor(model_path: str) -> Dict[str, Any]:
    """
    Load pre-trained Rank Predictor from disk
    
    Args:
        model_path: Path to saved model
    
    Returns:
        Loaded model
    """
    import joblib
    
    model = joblib.load(model_path)
    print(f"[+] Rank Predictor loaded from {model_path}")
    return model


def calibration_error(
    predicted_probabilities: List[float],
    actual_outcomes: List[int]
) -> float:
    """
    Calculate calibration error (how well probabilities match reality)
    
    Calibration Error = mean(|predicted_prob - actual_outcome|)
    Lower is better, <0.10 is good.
    
    Args:
        predicted_probabilities: List of predicted probabilities (0-1)
        actual_outcomes: List of actual outcomes (0 or 1)
    
    Returns:
        Calibration error score
    """
    import numpy as np
    
    predicted = np.array(predicted_probabilities)
    actual = np.array(actual_outcomes)
    
    return float(np.mean(np.abs(predicted - actual)))


def calculate_ranking_metrics(
    predicted_ranks: List[float],
    actual_ranks: List[int]
) -> Dict[str, float]:
    """
    Calculate ranking prediction metrics
    
    Args:
        predicted_ranks: List of predicted ranks
        actual_ranks: List of actual ranks
    
    Returns:
        Metrics dictionary
    """
    import numpy as np
    
    predicted = np.array(predicted_ranks)
    actual = np.array(actual_ranks)
    
    mae = np.mean(np.abs(predicted - actual))
    
    # Within-1-rank accuracy
    within_one = (np.abs(predicted - actual) <= 1).sum() / len(actual)
    
    # Spearman correlation (ranking correlation)
    from scipy.stats import spearmanr
    corr, _ = spearmanr(predicted, actual)
    
    return {
        "MAE": float(mae),
        "Within_1_Rank_Accuracy": float(within_one),
        "Spearman_Correlation": float(corr),
        "Calibration_Error": calibration_error(predicted / 10.0, (actual <= 3).astype(int))  # Rough conversion
    }
