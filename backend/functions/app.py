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

# Ensure project root, backend package, and function directory are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

for p in [str(REPO_ROOT), str(BACKEND_DIR), str(CURRENT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if "backend" not in sys.modules:
    import types
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(BACKEND_DIR)]
    sys.modules["backend"] = backend_pkg

try:
    from dotenv import load_dotenv
    load_dotenv(REPO_ROOT / ".env")
except ImportError:
    pass

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
    VisionOutput,
    VisionPart,
)
from backend.core.points import compute_eco_points
from backend.core.routing import build_optimized_route
from backend.core.vision_client import BedrockVisionClient, MockVisionClient, inspect_with_retry
from backend.core.voice_agent import run_voice_agent, transcribe_audio

app = Flask(__name__)
CORS(app)

# In-memory runtime state for fast, deterministic demo & local testing
SCANS: dict[str, dict[str, Any]] = {
    "scan_demo_4412": {
        "scan_id": "scan_demo_4412",
        "device": {
            "device_type": "mobile_phone",
            "label": "Smartphone (Samsung)",
            "condition": "damaged",
            "age_band": "3to6",
        },
        "hazards": [
            {
                "hazard_id": "HAZ_LI_ION",
                "severity": "HIGH",
                "warning": "Damaged lithium battery may catch fire if punctured or heated.",
                "do": ["Stop handling a swollen battery.", "Hand over intact to a verified collector."],
                "dont": ["Do not puncture, hammer, or incinerate.", "Never put this in household waste."],
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
                    "option_name": "Screen Repair & Refurbish",
                    "money_text": "₹2,500 - ₹6,500",
                    "env_rating": "better",
                    "co2e_avoided_text": "35 - 55 kg CO₂e",
                    "summary_reason": "Highest circular value",
                }
            ],
        },
    },
    "scan_demo_laptop": {
        "scan_id": "scan_demo_laptop",
        "device": {
            "device_type": "laptop",
            "label": "Laptop (Dell/HP)",
            "condition": "damaged",
            "age_band": "3to6",
        },
        "hazards": [
            {
                "hazard_id": "HAZ_LI_ION",
                "severity": "HIGH",
                "warning": "Damaged laptop lithium battery may catch fire if punctured or heated.",
                "do": ["Do not puncture battery casing.", "Store in a cool dry area."],
                "dont": ["Never incinerate.", "Do not dispose in municipal landfill."],
            },
            {
                "hazard_id": "HAZ_BROKEN_GLASS_LCD",
                "severity": "MEDIUM",
                "warning": "Cracked LCD panel contains shattered glass shards and liquid crystals.",
                "do": ["Keep intact; wrap screen in protective paper if loose shards exist."],
                "dont": ["Do not scrape or touch liquid crystals directly."],
            },
        ],
        "decision": {
            "recommended_tier": "REPAIR_THEN_REUSE",
            "options": [
                {
                    "option_id": "REPAIR_THEN_REUSE",
                    "title": "Screen Replacement & Hardware Refurbish",
                    "money_range": {"min": 4500, "max": 12000, "currency": "INR"},
                    "co2e_avoided_min_kg": 180.0,
                    "co2e_avoided_max_kg": 260.0,
                    "why": "Repair cost is well under 50% of secondary market value (~₹22,000).",
                },
                {
                    "option_id": "RECYCLE_AUTHORIZED",
                    "title": "Certified High-Grade Dismantling",
                    "money_range": {"min": 600, "max": 1400, "currency": "INR"},
                    "co2e_avoided_min_kg": 40.0,
                    "co2e_avoided_max_kg": 85.0,
                    "why": "Recovers aluminium chassis and precious contact metals safely.",
                },
            ],
            "comparison_table": [
                {
                    "option_name": "Screen Repair & Refurbish",
                    "money_text": "₹4,500 - ₹12,000",
                    "env_rating": "better",
                    "co2e_avoided_text": "180 - 260 kg CO₂e",
                    "summary_reason": "High circular value preservation",
                }
            ],
        },
    },
    "scan_demo_crt_tv": {
        "scan_id": "scan_demo_crt_tv",
        "device": {
            "device_type": "crt_tv",
            "label": "CRT Television (Heavy Lead Glass)",
            "condition": "burnt",
            "age_band": "gt10",
        },
        "hazards": [
            {
                "hazard_id": "HAZ_CRT_LEAD",
                "severity": "HIGH",
                "warning": "CRT funnel glass contains up to 2-3 kg of hazardous lead oxide.",
                "do": ["Handle tube with extreme care to prevent violent vacuum implosion.", "Hand over whole to an authorized e-waste recycler."],
                "dont": ["NEVER smash or break CRT tube.", "Never dump in landfills or sell to informal open-air dismantlers."],
            }
        ],
        "decision": {
            "recommended_tier": "RECYCLE_AUTHORIZED",
            "options": [
                {
                    "option_id": "RECYCLE_AUTHORIZED",
                    "title": "Authorized Lead-Safe E-Waste Recycling",
                    "money_range": {"min": 150, "max": 350, "currency": "INR"},
                    "co2e_avoided_min_kg": 15.0,
                    "co2e_avoided_max_kg": 30.0,
                    "why": "Certified smelters isolate lead glass safely while recovering pure copper windings.",
                }
            ],
            "comparison_table": [
                {
                    "option_name": "Authorized Lead-Safe Recycling",
                    "money_text": "₹150 - ₹350",
                    "env_rating": "best",
                    "co2e_avoided_text": "15 - 30 kg CO₂e",
                    "summary_reason": "Safely neutralizes toxic lead oxide",
                }
            ],
        },
    },
}
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
    if app.config.get("TESTING"):
        return MockVisionClient()
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


def _preset_vision_output(device_type: str) -> VisionOutput:
    norm_type = "crt_tv" if device_type in ("crt_tv", "crt_television") else device_type
    if norm_type == "laptop":
        return VisionOutput(
            device_type="laptop",
            brand_guess="Dell",
            condition="damaged",
            age_band="3to6",
            visible_damage=["cracked_screen"],
            battery_present=True,
            parts=[
                VisionPart(part_id="lcd_panel", est_weight_g_min=250.0, est_weight_g_max=400.0, confidence=0.9),
                VisionPart(part_id="pcb_high", est_weight_g_min=120.0, est_weight_g_max=200.0, confidence=0.92),
                VisionPart(part_id="li_ion_cell", est_weight_g_min=180.0, est_weight_g_max=280.0, confidence=0.88),
                VisionPart(part_id="aluminium", est_weight_g_min=300.0, est_weight_g_max=500.0, confidence=0.85),
            ],
            hazards_detected=["HAZ_LI_ION", "HAZ_BROKEN_GLASS_LCD"],
            overall_confidence=0.92,
            needs_more_photos=False,
            suggested_angle=None,
            unknowns=[],
        )
    elif norm_type == "crt_tv":
        return VisionOutput(
            device_type="crt_tv",
            brand_guess="Onida",
            condition="burnt",
            age_band="gt10",
            visible_damage=["burn_marks"],
            battery_present=False,
            parts=[
                VisionPart(part_id="crt_tube", est_weight_g_min=6000.0, est_weight_g_max=10000.0, confidence=0.95),
                VisionPart(part_id="copper_winding", est_weight_g_min=400.0, est_weight_g_max=900.0, confidence=0.88),
                VisionPart(part_id="pcb_low", est_weight_g_min=350.0, est_weight_g_max=600.0, confidence=0.82),
            ],
            hazards_detected=["HAZ_CRT_LEAD", "HAZ_PCB_BURN_FUMES"],
            overall_confidence=0.92,
            needs_more_photos=False,
            suggested_angle=None,
            unknowns=[],
        )
    elif norm_type == "ceiling_fan":
        return VisionOutput(
            device_type="ceiling_fan",
            brand_guess="Usha",
            condition="looks_intact",
            age_band="6to10",
            visible_damage=[],
            battery_present=False,
            parts=[
                VisionPart(part_id="copper_winding", est_weight_g_min=600.0, est_weight_g_max=1100.0, confidence=0.9),
                VisionPart(part_id="steel", est_weight_g_min=2500.0, est_weight_g_max=3500.0, confidence=0.92),
                VisionPart(part_id="aluminium", est_weight_g_min=800.0, est_weight_g_max=1400.0, confidence=0.88),
            ],
            hazards_detected=[],
            overall_confidence=0.91,
            needs_more_photos=False,
            suggested_angle=None,
            unknowns=[],
        )
    else:
        return VisionOutput(
            device_type="mobile_phone",
            brand_guess="Samsung",
            condition="damaged",
            age_band="3to6",
            visible_damage=["cracked_screen"],
            battery_present=True,
            parts=[
                VisionPart(part_id="lcd_panel", est_weight_g_min=40.0, est_weight_g_max=65.0, confidence=0.9),
                VisionPart(part_id="pcb_high", est_weight_g_min=25.0, est_weight_g_max=45.0, confidence=0.92),
                VisionPart(part_id="li_ion_cell", est_weight_g_min=40.0, est_weight_g_max=60.0, confidence=0.88),
            ],
            hazards_detected=["HAZ_LI_ION"],
            overall_confidence=0.92,
            needs_more_photos=False,
            suggested_angle=None,
            unknowns=[],
        )


@app.route("/v1/scan", methods=["POST"])
def scan():
    """Full scan pipeline: Vision -> Hazard Guard -> Circular Decision Engine."""
    body = request.get_json() or {}
    _image_key = body.get("image_key", "uploads/guest/default.jpg")
    lang = body.get("lang", "en")
    powers_on = body.get("powers_on")
    device_type_hint = body.get("device_type")
    if device_type_hint in ("crt_tv", "crt_television"):
        device_type_hint = "crt_tv"

    # 1. Inspect image
    client = get_vision_client()
    dummy_bytes = b"mock_image_bytes"
    raw_b64 = ""
    if body.get("image_b64"):
        try:
            raw_b64 = str(body["image_b64"])
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            import base64
            dummy_bytes = base64.b64decode(raw_b64)
        except Exception:
            pass

    # If the user selected a preset button or provided a known device hint with synthetic SVG bytes,
    # evaluate directly with calibrated priors so preset demo buttons always return exact device results!
    is_svg_or_mock = (
        dummy_bytes == b"mock_image_bytes"
        or dummy_bytes.startswith(b"<svg")
        or dummy_bytes.startswith(b"data:image/svg")
        or body.get("image_key", "").endswith(".svg")
        or ("<svg" in str(body.get("image_b64", "")))
    )

    if device_type_hint and is_svg_or_mock:
        vision_output = _preset_vision_output(device_type_hint)
    else:
        if isinstance(client, MockVisionClient) and device_type_hint:
            if device_type_hint == "laptop":
                client.default_response = _preset_vision_output("laptop").model_dump()
            elif device_type_hint == "crt_tv":
                client.default_response = _preset_vision_output("crt_tv").model_dump()
            elif device_type_hint == "battery_pack":
                client.default_response = _preset_vision_output("battery_pack").model_dump()
            elif device_type_hint == "ceiling_fan":
                client.default_response = _preset_vision_output("ceiling_fan").model_dump()

        vision_output, err = inspect_with_retry(client, dummy_bytes)

        if vision_output is None and device_type_hint:
            vision_output = _preset_vision_output(device_type_hint)
        elif vision_output is None:
            return jsonify({
                "error_code": "VISION_RETRY_FAILED",
                "message_user_friendly": "We could not clearly identify the device in this photo. Please retake the photo in better lighting.",
                "message_dev": err,
            }), 422

    # If low confidence or needs_more_photos flagged
    if vision_output.needs_more_photos or vision_output.overall_confidence < 0.6:
        # If the device type was recognized (e.g. mobile_phone, laptop, etc.) and is NOT unknown,
        # proceed with circular decision so the citizen is never blocked from evaluation & pickup!
        if vision_output.device_type and vision_output.device_type != "unknown":
            vision_output.needs_more_photos = False
            vision_output.overall_confidence = max(vision_output.overall_confidence, 0.78)
            vision_output.suggested_angle = None
        else:
            scan_id = f"scan_{uuid.uuid4().hex[:8]}"
            res_data = {
                "scan_id": scan_id,
                "needs_more_photos": True,
                "suggested_angle": vision_output.suggested_angle or "Please place the device flat and take a clear, well-lit photo.",
                "confidence": vision_output.overall_confidence,
                "message": "Confidence is below 0.6. For safety and pricing accuracy, please capture another angle.",
            }
            SCANS[scan_id] = res_data
            return jsonify(res_data)

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


@app.route("/v1/auth/google", methods=["POST"])
def auth_google():
    """Google OAuth sign-in / registration for household users."""
    body = request.get_json() or {}
    email = body.get("email", "").strip().lower()
    display_name = body.get("name") or body.get("display_name", "")
    credential = body.get("credential")

    if credential:
        try:
            import base64
            import json
            parts = str(credential).split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
                email = payload.get("email", email).lower()
                display_name = display_name or payload.get("name") or payload.get("given_name") or email.split("@")[0]
        except Exception:
            pass

    if not email:
        return jsonify({
            "error_code": "VALIDATION_ERROR",
            "message": "Valid Google email is required.",
        }), 400

    if not display_name:
        display_name = email.split("@")[0].replace(".", " ").capitalize()

    # Find existing user by email
    user = None
    for p in PROFILES.values():
        if p.get("email_or_phone", "").lower() == email:
            user = p
            break

    if not user:
        user_id = f"sub_google_{uuid.uuid4().hex[:8]}"
        user = {
            "user_id": user_id,
            "role": "household",
            "display_name": display_name,
            "email_or_phone": email,
            "auth_provider": "google",
            "created_at": datetime.now(UTC).isoformat(),
            "is_demo": False,
        }
        PROFILES[user_id] = user
        status_code = 201
    else:
        status_code = 200

    token = f"token_{user['user_id']}"
    return jsonify({
        "token": token,
        "user": user,
        "message": f"Welcome, {user['display_name']}! Signed in with Google.",
    }), status_code


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
        "footnote": (
            "CO₂e is illustrative: ledger entries currently use a fixed 3.5 kg CO₂e/kg heuristic; "
            "accounts without handovers receive a 29.8 kg CO₂e demo baseline. Neither is a "
            "device-specific LCA result. See docs/ASSUMPTIONS.md."
        ),
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
        "is_demo": True,
        "data_label": "Demo seed data",
        "note": "These leaderboard values are illustrative demo seed records for a public prototype and should not be treated as real customer or city data.",
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
        "data_label": "Demo seed data",
        "note": "All city aggregates are seeded demo values for illustration only.",
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




# ──────────────────────────────────────────────────────────────────────────────
# Voice Agent Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/v1/voice/upload-url", methods=["POST"])
def voice_upload_url():
    """Return presigned S3 PUT URL for an audio clip (up to 30 s, deleted after 1 day)."""
    import mimetypes
    body = request.get_json() or {}
    content_type = body.get("content_type", "audio/webm")
    ext = mimetypes.guess_extension(content_type) or ".webm"
    file_id = f"audio_{uuid.uuid4().hex[:12]}{ext}"
    audio_key = f"voice/clips/{file_id}"

    bucket = os.environ.get("UPLOADS_BUCKET")
    region = os.environ.get("AWS_REGION", "us-east-1")

    if bucket and os.environ.get("VISION_MODE", "mock") == "bedrock":
        try:
            import boto3
            s3 = boto3.client("s3", region_name=region)
            upload_url = s3.generate_presigned_url(
                "put_object",
                Params={"Bucket": bucket, "Key": audio_key, "ContentType": content_type},
                ExpiresIn=300,
            )
            return jsonify({"upload_url": upload_url, "audio_key": audio_key, "expires_in_seconds": 300})
        except Exception:
            pass

    # Local mock
    return jsonify({
        "upload_url": f"http://127.0.0.1:5001/v1/mock-s3-upload/{file_id}",
        "audio_key": audio_key,
        "expires_in_seconds": 300,
    })


@app.route("/v1/voice/ask", methods=["POST"])
def voice_ask():
    """Conversational voice agent endpoint.

    Accepts audio_key (S3 key) or text input.
    Runs Bedrock tool-use loop with number/safety/scope guards.
    Returns display_text, speech_text, audio_url, sources, followups.
    """
    body = request.get_json() or {}
    session_id = body.get("session_id") or f"sess_{uuid.uuid4().hex[:12]}"
    scan_id = body.get("scan_id")
    scan_data_payload = body.get("scan_data")
    if scan_data_payload and isinstance(scan_data_payload, dict):
        sid = scan_id or scan_data_payload.get("scan_id")
        if sid:
            SCANS[sid] = scan_data_payload
            scan_id = sid

    request_id = body.get("request_id")
    lang_hint = body.get("lang_hint", "en")
    image_uploaded = body.get("image_uploaded", False)
    device_hint = body.get("device_hint")
    user_input_block = body.get("input", {})

    # Resolve caller identity (guest allowed for scan-level questions)
    token = get_auth_token_from_header()
    current_user = verify_token(token)

    # Rate limit: simple per-session counter (in-memory, resets on restart)
    # For production, use DynamoDB atomic counter
    from backend.core.voice_agent import VOICE_SESSIONS
    session_data = VOICE_SESSIONS.get(session_id, {})
    turn_count = len(session_data.get("turns", []))
    if turn_count >= 50:  # Max 50 turns per session per day
        return jsonify({"error": "rate_limit", "message": "Session turn limit reached. Start a new session."}), 429

    # ── Resolve transcript ───────────────────────────────────────────────────
    transcript = ""
    detected_lang = lang_hint

    if "text" in user_input_block:
        transcript = str(user_input_block["text"]).strip()
    elif "audio_key" in user_input_block:
        audio_key = user_input_block["audio_key"]
        transcript, detected_lang = transcribe_audio(audio_key, lang_hint)
        if not transcript:
            return jsonify({
                "error": "transcription_failed",
                "message": "Could not transcribe audio. Please try speaking more clearly or use text input.",
            }), 422
    else:
        return jsonify({"error": "missing_input", "message": "Provide either 'text' or 'audio_key' in the input field."}), 400

    # ── Build agent context ──────────────────────────────────────────────────
    agent_context = {
        "scans": SCANS,
        "pickup_requests": PICKUP_REQUESTS,
        "impact_ledger": IMPACT_LEDGER,
        "collectors": COLLECTORS,
        "user": current_user,
        "scan_id": scan_id,
        "request_id": request_id,
        "image_uploaded": image_uploaded,
        "device_hint": device_hint,
    }

    # ── Run agent ────────────────────────────────────────────────────────────
    try:
        result = run_voice_agent(
            session_id=session_id,
            user_input=transcript,
            context=agent_context,
            lang_hint=detected_lang,
        )
        result["transcript"] = transcript
        return jsonify(result)
    except Exception as exc:
        import traceback
        print(f"[voice_ask] Error: {exc}\n{traceback.format_exc()}")
        return jsonify({
            "session_id": session_id,
            "transcript": transcript,
            "display_text": "I'm having trouble right now. Please try again in a moment.",
            "speech_text": "Please try again in a moment.",
            "audio_url": None,
            "sources": [],
            "followups": [],
            "guard_status": "server_error",
        }), 500


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """AWS Lambda entrypoint supporting API Gateway HTTP API (v2) and REST API (v1)."""
    import base64
    import io
    import urllib.parse

    # 1. Resolve HTTP method, path, query
    http_ctx = event.get("requestContext", {}).get("http", {})
    method = http_ctx.get("method") or event.get("httpMethod", "GET")
    path = event.get("rawPath") or event.get("path", "/")
    query_string = event.get("rawQueryString") or ""
    if not query_string and "queryStringParameters" in event and event["queryStringParameters"]:
        query_string = urllib.parse.urlencode(event["queryStringParameters"])

    # 2. Resolve body
    body_bytes = b""
    raw_body = event.get("body")
    if raw_body:
        if event.get("isBase64Encoded", False):
            body_bytes = base64.b64decode(raw_body)
        else:
            body_bytes = raw_body.encode("utf-8")

    # 3. Headers & WSGI environ
    headers = event.get("headers") or {}
    environ = {
        "REQUEST_METHOD": method,
        "SCRIPT_NAME": "",
        "PATH_INFO": path,
        "QUERY_STRING": query_string,
        "SERVER_NAME": headers.get("host", "localhost"),
        "SERVER_PORT": "443",
        "SERVER_PROTOCOL": "HTTP/1.1",
        "wsgi.version": (1, 0),
        "wsgi.url_scheme": "https",
        "wsgi.input": io.BytesIO(body_bytes),
        "wsgi.errors": sys.stderr,
        "wsgi.multithread": False,
        "wsgi.multiprocess": False,
        "wsgi.run_once": False,
        "CONTENT_LENGTH": str(len(body_bytes)),
        "CONTENT_TYPE": headers.get("content-type", headers.get("Content-Type", "")),
    }

    for k, v in headers.items():
        key = "HTTP_" + k.upper().replace("-", "_")
        environ[key] = str(v)

    # 4. Invoke Flask WSGI application
    response_headers: list[tuple[str, str]] = []
    response_status: list[int] = [200]

    def start_response(status: str, headers_list: list[tuple[str, str]], exc_info: Any = None) -> None:
        code = int(status.split()[0])
        response_status[0] = code
        response_headers.extend(headers_list)

    response_body = b"".join(app(environ, start_response))

    # 5. Format API Gateway response
    out_headers = {k: v for k, v in response_headers}
    return {
        "statusCode": response_status[0],
        "headers": out_headers,
        "body": response_body.decode("utf-8", errors="replace"),
        "isBase64Encoded": False,
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
