"""Anti-gaming and integrity validation rules (Section 13).

Prevents fraudulent verification, self-handover, duplicate QR reuse, and out-of-range weights.
"""


from backend.core.catalog import load_data
from backend.core.taxonomy_types import DeviceType

DECISION_RULES_DATA = load_data("decision_rules.json")
DEVICE_RULES: dict[str, dict] = {
    item["device_type"]: item for item in DECISION_RULES_DATA["items"]
}


def validate_handover_integrity(
    owner_id: str,
    collector_id: str,
    qr_token: str,
    token_already_used: bool,
    entered_weight_kg: float,
    device_type: DeviceType,
) -> tuple[bool, bool, str]:
    """Validate handover transaction integrity.

    Returns:
        (is_valid_transaction, is_flagged_for_investigation, message)
    """
    # 1. Self-handover check
    if owner_id.strip().lower() == collector_id.strip().lower():
        return False, True, "Self-handover fraud detected: collector cannot verify own household item."

    # 2. Token reuse check
    if token_already_used:
        return False, True, "Invalid handover: QR token has already been redeemed."

    # 3. Weight sanity check against device category prior
    rule = DEVICE_RULES.get(device_type, DEVICE_RULES["unknown"])
    min_exp = rule.get("expected_weight_kg_min", 0.05)
    max_exp = rule.get("expected_weight_kg_max", 50.0)

    # Flag if entered weight is under 0.2x min or over 2.5x max
    if entered_weight_kg < (min_exp * 0.2) or entered_weight_kg > (max_exp * 2.5):
        return True, True, f"Weight anomaly: {entered_weight_kg}kg outside expected range ({min_exp}-{max_exp}kg). Flagged for admin verification."

    return True, False, "Handover integrity verified."
