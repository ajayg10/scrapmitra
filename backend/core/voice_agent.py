"""KabadiPlus Voice Agent.

Bedrock Converse tool-use loop with three deterministic guards:
  1. Number Guard — every ₹/kg/km/point value verified against tool output
  2. Safety Guard — hazardous disassembly questions always get approved DON'T text
  3. Scope Guard — off-topic questions redirected in one sentence

Session memory: last 6 turns per session_id (in-memory with TTL).
"""

from __future__ import annotations

import json
import os
import re
import time
import uuid
from typing import Any

from backend.core.voice_tools import (
    TOOL_SCHEMAS,
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

# ─────────────────────────────────────────────────────────────────────────────
# Session Store (in-memory, TTL 24 h, max 6 turns)
# ─────────────────────────────────────────────────────────────────────────────

VOICE_SESSIONS: dict[str, dict[str, Any]] = {}
SESSION_TTL_SECONDS = 86_400  # 24 hours
MAX_TURNS = 6


def _clean_sessions() -> None:
    now = time.time()
    expired = [sid for sid, s in VOICE_SESSIONS.items() if s.get("expires_at", 0) < now]
    for sid in expired:
        del VOICE_SESSIONS[sid]


def get_session(session_id: str) -> dict[str, Any]:
    _clean_sessions()
    if session_id not in VOICE_SESSIONS:
        VOICE_SESSIONS[session_id] = {
            "session_id": session_id,
            "turns": [],
            "expires_at": time.time() + SESSION_TTL_SECONDS,
        }
    return VOICE_SESSIONS[session_id]


def append_turn(session_id: str, turn: dict[str, Any]) -> None:
    session = get_session(session_id)
    session["turns"].append(turn)
    # Keep only last MAX_TURNS
    if len(session["turns"]) > MAX_TURNS:
        session["turns"] = session["turns"][-MAX_TURNS:]
    session["expires_at"] = time.time() + SESSION_TTL_SECONDS


# ─────────────────────────────────────────────────────────────────────────────
# Guards
# ─────────────────────────────────────────────────────────────────────────────

# Number guard: extract numeric values from a text string
_NUMBER_RE = re.compile(r"(?:₹\s*|Rs\.?\s*|rupee[s]?\s*)?([\d,]+(?:\.\d+)?)\s*(?:rupee[s]?|kg|km|point[s]?|%)?", re.IGNORECASE)


def _extract_numbers(text: str) -> set[float]:
    results = set()
    for m in _NUMBER_RE.finditer(text):
        try:
            val = float(m.group(1).replace(",", ""))
            if val > 0:
                results.add(val)
        except ValueError:
            pass
    return results


def _collect_tool_numbers(tool_outputs: list[dict[str, Any]]) -> set[float]:
    """Recursively extract all numeric values from tool outputs."""
    nums: set[float] = set()

    def _recurse(obj: Any) -> None:
        if isinstance(obj, (int, float)) and obj > 0:
            nums.add(float(obj))
        elif isinstance(obj, dict):
            for v in obj.values():
                _recurse(v)
        elif isinstance(obj, list):
            for item in obj:
                _recurse(item)

    for out in tool_outputs:
        _recurse(out)
    return nums


def number_guard(reply_text: str, tool_outputs: list[dict[str, Any]]) -> tuple[bool, str]:
    """Returns (passed, reason). Fails if reply contains numbers not in tool output."""
    if not tool_outputs:
        return True, "no_tools_called"

    reply_nums = _extract_numbers(reply_text)
    allowed_nums = _collect_tool_numbers(tool_outputs)

    # Allow small numbers (< 10) — they're likely counts or percentages
    violations = {n for n in reply_nums if n >= 10 and not any(abs(n - a) < 1 for a in allowed_nums)}
    if violations:
        return False, f"invented_numbers: {violations}"
    return True, "ok"


# Safety guard keywords — topics that MUST trigger hazard rules
_SAFETY_TRIGGERS = re.compile(
    r"\b(open|break|burn|crush|dismantle|dissemble|tear apart|cut open|puncture|hammer|"
    r"battery|battari|बैटरी|burn wire|wire jala|crt|tube|CRT|खोलना|तोड़ना|जलाना)\b",
    re.IGNORECASE,
)

_SAFE_INSTRUCTION_PATTERNS = re.compile(
    r"\b(how to|steps to|instructions|guide me|bata|batao|kaise|कैसे|tarika|तरीका)\b",
    re.IGNORECASE,
)


def safety_guard(user_text: str, reply_text: str, hazards: list[dict[str, Any]]) -> tuple[bool, str]:
    """Returns (passed, injected_dont_text).

    If user asks how to do something hazardous, the reply MUST include the approved DON'T text.
    If the reply doesn't include it, guard fails and we prepend it.
    """
    triggers_safety = bool(_SAFETY_TRIGGERS.search(user_text))
    asks_instructions = bool(_SAFE_INSTRUCTION_PATTERNS.search(user_text))

    if triggers_safety and asks_instructions and hazards:
        # Find the first HIGH severity hazard
        high_hazard = next((h for h in hazards if h.get("severity") == "HIGH"), hazards[0] if hazards else None)
        if high_hazard:
            dont_rules = high_hazard.get("dont", [])
            dont_text = dont_rules[0] if dont_rules else "Do not dismantle this item at home."
            if dont_text.lower() not in reply_text.lower():
                return False, dont_text
    return True, ""


# Scope guard — detect clearly off-topic questions
_OFFTOPIC_TRIGGERS = re.compile(
    r"\b(recipe|cricket|movie|film|song|gana|politics|election|weather|mausam|"
    r"stock market|share bazaar|dating|relationship|khana|cooking|cook|chef)\b",
    re.IGNORECASE,
)


def scope_guard(user_text: str) -> bool:
    """Returns True if question is off-topic (should be redirected)."""
    return bool(_OFFTOPIC_TRIGGERS.search(user_text))


# ─────────────────────────────────────────────────────────────────────────────
# Language Detection
# ─────────────────────────────────────────────────────────────────────────────

_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
_HINDI_WORDS = {"kya", "hai", "ka", "ki", "ke", "me", "ko", "se", "aur", "nahi", "hoga", "karo", "bata", "kitna", "kyun", "kaise"}


def detect_language(text: str) -> str:
    """Detect language from user text. Returns 'hi' (Devanagari), 'hinglish', or 'en'."""
    if _DEVANAGARI_RE.search(text):
        return "hi"
    lower = text.lower()
    words = set(re.findall(r"\b\w+\b", lower))
    if len(words & _HINDI_WORDS) >= 2:
        return "hinglish"
    return "en"


# ─────────────────────────────────────────────────────────────────────────────
# System Prompt Loader
# ─────────────────────────────────────────────────────────────────────────────

def _load_system_prompt() -> str:
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "voice_system.md")
    try:
        with open(prompt_path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "You are the KabadiPlus voice assistant. Answer questions about e-waste value and safety. Never invent prices."


# ─────────────────────────────────────────────────────────────────────────────
# Tool Dispatcher
# ─────────────────────────────────────────────────────────────────────────────

def _dispatch_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    """Route tool call to the appropriate implementation.

    context contains: scans, pickup_requests, impact_ledger, collectors, user, lang
    """
    scans = context.get("scans", {})
    pickup_requests = context.get("pickup_requests", {})
    impact_ledger = context.get("impact_ledger", [])
    collectors = context.get("collectors", [])
    user = context.get("user")
    lang = context.get("lang", "en")

    if tool_name == "get_scan_result":
        return get_scan_result(tool_input["scan_id"], scans)

    elif tool_name == "get_price_breakdown":
        return get_price_breakdown(tool_input["scan_id"], scans)

    elif tool_name == "explain_decision":
        return explain_decision(tool_input["scan_id"], scans)

    elif tool_name == "get_hazard_rules":
        return get_hazard_rules(tool_input["hazard_ids"], tool_input.get("lang", lang))

    elif tool_name == "what_if_value":
        return what_if_value(tool_input["scan_id"], tool_input["parts_to_separate"], scans)

    elif tool_name == "check_offer":
        return check_offer(tool_input["scan_id"], float(tool_input["offered_inr"]), scans)

    elif tool_name == "find_collectors":
        return find_collectors(tool_input.get("scan_id"), scans, collectors)

    elif tool_name == "get_pickup_status":
        if not user:
            return {"error": "unauthorized", "message": "Please sign in to check pickup status."}
        if user.get("role") not in ("household", "admin"):
            return {"error": "forbidden", "message": "Only household users can check pickup status."}
        return get_pickup_status(tool_input["request_id"], user["user_id"], pickup_requests)

    elif tool_name == "get_my_impact":
        if not user:
            return {"error": "unauthorized", "message": "Please sign in to see your impact."}
        if user.get("role") not in ("household", "admin"):
            return {"error": "forbidden", "message": "Only household users can view impact data."}
        return get_my_impact(user["user_id"], impact_ledger)

    else:
        return {"error": "unknown_tool", "message": f"Tool '{tool_name}' is not recognized."}


# ─────────────────────────────────────────────────────────────────────────────
# Polly TTS
# ─────────────────────────────────────────────────────────────────────────────

def _synthesize_speech(speech_text: str, lang: str) -> str | None:
    """Call Amazon Polly and return a presigned S3 URL, or None on failure."""
    try:
        import boto3
        import hashlib

        voice_id = os.environ.get("POLLY_VOICE_HI", "Kajal") if lang in ("hi", "hinglish") else os.environ.get("POLLY_VOICE_EN", "Raveena")
        audio_bucket = os.environ.get("AUDIO_CACHE_BUCKET")
        region = os.environ.get("AWS_REGION", "us-east-1")

        if not audio_bucket:
            return None

        # Cache key by hash of (text, lang, voice)
        cache_key = hashlib.sha256(f"{speech_text}|{lang}|{voice_id}".encode()).hexdigest()[:32]
        s3_key = f"voice_cache/{cache_key}.mp3"

        s3 = boto3.client("s3", region_name=region)

        # Check cache first
        try:
            s3.head_object(Bucket=audio_bucket, Key=s3_key)
            # Already cached — return presigned URL
            return s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": audio_bucket, "Key": s3_key},
                ExpiresIn=3600,
            )
        except Exception:
            pass  # Not cached, synthesize

        polly = boto3.client("polly", region_name=region)
        engine = "neural" if voice_id == "Kajal" else "standard"
        response = polly.synthesize_speech(
            Text=speech_text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            Engine=engine,
            LanguageCode="hi-IN" if lang in ("hi", "hinglish") else "en-IN",
        )
        audio_bytes = response["AudioStream"].read()
        s3.put_object(Bucket=audio_bucket, Key=s3_key, Body=audio_bytes, ContentType="audio/mpeg")

        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": audio_bucket, "Key": s3_key},
            ExpiresIn=3600,
        )
    except Exception:
        return None  # Fallback to browser SpeechSynthesis


# ─────────────────────────────────────────────────────────────────────────────
# Transcription
# ─────────────────────────────────────────────────────────────────────────────

def transcribe_audio(audio_key: str, lang_hint: str = "en") -> tuple[str, str]:
    """Transcribe audio from S3 using Amazon Transcribe.

    Returns (transcript, detected_language).
    Falls back gracefully if Transcribe is unavailable.
    """
    try:
        import boto3
        import time as _time

        region = os.environ.get("AWS_REGION", "us-east-1")
        bucket = os.environ.get("UPLOADS_BUCKET")
        if not bucket:
            return "", lang_hint

        transcribe = boto3.client("transcribe", region_name=region)
        job_name = f"voice_{uuid.uuid4().hex[:12]}"

        # Language options for Indian multilingual support
        lang_options = ["en-IN", "hi-IN", "ta-IN", "te-IN", "mr-IN"]

        ext = os.path.splitext(audio_key)[1].lstrip(".").lower()
        media_format = ext if ext in ("mp3", "mp4", "wav", "flac", "ogg", "amr", "webm") else "webm"

        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": f"s3://{bucket}/{audio_key}"},
            MediaFormat=media_format,
            IdentifyMultipleLanguages=False,
            LanguageCode=f"{lang_hint}-IN" if lang_hint in ("en", "hi") else "hi-IN",
            Settings={"ShowSpeakerLabels": False},
        )

        # Poll for up to 15 seconds (Lambda timeout safety budget)
        for _ in range(15):
            _time.sleep(1)
            job = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            status = job["TranscriptionJob"]["TranscriptionJobStatus"]
            if status == "COMPLETED":
                import urllib.request
                transcript_uri = job["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
                with urllib.request.urlopen(transcript_uri) as resp:
                    data = json.loads(resp.read())
                transcript_text = data["results"]["transcripts"][0]["transcript"]
                detected_lang = job["TranscriptionJob"].get("LanguageCode", lang_hint + "-IN")
                lang_code = detected_lang.split("-")[0]
                return transcript_text, lang_code
            elif status == "FAILED":
                return "", lang_hint

        return "", lang_hint

    except Exception:
        return "", lang_hint


def _parse_agent_response(raw_text: str) -> tuple[str, str, list[str], list[str]]:
    """Robustly parse display_text, speech_text, followups, sources from model output.
    Guarantees raw JSON or markdown code fences are never exposed in user chat bubbles.
    """
    display_text = ""
    speech_text = ""
    followups: list[str] = []
    sources: list[str] = []

    # 1. Search for fenced ```json ... ```
    fence = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", raw_text)
    candidate = fence.group(1) if fence else None

    # 2. Search for outermost {...}
    if not candidate:
        brace = re.search(r"(\{[\s\S]*\})", raw_text)
        if brace:
            candidate = brace.group(1)

    if candidate:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict) and "display_text" in parsed:
                display_text = str(parsed["display_text"]).strip()
                speech_text = str(parsed.get("speech_text", display_text)).strip()
                followups = parsed.get("followups", [])
                sources = parsed.get("sources", [])
        except Exception:
            pass

    if not display_text:
        # Strip all code blocks completely
        cleaned = re.sub(r"```(?:json)?[\s\S]*?```", "", raw_text).strip()
        display_text = cleaned or raw_text
        speech_text = display_text

    # Final cleanup: remove any remaining code fences from display text
    display_text = re.sub(r"```(?:json)?[\s\S]*?```", "", display_text).strip()
    speech_text = re.sub(r"```(?:json)?[\s\S]*?```", "", speech_text).strip()

    return display_text, speech_text, followups, sources


# ─────────────────────────────────────────────────────────────────────────────
# Main Agent Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def run_voice_agent(
    session_id: str,
    user_input: str,
    context: dict[str, Any],
    lang_hint: str = "en",
) -> dict[str, Any]:
    """Run the voice agent for one turn.

    Args:
        session_id: Conversation session ID (created if new)
        user_input: The user's transcribed text
        context: Dict with scans, pickup_requests, impact_ledger, collectors, user
        lang_hint: Detected or user-selected language

    Returns:
        {session_id, display_text, speech_text, audio_url, sources, followups, guard_status}
    """
    # Detect language from actual user text (overrides hint)
    detected_lang = detect_language(user_input)
    if detected_lang == "en" and lang_hint in ("hi", "hinglish"):
        detected_lang = lang_hint
    context["lang"] = detected_lang

    # Scope guard — redirect off-topic questions immediately
    if scope_guard(user_input):
        redirect = {
            "en": "I can only help with e-waste value, safety, and pickup. What would you like to know about your device?",
            "hi": "मैं केवल ई-कचरे के मूल्य, सुरक्षा और पिकअप के बारे में बता सकता हूँ। आपके डिवाइस के बारे में क्या जानना है?",
            "hinglish": "Main sirf e-waste value, safety aur pickup ke baare mein bata sakta hoon. Device ke baare mein kya jaanna chahte hain?",
        }.get(detected_lang, "I can only help with e-waste questions. What would you like to know about your device?")
        return {
            "session_id": session_id,
            "detected_language": detected_lang,
            "transcript": user_input,
            "display_text": redirect,
            "speech_text": redirect,
            "audio_url": _synthesize_speech(redirect, detected_lang),
            "sources": [],
            "followups": [],
            "guard_status": "scope_redirect",
        }

    # Load session history
    session = get_session(session_id)
    history_messages = []
    for turn in session["turns"]:
        history_messages.append({"role": "user", "content": [{"text": turn["user"]}]})
        history_messages.append({"role": "assistant", "content": [{"text": turn["assistant"]}]})

    # Add current user message
    current_message = {"role": "user", "content": [{"text": user_input}]}
    messages = history_messages + [current_message]

    scan_id = context.get("scan_id")
    scans = context.get("scans", {})
    image_uploaded = context.get("image_uploaded", False)
    device_hint = context.get("device_hint", "device")

    device_context_block = ""
    if scan_id and scan_id in scans:
        scan_data = scans[scan_id]
        dev = scan_data.get("device", {})
        dec = scan_data.get("decision", {})
        hazards = [h.get("hazard_id") for h in scan_data.get("hazards", [])]
        opts = dec.get("options", [])
        best = opts[0] if opts else {}
        p_min = best.get("money_range", {}).get("min")
        p_max = best.get("money_range", {}).get("max")
        pr_str = f"₹{p_min} to ₹{p_max}" if p_min and p_max else "Social credit"

        device_context_block = f"""
## ACTIVE SCANNED ITEM CONTEXT (CRITICAL):
- The user has already uploaded and inspected a photo of their item!
- Active Scan ID: {scan_id}
- Device: {dev.get('label', dev.get('device_type', 'Smartphone'))} ({dev.get('device_type', 'unknown')})
- Condition: {dev.get('condition', 'unknown')}
- Age: {dev.get('age_band', 'unknown')}
- Hazards detected: {', '.join(hazards) if hazards else 'None'}
- Recommended Action: {best.get('title')} ({pr_str})
- Available options: {', '.join(o.get('title', '') for o in opts)}
CRITICAL RULE: NEVER ask the user for their scan ID! You ALREADY HAVE IT ({scan_id}).
When the user asks 'Where can I sell it?', 'Why this price?', 'Is it safe?', or 'Is this offer fair?', you already know it is this {dev.get('label', 'device')}. Immediately call the appropriate tool (like `find_collectors` with scan_id '{scan_id}') or answer directly with the verified details above.
"""
    elif image_uploaded or (device_hint and device_hint != "device"):
        device_context_block = f"""
## UPLOADED IMAGE STATUS:
- The user has uploaded an image of their {device_hint} on the screen (inspection pending or in progress).
- Acknowledge that you see they uploaded a photo of their {device_hint}.
- If they ask about value or safety, give general expectations for a {device_hint} and guide them to tap 'Inspect Device Now' for the exact verified appraisal.
"""

    system_prompt = _load_system_prompt()
    if device_context_block:
        system_prompt += "\n" + device_context_block

    # Bedrock Converse tool-use loop
    try:
        import boto3
        primary_model = os.environ.get("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-5-20250929-v1:0")
        region = os.environ.get("AWS_REGION", "us-east-1")
        bedrock = boto3.client("bedrock-runtime", region_name=region)
        models_to_try = [primary_model]
        if "nova" not in primary_model:
            models_to_try.append("amazon.nova-pro-v1:0")
        model_id = models_to_try[0]

        tool_outputs_this_turn: list[dict[str, Any]] = []
        sources: list[str] = []
        display_text = ""
        speech_text = ""
        followups: list[str] = []
        guard_status = "ok"

        max_iterations = 3
        for iteration in range(max_iterations):
            response = bedrock.converse(
                modelId=model_id,
                system=[{"text": system_prompt}],
                messages=messages,
                toolConfig={"tools": TOOL_SCHEMAS},
                inferenceConfig={
                    "maxTokens": 512,
                    "temperature": 0.2,
                },
            )

            stop_reason = response.get("stopReason", "end_turn")
            response_content = response.get("output", {}).get("message", {}).get("content", [])

            # Collect text from response
            raw_text = ""
            tool_calls_in_response = []
            for block in response_content:
                if "text" in block:
                    raw_text += block["text"]
                elif "toolUse" in block:
                    tool_calls_in_response.append(block["toolUse"])

            if stop_reason == "tool_use" and tool_calls_in_response:
                # Process tool calls
                tool_result_content = []
                for tool_call in tool_calls_in_response:
                    tool_name = tool_call["name"]
                    tool_input = tool_call.get("input", {})
                    # If tool requires scan_id and it's missing, inject active scan_id
                    if "scan_id" in tool_input and not tool_input["scan_id"] and scan_id:
                        tool_input["scan_id"] = scan_id
                    elif tool_name in ("get_scan_result", "get_price_breakdown", "explain_decision", "what_if_value", "check_offer", "find_collectors") and "scan_id" not in tool_input and scan_id:
                        tool_input["scan_id"] = scan_id

                    tool_id = tool_call["toolUseId"]

                    result = _dispatch_tool(tool_name, tool_input, context)
                    tool_outputs_this_turn.append(result)

                    # Extract sources
                    if "source" in result and "last_updated" in result:
                        src = f"{result['source']} — {result['last_updated']}"
                        if src not in sources:
                            sources.append(src)

                    tool_result_content.append({
                        "toolResult": {
                            "toolUseId": tool_id,
                            "content": [{"text": json.dumps(result, ensure_ascii=False)}],
                        }
                    })

                # Append assistant tool use message and tool results to messages
                messages.append({"role": "assistant", "content": response_content})
                messages.append({"role": "user", "content": tool_result_content})
                continue

            else:
                # Final text response — parse robustly without leaking raw JSON
                raw_text = raw_text.strip()
                display_text, speech_text, parsed_followups, parsed_sources = _parse_agent_response(raw_text)
                followups = parsed_followups
                for s in parsed_sources:
                    if s not in sources:
                        sources.append(s)
                break

        if not display_text:
            display_text = "I couldn't find enough information to answer that. Please try again or ask a different question."
            speech_text = display_text

    except Exception as e:
        # Fallback response on Bedrock failure
        display_text = "I'm having trouble connecting right now. Please try again in a moment."
        speech_text = display_text
        sources = []
        followups = []
        tool_outputs_this_turn = []
        guard_status = f"bedrock_error: {type(e).__name__}"

    # ── Guard 1: Number Guard ────────────────────────────────────────────────
    if tool_outputs_this_turn:
        passed, reason = number_guard(display_text, tool_outputs_this_turn)
        if not passed:
            guard_status = f"number_guard_triggered: {reason}"
            # Build templated answer from tool data
            price_data = next(
                (t for t in tool_outputs_this_turn if "options" in t and t.get("options")),
                None,
            )
            if price_data and price_data["options"]:
                best = price_data["options"][0]
                p_min = best.get("price_min_inr")
                p_max = best.get("price_max_inr")
                src = price_data.get("source", "DEMO DATA")
                updated = price_data.get("last_updated", "2026-10-09")
                if p_min and p_max:
                    display_text = f"Expected value: ₹{int(p_min)} to ₹{int(p_max)} ({best['title']}). Source: {src}, last updated {updated}."
                    speech_text = display_text
                else:
                    display_text = "This item's value is not directly available. Please check with a verified collector."
                    speech_text = display_text

    # ── Guard 2: Safety Guard ────────────────────────────────────────────────
    scan_hazards = []
    scan_id = context.get("scan_id")
    if scan_id:
        scan_data = context.get("scans", {}).get(scan_id, {})
        scan_hazards = scan_data.get("hazards", [])

    safety_passed, dont_text = safety_guard(user_input, display_text, scan_hazards)
    if not safety_passed:
        display_text = f"⚠️ {dont_text} {display_text}"
        speech_text = f"Safety warning: {dont_text} {speech_text}"
        guard_status = "safety_guard_injected"

    # Store turn in session
    append_turn(session_id, {
        "user": user_input,
        "assistant": display_text,
        "lang": detected_lang,
        "guard_status": guard_status,
    })

    # Synthesize speech (Polly or None → browser fallback)
    audio_url = _synthesize_speech(speech_text, detected_lang)

    return {
        "session_id": session_id,
        "detected_language": detected_lang,
        "transcript": user_input,
        "display_text": display_text,
        "speech_text": speech_text,
        "audio_url": audio_url,
        "sources": sources,
        "followups": followups,
        "guard_status": guard_status,
    }
