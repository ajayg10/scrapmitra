"""Export portable contract schemas. Runtime business validators remain Python-owned."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.core.models import (  # noqa: E402
    AppraisalResponse,
    ErrorResponse,
    ScanRequest,
    UploadRequest,
    VisionOutput,
)

MODELS = {
    "vision": VisionOutput,
    "appraisal": AppraisalResponse,
    "scan-request": ScanRequest,
    "upload-request": UploadRequest,
    "error": ErrorResponse,
}


def generated_files() -> dict[Path, str]:
    result = {}
    for name, model in MODELS.items():
        schema = {"$schema": "https://json-schema.org/draft/2020-12/schema", **model.model_json_schema()}
        result[ROOT / f"data/schemas/{name}.schema.json"] = json.dumps(schema, ensure_ascii=False, indent=2) + "\n"
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, content in generated_files().items():
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                raise SystemExit(f"Stale schema: {path.relative_to(ROOT)}")
        else:
            path.write_text(content, encoding="utf-8")
    print("Contract schemas are current." if args.check else "Contract schemas generated.")
