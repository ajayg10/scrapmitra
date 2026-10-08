"""Strict contracts shared through generated JSON Schema and TypeScript types.

KabadiPlus v2 contracts for Vision, Decision Engine, Pickup, Handover, and Impact.
"""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from backend.core.catalog import part_by_id
from backend.core.taxonomy_types import (
    AgeBand,
    Condition,
    DeviceType,
    HazardId,
    Language,
    OptionId,
    PartId,
    VisibleDamage,
)

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Confidence = Annotated[float, Field(ge=0, le=1)]
NonNegative = Annotated[float, Field(ge=0)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class VisionPart(StrictModel):
    part_id: PartId
    est_weight_g_min: Annotated[float, Field(ge=0, le=1_000_000)]
    est_weight_g_max: Annotated[float, Field(ge=0, le=1_000_000)]
    confidence: Confidence

    @model_validator(mode="after")
    def require_valid_range_and_catalog(self) -> Self:
        part_by_id(self.part_id)
        if self.est_weight_g_max < self.est_weight_g_min:
            raise ValueError("est_weight_g_max must be >= est_weight_g_min")
        return self


class VisionOutput(StrictModel):
    device_type: DeviceType
    brand_guess: Text | None
    condition: Condition
    age_band: AgeBand
    visible_damage: Annotated[list[VisibleDamage], Field(max_length=10)]
    battery_present: bool
    parts: Annotated[list[VisionPart], Field(max_length=32)]
    hazards_detected: Annotated[list[HazardId], Field(max_length=32)]
    overall_confidence: Confidence
    needs_more_photos: bool
    suggested_angle: Text | None
    unknowns: Annotated[list[Text], Field(max_length=20)]

    @model_validator(mode="after")
    def require_consistent_observation(self) -> Self:
        if self.overall_confidence < 0.6 and not self.needs_more_photos:
            raise ValueError("Confidence below 0.6 requires needs_more_photos=true")
        if self.needs_more_photos and not self.suggested_angle:
            raise ValueError("A requested re-shoot requires suggested_angle")
        ids = [part.part_id for part in self.parts]
        if len(ids) != len(set(ids)):
            raise ValueError("Aggregate duplicate part_id entries to prevent double counting")
        if len(self.hazards_detected) != len(set(self.hazards_detected)):
            raise ValueError("hazards_detected must contain unique hazard IDs")
        if len(self.visible_damage) != len(set(self.visible_damage)):
            raise ValueError("visible_damage must contain unique entries")
        return self


class MoneyRange(StrictModel):
    min: NonNegative
    max: NonNegative
    currency: Literal["INR"]

    @model_validator(mode="after")
    def require_ordered_range(self) -> Self:
        if self.max < self.min:
            raise ValueError("max must be greater than or equal to min")
        return self


class LocalizedHazard(StrictModel):
    hazard_id: HazardId
    severity: Literal["HIGH", "MEDIUM", "LOW"]
    icon: Text
    warning: Text
    do: Annotated[list[Text], Field(min_length=1, max_length=8)]
    dont: Annotated[list[Text], Field(min_length=1, max_length=8)]
    exposure_help: Text
    disposal_route: Text
    review_status: Literal["draft", "approved"]


class CircularOption(StrictModel):
    option_id: OptionId
    title: Text
    money_range: MoneyRange | None
    env_rating: Literal["much_better", "better", "good", "poor"]
    co2e_avoided_min_kg: NonNegative
    co2e_avoided_max_kg: NonNegative
    viability: Confidence
    confidence_label: Literal["High", "Medium", "Low"]
    why: Text
    assumption_id: Text

    @model_validator(mode="after")
    def require_co2_order(self) -> Self:
        if self.co2e_avoided_max_kg < self.co2e_avoided_min_kg:
            raise ValueError("co2e_avoided_max_kg must be >= co2e_avoided_min_kg")
        return self


class ComparisonRow(StrictModel):
    option_name: Text
    money_text: Text
    env_rating: Literal["much_better", "better", "good", "poor"]
    co2e_avoided_text: Text
    summary_reason: Text


class DecisionOutput(StrictModel):
    recommended_tier: OptionId
    options: list[CircularOption]
    comparison_table: list[ComparisonRow]
    hazards: list[LocalizedHazard]
    safety_gate_triggered: bool


class DeviceSummary(StrictModel):
    device_type: DeviceType
    label: Text
    brand: Text | None
    condition: Condition
    age_band: AgeBand
    battery_present: bool


class NextAction(StrictModel):
    kind: Literal["retake_photo", "arrange_pickup", "find_recycler", "contact_recycler"]
    label: Text
    target_id: Text | None


class AppraisalResponse(StrictModel):
    scan_id: Text
    lang: Language
    device: DeviceSummary
    decision: DecisionOutput
    hazards: list[LocalizedHazard]
    is_demo: bool
    needs_more_photos: bool
    suggested_angle: Text | None
    audio_script: Annotated[str, Field(min_length=1, max_length=8000)]
    next_actions: list[NextAction]


class UploadRequest(StrictModel):
    content_type: Literal["image/jpeg"]
    size_bytes: Annotated[int, Field(gt=0, le=307_200)]


class ScanRequest(StrictModel):
    image_key: Annotated[str, Field(min_length=1, max_length=512, pattern=r"^uploads/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.jpg$")]
    lang: Language
    powers_on: Literal["yes", "no", "unsure"] | None = None


class PickupItem(StrictModel):
    item_id: Text
    device_type: DeviceType
    est_weight_kg_min: NonNegative
    est_weight_kg_max: NonNegative
    recommended_option: OptionId
    hazards: list[HazardId]


class PickupRequest(StrictModel):
    request_id: Text
    owner_id: Text
    pseudonym: Text | None = None
    geohash: Text
    approx_lat: float
    approx_lng: float
    window: Text
    items: list[PickupItem]
    total_weight_kg_min: NonNegative
    total_weight_kg_max: NonNegative
    hazard_flags: list[HazardId]
    status: Literal["REQUESTED", "CLUSTERED", "ASSIGNED", "EN_ROUTE", "HANDOVER_PENDING", "VERIFIED", "REJECTED", "EXPIRED"]
    cluster_id: Text | None = None
    collector_id: Text | None = None
    created_at: Text


class ItemToken(StrictModel):
    qr_token: Text
    request_id: Text
    item_id: Text
    used: bool
    expected_weight_kg_min: NonNegative
    expected_weight_kg_max: NonNegative


class HandoverScanRequest(StrictModel):
    qr_token: Text
    collector_id: Text
    entered_weight_kg: Annotated[float, Field(gt=0, le=500)]
    category_confirmed: DeviceType


class HandoverConfirmRequest(StrictModel):
    request_id: Text
    item_id: Text
    owner_id: Text
    confirmed: bool


class ImpactLedgerEntry(StrictModel):
    owner_id: Text
    item_id: Text
    kg_diverted: NonNegative
    co2e_avoided_min_kg: NonNegative
    co2e_avoided_max_kg: NonNegative
    outcome: OptionId
    hazard_handled: bool
    points: int
    verified_at: Text


class LeaderboardEntry(StrictModel):
    owner_id: Text
    pseudonym: Text
    role: Literal["household", "collector"]
    total_kg_diverted: NonNegative
    hazards_safely_routed: int
    items_count: int
    points: int


class ErrorResponse(StrictModel):
    error_code: Text
    message_user_friendly: Text
    message_dev: Text | None
