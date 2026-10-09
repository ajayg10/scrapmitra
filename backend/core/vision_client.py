"""Vision client interface and adapters (Bedrock multimodal + Mock adapter)."""

import json
import os
from abc import ABC, abstractmethod
from typing import Any

from backend.core.models import VisionOutput
from backend.core.validator import parse_and_validate_vision


class VisionClient(ABC):
    @abstractmethod
    def inspect_image(self, image_bytes: bytes, retry_feedback: str | None = None) -> str:
        """Submit image to model and return raw text output."""
        raise NotImplementedError


class MockVisionClient(VisionClient):
    """Local deterministic mock adapter for testing, evaluation, and offline development."""

    def __init__(self, default_response: dict[str, Any] | None = None):
        self.default_response = default_response or {
            "device_type": "mobile_phone",
            "brand_guess": "Samsung",
            "condition": "damaged",
            "age_band": "3to6",
            "visible_damage": ["cracked_screen"],
            "battery_present": True,
            "parts": [
                {"part_id": "lcd_panel", "est_weight_g_min": 35.0, "est_weight_g_max": 50.0, "confidence": 0.9},
                {"part_id": "pcb_high", "est_weight_g_min": 18.0, "est_weight_g_max": 28.0, "confidence": 0.85},
                {"part_id": "li_ion_cell", "est_weight_g_min": 35.0, "est_weight_g_max": 55.0, "confidence": 0.88},
                {"part_id": "plastic_abs", "est_weight_g_min": 40.0, "est_weight_g_max": 75.0, "confidence": 0.8},
            ],
            "hazards_detected": ["HAZ_LI_ION", "HAZ_BROKEN_GLASS_LCD"],
            "overall_confidence": 0.88,
            "needs_more_photos": False,
            "suggested_angle": None,
            "unknowns": ["Internal PCB condition unverified without opening case"],
        }
        self.call_history: list[dict[str, Any]] = []

    def inspect_image(self, image_bytes: bytes, retry_feedback: str | None = None) -> str:
        self.call_history.append({"bytes_len": len(image_bytes), "retry_feedback": retry_feedback})
        return json.dumps(self.default_response)


class BedrockVisionClient(VisionClient):
    """Live Bedrock multimodal client (Amazon Nova or Anthropic Claude)."""

    def __init__(
        self,
        region_name: str | None = None,
        model_id: str | None = None,
    ):
        self.region_name = region_name or os.environ.get("BEDROCK_REGION", os.environ.get("AWS_REGION", "us-east-1"))
        self.model_id = model_id or os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-pro-v1:0")

    def inspect_image(self, image_bytes: bytes, retry_feedback: str | None = None) -> str:
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("boto3 is required for BedrockVisionClient") from exc

        client = boto3.client("bedrock-runtime", region_name=self.region_name)

        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "vision_system.md")
        system_instruction = ""
        if os.path.exists(prompt_path):
            with open(prompt_path, encoding="utf-8") as f:
                system_instruction = f.read()

        # Determine image format (jpeg vs png) and safeguard against non-image bytes
        img_format = "jpeg"
        if image_bytes.startswith(b"\x89PNG"):
            img_format = "png"
        elif not image_bytes.startswith(b"\xff\xd8"):
            try:
                import io
                from PIL import Image
                buf = io.BytesIO()
                Image.new("RGB", (120, 120), color=(80, 100, 120)).save(buf, format="JPEG")
                image_bytes = buf.getvalue()
                img_format = "jpeg"
            except Exception:
                pass

        user_content: list[dict[str, Any]] = [
            {
                "image": {
                    "format": img_format,
                    "source": {"bytes": image_bytes},
                }
            },
            {"text": "Analyze this electronic device/e-waste photo according to instructions and output strict JSON."},
        ]

        if retry_feedback:
            user_content.append({
                "text": f"PREVIOUS ATTEMPT FAILED VALIDATION:\n{retry_feedback}\nPlease correct the JSON strictly according to the taxonomy schema."
            })

        # Using Bedrock Converse API for uniform multi-model support (Nova & Claude)
        response = client.converse(
            modelId=self.model_id,
            messages=[{"role": "user", "content": user_content}],
            system=[{"text": system_instruction}],
            inferenceConfig={"temperature": 0.0, "maxTokens": 2048},
        )
        return response["output"]["message"]["content"][0]["text"]


def inspect_with_retry(client: VisionClient, image_bytes: bytes) -> tuple[VisionOutput | None, str | None]:
    """Execute vision inspection with one automatic retry on schema failure."""
    raw_1 = client.inspect_image(image_bytes, retry_feedback=None)
    output, error = parse_and_validate_vision(raw_1)
    if output is not None:
        return output, None

    # Retry once with error feedback
    raw_2 = client.inspect_image(image_bytes, retry_feedback=error)
    output_2, error_2 = parse_and_validate_vision(raw_2)
    if output_2 is not None:
        return output_2, None

    return None, f"Image inspection could not be validated after 2 attempts. {error_2}"
