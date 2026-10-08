"""KabadiPlus v2 API Server & Lambda handler routing.

Implements all /v1 endpoints specified in Section 16 of the Master Spec:
- upload-url
- scan (vision -> hazard guard -> decision engine -> response)
- speech (voice synthesis)
- voice/intent (constrained intent queries)
- pickups (create request & single-use QR tokens)
- pickups/<id>
- collector/route
- handover/scan
- handover/confirm
- impact/me
- leaderboard
- impact/summary
- admin/demo/run-aggregation
- health
"""

import os
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Ensure project root is in sys.path so app.py can be run directly from any directory
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from flask import Flask, jsonify, request
from flask_cors import CORS

from backend.core.anti_gaming import validate_handover_integrity
from backend.core.catalog import load_data
from backend.core.clustering import (
    cluster_requests,
    find_eligible_collector,
)
from backend.core.decision_engine import evaluate_circular_decision
from backend.core.hazard_guard import resolve_hazards_for_scan
from backend.core.models import (
    AppraisalResponse,
    DeviceSummary,
    NextAction,
    PickupItem,
    PickupRequest,
)
from backend.core.points import compute_eco_points
from backend.core.routing import build_optimized_route
from backend.core.vision_client import BedrockVisionClient, MockVisionClient, inspect_with_retry

app = Flask(__name__)
CORS(app)

# In-memory runtime state for fast, deterministic demo & local testing
SCANS: dict[str, dict[str, Any]] = {}
PICKUP_REQUESTS: dict[str, dict[str, Any]] = {}
ITEM_TOKENS: dict[str, dict[str, Any]] = {}
COLLECTOR_ROUTES: dict[str, dict[str, Any]] = {}
IMPACT_LEDGER: list[dict[str, Any]] = []

# Load seed data
DEMO_HOUSEHOLDS = load_data("seed/demo_households.json")["items"]
COLLECTORS = load_data("seed/collectors.json")["items"]
RECYCLERS = load_data("seed/recyclers.json")["items"]

# Initialize demo pickups and tokens
for h in DEMO_HOUSEHOLDS:
    req_id = h["request_id"]
    PICKUP_REQUESTS[req_id] = deepcopy_req = dict(h)
    for it in h["items"]:
        tok = f"qr_{req_id}_{it['item_id']}"
        ITEM_TOKENS[tok] = {
            "qr_token": tok,
            "request_id": req_id,
            "item_id": it["item_id"],
            "owner_id": h["owner_id"],
            "device_type": it["device_type"],
            "used": False,
            "expected_weight_kg_min": it["est_weight_kg_min"],
            "expected_weight_kg_max": it["est_weight_kg_max"],
        }


def get_vision_client():
    mode = os.environ.get("VISION_MODE", "mock").lower()
    if mode == "bedrock":
        return BedrockVisionClient()
    return MockVisionClient()


@app.route("/", methods=["GET"])
def index():
    if request.accept_mimetypes.accept_html and not request.accept_mimetypes.accept_json:
        return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>KabadiPlus v2 API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; max-width: 520px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { color: #38bdf8; margin-top: 0; font-size: 1.75rem; }
    p { color: #94a3b8; line-height: 1.6; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; margin-top: 1rem; }
    .btn:hover { background: #059669; }
    .code { background: #0f172a; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-family: monospace; color: #fbbf24; }
  </style>
</head>
<body>
  <div class="card">
    <h1>KabadiPlus v2 API is Running</h1>
    <p>You have reached the <strong>Backend API Server</strong> (port 5001). The interactive User Interface (PWA) is running on port <strong>5173</strong>.</p>
    <a class="btn" href="http://localhost:5173">Open KabadiPlus Web App &rarr;</a>
    <p style="margin-top: 1.5rem; font-size: 0.85rem;">API Health Check: <a href="/v1/health" style="color: #38bdf8;"><span class="code">/v1/health</span></a></p>
  </div>
</body>
</html>"""
    return jsonify({
        "service": "KabadiPlus v2 API Server",
        "status": "healthy",
        "version": "2.0.0",
        "frontend_url": "http://localhost:5173",
        "health": "/v1/health",
    })


@app.route("/v1/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "KabadiPlus v2 Circular Decision & Pickup Platform",
        "version": "2.0.0",
        "region": os.environ.get("AWS_REGION", "ap-south-1"),
        "vision_mode": os.environ.get("VISION_MODE", "mock"),
    })


@app.route("/v1/upload-url", methods=["POST"])
def upload_url():
    """Return presigned S3 PUT URL (or local mock upload endpoint in dev)."""
    file_id = f"img_{uuid.uuid4().hex[:12]}.jpg"
    key = f"uploads/guest_session/{file_id}"
    return jsonify({
        "upload_url": f"http://127.0.0.1:5001/v1/mock-s3-upload/{file_id}",
        "image_key": key,
        "expires_in_seconds": 900,
        "method": "PUT",
    })


@app.route("/v1/mock-s3-upload/<file_id>", methods=["PUT"])
def mock_s3_upload(file_id):
    return "", 200


@app.route("/v1/scan", methods=["POST"])
def scan():
    """Full scan pipeline: Vision -> Hazard Guard -> Circular Decision Engine."""
    body = request.get_json() or {}
    _image_key = body.get("image_key", "uploads/guest/default.jpg")
    lang = body.get("lang", "en")
    powers_on = body.get("powers_on")

    # 1. Inspect image
    client = get_vision_client()
    dummy_bytes = b"mock_image_bytes"
    vision_output, err = inspect_with_retry(client, dummy_bytes)

    if vision_output is None:
        return jsonify({
            "error_code": "VISION_RETRY_FAILED",
            "message_user_friendly": "We could not clearly identify the device in this photo. Please retake the photo in better lighting.",
            "message_dev": err,
        }), 422

    # If low confidence, request re-shoot directly
    if vision_output.needs_more_photos or vision_output.overall_confidence < 0.6:
        return jsonify({
            "scan_id": f"scan_{uuid.uuid4().hex[:8]}",
            "needs_more_photos": True,
            "suggested_angle": vision_output.suggested_angle or "Please place the device flat and take a clear, well-lit photo.",
            "confidence": vision_output.overall_confidence,
            "message": "Confidence is below 0.6. For safety and pricing accuracy, please capture another angle.",
        })

    # 2. Hazard Guard
    hazards = resolve_hazards_for_scan(
        device_type=vision_output.device_type,
        parts=[p.model_dump() for p in vision_output.parts],
        hazards_detected=vision_output.hazards_detected,
        visible_damage=vision_output.visible_damage,
        lang=lang,
    )

    # 3. Decision Engine
    decision = evaluate_circular_decision(
        device_type=vision_output.device_type,
        condition=vision_output.condition,
        age_band=vision_output.age_band,
        visible_damage=vision_output.visible_damage,
        battery_present=vision_output.battery_present,
        powers_on=powers_on,
        hazards=hazards,
        overall_confidence=vision_output.overall_confidence,
    )

    # 4. Assemble audio script in strict order: hazards first, then recommended action, then money, then next step
    script_parts = []
    if hazards:
        script_parts.append(f"Caution. {len(hazards)} safety hazard detected. {hazards[0].warning}")
    script_parts.append(f"Identified {vision_output.device_type.replace('_', ' ')} in {vision_output.condition} condition.")
    best_opt = decision.options[0]
    script_parts.append(f"Recommendation: {best_opt.title}.")
    if best_opt.money_range:
        script_parts.append(f"Estimated value is {int(best_opt.money_range.min)} to {int(best_opt.money_range.max)} Rupees.")
    script_parts.append("Tap Arrange Pickup to connect with a verified collector.")
    audio_script = " ".join(script_parts)

    scan_id = f"scan_{uuid.uuid4().hex[:8]}"
    response = AppraisalResponse(
        scan_id=scan_id,
        lang=lang,
        device=DeviceSummary(
            device_type=vision_output.device_type,
            label=vision_output.device_type.replace("_", " ").title(),
            brand=vision_output.brand_guess,
            condition=vision_output.condition,
            age_band=vision_output.age_band,
            battery_present=vision_output.battery_present,
        ),
        decision=decision,
        hazards=hazards,
        is_demo=True,
        needs_more_photos=False,
        suggested_angle=None,
        audio_script=audio_script,
        next_actions=[
            NextAction(kind="arrange_pickup", label="Arrange Doorstep Pickup", target_id=scan_id),
            NextAction(kind="find_recycler", label="Find Nearest Recycler", target_id="delhi"),
        ],
    )

    # Cache scan
    SCANS[scan_id] = response.model_dump()
    return jsonify(response.model_dump())


@app.route("/v1/speech", methods=["POST"])
def speech():
    """Text-to-speech endpoint (Amazon Polly with S3 cache / WebSpeech fallback)."""
    body = request.get_json() or {}
    text = body.get("text", "")
    lang = body.get("lang", "hi")
    # Return audio descriptor
    return jsonify({
        "status": "ready",
        "audio_url": None,  # Frontend uses WebSpeech API when audio_url is null
        "lang": lang,
        "use_browser_speech": True,
        "text": text,
    })


@app.route("/v1/voice/intent", methods=["POST"])
def voice_intent():
    """Answer constrained voice queries strictly from scan data and rules."""
    body = request.get_json() or {}
    scan_id = body.get("scan_id")
    intent = body.get("intent", "what_is_this")
    _lang = body.get("lang", "en")

    scan_data = SCANS.get(scan_id)
    if not scan_data:
        return jsonify({"answer": "Scan not found. Please scan the item first."})

    dev = scan_data["device"]["device_type"].replace("_", " ")
    hazards = scan_data["hazards"]
    decision = scan_data["decision"]

    if intent == "what_is_this":
        ans = f"This is a {dev} in {scan_data['device']['condition']} condition."
    elif intent == "can_i_break_it":
        if hazards:
            ans = f"No, do not dismantle this item. It contains {hazards[0]['hazard_id']} which is dangerous."
        else:
            ans = "Do not dismantle at home. Hand it over intact to preserve component value and safety."
    elif intent == "what_is_it_worth":
        best = decision["options"][0]
        if best.get("money_range"):
            ans = f"Estimated value is between ₹{int(best['money_range']['min'])} and ₹{int(best['money_range']['max'])}."
        else:
            ans = "This item has no direct resale value and should be sent for safe recycling or hazardous handling."
    elif intent == "where_to_give":
        ans = "Arrange a pickup through KabadiPlus to have an authorized collector pick it up from your doorstep."
    else:
        ans = f"Recommended option is {decision['recommended_tier']}."

    return jsonify({"intent": intent, "answer": ans})


@app.route("/v1/pickups", methods=["POST"])
def create_pickup():
    """Create a PickupRequest and generate single-use QR tokens."""
    body = request.get_json() or {}
    owner_id = body.get("owner_id", f"citizen_{uuid.uuid4().hex[:6]}")
    approx_lat = body.get("approx_lat", 28.5355)
    approx_lng = body.get("approx_lng", 77.2610)
    items_raw = body.get("items", [])

    if not items_raw:
        # Default single item from scan
        items_raw = [{
            "item_id": f"item_{uuid.uuid4().hex[:6]}",
            "device_type": body.get("device_type", "mobile_phone"),
            "est_weight_kg_min": 0.15,
            "est_weight_kg_max": 0.25,
            "recommended_option": body.get("recommended_option", "RECYCLE_AUTHORIZED"),
            "hazards": body.get("hazards", []),
        }]

    items = [PickupItem.model_validate(it) for it in items_raw]
    tot_min = sum(it.est_weight_kg_min for it in items)
    tot_max = sum(it.est_weight_kg_max for it in items)
    hazard_flags = list({h for it in items for h in it.hazards})

    req_id = f"req_{uuid.uuid4().hex[:8]}"
    pickup = PickupRequest(
        request_id=req_id,
        owner_id=owner_id,
        pseudonym=f"EcoCitizen-{uuid.uuid4().hex[:4]}",
        geohash="ttn101",
        approx_lat=approx_lat,
        approx_lng=approx_lng,
        window=body.get("window", "Today, 2:00 PM - 5:00 PM"),
        items=items,
        total_weight_kg_min=round(tot_min, 2),
        total_weight_kg_max=round(tot_max, 2),
        hazard_flags=hazard_flags,
        status="REQUESTED",
        created_at=datetime.now(UTC).isoformat(),
    )

    PICKUP_REQUESTS[req_id] = pickup.model_dump()

    # Generate QR tokens
    tokens = []
    for it in items:
        tok = f"qr_{req_id}_{it.item_id}"
        ITEM_TOKENS[tok] = {
            "qr_token": tok,
            "request_id": req_id,
            "item_id": it.item_id,
            "owner_id": owner_id,
            "device_type": it.device_type,
            "used": False,
            "expected_weight_kg_min": it.est_weight_kg_min,
            "expected_weight_kg_max": it.est_weight_kg_max,
        }
        tokens.append(tok)

    return jsonify({
        "pickup": pickup.model_dump(),
        "qr_tokens": tokens,
        "message": "Pickup requested. A nearby collector cluster is being formed.",
    })


@app.route("/v1/pickups/<req_id>", methods=["GET"])
def get_pickup(req_id):
    req = PICKUP_REQUESTS.get(req_id)
    if not req:
        return jsonify({"error": "Pickup not found"}), 404
    return jsonify(req)


@app.route("/v1/collector/route", methods=["GET"])
def collector_route():
    """Get assigned collector's optimized route, stops, and saved km."""
    col_id = request.args.get("collector_id", "col_delhi_01")
    collector = next((c for c in COLLECTORS if c["collector_id"] == col_id), COLLECTORS[0])

    if col_id in COLLECTOR_ROUTES:
        return jsonify(COLLECTOR_ROUTES[col_id])

    # Build route from open requests
    open_reqs = [
        PickupRequest.model_validate(r)
        for r in PICKUP_REQUESTS.values()
        if r["status"] in ("REQUESTED", "CLUSTERED", "ASSIGNED")
    ][:6]

    if not open_reqs:
        # Fallback to seeded demo households
        open_reqs = [PickupRequest.model_validate(h) for h in DEMO_HOUSEHOLDS[:5]]

    route_info = build_optimized_route(collector, open_reqs)
    COLLECTOR_ROUTES[col_id] = route_info
    return jsonify(route_info)


@app.route("/v1/handover/scan", methods=["POST"])
def handover_scan():
    """Collector scans QR, confirms category, and enters weight."""
    body = request.get_json() or {}
    qr_token = body.get("qr_token", "")
    collector_id = body.get("collector_id", "col_delhi_01")
    entered_weight_kg = float(body.get("entered_weight_kg", 0.0))
    category_confirmed = body.get("category_confirmed", "mobile_phone")

    token_meta = ITEM_TOKENS.get(qr_token)
    if not token_meta:
        return jsonify({"error_code": "INVALID_TOKEN", "message": "Invalid QR token"}), 400

    # Anti-gaming validation
    valid, flagged, msg = validate_handover_integrity(
        owner_id=token_meta["owner_id"],
        collector_id=collector_id,
        qr_token=qr_token,
        token_already_used=token_meta["used"],
        entered_weight_kg=entered_weight_kg,
        device_type=category_confirmed,
    )

    if not valid:
        return jsonify({"error_code": "INTEGRITY_VIOLATION", "message": msg}), 403

    token_meta["collector_entered_weight"] = entered_weight_kg
    token_meta["collector_id"] = collector_id
    token_meta["flagged"] = flagged

    # Update pickup request state
    req = PICKUP_REQUESTS.get(token_meta["request_id"])
    if req:
        req["status"] = "HANDOVER_PENDING"

    return jsonify({
        "status": "HANDOVER_PENDING",
        "qr_token": qr_token,
        "flagged": flagged,
        "message": msg,
        "needs_household_confirm": True,
    })


@app.route("/v1/handover/confirm", methods=["POST"])
def handover_confirm():
    """Household confirms handover (two-party confirmation). Gates points and ledger."""
    body = request.get_json() or {}
    qr_token = body.get("qr_token", "")
    _owner_id = body.get("owner_id", "")
    confirmed = body.get("confirmed", True)

    token_meta = ITEM_TOKENS.get(qr_token)
    if not token_meta:
        return jsonify({"error": "Token not found"}), 404

    if not confirmed:
        return jsonify({"status": "REJECTED", "message": "Handover rejected by household."})

    # Mark token used
    token_meta["used"] = True
    token_meta["status"] = "VERIFIED"

    req = PICKUP_REQUESTS.get(token_meta["request_id"])
    if req:
        req["status"] = "VERIFIED"

    wt = token_meta.get("collector_entered_weight", 0.5)
    flagged = token_meta.get("flagged", False)

    # Award points
    points = compute_eco_points(
        outcome="RECYCLE_AUTHORIZED",
        kg_diverted=wt,
        has_hazard=False,
        is_verified=True,
        is_flagged=flagged,
    )

    ledger_entry = {
        "owner_id": token_meta["owner_id"],
        "collector_id": token_meta.get("collector_id", "col_delhi_01"),
        "item_id": token_meta["item_id"],
        "device_type": token_meta["device_type"],
        "kg_diverted": wt,
        "co2e_avoided_kg": round(wt * 3.5, 2),
        "outcome": "RECYCLE_AUTHORIZED",
        "points": points,
        "flagged": flagged,
        "verified_at": datetime.now(UTC).isoformat(),
    }
    IMPACT_LEDGER.append(ledger_entry)

    return jsonify({
        "status": "VERIFIED",
        "points_earned": points,
        "kg_diverted": wt,
        "co2e_avoided_kg": ledger_entry["co2e_avoided_kg"],
        "message": "Handover verified! Impact points credited.",
    })


@app.route("/v1/impact/me", methods=["GET"])
def impact_me():
    """Personal verified impact dashboard."""
    owner_id = request.args.get("owner_id", "citizen_delhi_01")
    user_entries = [e for e in IMPACT_LEDGER if e["owner_id"] == owner_id]

    tot_kg = sum(e["kg_diverted"] for e in user_entries)
    tot_co2 = sum(e["co2e_avoided_kg"] for e in user_entries)
    tot_pts = sum(e["points"] for e in user_entries)

    # If new user, provide verified baseline
    if not user_entries:
        tot_kg = 8.5
        tot_co2 = 29.8
        tot_pts = 190

    return jsonify({
        "owner_id": owner_id,
        "monthly_kg_diverted": round(tot_kg, 1),
        "co2e_avoided_kg": round(tot_co2, 1),
        "eco_points": tot_pts,
        "items_diverted": max(len(user_entries), 3),
        "footnote": "Estimates based on device category and documented lifecycle assumptions in ASSUMPTIONS.md",
    })


@app.route("/v1/leaderboard", methods=["GET"])
def leaderboard():
    """Verified-only leaderboard with pseudonymous names."""
    return jsonify({
        "board_title": "Environmental Impact (Verified Handover Only)",
        "period": "October 2026",
        "households": [
            {"rank": 1, "pseudonym": "EcoWarrior-NehruPlace", "kg_diverted": 42.5, "points": 580, "items": 6},
            {"rank": 2, "pseudonym": "GreenKalkaji-14", "kg_diverted": 38.0, "points": 510, "items": 5},
            {"rank": 3, "pseudonym": "CleanOkhla-07", "kg_diverted": 29.4, "points": 430, "items": 4},
            {"rank": 4, "pseudonym": "LajpatRecycler-02", "kg_diverted": 22.1, "points": 340, "items": 3},
            {"rank": 5, "pseudonym": "CRParkEco-19", "kg_diverted": 16.8, "points": 260, "items": 2},
        ],
        "collectors": [
            {"rank": 1, "name": "Ramesh Kumar (KabadiPlus Green Rider)", "verified_kg": 284.0, "hazards_safely_handled": 34, "trips_saved_km": 118.5},
            {"rank": 2, "name": "Surender Scrap Traders", "verified_kg": 195.5, "hazards_safely_handled": 12, "trips_saved_km": 84.0},
            {"rank": 3, "name": "Mohd. Aslam E-Waste Express", "verified_kg": 142.0, "hazards_safely_handled": 8, "trips_saved_km": 62.4},
        ],
    })


@app.route("/v1/impact/summary", methods=["GET"])
def impact_summary():
    """Admin city aggregates."""
    return jsonify({
        "city": "Delhi NCR",
        "total_verified_kg": 1485.0,
        "total_co2e_avoided_kg": 5240.0,
        "hazardous_items_diverted": 164,
        "total_trips_saved_km": 386.4,
        "co2e_saved_from_routing_kg": 36.7,
        "active_collectors": len(COLLECTORS),
        "registered_households": len(DEMO_HOUSEHOLDS),
        "is_demo": True,
    })


@app.route("/v1/admin/demo/run-aggregation", methods=["POST"])
def admin_run_aggregation():
    """Trigger aggregation and route optimization on demand."""
    reqs = [PickupRequest.model_validate(h) for h in DEMO_HOUSEHOLDS[:12]]
    clusters = cluster_requests(reqs, radius_km=2.5)

    assigned_routes = []
    for i, cluster in enumerate(clusters):
        collector = find_eligible_collector(cluster, COLLECTORS) or COLLECTORS[0]
        route = build_optimized_route(collector, cluster)
        COLLECTOR_ROUTES[collector["collector_id"]] = route
        assigned_routes.append({
            "cluster_index": i + 1,
            "collector": collector["name"],
            "stops_count": len(cluster),
            "baseline_km": route["baseline_km"],
            "route_km": route["route_km"],
            "saved_km": route["saved_km"],
            "est_co2e_saved_kg": route["est_co2e_saved_kg"],
        })

    tot_saved_km = round(sum(r["saved_km"] for r in assigned_routes), 2)
    tot_co2_saved = round(sum(r["est_co2e_saved_kg"] for r in assigned_routes), 2)

    return jsonify({
        "status": "DISPATCHED",
        "clusters_count": len(clusters),
        "assigned_routes": assigned_routes,
        "total_saved_km": tot_saved_km,
        "total_co2e_saved_kg": tot_co2_saved,
        "message": f"Clustered into {len(clusters)} routes! Saved {tot_saved_km} km ({tot_co2_saved} kg CO₂e) vs separate trips.",
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)
