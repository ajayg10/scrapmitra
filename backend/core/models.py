"""Strict contracts shared through generated JSON Schema and TypeScript types.

These are data boundaries, not the Phase 2 Bedrock validator/retry pipeline.
"""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from backend.core.catalog import part_by_id
from backend.core.taxonomy_types import (
    Condition,
    DeviceType,
    HazardId,
    Language,
    MaterialClass,
    PartId,
    VisionGrade,
)

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Confidence = Annotated[float, Field(ge=0, le=1)]
NonNegative = Annotated[float, Field(ge=0)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class VisionPart(StrictModel):
    part_id: PartId
    name: Annotated[str, StringConstraints(min_length=1, max_length=120)]
    material_class: MaterialClass
    grade: VisionGrade
    est_weight_g: Annotated[float, Field(ge=0, le=1_000_000)]
    confidence: Confidence

    @model_validator(mode="after")
    def require_catalog_mapping(self) -> Self:
        entry = part_by_id(self.part_id)
        if (self.material_class, self.grade) != (entry["material_class"], entry["vision_grade"]):
            raise ValueError(f"{self.part_id} must use {entry['material_class']}/{entry['vision_grade']}")
        return self


class VisionOutput(StrictModel):
    device_type: DeviceType
    brand_guess: Text | None
    condition: Condition
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


class PartAppraisal(StrictModel):
    part_id: PartId
    label: Text
    weight_g_min: NonNegative
    weight_g_max: NonNegative
    value_range: MoneyRange | None
    pricing_status: Literal["priced", "illustrative", "unpriced"]

    @model_validator(mode="after")
    def require_complete_range(self) -> Self:
        if self.weight_g_max < self.weight_g_min:
            raise ValueError("Weight max must be greater than or equal to min")
        if (self.pricing_status == "unpriced") != (self.value_range is None):
            raise ValueError("Only unpriced parts have null value_range")
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


class DeviceSummary(StrictModel):
    device_type: DeviceType
    label: Text
    brand: Text | None
    condition: Condition


class NextAction(StrictModel):
    kind: Literal["retake_photo", "find_recycler", "contact_recycler"]
    label: Text
    recycler_id: Text | None


class AgentTrace(StrictModel):
    tool: Literal["identify_parts", "lookup_price", "check_hazards", "find_recycler", "explain_in_language", "request_better_photo"]
    summary: Text


class AppraisalResponse(StrictModel):
    scan_id: Text
    lang: Language
    device: DeviceSummary
    parts: list[PartAppraisal]
    hazards: list[LocalizedHazard]
    value_range: MoneyRange | None
    valuation_complete: bool
    confidence_label: Literal["High", "Medium", "Low"]
    price_source: Text
    price_last_updated: Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")] | None
    is_demo: bool
    needs_more_photos: bool
    suggested_angle: Text | None
    audio_script: Annotated[str, Field(min_length=1, max_length=8000)]
    next_actions: list[NextAction]
    agent_trace: list[AgentTrace] | None


class UploadRequest(StrictModel):
    content_type: Literal["image/jpeg"]
    size_bytes: Annotated[int, Field(gt=0, le=307_200)]


class ScanRequest(StrictModel):
    image_key: Annotated[str, Field(min_length=1, max_length=512, pattern=r"^uploads/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.jpg$")]
    lang: Language
    # The future API must derive owner from a verified guest session, not a body field.


class ErrorResponse(StrictModel):
    error_code: Text
    message_user_friendly: Text
    message_dev: Text | None
