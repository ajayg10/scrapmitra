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
export type Condition = "working" | "damaged" | "burnt" | "unknown";
export type PartId =
  | "pcb_low_grade"
  | "pcb_mid_grade"
  | "pcb_high_grade"
  | "copper_wire"
  | "copper_winding_motor"
  | "copper_transformer"
  | "aluminium_heatsink"
  | "aluminium_body"
  | "steel_frame"
  | "brass_fitting"
  | "plastic_abs"
  | "li_ion_cell"
  | "lead_acid_cell"
  | "compressor_unit"
  | "crt_tube"
  | "lcd_panel"
  | "ram_chip"
  | "cpu_chip"
  | "hdd_drive"
  | "capacitor_large"
  | "magnet_neodymium"
  | "toner_cartridge"
  | "unknown_part"
  | "mercury_lamp"
  | "suspect_insulation"
  | "sealed_container";
export type Name = string;
export type MaterialClass =
  "copper" | "aluminium" | "brass" | "steel" | "pcb" | "battery_cell" | "plastic" | "compressor" | "other";
export type Grade = "low" | "mid" | "high" | "na";
export type EstWeightG = number;
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
  | "HAZ_ASBESTOS_SUSPECTED"
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
  parts: Parts;
  hazards_detected: HazardsDetected;
  overall_confidence: OverallConfidence;
  needs_more_photos: NeedsMorePhotos;
  suggested_angle: SuggestedAngle;
  unknowns: Unknowns;
}
export interface VisionPart {
  part_id: PartId;
  name: Name;
  material_class: MaterialClass;
  grade: Grade;
  est_weight_g: EstWeightG;
  confidence: Confidence;
}
