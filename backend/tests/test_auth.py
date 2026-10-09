"""Tests for authentication, role enforcement, and anti-gaming identity rules."""

import pytest
from backend.functions.app import app, SCANS, ITEM_TOKENS, PICKUP_REQUESTS, PROFILES, COLLECTORS


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# 1. Unauthenticated calls to protected endpoints return 401
@pytest.mark.parametrize("method,endpoint", [
    ("get", "/v1/me"),
    ("post", "/v1/pickups"),
    ("get", "/v1/collector/route"),
    ("post", "/v1/handover/scan"),
    ("post", "/v1/handover/confirm"),
    ("get", "/v1/impact/me"),
    ("get", "/v1/impact/summary"),
    ("post", "/v1/admin/demo/run-aggregation"),
    ("get", "/v1/admin/collectors"),
])
def test_unauthenticated_calls_return_401(client, method, endpoint):
    res = getattr(client, method)(endpoint)
    assert res.status_code == 401
    data = res.get_json()
    assert data["error_code"] == "UNAUTHORIZED"


# 2. Public endpoints remain accessible without auth (guest-first)
def test_public_endpoints_accessible_without_auth(client):
    res_health = client.get("/v1/health")
    assert res_health.status_code == 200

    res_scan = client.post("/v1/scan", json={"image_key": "uploads/guest/phone.jpg", "lang": "en"})
    assert res_scan.status_code == 200
    assert "scan_id" in res_scan.get_json()

    res_lead = client.get("/v1/leaderboard")
    assert res_lead.status_code == 200


# 3. Household token cannot call collector or admin endpoints
def test_household_cannot_access_collector_or_admin_endpoints(client):
    hh_headers = {"Authorization": "Bearer demo-token-household-1"}

    # Collector endpoints
    res_route = client.get("/v1/collector/route", headers=hh_headers)
    assert res_route.status_code == 403
    assert res_route.get_json()["error_code"] == "FORBIDDEN"

    res_handover = client.post("/v1/handover/scan", headers=hh_headers, json={"qr_token": "dummy"})
    assert res_handover.status_code == 403
    assert res_handover.get_json()["error_code"] == "FORBIDDEN"

    # Admin endpoints
    res_admin = client.get("/v1/admin/collectors", headers=hh_headers)
    assert res_admin.status_code == 403
    assert res_admin.get_json()["error_code"] == "FORBIDDEN"

    res_agg = client.post("/v1/admin/demo/run-aggregation", headers=hh_headers)
    assert res_agg.status_code == 403
    assert res_agg.get_json()["error_code"] == "FORBIDDEN"

    res_summary = client.get("/v1/impact/summary", headers=hh_headers)
    assert res_summary.status_code == 403
    assert res_summary.get_json()["error_code"] == "FORBIDDEN"


# 4. Collector token cannot read other collectors' routes
def test_collector_cannot_read_other_collectors_routes(client):
    col_headers = {"Authorization": "Bearer demo-token-collector-1"}

    # Can read own route
    res_own = client.get("/v1/collector/route?collector_id=col_delhi_01", headers=col_headers)
    assert res_own.status_code == 200

    # Cannot read other collector's route
    res_other = client.get("/v1/collector/route?collector_id=col_delhi_02", headers=col_headers)
    assert res_other.status_code == 403
    assert res_other.get_json()["error_code"] == "FORBIDDEN"


# 5. Guest scan claim works once and only for the claimant
def test_guest_scan_claim_works_once_and_only_for_claimant(client):
    # Step A: Perform guest scan
    scan_res = client.post("/v1/scan", json={"image_key": "uploads/guest/phone.jpg"})
    assert scan_res.status_code == 200
    scan_id = scan_res.get_json()["scan_id"]

    hh1_headers = {"Authorization": "Bearer demo-token-household-1"}
    hh2_headers = {"Authorization": "Bearer demo-token-household-2"}

    # Step B: Household 1 claims it
    claim1_res = client.post(f"/v1/scan/{scan_id}/claim", headers=hh1_headers)
    assert claim1_res.status_code == 200
    data1 = claim1_res.get_json()
    assert data1["status"] == "CLAIMED"
    assert data1["claimed_by"] == "sub_hh_01"

    # Step C: Household 2 tries to claim same scan -> Rejection
    claim2_res = client.post(f"/v1/scan/{scan_id}/claim", headers=hh2_headers)
    assert claim2_res.status_code == 400
    assert claim2_res.get_json()["error_code"] == "ALREADY_CLAIMED"

    # Step D: Collector cannot claim scan
    col_headers = {"Authorization": "Bearer demo-token-collector-1"}
    claim_col = client.post(f"/v1/scan/{scan_id}/claim", headers=col_headers)
    assert claim_col.status_code == 403


# 6. Collector cannot verify handover for account sharing their identifier
def test_collector_cannot_verify_handover_for_self(client):
    # Setup token owned by collector's identifier
    tok_id = "qr_test_self_handover"
    ITEM_TOKENS[tok_id] = {
        "qr_token": tok_id,
        "request_id": "req_dummy",
        "item_id": "item_01",
        "owner_id": "sub_col_delhi_01",  # Same as collector 1!
        "device_type": "mobile_phone",
        "used": False,
        "expected_weight_kg_min": 0.1,
        "expected_weight_kg_max": 0.3,
    }

    col1_headers = {"Authorization": "Bearer demo-token-collector-1"}
    res = client.post("/v1/handover/scan", headers=col1_headers, json={
        "qr_token": tok_id,
        "collector_id": "col_delhi_01",
        "entered_weight_kg": 0.2,
        "category_confirmed": "mobile_phone",
    })
    assert res.status_code == 403
    assert res.get_json()["error_code"] == "INTEGRITY_VIOLATION"


# 7. Collector application & Admin approval flow (including hazard auth flag)
def test_collector_apply_and_admin_approve_flow(client):
    # Public apply
    phone = "+919999888877"
    apply_res = client.post("/v1/collector/apply", json={
        "name": "Jagdish Prasad",
        "phone": phone,
        "vehicle_type": "Three-Wheeler EV Cargo",
        "service_area": "Lajpat Nagar & Kalkaji",
        "categories": ["mobile_phone", "laptop", "lithium_battery"],
        "authorization_ref": "DL-EW-2026-TEST",
    })
    assert apply_res.status_code == 201
    app_data = apply_res.get_json()
    app_id = app_data["application_id"]
    assert app_data["status"] == "pending"

    # Non-admin cannot approve
    hh_headers = {"Authorization": "Bearer demo-token-household-1"}
    fail_res = client.post(f"/v1/admin/collectors/{app_id}/approve", headers=hh_headers, json={
        "is_hazard_authorized": True,
    })
    assert fail_res.status_code == 403

    # Admin approves with hazard authorization enabled
    admin_headers = {"Authorization": "Bearer demo-token-admin"}
    approve_res = client.post(f"/v1/admin/collectors/{app_id}/approve", headers=admin_headers, json={
        "is_hazard_authorized": True,
    })
    assert approve_res.status_code == 200
    appr_data = approve_res.get_json()
    assert appr_data["status"] == "approved"
    assert appr_data["is_hazard_authorized"] is True
    assert appr_data["username"] == phone
    assert "temp_password" in appr_data
    new_sub = appr_data["cognito_sub"]

    # Newly approved collector profile exists
    assert new_sub in PROFILES
    assert PROFILES[new_sub]["role"] == "collector"
    assert PROFILES[new_sub]["is_hazard_authorized"] is True


# 8. Leaderboard shows only display names and no sensitive identity details
def test_leaderboard_display_name_privacy(client):
    res = client.get("/v1/leaderboard")
    assert res.status_code == 200
    data = res.get_json()
    households = data["households"]
    assert len(households) > 0
    for h in households:
        assert "display_name" in h
        # Ensure never email, phone or real name
        assert "@" not in h["display_name"]
        assert "+91" not in h["display_name"]
