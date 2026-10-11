"""Unit and integration tests for the KabadiPlus Voice Agent."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from backend.core.voice_agent import (
    VOICE_SESSIONS,
    _collect_tool_numbers,
    _dispatch_tool,
    _extract_numbers,
    append_turn,
    detect_language,
    get_session,
    number_guard,
    run_voice_agent,
    safety_guard,
    scope_guard,
)
from backend.core.voice_tools import (
    check_offer,
    explain_decision,
    find_collectors,
    get_hazard_rules,
    get_my_impact,
    get_pickup_status,
    get_price_breakdown,
    get_scan_result,
    what_if_value,
)
from backend.functions.app import app


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures & Test Data
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_scans():
    return {
        "scan_phone_123": {
            "scan_id": "scan_phone_123",
            "device": {
                "device_type": "mobile_phone",
                "label": "Smartphone (Samsung)",
                "condition": "damaged",
                "age_band": "3to6",
            },
            "parts": [
                {"part_id": "pcb_high", "est_weight_g_min": 18.0, "est_weight_g_max": 28.0},
                {"part_id": "li_ion_cell", "est_weight_g_min": 35.0, "est_weight_g_max": 55.0},
                {"part_id": "lcd_panel", "est_weight_g_min": 35.0, "est_weight_g_max": 50.0},
            ],
            "hazards": [
                {
                    "hazard_id": "HAZ_LI_ION",
                    "severity": "HIGH",
                    "warning": "Damaged lithium battery may catch fire if punctured.",
                    "do": ["Store in a cool dry place.", "Hand over intact."],
                    "dont": ["Do not puncture, hammer, or incinerate."],
                }
            ],
            "decision": {
                "recommended_tier": "REPAIR_THEN_REUSE",
                "options": [
                    {
                        "option_id": "REPAIR_THEN_REUSE",
                        "title": "Screen Repair & Refurbishment",
                        "money_range": {"min": 2500, "max": 6500, "currency": "INR"},
                        "co2e_avoided_min_kg": 35.0,
                        "co2e_avoided_max_kg": 55.0,
                        "why": "Repair cost is well under 50% of secondary market value.",
                    },
                    {
                        "option_id": "RECYCLE_AUTHORIZED",
                        "title": "Authorized Material Recycling",
                        "money_range": {"min": 80, "max": 220, "currency": "INR"},
                        "co2e_avoided_min_kg": 10.0,
                        "co2e_avoided_max_kg": 18.0,
                        "why": "Certified smelters reclaim metals safely.",
                    },
                ],
                "comparison_table": [
                    {
                        "option_name": "Screen Repair",
                        "money_text": "₹2,500 - ₹6,500",
                        "env_rating": "better",
                        "co2e_avoided_text": "35 - 55 kg CO₂e",
                        "summary_reason": "Highest carbon and monetary savings",
                    }
                ],
            },
        }
    }


@pytest.fixture
def mock_collectors():
    return [
        {
            "collector_id": "col_delhi_01",
            "name": "Ramesh Kumar (EV Cargo)",
            "vehicle": "Three-Wheeler EV Cargo",
            "operating_areas": ["Nehru Place", "Okhla", "Kalkaji"],
            "authorized_categories": ["mobile_phone", "laptop", "battery"],
            "rating": 4.9,
            "status": "active",
        }
    ]


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ─────────────────────────────────────────────────────────────────────────────
# 1. Language Detection Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_detect_language_hindi():
    assert detect_language("इस फोन की क्या कीमत मिलेगी?") == "hi"
    assert detect_language("क्या यह सुरक्षित है?") == "hi"


def test_detect_language_hinglish():
    assert detect_language("iss phone ka price kitna milega?") == "hinglish"
    assert detect_language("kya ye safe hai aur pickup hoga?") == "hinglish"


def test_detect_language_english():
    assert detect_language("What is the estimated scrap value of this smartphone?") == "en"
    assert detect_language("Is it safe to dismantle the screen at home?") == "en"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Scope Guard Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_scope_guard_detects_offtopic():
    assert scope_guard("Can you give me a recipe for paneer tikka?") is True
    assert scope_guard("Who will win the cricket match today?") is True
    assert scope_guard("What is today's weather in Delhi?") is True
    assert scope_guard("Tell me about politics and election results.") is True


def test_scope_guard_permits_on_topic():
    assert scope_guard("What is the price for this damaged phone?") is False
    assert scope_guard("Can I open the battery inside?") is False
    assert scope_guard("Where can I sell my laptop?") is False
    assert scope_guard("How do you calculate eco points?") is False


# ─────────────────────────────────────────────────────────────────────────────
# 3. Number Guard Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_number_guard_accepts_valid_numbers():
    tool_outputs = [{"options": [{"price_min_inr": 80, "price_max_inr": 220}]}]
    reply = "The recycling value is between ₹80 and ₹220 depending on condition."
    passed, reason = number_guard(reply, tool_outputs)
    assert passed is True


def test_number_guard_blocks_invented_numbers():
    tool_outputs = [{"options": [{"price_min_inr": 80, "price_max_inr": 220}]}]
    reply = "I estimate you will get ₹1,500 from a local buyer."
    passed, reason = number_guard(reply, tool_outputs)
    assert passed is False
    assert "invented_numbers" in reason


def test_collect_tool_numbers_deep_extraction():
    data = [
        {"a": 100, "b": [200, {"c": 300.5}]},
        {"nested": {"rate": 50}},
    ]
    nums = _collect_tool_numbers(data)
    assert {100.0, 200.0, 300.5, 50.0}.issubset(nums)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Safety Guard Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_safety_guard_triggers_on_dismantling_hazardous_item():
    hazards = [
        {
            "hazard_id": "HAZ_LI_ION",
            "severity": "HIGH",
            "dont": ["Do not puncture, hammer, or incinerate."],
        }
    ]
    user_q = "How to open the phone battery at home?"
    reply = "Use a small pry tool and heat gun to remove the battery carefully."
    passed, dont_text = safety_guard(user_q, reply, hazards)
    assert passed is False
    assert "Do not puncture, hammer, or incinerate." in dont_text


def test_safety_guard_passes_when_dont_included():
    hazards = [
        {
            "hazard_id": "HAZ_LI_ION",
            "severity": "HIGH",
            "dont": ["Do not puncture, hammer, or incinerate."],
        }
    ]
    user_q = "Can I open the battery?"
    reply = "Do not puncture, hammer, or incinerate. Take it to an authorized collector."
    passed, dont_text = safety_guard(user_q, reply, hazards)
    assert passed is True


# ─────────────────────────────────────────────────────────────────────────────
# 5. Session Memory Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_session_memory_caps_at_max_turns():
    session_id = "test_sess_overflow"
    VOICE_SESSIONS.pop(session_id, None)

    for i in range(10):
        append_turn(session_id, {"user": f"q{i}", "assistant": f"a{i}"})

    sess = get_session(session_id)
    assert len(sess["turns"]) == 6
    assert sess["turns"][0]["user"] == "q4"
    assert sess["turns"][-1]["user"] == "q9"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Tool Implementations Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_get_scan_result_tool(mock_scans):
    res = get_scan_result("scan_phone_123", mock_scans)
    assert res["device_type"] == "mobile_phone"
    assert res["recommended_tier"] == "REPAIR_THEN_REUSE"


def test_get_price_breakdown_tool(mock_scans):
    res = get_price_breakdown("scan_phone_123", mock_scans)
    assert "options" in res
    assert "source" in res
    assert "last_updated" in res


def test_check_offer_low_offer_flags_red(mock_scans):
    res = check_offer("scan_phone_123", 40.0, mock_scans)
    assert res["status"] == "RED"
    assert "Too low" in res["verdict"]
    assert "counter_offer_line" in res


def test_check_offer_fair_offer_flags_green(mock_scans):
    # Recommended first option has min ₹2500, so ₹3000 is fair
    res = check_offer("scan_phone_123", 3000.0, mock_scans)
    assert res["status"] == "GREEN"
    assert "Fair offer" in res["verdict"]


def test_what_if_value_blocks_hazardous_separation(mock_scans):
    res = what_if_value("scan_phone_123", ["li_ion_cell"], mock_scans)
    assert res["allowed"] is False
    assert "blocked_parts" in res


def test_find_collectors_tool(mock_scans, mock_collectors):
    mock_collectors[0]["is_hazard_authorized"] = True
    res = find_collectors("scan_phone_123", mock_scans, mock_collectors)
    assert res["collectors_found"] >= 1
    assert len(res["collectors"]) >= 1


# ─────────────────────────────────────────────────────────────────────────────
# 7. Tool Dispatcher & RBAC Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_dispatch_tool_pickup_status_unauthorized():
    context = {"pickup_requests": {}, "user": None}
    res = _dispatch_tool("get_pickup_status", {"request_id": "req_1"}, context)
    assert res["error"] == "unauthorized"


def test_dispatch_tool_pickup_status_collector_forbidden():
    context = {"pickup_requests": {}, "user": {"user_id": "col_1", "role": "collector"}}
    res = _dispatch_tool("get_pickup_status", {"request_id": "req_1"}, context)
    assert res["error"] == "forbidden"


def test_dispatch_tool_impact_unauthorized():
    context = {"impact_ledger": [], "user": None}
    res = _dispatch_tool("get_my_impact", {}, context)
    assert res["error"] == "unauthorized"


# ─────────────────────────────────────────────────────────────────────────────
# 8. End-to-End Voice API Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_voice_upload_url_endpoint(client):
    res = client.post("/v1/voice/upload-url", json={"content_type": "audio/webm"})
    assert res.status_code == 200
    data = res.get_json()
    assert "upload_url" in data
    assert "audio_key" in data
    assert data["audio_key"].startswith("voice/clips/")


def test_voice_ask_scope_redirect(client):
    payload = {
        "input": {"text": "What is the recipe for biryani?"},
        "lang_hint": "en",
    }
    res = client.post("/v1/voice/ask", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["guard_status"] == "scope_redirect"
    assert "only help with e-waste" in data["display_text"]


def test_voice_ask_missing_input(client):
    res = client.post("/v1/voice/ask", json={})
    assert res.status_code == 400
    assert res.get_json()["error"] == "missing_input"


@patch("boto3.client")
def test_voice_ask_mocked_bedrock_converse(mock_boto_client, client, mock_scans):
    # Setup mock Bedrock response
    mock_bedrock = MagicMock()
    mock_boto_client.return_value = mock_bedrock

    mock_bedrock.converse.return_value = {
        "stopReason": "end_turn",
        "output": {
            "message": {
                "content": [
                    {
                        "text": json.dumps({
                            "display_text": "The recycling value is between ₹80 and ₹220.",
                            "speech_text": "Recycling value is 80 to 220 rupees.",
                            "sources": ["DEMO DATA — 2026-10-09"],
                            "followups": ["Where can I sell it?"],
                        })
                    }
                ]
            }
        },
    }

    from backend.functions.app import SCANS
    SCANS.update(mock_scans)

    payload = {
        "scan_id": "scan_phone_123",
        "input": {"text": "Why this price?"},
        "lang_hint": "en",
    }
    res = client.post("/v1/voice/ask", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "₹80" in data["display_text"]
    assert "sources" in data
