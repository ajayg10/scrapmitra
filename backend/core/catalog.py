"""Read the canonical data without any cloud access or side effects."""

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_data(relative_path: str) -> Any:
    path = (DATA_DIR / relative_path).resolve()
    if not path.is_relative_to(DATA_DIR):
        raise ValueError("Data path must remain inside data/")
    return json.loads(path.read_text(encoding="utf-8"))


def part_by_id(part_id: str) -> dict[str, Any]:
    for part in load_data("seed/part_catalog.json")["items"]:
        if part["part_id"] == part_id:
            return part
    raise KeyError(f"Unknown part_id: {part_id}")


def hazard_by_id(hazard_id: str) -> dict[str, Any]:
    for rule in load_data("seed/hazard_rules.json")["items"]:
        if rule["hazard_id"] == hazard_id:
            return rule
    raise KeyError(f"Unknown hazard_id: {hazard_id}")
