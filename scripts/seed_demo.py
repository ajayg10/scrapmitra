"""Generate realistic demo households, collectors, and recyclers for Delhi-NCR (Section 18)."""

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Delhi-NCR centroid (South Delhi / Okhla industrial & residential cluster)
BASE_LAT = 28.5355
BASE_LNG = 77.2610

DEVICES_POOL = [
    ("mobile_phone", 0.18, False),
    ("laptop", 2.2, False),
    ("ceiling_fan", 3.8, False),
    ("microwave", 11.5, False),
    ("crt_tv", 18.0, True),
    ("refrigerator", 38.0, True),
    ("battery_pack", 8.5, True),
    ("cfl_tube_light", 0.15, True),
    ("router_modem", 0.45, False),
    ("keyboard", 0.65, False),
]


def generate_demo_dataset():
    random.seed(42)

    # 1. Demo Collectors (3 collectors, one hazard-authorized)
    collectors = [
        {
            "collector_id": "col_delhi_01",
            "cognito_sub": "sub_col_delhi_01",
            "name": "Ramesh Kumar (KabadiPlus Green Rider)",
            "base_lat": 28.5380,
            "base_lng": 77.2550,
            "vehicle_type": "three_wheeler_cng",
            "authorized_categories": ["mobile_phone", "laptop", "appliances", "metals"],
            "is_hazard_authorized": True,
            "verified": True,
            "is_demo": True,
        },
        {
            "collector_id": "col_delhi_02",
            "cognito_sub": "sub_col_delhi_02",
            "name": "Surender Scrap Traders",
            "base_lat": 28.5450,
            "base_lng": 77.2680,
            "vehicle_type": "three_wheeler_cng",
            "authorized_categories": ["metals", "plastic", "cables"],
            "is_hazard_authorized": False,
            "verified": True,
            "is_demo": True,
        },
        {
            "collector_id": "col_delhi_03",
            "cognito_sub": "sub_col_delhi_03",
            "name": "Mohd. Aslam E-Waste Express",
            "base_lat": 28.5280,
            "base_lng": 77.2490,
            "vehicle_type": "two_wheeler_electric",
            "authorized_categories": ["mobile_phone", "laptop", "router_modem"],
            "is_hazard_authorized": False,
            "verified": True,
            "is_demo": True,
        },
    ]

    # 2. Demo Households (~20 households in 1.8km radius)
    households = []
    for i in range(1, 21):
        lat_offset = random.uniform(-0.015, 0.015)
        lng_offset = random.uniform(-0.015, 0.015)
        dev_type, avg_wt, is_hazard = random.choice(DEVICES_POOL)

        households.append({
            "request_id": f"req_demo_{i:02d}",
            "owner_id": f"citizen_delhi_{i:02d}",
            "pseudonym": f"EcoCitizen-{random.choice(['NehruPlace', 'Kalkaji', 'Okhla', 'Lajpat', 'CRPark'])}-{i:02d}",
            "geohash": f"ttn{random.randint(100, 999)}",
            "approx_lat": round(BASE_LAT + lat_offset, 5),
            "approx_lng": round(BASE_LNG + lng_offset, 5),
            "window": "Today, 2:00 PM - 5:00 PM",
            "items": [
                {
                    "item_id": f"item_{i:02d}_1",
                    "device_type": dev_type,
                    "est_weight_kg_min": round(avg_wt * 0.85, 2),
                    "est_weight_kg_max": round(avg_wt * 1.15, 2),
                    "recommended_option": "HAZARDOUS_SPECIAL_HANDLING" if is_hazard else "RECYCLE_AUTHORIZED",
                    "hazards": ["HAZ_LI_ION"] if is_hazard else [],
                }
            ],
            "total_weight_kg_min": round(avg_wt * 0.85, 2),
            "total_weight_kg_max": round(avg_wt * 1.15, 2),
            "hazard_flags": ["HAZ_LI_ION"] if is_hazard else [],
            "status": "REQUESTED",
            "cluster_id": None,
            "collector_id": None,
            "created_at": "2026-10-09T08:30:00Z",
        })

    # 3. Verified Recyclers
    recyclers = [
        {
            "recycler_id": "rec_cpcb_01",
            "name": "Attero Recycling Pvt Ltd (Facility Hub)",
            "city": "Delhi NCR",
            "lat": 28.5300,
            "lng": 77.2700,
            "categories": ["all_ewaste", "li_ion_batteries", "pcb_refining"],
            "authorization_ref": "CPCB/E-Waste/2026/AUTH-0881 (Verified Demo Reference)",
            "verified": True,
            "is_demo": True,
        },
        {
            "recycler_id": "rec_cpcb_02",
            "name": "Ecoreco Safe Dismantling Center",
            "city": "Delhi NCR",
            "lat": 28.5410,
            "lng": 77.2620,
            "categories": ["consumer_electronics", "appliances", "crt"],
            "authorization_ref": "DPCC/BMW/2026/REC-302 (Verified Demo Reference)",
            "verified": True,
            "is_demo": True,
        },
    ]

    # 4. User Profiles (2 demo households, 3 demo collectors, 1 admin)
    profiles = [
        {
            "user_id": "sub_hh_01",
            "role": "household",
            "display_name": "EcoPioneer_MayurVihar",
            "email_or_phone": "household1@demo.kabadiplus.in",
            "created_at": "2026-10-09T08:00:00Z",
            "is_demo": True,
        },
        {
            "user_id": "sub_hh_02",
            "role": "household",
            "display_name": "GreenHero_Saket",
            "email_or_phone": "household2@demo.kabadiplus.in",
            "created_at": "2026-10-09T08:15:00Z",
            "is_demo": True,
        },
        {
            "user_id": "sub_col_delhi_01",
            "role": "collector",
            "display_name": "Ramesh Kumar",
            "collector_id": "col_delhi_01",
            "email_or_phone": "+919876543210",
            "created_at": "2026-10-09T07:30:00Z",
            "is_demo": True,
        },
        {
            "user_id": "sub_col_delhi_02",
            "role": "collector",
            "display_name": "Surender Scrap",
            "collector_id": "col_delhi_02",
            "email_or_phone": "+919876543211",
            "created_at": "2026-10-09T07:45:00Z",
            "is_demo": True,
        },
        {
            "user_id": "sub_col_delhi_03",
            "role": "collector",
            "display_name": "Mohd. Aslam",
            "collector_id": "col_delhi_03",
            "email_or_phone": "+919876543212",
            "created_at": "2026-10-09T08:00:00Z",
            "is_demo": True,
        },
        {
            "user_id": "sub_admin_01",
            "role": "admin",
            "display_name": "Delhi Waste Commissioner",
            "email_or_phone": "admin@kabadiplus.gov.in",
            "created_at": "2026-10-01T00:00:00Z",
            "is_demo": True,
        },
    ]

    # 5. Collector Applications (1 pending for admin approval demo)
    applications = [
        {
            "application_id": "app_demo_01",
            "name": "Vikram Singh",
            "phone": "+919811223344",
            "vehicle_type": "three_wheeler_electric",
            "service_area": "Dwarka Sector 10 & 11",
            "categories": ["mobile_phone", "laptop", "battery_pack", "appliances"],
            "authorization_ref": "DPCC/PENDING/2026/04",
            "status": "pending",
            "reviewed_by": None,
            "reviewed_at": None,
            "created_at": "2026-10-09T09:00:00Z",
            "is_demo": True,
        }
    ]

    # Save to disk
    (ROOT / "data/seed/collectors.json").write_text(
        json.dumps({"_meta": {"is_demo": True, "count": len(collectors)}, "items": collectors}, indent=2),
        encoding="utf-8",
    )
    (ROOT / "data/seed/demo_households.json").write_text(
        json.dumps({"_meta": {"is_demo": True, "count": len(households)}, "items": households}, indent=2),
        encoding="utf-8",
    )
    (ROOT / "data/seed/recyclers.json").write_text(
        json.dumps({"_meta": {"is_demo": True, "count": len(recyclers)}, "items": recyclers}, indent=2),
        encoding="utf-8",
    )
    (ROOT / "data/seed/profiles.json").write_text(
        json.dumps({"_meta": {"is_demo": True, "count": len(profiles)}, "items": profiles}, indent=2),
        encoding="utf-8",
    )
    (ROOT / "data/seed/collector_applications.json").write_text(
        json.dumps({"_meta": {"is_demo": True, "count": len(applications)}, "items": applications}, indent=2),
        encoding="utf-8",
    )
    print(f"Generated {len(households)} demo households, {len(collectors)} collectors, {len(recyclers)} recyclers, {len(profiles)} profiles, and {len(applications)} applications.")


if __name__ == "__main__":
    generate_demo_dataset()
