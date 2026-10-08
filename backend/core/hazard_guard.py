"""Deterministic rule-based Hazard Guard.

Merges detected vision hazards, part-triggered hazards, device precautionary hazards,
and damage flags into localized Hazard rules.
"""

from typing import Any

from backend.core.catalog import hazard_by_id, load_data, part_by_id
from backend.core.models import LocalizedHazard
from backend.core.taxonomy_types import DeviceType, HazardId, Language, PartId, VisibleDamage

DEVICE_CATALOG: dict[str, Any] = {
    item["device_type"]: item for item in load_data("seed/device_catalog.json")["items"]
}


def resolve_hazards_for_scan(
    device_type: DeviceType,
    parts: list[dict[str, Any]],
    hazards_detected: list[HazardId],
    visible_damage: list[VisibleDamage],
    lang: Language = "en",
) -> list[LocalizedHazard]:
    """Deterministically determine all applicable hazards and return localized rule objects.

    Rules:
    1. Direct model detections in `hazards_detected`.
    2. Part-inherent hazards for every part identified in the device.
    3. Visible damage mappings:
       - swollen_battery -> HAZ_LI_ION
       - cracked_screen -> HAZ_BROKEN_GLASS_LCD
       - burn_marks -> HAZ_PCB_BURN_FUMES
    4. If device is damaged, add precautionary device hazards from device_catalog.
    """
    applicable_hazard_ids: set[HazardId] = set(hazards_detected)

    # 1. Damage-based hazard triggers
    if "swollen_battery" in visible_damage:
        applicable_hazard_ids.add("HAZ_LI_ION")
    if "cracked_screen" in visible_damage:
        applicable_hazard_ids.add("HAZ_BROKEN_GLASS_LCD")
    if "burn_marks" in visible_damage:
        applicable_hazard_ids.add("HAZ_PCB_BURN_FUMES")

    # 2. Part-based hazard triggers
    for part in parts:
        pid: PartId = part.get("part_id") if isinstance(part, dict) else getattr(part, "part_id", None)
        if pid:
            part_meta = part_by_id(pid)
            for h in part_meta.get("possible_hazards", []):
                applicable_hazard_ids.add(h)

    # 3. Device-level precautionary hazards if visibly damaged
    if visible_damage or any(d in visible_damage for d in ["missing_parts", "water_damage", "bent_frame"]):
        device_meta = DEVICE_CATALOG.get(device_type)
        if device_meta:
            for h in device_meta.get("possible_hazards", []):
                applicable_hazard_ids.add(h)

    # Map to LocalizedHazard models
    localized_list: list[LocalizedHazard] = []
    # Sort with HIGH severity first, then MEDIUM, then LOW
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}

    for hid in sorted(applicable_hazard_ids, key=lambda x: (severity_order.get(hazard_by_id(x)["severity"], 3), x)):
        raw_rule = hazard_by_id(hid)
        localized_text = raw_rule["text"].get(lang, raw_rule["text"]["en"])
        localized_list.append(
            LocalizedHazard(
                hazard_id=hid,
                severity=raw_rule["severity"],
                icon=raw_rule["icon"],
                warning=localized_text["warning"],
                do=localized_text["do"],
                dont=localized_text["dont"],
                exposure_help=localized_text["exposure_help"],
                disposal_route=localized_text["disposal_route"],
                review_status=raw_rule.get("review_status", "draft"),
            )
        )

    return localized_list
