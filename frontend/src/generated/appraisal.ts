/* Generated from the Pydantic JSON Schema. Do not edit by hand. */

export type ScanId = string;
export type Lang = "en" | "hi";
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
export type Label = string;
export type Brand = string | null;
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
export type Label1 = string;
export type WeightGMin = number;
export type WeightGMax = number;
export type Min = number;
export type Max = number;
export type Currency = "INR";
export type PricingStatus = "priced" | "illustrative" | "unpriced";
export type Parts = PartAppraisal[];
export type HazardId =
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
  | "HAZ_ASBESTOS_SUSPECTED";
export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type Icon = string;
export type Warning = string;
/**
 * @minItems 1
 * @maxItems 8
 */
export type Do = [string, ...string[]];
/**
 * @minItems 1
 * @maxItems 8
 */
export type Dont = [string, ...string[]];
export type ExposureHelp = string;
export type DisposalRoute = string;
export type ReviewStatus = "draft" | "approved";
export type Hazards = LocalizedHazard[];
export type ValuationComplete = boolean;
export type ConfidenceLabel = "High" | "Medium" | "Low";
export type PriceSource = string;
export type PriceLastUpdated = string | null;
export type IsDemo = boolean;
export type NeedsMorePhotos = boolean;
export type SuggestedAngle = string | null;
export type AudioScript = string;
export type Kind = "retake_photo" | "find_recycler" | "contact_recycler";
export type Label2 = string;
export type RecyclerId = string | null;
export type NextActions = NextAction[];
export type AgentTrace = AgentTrace1[] | null;
export type Tool =
  | "identify_parts"
  | "lookup_price"
  | "check_hazards"
  | "find_recycler"
  | "explain_in_language"
  | "request_better_photo";
export type Summary = string;

export interface AppraisalResponse {
  scan_id: ScanId;
  lang: Lang;
  device: DeviceSummary;
  parts: Parts;
  hazards: Hazards;
  value_range: MoneyRange | null;
  valuation_complete: ValuationComplete;
  confidence_label: ConfidenceLabel;
  price_source: PriceSource;
  price_last_updated: PriceLastUpdated;
  is_demo: IsDemo;
  needs_more_photos: NeedsMorePhotos;
  suggested_angle: SuggestedAngle;
  audio_script: AudioScript;
  next_actions: NextActions;
  agent_trace: AgentTrace;
}
export interface DeviceSummary {
  device_type: DeviceType;
  label: Label;
  brand: Brand;
  condition: Condition;
}
export interface PartAppraisal {
  part_id: PartId;
  label: Label1;
  weight_g_min: WeightGMin;
  weight_g_max: WeightGMax;
  value_range: MoneyRange | null;
  pricing_status: PricingStatus;
}
export interface MoneyRange {
  min: Min;
  max: Max;
  currency: Currency;
}
export interface LocalizedHazard {
  hazard_id: HazardId;
  severity: Severity;
  icon: Icon;
  warning: Warning;
  do: Do;
  dont: Dont;
  exposure_help: ExposureHelp;
  disposal_route: DisposalRoute;
  review_status: ReviewStatus;
}
export interface NextAction {
  kind: Kind;
  label: Label2;
  recycler_id: RecyclerId;
}
export interface AgentTrace1 {
  tool: Tool;
  summary: Summary;
}
