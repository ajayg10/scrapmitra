"""Route optimization using nearest-neighbour and 2-opt with verified km savings (Section 12)."""

from typing import Any

from backend.core.clustering import haversine_km
from backend.core.models import PickupRequest


def compute_baseline_km(base_lat: float, base_lng: float, stops: list[PickupRequest]) -> float:
    """Calculate baseline kilometres if collector visited each household as a separate round-trip."""
    return sum(2.0 * haversine_km(base_lat, base_lng, stop.approx_lat, stop.approx_lng) for stop in stops)


def nearest_neighbour_route(
    base_lat: float,
    base_lng: float,
    stops: list[PickupRequest],
) -> list[PickupRequest]:
    """Build initial tour using nearest-neighbour heuristic."""
    if not stops:
        return []

    unvisited = list(stops)
    current_lat, current_lng = base_lat, base_lng
    ordered_stops: list[PickupRequest] = []

    while unvisited:
        nearest_idx = 0
        min_dist = float("inf")
        for i, stop in enumerate(unvisited):
            d = haversine_km(current_lat, current_lng, stop.approx_lat, stop.approx_lng)
            if d < min_dist:
                min_dist = d
                nearest_idx = i
        next_stop = unvisited.pop(nearest_idx)
        ordered_stops.append(next_stop)
        current_lat, current_lng = next_stop.approx_lat, next_stop.approx_lng

    return ordered_stops


def calculate_tour_length(base_lat: float, base_lng: float, stops: list[PickupRequest]) -> float:
    """Total loop distance from base -> stop_1 -> ... -> stop_n -> base."""
    if not stops:
        return 0.0

    dist = haversine_km(base_lat, base_lng, stops[0].approx_lat, stops[0].approx_lng)
    for i in range(len(stops) - 1):
        dist += haversine_km(
            stops[i].approx_lat,
            stops[i].approx_lng,
            stops[i + 1].approx_lat,
            stops[i + 1].approx_lng,
        )
    dist += haversine_km(stops[-1].approx_lat, stops[-1].approx_lng, base_lat, base_lng)
    return dist


def optimize_2opt(base_lat: float, base_lng: float, tour: list[PickupRequest]) -> list[PickupRequest]:
    """Improve tour using standard 2-opt inversion swaps."""
    if len(tour) < 3:
        return tour

    best_tour = list(tour)
    best_dist = calculate_tour_length(base_lat, base_lng, best_tour)
    improved = True

    while improved:
        improved = False
        for i in range(len(best_tour) - 1):
            for k in range(i + 1, len(best_tour)):
                # 2-opt swap: reverse slice between i and k
                new_tour = best_tour[:i] + best_tour[i : k + 1][::-1] + best_tour[k + 1 :]
                new_dist = calculate_tour_length(base_lat, base_lng, new_tour)
                if new_dist < best_dist - 1e-4:
                    best_tour = new_tour
                    best_dist = new_dist
                    improved = True
                    break
            if improved:
                break

    return best_tour


def build_optimized_route(
    collector: dict[str, Any],
    stops: list[PickupRequest],
    vehicle_factor_co2e_per_km: float = 0.095,
) -> dict[str, Any]:
    """Compute complete route optimization results with verified km savings."""
    base_lat = collector["base_lat"]
    base_lng = collector["base_lng"]

    initial_tour = nearest_neighbour_route(base_lat, base_lng, stops)
    optimized_tour = optimize_2opt(base_lat, base_lng, initial_tour)

    baseline_km = round(compute_baseline_km(base_lat, base_lng, stops), 2)
    route_km = round(calculate_tour_length(base_lat, base_lng, optimized_tour), 2)
    saved_km = round(max(0.0, baseline_km - route_km), 2)
    est_co2e_saved = round(saved_km * vehicle_factor_co2e_per_km, 2)

    return {
        "collector_id": collector["collector_id"],
        "stops": [
            {
                "request_id": s.request_id,
                "owner_id": s.owner_id,
                "approx_lat": s.approx_lat,
                "approx_lng": s.approx_lng,
                "items_count": len(s.items),
                "has_hazard": bool(s.hazard_flags),
            }
            for s in optimized_tour
        ],
        "baseline_km": baseline_km,
        "route_km": route_km,
        "saved_km": saved_km,
        "est_co2e_saved_kg": est_co2e_saved,
    }
