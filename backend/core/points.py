"""Eco Points and Impact Ledger calculations (Section 13 & F9).

Points are strictly awarded on VERIFIED handover events only.
"""

import math

from backend.core.taxonomy_types import OptionId


def compute_eco_points(
    outcome: OptionId,
    kg_diverted: float,
    has_hazard: bool,
    is_verified: bool,
    is_flagged: bool = False,
) -> int:
    """Calculate Eco Points earned for a verified handover.

    Rules:
    - Points ONLY for verified handovers.
    - Zero points if flagged (anti-gaming out-of-range weight).
    - +10 correctly routed
    - +20 hazardous item safely routed
    - +30 verified recycling
    - +40 verified reuse/repair
    - +50 per 5 kg diverted
    """
    if not is_verified or is_flagged:
        return 0

    points = 10  # Base: correctly routed

    if has_hazard:
        points += 20  # Hazardous item safely neutralized

    if outcome in ("REUSE_SELL", "REUSE_DONATE", "REPAIR_THEN_REUSE"):
        points += 40
    elif outcome == "RECYCLE_AUTHORIZED":
        points += 30
    elif outcome == "HAZARDOUS_SPECIAL_HANDLING":
        points += 20

    # +50 per 5 kg diverted
    diverted_blocks = math.floor(kg_diverted / 5.0)
    if diverted_blocks > 0:
        points += diverted_blocks * 50

    return points
