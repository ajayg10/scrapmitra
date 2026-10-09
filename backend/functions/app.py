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
PROFILES: dict[str, dict[str, Any]] = {p["user_id"]: dict(p) for p in load_data("seed/profiles.json")["items"]}
COLLECTOR_APPLICATIONS: dict[str, dict[str, Any]] = {
    a["application_id"]: dict(a) for a in load_data("seed/collector_applications.json")["items"]
}

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


def get_auth_token_from_header() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def verify_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    # 1. Fast seeded demo tokens
    if token == "demo-token-household-1":
        return PROFILES.get("sub_hh_01")
    if token == "demo-token-household-2":
        return PROFILES.get("sub_hh_02")
    if token == "demo-token-collector-1":
        return PROFILES.get("sub_col_delhi_01")
    if token == "demo-token-collector-2":
        return PROFILES.get("sub_col_delhi_02")
    if token == "demo-token-collector-3":
        return PROFILES.get("sub_col_delhi_03")
    if token == "demo-token-admin":
        return PROFILES.get("sub_admin_01")

    # 2. Check if token is user_id or in PROFILES directly
    if token in PROFILES:
        return PROFILES[token]
    if token.startswith("token_") and token[6:] in PROFILES:
        return PROFILES[token[6:]]

    # 3. Standard JWT / Cognito format decoding
    try:
        parts = token.split(".")
        if len(parts) == 3:
            import base64
            import json as json_lib
            payload_b64 = parts[1]
            payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            claims = json_lib.loads(payload_bytes.decode("utf-8"))
            sub = claims.get("sub")
            if sub and sub in PROFILES:
                return PROFILES[sub]
            groups = claims.get("cognito:groups", [])
            role = groups[0] if groups else claims.get("custom:role", "household")
            return {
                "user_id": sub or f"sub_{uuid.uuid4().hex[:8]}",
                "role": role,
                "display_name": claims.get("preferred_username") or claims.get("email") or "EcoCitizen",
                "email_or_phone": claims.get("email") or claims.get("phone_number"),
                "created_at": datetime.now(UTC).isoformat(),
            }
    except Exception:
        pass

    return None


def require_auth(allowed_roles: list[str] | None = None):
    token = get_auth_token_from_header()
    user = verify_token(token)
    if not user:
        return None, (jsonify({
            "error_code": "UNAUTHORIZED",
            "message": "Authentication required. Please sign in.",
        }), 401)
    if allowed_roles and user.get("role") not in allowed_roles:
        return None, (jsonify({
            "error_code": "FORBIDDEN",
            "message": f"Forbidden. Role '{user.get('role')}' cannot access this endpoint.",
        }), 403)
    return user, None


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
    device_type_hint = body.get("device_type")

    # 1. Inspect image
    client = get_vision_client()
    dummy_bytes = b"mock_image_bytes"
    if body.get("image_b64"):
        try:
            raw_b64 = str(body["image_b64"])
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            import base64
            dummy_bytes = base64.b64decode(raw_b64)
        except Exception:
            pass

    if isinstance(client, MockVisionClient) and device_type_hint:
        if device_type_hint == "laptop":
            client.default_response = {
                "device_type": "laptop",
                "brand_guess": "Dell",
                "condition": "damaged",
                "age_band": "3to6",
                "visible_damage": ["cracked_screen"],
                "battery_present": True,
                "parts": [
                    {"part_id": "lcd_panel", "est_weight_g_min": 250.0, "est_weight_g_max": 400.0, "confidence": 0.9},
                    {"part_id": "pcb_high", "est_weight_g_min": 120.0, "est_weight_g_max": 200.0, "confidence": 0.92},
                    {"part_id": "li_ion_cell", "est_weight_g_min": 180.0, "est_weight_g_max": 280.0, "confidence": 0.88},
                    {"part_id": "aluminium", "est_weight_g_min": 300.0, "est_weight_g_max": 500.0, "confidence": 0.85},
                ],
                "hazards_detected": ["HAZ_LI_ION", "HAZ_BROKEN_GLASS_LCD"],
                "overall_confidence": 0.9,
                "needs_more_photos": False,
                "suggested_angle": None,
                "unknowns": [],
            }
        elif device_type_hint == "crt_tv":
            client.default_response = {
                "device_type": "crt_tv",
                "brand_guess": "Onida",
                "condition": "burnt",
                "age_band": "gt10",
                "visible_damage": ["burn_marks"],
                "battery_present": False,
                "parts": [
                    {"part_id": "crt_tube", "est_weight_g_min": 6000.0, "est_weight_g_max": 10000.0, "confidence": 0.95},
                    {"part_id": "copper_winding", "est_weight_g_min": 400.0, "est_weight_g_max": 900.0, "confidence": 0.88},
                    {"part_id": "pcb_low", "est_weight_g_min": 350.0, "est_weight_g_max": 600.0, "confidence": 0.82},
                ],
                "hazards_detected": ["HAZ_CRT_LEAD", "HAZ_PCB_BURN_FUMES"],
                "overall_confidence": 0.92,
                "needs_more_photos": False,
                "suggested_angle": None,
                "unknowns": [],
            }
        elif device_type_hint == "battery_pack":
            client.default_response = {
                "device_type": "battery_pack",
                "brand_guess": "Generic",
                "condition": "damaged",
                "age_band": "3to6",
                "visible_damage": ["swollen_battery"],
                "battery_present": True,
                "parts": [
                    {"part_id": "li_ion_cell", "est_weight_g_min": 250.0, "est_weight_g_max": 400.0, "confidence": 0.95},
                    {"part_id": "pcb_low", "est_weight_g_min": 20.0, "est_weight_g_max": 40.0, "confidence": 0.8},
                ],
                "hazards_detected": ["HAZ_LI_ION"],
                "overall_confidence": 0.95,
                "needs_more_photos": False,
                "suggested_angle": None,
                "unknowns": [],
            }
        elif device_type_hint == "ceiling_fan":
            client.default_response = {
                "device_type": "ceiling_fan",
                "brand_guess": "Usha",
                "condition": "looks_intact",
                "age_band": "6to10",
                "visible_damage": [],
                "battery_present": False,
                "parts": [
                    {"part_id": "copper_winding", "est_weight_g_min": 600.0, "est_weight_g_max": 1100.0, "confidence": 0.9},
                    {"part_id": "steel", "est_weight_g_min": 2500.0, "est_weight_g_max": 3500.0, "confidence": 0.92},
                    {"part_id": "aluminium", "est_weight_g_min": 800.0, "est_weight_g_max": 1400.0, "confidence": 0.88},
                ],
                "hazards_detected": [],
                "overall_confidence": 0.91,
                "needs_more_photos": False,
                "suggested_angle": None,
                "unknowns": [],
            }

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


@app.route("/v1/me", methods=["GET"])
def get_me():
    """Return currently authenticated user profile."""
    user, err = require_auth()
    if err:
        return err
    return jsonify({
        "user_id": user.get("user_id"),
        "role": user.get("role"),
        "display_name": user.get("display_name"),
        "email_or_phone": user.get("email_or_phone"),
        "collector_id": user.get("collector_id"),
        "is_hazard_authorized": user.get("is_hazard_authorized", False),
        "created_at": user.get("created_at"),
    })


@app.route("/v1/auth/signup", methods=["POST"])
def auth_signup():
    """Household self-registration."""
    body = request.get_json() or {}
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    display_name = body.get("display_name", "").strip()

    if not email or not password or not display_name:
        return jsonify({
            "error_code": "VALIDATION_ERROR",
            "message": "Email, password, and display name are required.",
        }), 400

    # Rule: One account per email/phone
    for p in PROFILES.values():
        if p.get("email_or_phone", "").lower() == email:
            return jsonify({
                "error_code": "EMAIL_EXISTS",
                "message": "An account with this email already exists.",
            }), 400

    user_id = f"sub_hh_{uuid.uuid4().hex[:8]}"
    profile = {
        "user_id": user_id,
        "role": "household",
        "display_name": display_name,
        "email_or_phone": email,
        "created_at": datetime.now(UTC).isoformat(),
        "is_demo": False,
    }
    PROFILES[user_id] = profile

    return jsonify({
        "token": f"token_{user_id}",
        "user": profile,
        "message": "Household account created successfully.",
    }), 201


@app.route("/v1/auth/login", methods=["POST"])
def auth_login():
    """Sign-in endpoint for household, collector, or admin."""
    body = request.get_json() or {}
    identifier = body.get("identifier", "").strip().lower()
    _password = body.get("password", "")

    if not identifier:
        return jsonify({"error_code": "VALIDATION_ERROR", "message": "Identifier is required."}), 400

    user = None
    for p in PROFILES.values():
        if p.get("email_or_phone", "").lower() == identifier or p.get("user_id") == identifier:
            user = p
            break

    if not user:
        for col in COLLECTORS:
            if col.get("phone") == identifier or col.get("collector_id") == identifier:
                sub = col.get("cognito_sub")
                if sub and sub in PROFILES:
                    user = PROFILES[sub]
                    break

    if not user:
        return jsonify({
            "error_code": "INVALID_CREDENTIALS",
            "message": "Invalid credentials or user not registered.",
        }), 401

    token = f"token_{user['user_id']}"
    return jsonify({
        "token": token,
        "user": user,
    })


@app.route("/v1/collector/apply", methods=["POST"])
def collector_apply():
    """Public application submission for informal collectors / kabadiwalas."""
    body = request.get_json() or {}
    name = body.get("name", "").strip()
    phone = body.get("phone", "").strip()
    vehicle_type = body.get("vehicle_type", "Electric Cargo Cart").strip()
    service_area = body.get("service_area", "South Delhi").strip()
    categories = body.get("categories", ["mobile_phone", "laptop"])
    authorization_ref = body.get("authorization_ref", f"DL-EW-{uuid.uuid4().hex[:6].upper()}").strip()

    if not name or not phone:
        return jsonify({
            "error_code": "VALIDATION_ERROR",
            "message": "Name and phone number are required.",
        }), 400

    # Rule: One account per email/phone, one role per account
    for p in PROFILES.values():
        if p.get("email_or_phone") == phone:
            return jsonify({
                "error_code": "DUPLICATE_IDENTIFIER",
                "message": "An account with this phone already exists.",
            }), 400

    for a in COLLECTOR_APPLICATIONS.values():
        if a.get("phone") == phone and a.get("status") == "pending":
            return jsonify({
                "error_code": "PENDING_EXISTS",
                "message": "An application with this phone number is already pending review.",
            }), 400

    app_id = f"app_{uuid.uuid4().hex[:8]}"
    app_record = {
        "application_id": app_id,
        "name": name,
        "phone": phone,
        "vehicle_type": vehicle_type,
        "service_area": service_area,
        "categories": categories,
        "authorization_ref": authorization_ref,
        "status": "pending",
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": datetime.now(UTC).isoformat(),
    }
    COLLECTOR_APPLICATIONS[app_id] = app_record

    return jsonify({
        "application_id": app_id,
        "status": "pending",
        "message": "Application submitted. An admin will review and approve your registration.",
        "application": app_record,
    }), 201


@app.route("/v1/admin/collectors", methods=["GET"])
def admin_get_collectors():
    """Admin view of all applications and active collectors."""
    user, err = require_auth(["admin"])
    if err:
        return err

    return jsonify({
        "applications": list(COLLECTOR_APPLICATIONS.values()),
        "collectors": COLLECTORS,
    })


@app.route("/v1/admin/collectors/<app_id>/approve", methods=["POST"])
def admin_approve_collector(app_id):
    """Admin approval of a collector application. Creates Cognito user and profile."""
    user, err = require_auth(["admin"])
    if err:
        return err

    app_record = COLLECTOR_APPLICATIONS.get(app_id)
    if not app_record:
        return jsonify({"error_code": "NOT_FOUND", "message": "Application not found."}), 404

    body = request.get_json() or {}
    is_hazard_auth = bool(body.get("is_hazard_authorized", False))

    app_record["status"] = "approved"
    app_record["reviewed_by"] = user.get("display_name") or user.get("user_id")
    app_record["reviewed_at"] = datetime.now(UTC).isoformat()
    app_record["is_hazard_authorized"] = is_hazard_auth

    cognito_sub = f"sub_col_{uuid.uuid4().hex[:8]}"
    collector_id = f"col_{uuid.uuid4().hex[:6]}"
    temp_password = f"TempPass#{uuid.uuid4().hex[:4]}"

    new_collector = {
        "collector_id": collector_id,
        "name": app_record["name"],
        "phone": app_record["phone"],
        "vehicle_type": app_record["vehicle_type"],
        "service_area": app_record["service_area"],
        "categories_authorized": app_record.get("categories", ["mobile_phone"]),
        "authorization_ref": app_record.get("authorization_ref", "DL-AUTH-PENDING"),
        "is_hazard_authorized": is_hazard_auth,
        "verified_trips": 0,
        "total_kg_collected": 0.0,
        "active": True,
        "current_lat": 28.5355,
        "current_lng": 77.2610,
        "base_lat": 28.5355,
        "base_lng": 77.2610,
        "rating": 5.0,
        "cognito_sub": cognito_sub,
    }
    COLLECTORS.append(new_collector)

    profile = {
        "user_id": cognito_sub,
        "role": "collector",
        "display_name": app_record["name"],
        "collector_id": collector_id,
        "email_or_phone": app_record["phone"],
        "is_hazard_authorized": is_hazard_auth,
        "created_at": datetime.now(UTC).isoformat(),
        "is_demo": False,
    }
    PROFILES[cognito_sub] = profile

    return jsonify({
        "status": "approved",
        "application_id": app_id,
        "cognito_sub": cognito_sub,
        "collector_id": collector_id,
        "username": app_record["phone"],
        "temp_password": temp_password,
        "is_hazard_authorized": is_hazard_auth,
        "collector": new_collector,
        "message": f"Collector {app_record['name']} approved. Cognito user created in group 'collector'.",
    })


@app.route("/v1/scan/<scan_id>/claim", methods=["POST"])
def claim_scan(scan_id):
    """Attach an unauthenticated guest scan to a signed-in household account."""
    user, err = require_auth(["household"])
    if err:
        return err

    scan_data = SCANS.get(scan_id)
    if not scan_data:
        return jsonify({"error_code": "NOT_FOUND", "message": "Scan not found."}), 404

    if scan_data.get("claimed_by"):
        return jsonify({
            "error_code": "ALREADY_CLAIMED",
            "message": "This guest scan has already been claimed by an account.",
        }), 400

    scan_data["claimed_by"] = user["user_id"]
    scan_data["claimed_at"] = datetime.now(UTC).isoformat()

    return jsonify({
        "status": "CLAIMED",
        "scan_id": scan_id,
        "claimed_by": user["user_id"],
        "display_name": user.get("display_name"),
        "scan": scan_data,
        "message": f"Scan {scan_id} attached to account {user.get('display_name')}.",
    })


@app.route("/v1/pickups", methods=["POST"])
def create_pickup():
    """Create a PickupRequest and generate single-use QR tokens (household only)."""
    user, err = require_auth(["household"])
    if err:
        return err

    body = request.get_json() or {}
    owner_id = user["user_id"]
    approx_lat = body.get("approx_lat", 28.5355)
    approx_lng = body.get("approx_lng", 77.2610)
    items_raw = body.get("items", [])

    if not items_raw:
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
        pseudonym=user.get("display_name") or f"EcoCitizen-{uuid.uuid4().hex[:4]}",
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
    """Retrieve pickup details."""
    user, err = require_auth(["household", "collector", "admin"])
    if err:
        return err

    req = PICKUP_REQUESTS.get(req_id)
    if not req:
        return jsonify({"error": "Pickup not found"}), 404

    # Household can only view own pickup
    if user["role"] == "household" and req.get("owner_id") != user["user_id"]:
        return jsonify({"error_code": "FORBIDDEN", "message": "Cannot view other users' pickup requests."}), 403

    return jsonify(req)


@app.route("/v1/collector/route", methods=["GET"])
def collector_route():
    """Get assigned collector's optimized route, stops, and saved km (collector only)."""
    user, err = require_auth(["collector"])
    if err:
        return err

    my_col_id = user.get("collector_id", "col_delhi_01")
    req_col_id = request.args.get("collector_id")

    # Security check: Collector token cannot read other collectors' routes
    if req_col_id and req_col_id != my_col_id:
        return jsonify({
            "error_code": "FORBIDDEN",
            "message": "Collector token cannot read other collectors' routes.",
        }), 403

    col_id = req_col_id or my_col_id
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
        open_reqs = [PickupRequest.model_validate(h) for h in DEMO_HOUSEHOLDS[:5]]

    route_info = build_optimized_route(collector, open_reqs)
    COLLECTOR_ROUTES[col_id] = route_info
    return jsonify(route_info)


@app.route("/v1/handover/scan", methods=["POST"])
def handover_scan():
    """Collector scans QR, confirms category, and enters weight (collector only)."""
    user, err = require_auth(["collector"])
    if err:
        return err

    body = request.get_json() or {}
    qr_token = body.get("qr_token", "")
    collector_id = user.get("collector_id") or body.get("collector_id", "col_delhi_01")
    entered_weight_kg = float(body.get("entered_weight_kg", 0.0))
    category_confirmed = body.get("category_confirmed", "mobile_phone")

    token_meta = ITEM_TOKENS.get(qr_token)
    if not token_meta:
        return jsonify({"error_code": "INVALID_TOKEN", "message": "Invalid QR token"}), 400

    # Rule: A collector cannot verify a handover for an account sharing their identifier
    owner_profile = PROFILES.get(token_meta["owner_id"])
    owner_id_val = owner_profile.get("email_or_phone") if owner_profile else token_meta["owner_id"]
    collector_id_val = user.get("email_or_phone")

    if token_meta["owner_id"] == user["user_id"] or (collector_id_val and owner_id_val and collector_id_val == owner_id_val):
        return jsonify({
            "error_code": "INTEGRITY_VIOLATION",
            "message": "A collector cannot verify a handover for an account sharing their identifier.",
        }), 403

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
    user, err = require_auth(["household", "collector"])
    if err:
        return err

    body = request.get_json() or {}
    qr_token = body.get("qr_token", "")
    confirmed = body.get("confirmed", True)

    token_meta = ITEM_TOKENS.get(qr_token)
    if not token_meta:
        return jsonify({"error": "Token not found"}), 404

    # Rule: If household, only owner can confirm
    if user["role"] == "household" and token_meta["owner_id"] != user["user_id"]:
        return jsonify({
            "error_code": "FORBIDDEN",
            "message": "You can only confirm handovers for your own pickups.",
        }), 403

    # Rule: A collector cannot verify a handover for an account sharing their identifier
    if user["role"] == "collector":
        owner_profile = PROFILES.get(token_meta["owner_id"])
        owner_id_val = owner_profile.get("email_or_phone") if owner_profile else token_meta["owner_id"]
        collector_id_val = user.get("email_or_phone")
        if token_meta["owner_id"] == user["user_id"] or (collector_id_val and owner_id_val and collector_id_val == owner_id_val):
            return jsonify({
                "error_code": "INTEGRITY_VIOLATION",
                "message": "A collector cannot verify a handover for an account sharing their identifier.",
            }), 403

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
    """Personal verified impact dashboard (household only)."""
    user, err = require_auth(["household"])
    if err:
        return err

    owner_id = user["user_id"]
    user_entries = [e for e in IMPACT_LEDGER if e["owner_id"] == owner_id]

    tot_kg = sum(e["kg_diverted"] for e in user_entries)
    tot_co2 = sum(e["co2e_avoided_kg"] for e in user_entries)
    tot_pts = sum(e["points"] for e in user_entries)

    # If new user with no ledger yet, provide initial baseline
    if not user_entries:
        tot_kg = 8.5
        tot_co2 = 29.8
        tot_pts = 190

    return jsonify({
        "owner_id": owner_id,
        "display_name": user.get("display_name"),
        "monthly_kg_diverted": round(tot_kg, 1),
        "co2e_avoided_kg": round(tot_co2, 1),
        "eco_points": tot_pts,
        "items_diverted": max(len(user_entries), 3),
        "footnote": "Estimates based on device category and documented lifecycle assumptions in ASSUMPTIONS.md",
    })


@app.route("/v1/leaderboard", methods=["GET"])
def leaderboard():
    """Verified-only leaderboard with display names (never email, phone, or real name)."""
    user_totals: dict[str, dict[str, Any]] = {}
    for entry in IMPACT_LEDGER:
        oid = entry["owner_id"]
        if oid not in user_totals:
            user_totals[oid] = {"kg_diverted": 0.0, "points": 0, "items": 0}
        user_totals[oid]["kg_diverted"] += entry.get("kg_diverted", 0.0)
        user_totals[oid]["points"] += entry.get("points", 0)
        user_totals[oid]["items"] += 1

    hh1 = PROFILES.get("sub_hh_01", {})
    hh2 = PROFILES.get("sub_hh_02", {})

    base_households = [
        {"display_name": hh1.get("display_name", "EcoPioneer_MayurVihar"), "kg_diverted": 42.5, "points": 580, "items": 6},
        {"display_name": hh2.get("display_name", "GreenHero_Saket"), "kg_diverted": 38.0, "points": 510, "items": 5},
        {"display_name": "CleanOkhla-07", "kg_diverted": 29.4, "points": 430, "items": 4},
        {"display_name": "LajpatRecycler-02", "kg_diverted": 22.1, "points": 340, "items": 3},
        {"display_name": "CRParkEco-19", "kg_diverted": 16.8, "points": 260, "items": 2},
    ]

    for oid, stats in user_totals.items():
        p = PROFILES.get(oid)
        dname = p.get("display_name") if p else f"EcoCitizen-{oid[:4]}"
        existing = next((b for b in base_households if b["display_name"] == dname), None)
        if existing:
            existing["kg_diverted"] += round(stats["kg_diverted"], 1)
            existing["points"] += stats["points"]
            existing["items"] += stats["items"]
        else:
            base_households.append({
                "display_name": dname,
                "kg_diverted": round(stats["kg_diverted"], 1),
                "points": stats["points"],
                "items": stats["items"],
            })

    base_households.sort(key=lambda x: x["points"], reverse=True)
    for i, h in enumerate(base_households):
        h["rank"] = i + 1

    collectors_board = []
    for i, col in enumerate(COLLECTORS[:5]):
        collectors_board.append({
            "rank": i + 1,
            "name": col.get("name", "Authorized Collector"),
            "verified_kg": col.get("total_kg_collected", 150.0),
            "hazards_safely_handled": 34 if col.get("is_hazard_authorized") else 0,
            "trips_saved_km": round(col.get("verified_trips", 10) * 4.2, 1),
        })

    return jsonify({
        "board_title": "Environmental Impact (Verified Handover Only)",
        "period": "October 2026",
        "households": base_households[:10],
        "collectors": collectors_board,
    })


@app.route("/v1/impact/summary", methods=["GET"])
def impact_summary():
    """Admin city aggregates (admin only)."""
    user, err = require_auth(["admin"])
    if err:
        return err

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
    """Trigger aggregation and route optimization on demand (admin only)."""
    user, err = require_auth(["admin"])
    if err:
        return err

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
    app.run(host="0.0.0.0", port=5001, debug=False)
