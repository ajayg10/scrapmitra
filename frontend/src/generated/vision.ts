/* Generated from the Pydantic JSON Schema. Do not edit by hand. */

export type DeviceType =
  | "mobile_phone"
  | "feature_phone"
  | "laptop"
  | "desktop_cpu"
  | "crt_monitor"
  | "lcd_monitor"
  | "crt_tv"
  | "led_tv"
  | "keyboard"
  | "mouse"
  | "printer"
  | "router_modem"
  | "charger_adapter"
  | "cables_wires"
  | "ceiling_fan"
  | "microwave"
  | "washing_machine"
  | "refrigerator"
  | "air_conditioner"
  | "inverter_ups"
  | "battery_pack"
  | "cfl_tube_light"
  | "power_bank"
  | "speaker_audio"
  | "unknown";
export type BrandGuess = string | null;
export type Condition = "looks_intact" | "damaged" | "burnt" | "unknown";
export type AgeBand = "lt3" | "3to6" | "6to10" | "gt10" | "unknown";
/**
 * @maxItems 10
 */
export type VisibleDamage = (
  "cracked_screen" | "bent_frame" | "burn_marks" | "swollen_battery" | "water_damage" | "missing_parts" | "corrosion"
)[];
export type BatteryPresent = boolean;
export type PartId =
  | "pcb_low"
  | "pcb_mid"
  | "pcb_high"
  | "copper_wire"
  | "copper_winding"
  | "aluminium"
  | "steel"
  | "brass"
  | "plastic_abs"
  | "li_ion_cell"
  | "lead_acid_cell"
  | "compressor"
  | "crt_tube"
  | "lcd_panel"
  | "ram_chip"
  | "cpu_chip"
  | "hdd_drive"
  | "capacitor_large"
  | "magnet_neodymium"
  | "toner_cartridge"
  | "unknown_part";
export type EstWeightGMin = number;
export type EstWeightGMax = number;
export type Confidence = number;
/**
 * @maxItems 32
 */
export type Parts = VisionPart[];
/**
 * @maxItems 32
 */
export type HazardsDetected = (
  | "HAZ_LI_ION"
  | "HAZ_LEAD_ACID"
  | "HAZ_CRT_LEAD"
  | "HAZ_MERCURY"
  | "HAZ_REFRIGERANT"
  | "HAZ_CAPACITOR_CHARGE"
  | "HAZ_TONER_DUST"
  | "HAZ_BROKEN_GLASS_LCD"
  | "HAZ_PCB_BURN_FUMES"
  | "HAZ_UNKNOWN_SEALED"
)[];
export type OverallConfidence = number;
export type NeedsMorePhotos = boolean;
export type SuggestedAngle = string | null;
/**
 * @maxItems 20
 */
export type Unknowns = string[];

export interface VisionOutput {
  device_type: DeviceType;
  brand_guess: BrandGuess;
  condition: Condition;
  age_band: AgeBand;
  visible_damage: VisibleDamage;
  battery_present: BatteryPresent;
  parts: Parts;
  hazards_detected: HazardsDetected;
  overall_confidence: OverallConfidence;
  needs_more_photos: NeedsMorePhotos;
  suggested_angle: SuggestedAngle;
  unknowns: Unknowns;
}
export interface VisionPart {
  part_id: PartId;
  est_weight_g_min: EstWeightGMin;
  est_weight_g_max: EstWeightGMax;
  confidence: Confidence;
}
