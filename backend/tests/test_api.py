"""Integration tests for all /v1 endpoints in KabadiPlus v2."""

import pytest

from backend.functions.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    res = client.get("/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0.0"


def test_upload_url_endpoint(client):
    res = client.post("/v1/upload-url")
    assert res.status_code == 200
    data = res.get_json()
    assert "upload_url" in data
    assert data["image_key"].startswith("uploads/guest_session/")


def test_scan_endpoint_returns_decision_and_hazards(client):
    payload = {
        "image_key": "uploads/guest/phone.jpg",
        "lang": "en",
        "powers_on": "yes",
    }
    res = client.post("/v1/scan", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "scan_id" in data
    assert "decision" in data
    assert "hazards" in data
    assert "comparison_table" in data["decision"]
    assert "audio_script" in data
    # Audio script must mention caution or identified device
    assert len(data["audio_script"]) > 10


def test_speech_endpoint(client):
    res = client.post("/v1/speech", json={"text": "Test speech", "lang": "hi"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ready"


def test_voice_intent_endpoint(client):
    # First create a scan
    scan_res = client.post("/v1/scan", json={"image_key": "uploads/guest/phone.jpg", "lang": "en"})
    scan_id = scan_res.get_json()["scan_id"]

    res = client.post("/v1/voice/intent", json={"scan_id": scan_id, "intent": "what_is_this"})
    assert res.status_code == 200
    assert "answer" in res.get_json()


def test_pickup_and_handover_flow(client):
    # 1. Create pickup request
    res = client.post("/v1/pickups", json={
        "device_type": "laptop",
        "approx_lat": 28.5355,
        "approx_lng": 77.2610,
    })
    assert res.status_code == 200
    pickup_data = res.get_json()
    assert pickup_data["pickup"]["request_id"]
    qr_token = pickup_data["qr_tokens"][0]

    # 2. Collector scan
    scan_res = client.post("/v1/handover/scan", json={
        "qr_token": qr_token,
        "collector_id": "col_delhi_01",
        "entered_weight_kg": 2.1,
        "category_confirmed": "laptop",
    })
    assert scan_res.status_code == 200
    assert scan_res.get_json()["status"] == "HANDOVER_PENDING"

    # 3. Household confirm
    confirm_res = client.post("/v1/handover/confirm", json={
        "qr_token": qr_token,
        "confirmed": True,
    })
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.get_json()
    assert confirm_data["status"] == "VERIFIED"
    assert confirm_data["points_earned"] > 0


def test_collector_route_endpoint(client):
    res = client.get("/v1/collector/route?collector_id=col_delhi_01")
    assert res.status_code == 200
    data = res.get_json()
    assert "baseline_km" in data
    assert "route_km" in data
    assert "saved_km" in data


def test_admin_run_aggregation(client):
    res = client.post("/v1/admin/demo/run-aggregation")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "DISPATCHED"
    assert data["total_saved_km"] > 0
    assert "assigned_routes" in data


def test_leaderboard_endpoint(client):
    res = client.get("/v1/leaderboard")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["households"]) > 0
    assert len(data["collectors"]) > 0
