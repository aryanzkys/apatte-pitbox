export const METRIC_KEYS = {
  speed_mps: ["speed_mps"],
  speed_kph: ["speed_kph"],
  speed_delta_pct: ["speed_delta_pct", "speed_change_pct"],
  fuel_eff_km_m3: ["fuel_efficiency_km_per_m3", "fuel_eff_km_m3"],
  hydrogen_tank_pct: ["h2_tank_lel_pct", "hydrogen_tank_pct", "h2_tank_pct"],
  temp_c: ["temp_c", "stack_temp_c", "fuel_cell_temp_c", "inverter_temp_c"],
  voltage_v: ["voltage_v", "pack_voltage_v", "stack_voltage_v"],
  energy_eff_km_kwh: ["energy_efficiency_km_per_kwh", "energy_eff_km_kwh"],
  battery_soc_pct: ["battery_soc_pct", "soc_pct"],
  lap_current: ["lap_current", "lap_count", "lap"],
  lap_total: ["lap_total", "lap_target"],
  sector_1_pct: ["sector_1_pct", "sector_s1_pct"],
  sector_2_pct: ["sector_2_pct", "sector_s2_pct"],
  sector_3_pct: ["sector_3_pct", "sector_s3_pct"],
  sector_4_pct: ["sector_4_pct", "sector_s4_pct"],
  sector_5_pct: ["sector_5_pct", "sector_s5_pct"],
  estimated_finish: ["estimated_finish", "eta_finish"],
  track_temp_c: ["track_temp_c"],
  wind_speed_kph: ["wind_speed_kph", "wind_speed_kmh"],
  wind_dir: ["wind_dir", "wind_direction"],
  alert_message: ["alert_message"],
  alert_level: ["alert_level"],
  alert_time: ["alert_time"],
  ml_ucbe_advice: ["ml_ucbe_advice"],
  ml_phh2_advice: ["ml_phh2_advice"],
  ml_predicted_finish: ["ml_predicted_finish"],
  component_pdu_load_pct: ["component_pdu_load_pct"],
  component_pdu_mode: ["component_pdu_mode"],
  component_pdu_id: ["component_pdu_id"],
  component_pdu_last_sync: ["component_pdu_last_sync"],
  component_fuelcell_load_pct: ["component_fuelcell_load_pct"],
  component_fuelcell_mode: ["component_fuelcell_mode"],
  component_fuelcell_id: ["component_fuelcell_id"],
  component_fuelcell_last_sync: ["component_fuelcell_last_sync"],
  component_motor_load_pct: ["component_motor_load_pct"],
  component_motor_mode: ["component_motor_mode"],
  component_motor_id: ["component_motor_id"],
  component_motor_last_sync: ["component_motor_last_sync"]
} as const;

export type MetricKey = keyof typeof METRIC_KEYS;

export const VEHICLE_HINTS = {
  phH2: ["ph-h2", "ph_h2", "hydrogen", "h2"],
  ucBe: ["uc-be", "uc_be", "electric", "ucbe"]
} as const;
