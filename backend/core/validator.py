"""Strict output parsing and schema validation with retry feedback."""

import json
import re
from typing import Any

from pydantic import ValidationError

from backend.core.models import VisionOutput


def extract_json(raw_text: str) -> str:
    """Extract raw JSON text, stripping any markdown code fences or conversational prose."""
    text = raw_text.strip()
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Try finding outer curly braces
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace : last_brace + 1].strip()
    return text


def parse_and_validate_vision(raw_text: str) -> tuple[VisionOutput | None, str | None]:
    """Parse text from Bedrock vision model and validate against VisionOutput schema.

    Returns:
        (vision_output, None) on success
        (None, error_feedback_string) on failure, suitable for retry feedback.
    """
    clean_json = extract_json(raw_text)
    try:
        data: Any = json.loads(clean_json)
    except json.JSONDecodeError as exc:
        return None, f"Invalid JSON syntax at line {exc.lineno}, col {exc.colno}: {exc.msg}"

    if not isinstance(data, dict):
        return None, "Model output must be a JSON object, not a list or scalar"

    try:
        output = VisionOutput.model_validate(data)
        return output, None
    except ValidationError as exc:
        errors = []
        for err in exc.errors():
            loc = ".".join(str(p) for p in err["loc"])
            msg = err["msg"]
            errors.append(f"Field '{loc}': {msg}")
        feedback = "Schema validation failed:\n" + "\n".join(errors)
        return None, feedback
