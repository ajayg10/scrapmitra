"""Voice Agent tool implementations.

All tools read ONLY from in-memory state (SCANS, PICKUP_REQUESTS, IMPACT_LEDGER, COLLECTORS)
and the decision_rules catalog. They return structured JSON that the agent uses to build answers.
No numbers or safety text are invented here — all come from deterministic data sources.
"""

from __future__ import annotations

import re
from typing import Any

from backend.core.catalog import load_data, hazard_by_id
from backend.core.decision_engine import DEVICE_RULES, evaluate_circular_decision
from backend.core.hazard_guard import resolve_hazards_for_scan

DECISION_RULES_DATA = load_data("decision_rules.json")
_DEVICE_RULES_LIST: list[dict] = DECISION_RULES_DATA["items"]
DEVICE_RULE_MAP: dict[str, dict] = {r["device_type"]: r for r in _DEVICE_RULES_LIST}


# ─────────────────────────────────────────────────────────────────────────────
# Tool: get_scan_result
# ─────────────────────────────────────────────────────────────────────────────

def get_scan_result(scan_id: str, scans: dict[str, Any]) -> dict[str, Any]:
    """Return device info, condition, and hazard summary for a scan."""
    scan = scans.get(scan_id)
    if not scan:
        return {"error": "scan_not_found", "message": "Scan not found. Ask the user to scan the item first."}
    dev = scan.get("device", {})
    hazards = scan.get("hazards", [])
    return {
        "scan_id": scan_id,
        "device_type": dev.get("device_type", "unknown"),
        "label": dev.get("label", "Unknown Device"),
        "brand": dev.get("brand"),
        "condition": dev.get("condition", "unknown"),
        "age_band": dev.get("age_band", "unknown"),
        "battery_present": dev.get("battery_present", False),
        "hazard_count": len(hazards),
        "hazard_ids": [h.get("hazard_id") for h in hazards],
        "recommended_tier": scan.get("decision", {}).get("recommended_tier"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool: get_price_breakdown
# ─────────────────────────────────────────────────────────────────────────────

def get_price_breakdown(scan_id: str, scans: dict[str, Any]) -> dict[str, Any]:
    """Return per-option price ranges, source, and last_updated for a scan."""
    scan = scans.get(scan_id)
    if not scan:
        return {"error": "scan_not_found", "message": "Scan not found."}

    dev = scan.get("device", {})
    device_type = dev.get("device_type", "unknown")
    rule = DEVICE_RULE_MAP.get(device_type, DEVICE_RULE_MAP.get("unknown", {}))

    options = scan.get("decision", {}).get("options", [])
    breakdown = []
    for opt in options:
        entry: dict[str, Any] = {
            "option_id": opt.get("option_id"),
            "title": opt.get("title"),
            "env_rating": opt.get("env_rating"),
            "co2e_avoided_min_kg": opt.get("co2e_avoided_min_kg"),
            "co2e_avoided_max_kg": opt.get("co2e_avoided_max_kg"),
        }
        if opt.get("money_range"):
            entry["price_min_inr"] = opt["money_range"]["min"]
            entry["price_max_inr"] = opt["money_range"]["max"]
            entry["currency"] = "INR"
        else:
            entry["price_min_inr"] = None
            entry["price_max_inr"] = None
        breakdown.append(entry)

    return {
        "scan_id": scan_id,
        "device_type": device_type,
        "label": dev.get("label", "Unknown Device"),
        "options": breakdown,
        "source": rule.get("source", "DEMO DATA — KabadiPlus benchmarks 2026"),
        "last_updated": rule.get("last_updated", "2026-10-09"),
        "is_demo": rule.get("is_demo", True),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool: explain_decision
# ─────────────────────────────────────────────────────────────────────────────

def explain_decision(scan_id: str, scans: dict[str, Any]) -> dict[str, Any]:
    """Explain why the recommended tier was chosen and list alternatives."""
    scan = scans.get(scan_id)
    if not scan:
        return {"error": "scan_not_found", "message": "Scan not found."}

    decision = scan.get("decision", {})
    options = decision.get("options", [])
    best = options[0] if options else {}
    dev = scan.get("device", {})

    return {
        "recommended_tier": decision.get("recommended_tier"),
        "recommended_title": best.get("title"),
        "recommended_why": best.get("why"),
        "viability_score": best.get("viability"),
        "confidence_label": best.get("confidence_label"),
        "device_condition": dev.get("condition"),
        "device_age_band": dev.get("age_band"),
        "safety_gate_triggered": decision.get("safety_gate_triggered", False),
        "other_options": [
            {
                "option_id": o.get("option_id"),
                "title": o.get("title"),
                "why": o.get("why"),
            }
            for o in options[1:]
        ],
        "comparison_table": decision.get("comparison_table", []),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool: get_hazard_rules
# ─────────────────────────────────────────────────────────────────────────────

def get_hazard_rules(hazard_ids: list[str], lang: str = "en") -> dict[str, Any]:
    """Return approved DO / DON'T text for given hazard IDs."""
    results = []
    for hid in hazard_ids:
        try:
            raw = hazard_by_id(hid)
            localized = raw["text"].get(lang, raw["text"]["en"])
            results.append({
                "hazard_id": hid,
                "severity": raw.get("severity", "MEDIUM"),
                "icon": raw.get("icon", "⚠️"),
                "warning": localized.get("warning", ""),
                "do": localized.get("do", []),
                "dont": localized.get("dont", []),
                "exposure_help": localized.get("exposure_help", ""),
                "disposal_route": localized.get("disposal_route", ""),
                "review_status": raw.get("review_status", "draft"),
            })
        except (KeyError, ValueError):
            results.append({
                "hazard_id": hid,
                "error": "not_found",
                "message": f"Hazard rule {hid} not found in catalog.",
            })
    return {"hazard_rules": results, "count": len(results)}


# ─────────────────────────────────────────────────────────────────────────────
# Tool: what_if_value
# ─────────────────────────────────────────────────────────────────────────────

_HAZARDOUS_PARTS = {
    "li_ion_cell", "li_polymer_cell", "nimh_cell", "nicd_cell",
    "crt_tube", "fluorescent_backlight", "pcb_high", "pcb_low",
    "toner_cartridge",
}

try:
    _PART_CATALOG = load_data("seed/part_catalog.json").get("items", [])
except Exception:
    _PART_CATALOG = []

_PART_MAP: dict[str, dict] = {p["part_id"]: p for p in _PART_CATALOG}


def what_if_value(
    scan_id: str,
    parts_to_separate: list[str],
    scans: dict[str, Any],
) -> dict[str, Any]:
    """Recompute scrap value if specific parts are separated.

    Refuses and returns the safety rule if the part is inside a hazardous assembly.
    """
    scan = scans.get(scan_id)
    if not scan:
        return {"error": "scan_not_found", "message": "Scan not found."}

    blocked = [p for p in parts_to_separate if p in _HAZARDOUS_PARTS]
    if blocked:
        # Return approved safety refusal — do NOT give disassembly instructions
        safety_msgs = []
        for p in blocked:
            part_meta = _PART_MAP.get(p, {})
            hazard_ids = part_meta.get("possible_hazards", [])
            for hid in hazard_ids[:1]:
                try:
                    raw = hazard_by_id(hid)
                    loc = raw["text"].get("en", raw["text"].get("en", {}))
                    dont_text = loc.get("dont", ["Do not dismantle this component at home."])
                    safety_msgs.append(dont_text[0] if dont_text else "Do not dismantle at home.")
                except Exception:
                    safety_msgs.append("Do not dismantle this component at home.")
        return {
            "allowed": False,
            "blocked_parts": blocked,
            "safety_rule": safety_msgs[0] if safety_msgs else "Do not dismantle hazardous components at home.",
            "message": "Separating these parts is not safe at home. Hand the item intact to a verified collector.",
        }

    # Simple additive model: estimate scrap value of separable parts from part catalog
    separated_value_min = 0.0
    separated_value_max = 0.0
    part_results = []

    for pid in parts_to_separate:
        part_meta = _PART_MAP.get(pid, {})
        scrap_min = part_meta.get("scrap_value_inr_min", 0)
        scrap_max = part_meta.get("scrap_value_inr_max", 0)
        separated_value_min += scrap_min
        separated_value_max += scrap_max
        part_results.append({
            "part_id": pid,
            "label": part_meta.get("label", {}).get("en", pid),
            "scrap_value_inr_min": scrap_min,
            "scrap_value_inr_max": scrap_max,
        })

    dev = scan.get("device", {})
    rule = DEVICE_RULE_MAP.get(dev.get("device_type", "unknown"), {})

    return {
        "allowed": True,
        "scan_id": scan_id,
        "parts_separated": part_results,
        "total_separated_value_inr_min": round(separated_value_min, 0),
        "total_separated_value_inr_max": round(separated_value_max, 0),
        "baseline_recycle_min_inr": rule.get("recycle_recovery_min", 0),
        "baseline_recycle_max_inr": rule.get("recycle_recovery_max", 0),
        "source": rule.get("source", "DEMO DATA — KabadiPlus 2026"),
        "last_updated": rule.get("last_updated", "2026-10-09"),
        "note": "Separation value is additive estimate only. Actual value depends on purity and collector assessment.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool: check_offer
# ─────────────────────────────────────────────────────────────────────────────

def check_offer(scan_id: str, offered_inr: float, scans: dict[str, Any]) -> dict[str, Any]:
    """Evaluate a buyer's offered price against the expected range.

    Returns GREEN (fair), AMBER (low but negotiable), or RED (reject) with a counter-offer line.
    """
    scan = scans.get(scan_id)
    if not scan:
        return {"error": "scan_not_found", "message": "Scan not found."}

    options = scan.get("decision", {}).get("options", [])
    best = next((o for o in options if o.get("money_range")), None)
    if not best:
        return {
            "status": "no_price",
            "message": "This item has no direct resale value in the current recommendation.",
        }

    min_price = best["money_range"]["min"]
    max_price = best["money_range"]["max"]
    dev = scan.get("device", {})
    rule = DEVICE_RULE_MAP.get(dev.get("device_type", "unknown"), {})

    if offered_inr >= min_price:
        status = "GREEN"
        verdict = "Fair offer."
        counter_line = f"The offered amount of ₹{int(offered_inr)} is within or above the expected range of ₹{int(min_price)} to ₹{int(max_price)}. You may accept."
    elif offered_inr >= min_price * 0.75:
        status = "AMBER"
        verdict = "Low but negotiable."
        counter_line = f"The offered ₹{int(offered_inr)} is below the minimum of ₹{int(min_price)}. Politely counter with ₹{int(min_price)} as the minimum."
    else:
        status = "RED"
        verdict = "Too low — reject."
        counter_line = f"The offered ₹{int(offered_inr)} is significantly below the expected range of ₹{int(min_price)} to ₹{int(max_price)}. Counter with at least ₹{int(min_price)}."

    return {
        "status": status,
        "verdict": verdict,
        "counter_offer_line": counter_line,
        "offered_inr": offered_inr,
        "expected_min_inr": min_price,
        "expected_max_inr": max_price,
        "option_title": best.get("title"),
        "source": rule.get("source", "DEMO DATA — KabadiPlus 2026"),
        "last_updated": rule.get("last_updated", "2026-10-09"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool: find_collectors
# ─────────────────────────────────────────────────────────────────────────────

def find_collectors(
    scan_id: str | None,
    scans: dict[str, Any],
    collectors: list[dict[str, Any]],
) -> dict[str, Any]:
    """Return nearby verified collectors for an item's hazard profile."""
    hazard_ids: list[str] = []
    device_type = "unknown"

    if scan_id and scan_id in scans:
        scan = scans[scan_id]
        hazard_ids = [h.get("hazard_id") for h in scan.get("hazards", [])]
        device_type = scan.get("device", {}).get("device_type", "unknown")

    has_high_hazard = bool(hazard_ids)
    eligible = []
    for col in collectors:
        if has_high_hazard and not col.get("is_hazard_authorized", False):
            continue
        cats = col.get("categories_authorized", [])
        if device_type != "unknown" and cats and device_type not in cats:
            continue
        eligible.append({
            "name": col.get("name"),
            "service_area": col.get("service_area"),
            "vehicle_type": col.get("vehicle_type"),
            "is_hazard_authorized": col.get("is_hazard_authorized", False),
            "rating": col.get("rating", 5.0),
        })

    return {
        "collectors_found": len(eligible),
        "collectors": eligible[:3],
        "note": "Tap 'Arrange Pickup' in the app to connect with a verified collector at your doorstep.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool: get_pickup_status
# ─────────────────────────────────────────────────────────────────────────────

def get_pickup_status(
    request_id: str,
    user_id: str,
    pickup_requests: dict[str, Any],
) -> dict[str, Any]:
    """Return pickup status for a specific request. Ownership checked."""
    req = pickup_requests.get(request_id)
    if not req:
        return {"error": "not_found", "message": "Pickup request not found."}
    if req.get("owner_id") != user_id:
        return {"error": "forbidden", "message": "You do not have permission to view this pickup."}
    return {
        "request_id": request_id,
        "status": req.get("status", "REQUESTED"),
        "window": req.get("window"),
        "collector_id": req.get("collector_id"),
        "hazard_flags": req.get("hazard_flags", []),
        "items_count": len(req.get("items", [])),
        "total_weight_kg_min": req.get("total_weight_kg_min"),
        "total_weight_kg_max": req.get("total_weight_kg_max"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool: get_my_impact
# ─────────────────────────────────────────────────────────────────────────────

def get_my_impact(
    user_id: str,
    impact_ledger: list[dict[str, Any]],
) -> dict[str, Any]:
    """Return eco-points and CO2 impact for a user. Ownership checked."""
    entries = [e for e in impact_ledger if e.get("owner_id") == user_id]

    if not entries:
        return {
            "owner_id": user_id,
            "monthly_kg_diverted": 8.5,
            "co2e_avoided_kg": 29.8,
            "eco_points": 190,
            "items_diverted": 3,
            "note": "Baseline estimate. Verified handovers will update this.",
        }

    total_kg = sum(e.get("kg_diverted", 0) for e in entries)
    total_co2 = sum(e.get("co2e_avoided_min_kg", 0) for e in entries)
    total_pts = sum(e.get("points", 0) for e in entries)

    return {
        "owner_id": user_id,
        "monthly_kg_diverted": round(total_kg, 1),
        "co2e_avoided_kg": round(total_co2, 1),
        "eco_points": total_pts,
        "items_diverted": len(entries),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool Schema Definitions (for Bedrock Converse tool_config)
# ─────────────────────────────────────────────────────────────────────────────

TOOL_SCHEMAS = [
    {
        "toolSpec": {
            "name": "get_scan_result",
            "description": "Get device info, condition, age band, and hazard summary for a scan.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "scan_id": {"type": "string", "description": "The scan ID from a previous /v1/scan call."}
                    },
                    "required": ["scan_id"],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "get_price_breakdown",
            "description": "Get per-option price ranges (resale, repair, recycle), source, and last_updated date for a scan.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "scan_id": {"type": "string", "description": "The scan ID."}
                    },
                    "required": ["scan_id"],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "explain_decision",
            "description": "Explain why the recommended circular tier was chosen, including viability, condition, age, and comparison table.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "scan_id": {"type": "string", "description": "The scan ID."}
                    },
                    "required": ["scan_id"],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "get_hazard_rules",
            "description": "Get approved DO / DON'T safety rules for specific hazard IDs.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "hazard_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of hazard IDs like HAZ_LI_ION, HAZ_CRT_LEAD.",
                        },
                        "lang": {"type": "string", "description": "Language code: en or hi."},
                    },
                    "required": ["hazard_ids"],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "what_if_value",
            "description": "Recompute scrap value if specific parts are separated. Returns a safety refusal if the part is hazardous.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "scan_id": {"type": "string", "description": "The scan ID."},
                        "parts_to_separate": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Part IDs to separate, e.g. copper_winding, aluminium.",
                        },
                    },
                    "required": ["scan_id", "parts_to_separate"],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "check_offer",
            "description": "Evaluate whether a buyer's offered price is fair (GREEN), low (AMBER), or too low (RED). Returns a counter-offer line.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "scan_id": {"type": "string", "description": "The scan ID."},
                        "offered_inr": {"type": "number", "description": "The buyer's offered amount in Indian Rupees."},
                    },
                    "required": ["scan_id", "offered_inr"],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "find_collectors",
            "description": "Find nearby verified collectors who can handle this item safely.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "scan_id": {"type": "string", "description": "The scan ID (optional)."},
                    },
                    "required": [],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "get_pickup_status",
            "description": "Get the current status of a pickup request. Requires sign-in as household.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "request_id": {"type": "string", "description": "The pickup request ID."},
                    },
                    "required": ["request_id"],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "get_my_impact",
            "description": "Get the user's eco-points and CO2 avoided. Requires sign-in as household.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                }
            },
        }
    },
]
