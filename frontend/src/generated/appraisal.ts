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
export type Condition = "looks_intact" | "damaged" | "burnt" | "unknown";
export type AgeBand = "lt3" | "3to6" | "6to10" | "gt10" | "unknown";
export type BatteryPresent = boolean;
export type RecommendedTier =
  "REUSE_SELL" | "REUSE_DONATE" | "REPAIR_THEN_REUSE" | "RECYCLE_AUTHORIZED" | "HAZARDOUS_SPECIAL_HANDLING";
export type OptionId =
  "REUSE_SELL" | "REUSE_DONATE" | "REPAIR_THEN_REUSE" | "RECYCLE_AUTHORIZED" | "HAZARDOUS_SPECIAL_HANDLING";
export type Title = string;
export type Min = number;
export type Max = number;
export type Currency = "INR";
export type EnvRating = "much_better" | "better" | "good" | "poor";
export type Co2EAvoidedMinKg = number;
export type Co2EAvoidedMaxKg = number;
export type Viability = number;
export type ConfidenceLabel = "High" | "Medium" | "Low";
export type Why = string;
export type AssumptionId = string;
export type Options = CircularOption[];
export type OptionName = string;
export type MoneyText = string;
export type EnvRating1 = "much_better" | "better" | "good" | "poor";
export type Co2EAvoidedText = string;
export type SummaryReason = string;
export type ComparisonTable = ComparisonRow[];
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
  | "HAZ_UNKNOWN_SEALED";
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
export type SafetyGateTriggered = boolean;
export type Hazards1 = LocalizedHazard[];
export type IsDemo = boolean;
export type NeedsMorePhotos = boolean;
export type SuggestedAngle = string | null;
export type AudioScript = string;
export type Kind = "retake_photo" | "arrange_pickup" | "find_recycler" | "contact_recycler";
export type Label1 = string;
export type TargetId = string | null;
export type NextActions = NextAction[];

export interface AppraisalResponse {
  scan_id: ScanId;
  lang: Lang;
  device: DeviceSummary;
  decision: DecisionOutput;
  hazards: Hazards1;
  is_demo: IsDemo;
  needs_more_photos: NeedsMorePhotos;
  suggested_angle: SuggestedAngle;
  audio_script: AudioScript;
  next_actions: NextActions;
}
export interface DeviceSummary {
  device_type: DeviceType;
  label: Label;
  brand: Brand;
  condition: Condition;
  age_band: AgeBand;
  battery_present: BatteryPresent;
}
export interface DecisionOutput {
  recommended_tier: RecommendedTier;
  options: Options;
  comparison_table: ComparisonTable;
  hazards: Hazards;
  safety_gate_triggered: SafetyGateTriggered;
}
export interface CircularOption {
  option_id: OptionId;
  title: Title;
  money_range: MoneyRange | null;
  env_rating: EnvRating;
  co2e_avoided_min_kg: Co2EAvoidedMinKg;
  co2e_avoided_max_kg: Co2EAvoidedMaxKg;
  viability: Viability;
  confidence_label: ConfidenceLabel;
  why: Why;
  assumption_id: AssumptionId;
}
export interface MoneyRange {
  min: Min;
  max: Max;
  currency: Currency;
}
export interface ComparisonRow {
  option_name: OptionName;
  money_text: MoneyText;
  env_rating: EnvRating1;
  co2e_avoided_text: Co2EAvoidedText;
  summary_reason: SummaryReason;
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
  label: Label1;
  target_id: TargetId;
}
