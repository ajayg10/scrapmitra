"""Pickup request clustering and dispatchability evaluation (Section 12)."""

import math
from datetime import UTC, datetime
from typing import Any

from backend.core.models import PickupRequest


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometres."""
    r = 6371.0  # Earth radius in kilometres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def cluster_requests(
    requests: list[PickupRequest],
    radius_km: float = 2.0,
) -> list[list[PickupRequest]]:
    """Greedy distance clustering within radius_km."""
    if not requests:
        return []

    unassigned = list(requests)
    clusters: list[list[PickupRequest]] = []

    while unassigned:
        seed = unassigned.pop(0)
        current_cluster = [seed]
        remaining = []
        for req in unassigned:
            # Check distance to seed
            dist = haversine_km(seed.approx_lat, seed.approx_lng, req.approx_lat, req.approx_lng)
            if dist <= radius_km:
                current_cluster.append(req)
            else:
                remaining.append(req)
        clusters.append(current_cluster)
        unassigned = remaining

    return clusters


def evaluate_cluster_dispatchability(
    cluster: list[PickupRequest],
    w_min_kg: float = 10.0,
    v_min_inr: float = 500.0,
    t_max_hours: float = 24.0,
    current_time_iso: str | None = None,
) -> tuple[bool, str]:
    """Check whether a cluster satisfies the dispatchable criteria.

    Returns:
        (is_dispatchable, reason_text)
    """
    if not cluster:
        return False, "Empty cluster"

    total_weight = sum((req.total_weight_kg_min + req.total_weight_kg_max) / 2.0 for req in cluster)

    # Estimate rough value based on items
    rough_value = sum(len(req.items) * 200.0 for req in cluster)

    # Evaluate wait time of oldest request
    now = datetime.fromisoformat(current_time_iso) if current_time_iso else datetime.now(UTC)
    oldest_hours = 0.0
    for req in cluster:
        try:
            req_time = datetime.fromisoformat(req.created_at)
            diff_hours = (now - req_time).total_seconds() / 3600.0
            if diff_hours > oldest_hours:
                oldest_hours = diff_hours
        except Exception:
            pass

    if total_weight >= w_min_kg:
        return True, f"Weight threshold met ({round(total_weight, 1)} kg >= {w_min_kg} kg)"
    if rough_value >= v_min_inr:
        return True, f"Value threshold met (~₹{int(rough_value)} >= ₹{int(v_min_inr)})"
    if oldest_hours >= t_max_hours:
        return True, f"Time threshold reached ({round(oldest_hours, 1)}h >= {t_max_hours}h max wait)"

    pending_count = len(cluster)
    return False, f"Pickup threshold not reached: {pending_count} nearby household(s) pooled, combining more requests."


def find_eligible_collector(
    cluster: list[PickupRequest],
    collectors: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Find the nearest eligible collector.

    Clusters containing hazardous items require is_hazard_authorized == True.
    """
    has_hazard = any(bool(req.hazard_flags) for req in cluster)

    # Compute cluster centroid
    avg_lat = sum(req.approx_lat for req in cluster) / len(cluster)
    avg_lng = sum(req.approx_lng for req in cluster) / len(cluster)

    eligible = []
    for c in collectors:
        if has_hazard and not c.get("is_hazard_authorized", False):
            continue
        dist = haversine_km(avg_lat, avg_lng, c["base_lat"], c["base_lng"])
        eligible.append((dist, c))

    if not eligible:
        return None

    eligible.sort(key=lambda x: x[0])
    return eligible[0][1]
