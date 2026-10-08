"""Unit and integration tests for KabadiPlus v2 engines:

1. Circular Decision Engine (Safety gate, ranking, comparison table)
2. Clustering & Route Optimization (baseline vs route km savings, hazard routing)
3. Integrity, Points, and Anti-Gaming
"""


import pytest

from backend.core.anti_gaming import validate_handover_integrity
from backend.core.catalog import load_data
from backend.core.clustering import (
    cluster_requests,
    evaluate_cluster_dispatchability,
    find_eligible_collector,
)
from backend.core.decision_engine import evaluate_circular_decision
from backend.core.models import LocalizedHazard, PickupRequest
from backend.core.points import compute_eco_points
from backend.core.routing import build_optimized_route

TAXONOMY = load_data("taxonomy.json")
DECISION_RULES = load_data("decision_rules.json")


@pytest.fixture
def sample_hazard_li_ion():
    return LocalizedHazard(
        hazard_id="HAZ_LI_ION",
        severity="HIGH",
        icon="BatteryWarning",
        warning="Lithium battery fire danger.",
        do=["Keep in cool non-flammable container."],
        dont=["Do not puncture or incinerate."],
        exposure_help="Seek urgent medical care if burning.",
        disposal_route="Authorized hazardous facility.",
        review_status="draft",
    )


def test_every_device_type_has_decision_rule():
    rule_types = {item["device_type"] for item in DECISION_RULES["items"]}
    assert set(TAXONOMY["device_type"]) <= rule_types


def test_safety_gate_swollen_battery_blocks_resale_and_repair(sample_hazard_li_ion):
    """Safety overrides economics: swollen battery MUST return only HAZARDOUS_SPECIAL_HANDLING."""
    result = evaluate_circular_decision(
        device_type="mobile_phone",
        condition="damaged",
        age_band="lt3",
        visible_damage=["swollen_battery"],
        battery_present=True,
        powers_on="yes",
        hazards=[sample_hazard_li_ion],
    )
    assert result.safety_gate_triggered is True
    assert result.recommended_tier == "HAZARDOUS_SPECIAL_HANDLING"
    assert len(result.options) == 1
    assert result.options[0].option_id == "HAZARDOUS_SPECIAL_HANDLING"
    # Resale and repair must not be present as active options
    option_ids = [opt.option_id for opt in result.options]
    assert "REUSE_SELL" not in option_ids
    assert "REPAIR_THEN_REUSE" not in option_ids


def test_safety_gate_burnt_device_routes_to_hazard_safe(sample_hazard_li_ion):
    result = evaluate_circular_decision(
        device_type="laptop",
        condition="burnt",
        age_band="lt3",
        visible_damage=["burn_marks"],
        battery_present=True,
        powers_on="no",
        hazards=[sample_hazard_li_ion],
    )
    assert result.safety_gate_triggered is True
    assert result.recommended_tier == "HAZARDOUS_SPECIAL_HANDLING"


def test_working_laptop_prefers_reuse_over_recycling():
    """Waste hierarchy: intact recent laptop should recommend Reuse (sell/donate)."""
    result = evaluate_circular_decision(
        device_type="laptop",
        condition="looks_intact",
        age_band="lt3",
        visible_damage=[],
        battery_present=True,
        powers_on="yes",
        hazards=[],
    )
    assert result.safety_gate_triggered is False
    assert result.recommended_tier in ("REUSE_SELL", "REUSE_DONATE")
    # Both Reuse and Recycle should be present in options
    option_ids = [opt.option_id for opt in result.options]
    assert "REUSE_SELL" in option_ids or "REUSE_DONATE" in option_ids
    assert "RECYCLE_AUTHORIZED" in option_ids


def test_identical_inputs_give_identical_outputs():
    r1 = evaluate_circular_decision(
        device_type="mobile_phone",
        condition="looks_intact",
        age_band="3to6",
        visible_damage=[],
        battery_present=True,
        powers_on="yes",
        hazards=[],
    )
    r2 = evaluate_circular_decision(
        device_type="mobile_phone",
        condition="looks_intact",
        age_band="3to6",
        visible_damage=[],
        battery_present=True,
        powers_on="yes",
        hazards=[],
    )
    assert r1.model_dump() == r2.model_dump()


def test_side_by_side_comparison_table_includes_throw_away():
    result = evaluate_circular_decision(
        device_type="ceiling_fan",
        condition="looks_intact",
        age_band="3to6",
        visible_damage=[],
        battery_present=False,
        powers_on="yes",
        hazards=[],
    )
    table_names = [row.option_name for row in result.comparison_table]
    assert any("Throw away" in name for name in table_names)
    assert any("Recycl" in name for name in table_names)


def test_clustering_and_route_optimization_saves_kilometres():
    """A cluster of nearby households must result in route_km < baseline_km."""
    collector = {
        "collector_id": "col_1",
        "base_lat": 28.5380,
        "base_lng": 77.2550,
        "is_hazard_authorized": True,
    }
    raw_households = load_data("seed/demo_households.json")["items"][:5]
    requests = [PickupRequest.model_validate(h) for h in raw_households]

    clusters = cluster_requests(requests, radius_km=3.0)
    assert len(clusters) >= 1

    main_cluster = clusters[0]
    route_result = build_optimized_route(collector, main_cluster)

    assert route_result["baseline_km"] > 0
    assert route_result["route_km"] > 0
    # Pooling stops must save travel distance compared to individual round trips
    assert route_result["route_km"] < route_result["baseline_km"]
    assert route_result["saved_km"] > 0
    assert route_result["est_co2e_saved_kg"] > 0


def test_hazard_cluster_never_assigned_to_unauthorized_collector():
    collectors = [
        {"collector_id": "col_normal", "base_lat": 28.5380, "base_lng": 77.2550, "is_hazard_authorized": False},
        {"collector_id": "col_hazard", "base_lat": 28.5400, "base_lng": 77.2560, "is_hazard_authorized": True},
    ]
    raw_households = load_data("seed/demo_households.json")["items"]
    # Find a request with hazard flags
    hazard_reqs = [PickupRequest.model_validate(h) for h in raw_households if h["hazard_flags"]]
    assert len(hazard_reqs) > 0

    assigned = find_eligible_collector(hazard_reqs[:1], collectors)
    assert assigned is not None
    assert assigned["collector_id"] == "col_hazard"
    assert assigned["is_hazard_authorized"] is True


def test_cluster_dispatchability_triggers():
    raw_households = load_data("seed/demo_households.json")["items"][:2]
    requests = [PickupRequest.model_validate(h) for h in raw_households]

    # Test time-based trigger
    dispatchable, reason = evaluate_cluster_dispatchability(
        requests,
        w_min_kg=500.0,
        v_min_inr=50000.0,
        t_max_hours=12.0,
        current_time_iso="2026-10-10T12:00:00Z",  # 28 hours later
    )
    assert dispatchable is True
    assert "Time threshold" in reason


def test_points_awarded_only_for_verified_handover():
    # Zero points if not verified
    assert compute_eco_points(outcome="RECYCLE_AUTHORIZED", kg_diverted=12.0, has_hazard=False, is_verified=False) == 0
    # Zero points if flagged
    assert compute_eco_points(outcome="RECYCLE_AUTHORIZED", kg_diverted=12.0, has_hazard=False, is_verified=True, is_flagged=True) == 0
    # Verified points calculation:
    # +10 (routed) + 30 (recycle) + 50 * 2 (10kg = 2 blocks of 5kg) = 140
    pts = compute_eco_points(outcome="RECYCLE_AUTHORIZED", kg_diverted=12.0, has_hazard=False, is_verified=True)
    assert pts == 140

    # With hazard: +10 + 20 (hazard) + 30 + 100 = 160
    pts_haz = compute_eco_points(outcome="RECYCLE_AUTHORIZED", kg_diverted=12.0, has_hazard=True, is_verified=True)
    assert pts_haz == 160


def test_anti_gaming_blocks_self_handover():
    valid, flagged, msg = validate_handover_integrity(
        owner_id="citizen_1",
        collector_id="citizen_1",
        qr_token="qr_tok_123",
        token_already_used=False,
        entered_weight_kg=0.2,
        device_type="mobile_phone",
    )
    assert valid is False
    assert flagged is True
    assert "Self-handover" in msg


def test_anti_gaming_blocks_reused_qr():
    valid, flagged, msg = validate_handover_integrity(
        owner_id="citizen_1",
        collector_id="col_1",
        qr_token="qr_tok_123",
        token_already_used=True,
        entered_weight_kg=0.2,
        device_type="mobile_phone",
    )
    assert valid is False
    assert flagged is True
    assert "already been redeemed" in msg


def test_anti_gaming_flags_weight_anomaly():
    # Mobile phone weighing 45 kg is absurd
    valid, flagged, msg = validate_handover_integrity(
        owner_id="citizen_1",
        collector_id="col_1",
        qr_token="qr_tok_123",
        token_already_used=False,
        entered_weight_kg=45.0,
        device_type="mobile_phone",
    )
    assert valid is True
    assert flagged is True
    assert "Weight anomaly" in msg
