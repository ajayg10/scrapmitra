"""Deterministic Circular Decision Engine.

Ranks Reuse > Repair > Recycle > Safe hazardous disposal.
Computes environmental CO2e avoided and economic trade-offs without LLM hallucination.
"""

from typing import Literal

from backend.core.catalog import load_data
from backend.core.models import (
    CircularOption,
    ComparisonRow,
    DecisionOutput,
    LocalizedHazard,
    MoneyRange,
)
from backend.core.taxonomy_types import (
    AgeBand,
    Condition,
    DeviceType,
    OptionId,
    VisibleDamage,
)

DECISION_RULES_DATA = load_data("decision_rules.json")
EMISSION_FACTORS_DATA = load_data("emission_factors.json")

DEVICE_RULES: dict[str, dict] = {
    item["device_type"]: item for item in DECISION_RULES_DATA["items"]
}
VIABILITY_FACTORS = DECISION_RULES_DATA["viability_factors"]
EMBODIED_CARBON = EMISSION_FACTORS_DATA["embodied_carbon_avoidance_by_device"]


def evaluate_circular_decision(
    device_type: DeviceType,
    condition: Condition,
    age_band: AgeBand,
    visible_damage: list[VisibleDamage],
    battery_present: bool,
    powers_on: Literal["yes", "no", "unsure"] | None,
    hazards: list[LocalizedHazard],
    overall_confidence: float = 0.8,
    threshold: float = 0.5,
) -> DecisionOutput:
    """Evaluate circular hierarchy and return ranked options and side-by-side comparison."""
    rule = DEVICE_RULES.get(device_type, DEVICE_RULES["unknown"])
    has_high_hazard = any(h.severity == "HIGH" for h in hazards)

    # -------------------------------------------------------------
    # Step 1: Safety Gate
    # -------------------------------------------------------------
    safety_gate_triggered = (
        "swollen_battery" in visible_damage
        or "burn_marks" in visible_damage
        or condition == "burnt"
        or ("corrosion" in visible_damage and has_high_hazard)
    )

    carbon_info = EMBODIED_CARBON.get(device_type, EMBODIED_CARBON["unknown"])

    if safety_gate_triggered:
        hazard_reason = (
            "Critical safety hazard detected (swollen battery, burn marks, or compromised high-severity component). "
            "Resale, repair, or regular dismantling is strictly prohibited. Route directly to authorized hazardous facility."
        )
        safe_option = CircularOption(
            option_id="HAZARDOUS_SPECIAL_HANDLING",
            title="Quarantine & Authorized Hazardous Handling",
            money_range=None,
            env_rating="poor",
            co2e_avoided_min_kg=0.0,
            co2e_avoided_max_kg=5.0,
            viability=1.0,
            confidence_label="High",
            why=hazard_reason,
            assumption_id="HAZARD_ISOLATION_PREVENTION",
        )

        comparison_table = [
            ComparisonRow(
                option_name="Throw away (Landfill/Drain)",
                money_text="₹0",
                env_rating="poor",
                co2e_avoided_text="0 kg CO₂e",
                summary_reason="Toxic leakage: heavy metals, mercury, or lithium fire hazard into groundwater.",
            ),
            ComparisonRow(
                option_name="Authorized Hazardous Handling",
                money_text="Free / Safe Pickup",
                env_rating="good",
                co2e_avoided_text="Eliminates toxic release",
                summary_reason="Strictly contained by CPCB-authorized hazardous waste handlers.",
            ),
            ComparisonRow(
                option_name="Resale / Second-life",
                money_text="Prohibited",
                env_rating="poor",
                co2e_avoided_text="N/A",
                summary_reason="Unsafe: damaged or swollen components present active fire or chemical risk.",
            ),
            ComparisonRow(
                option_name="DIY Repair",
                money_text="Prohibited",
                env_rating="poor",
                co2e_avoided_text="N/A",
                summary_reason="Severe risk of electrical shock, thermal explosion, or toxic gas inhalation.",
            ),
            ComparisonRow(
                option_name="Donation",
                money_text="Prohibited",
                env_rating="poor",
                co2e_avoided_text="N/A",
                summary_reason="Hazardous goods cannot be transferred to schools or charities.",
            ),
        ]

        return DecisionOutput(
            recommended_tier="HAZARDOUS_SPECIAL_HANDLING",
            options=[safe_option],
            comparison_table=comparison_table,
            hazards=hazards,
            safety_gate_triggered=True,
        )

    # -------------------------------------------------------------
    # Step 2: Viability calculations
    # -------------------------------------------------------------
    cond_factor = VIABILITY_FACTORS["condition"].get(condition, 0.5)
    age_factor = VIABILITY_FACTORS["age_band"].get(age_band, 0.5)
    power_key = powers_on or "unsure"
    power_factor = VIABILITY_FACTORS["power"].get(power_key, 0.7)

    # Damage penalty is multiplicative over visible damages
    damage_penalty = 1.0
    for dmg in visible_damage:
        penalty = VIABILITY_FACTORS["damage_penalties"].get(dmg, 0.8)
        damage_penalty *= penalty

    reuse_viability = min(
        1.0,
        max(
            0.0,
            rule["base_reuse_viability"] * cond_factor * age_factor * damage_penalty * power_factor,
        ),
    )

    # Repair viability calculation:
    # Repair is only viable if visible damages can be remedied and repair_cost_mid < 0.5 * resale_mid
    repair_cost_mid = (rule["repair_cost_min"] + rule["repair_cost_max"]) / 2.0
    resale_mid = (rule["resale_min"] + rule["resale_max"]) / 2.0

    economic_repair_favorable = resale_mid > 0 and (repair_cost_mid < 0.5 * resale_mid)
    repair_viability_base = rule["base_repair_viability"]

    # Deduct 0.25 for each damage item, but if powers_on == 'no', power supply or motherboard repair needed
    damage_count_penalty = max(0.2, 1.0 - 0.25 * len(visible_damage))
    if powers_on == "no":
        damage_count_penalty *= 0.7

    repair_viability = min(
        1.0,
        max(
            0.0,
            repair_viability_base * damage_count_penalty * (1.0 if economic_repair_favorable else 0.4),
        ),
    )

    # Recycle viability is always robust as long as physical materials exist
    recycle_viability = 0.95

    # -------------------------------------------------------------
    # Step 3: Tier Selection & Option Building
    # -------------------------------------------------------------
    options: list[CircularOption] = []
    confidence_label: Literal["High", "Medium", "Low"] = (
        "High" if overall_confidence >= 0.8 else ("Medium" if overall_confidence >= 0.6 else "Low")
    )

    # 1. Reuse tier
    if reuse_viability >= threshold:
        # Determine whether to Sell or Donate
        if rule["resale_min"] >= 400:
            options.append(
                CircularOption(
                    option_id="REUSE_SELL",
                    title="Direct Resale / Second-Life Market",
                    money_range=MoneyRange(
                        min=float(rule["resale_min"]),
                        max=float(rule["resale_max"]),
                        currency="INR",
                    ),
                    env_rating="much_better",
                    co2e_avoided_min_kg=float(carbon_info["min"]),
                    co2e_avoided_max_kg=float(carbon_info["max"]),
                    viability=round(reuse_viability, 2),
                    confidence_label=confidence_label,
                    why=f"Device condition is {condition} and age band is {age_band}. High secondary utility saves 100% of embodied manufacturing carbon.",
                    assumption_id=carbon_info["assumption_id"],
                )
            )
        else:
            options.append(
                CircularOption(
                    option_id="REUSE_DONATE",
                    title="Community / NGO Donation",
                    money_range=None,
                    env_rating="much_better",
                    co2e_avoided_min_kg=float(carbon_info["min"]),
                    co2e_avoided_max_kg=float(carbon_info["max"]),
                    viability=round(reuse_viability, 2),
                    confidence_label=confidence_label,
                    why="Functional equipment can directly empower local community centers or schools, avoiding new manufacturing.",
                    assumption_id=carbon_info["assumption_id"],
                )
            )

    # 2. Repair tier
    if repair_viability >= threshold and economic_repair_favorable:
        est_net_resale_min = max(0.0, float(rule["resale_min"] - rule["repair_cost_max"]))
        est_net_resale_max = max(est_net_resale_min, float(rule["resale_max"] - rule["repair_cost_min"]))
        repair_title = "Screen Repair & Refurbishment" if "cracked_screen" in visible_damage else "Repair & Refurbishment"
        options.append(
            CircularOption(
                option_id="REPAIR_THEN_REUSE",
                title=repair_title,
                money_range=MoneyRange(
                    min=est_net_resale_min,
                    max=est_net_resale_max,
                    currency="INR",
                ),
                env_rating="better",
                co2e_avoided_min_kg=round(float(carbon_info["min"]) * 0.85, 1),
                co2e_avoided_max_kg=round(float(carbon_info["max"]) * 0.85, 1),
                viability=round(repair_viability, 2),
                confidence_label=confidence_label,
                why=f"Repair costs (~₹{int(repair_cost_mid)}) are under 50% of resale value (~₹{int(resale_mid)}). Restores functioning lifetime.",
                assumption_id=carbon_info["assumption_id"],
            )
        )

    # 3. Authorized Recycling tier (Always evaluated)
    options.append(
        CircularOption(
            option_id="RECYCLE_AUTHORIZED",
            title="Authorized Material Recycling",
            money_range=MoneyRange(
                min=float(rule["recycle_recovery_min"]),
                max=float(rule["recycle_recovery_max"]),
                currency="INR",
            ),
            env_rating="good",
            co2e_avoided_min_kg=round(float(carbon_info["min"]) * 0.25, 1),
            co2e_avoided_max_kg=round(float(carbon_info["max"]) * 0.35, 1),
            viability=recycle_viability,
            confidence_label=confidence_label,
            why="Certified de-manufacturing recovers copper, aluminium, and precious metals while containing hazardous fractions.",
            assumption_id="LCA_MATERIAL_SMELTING_OFFSET",
        )
    )

    # 4. If nothing cleared reuse or repair, fallback recommended tier is RECYCLE_AUTHORIZED
    recommended_tier: OptionId = options[0].option_id

    # -------------------------------------------------------------
    # Step 5: Side-by-side comparison table
    # -------------------------------------------------------------
    comparison_table = [
        ComparisonRow(
            option_name="Throw away (Trash / Dumping)",
            money_text="₹0",
            env_rating="poor",
            co2e_avoided_text="0 kg CO₂e (Heavy pollution)",
            summary_reason="Zero recovery; toxic materials leach into landfills and groundwater.",
        ),
        ComparisonRow(
            option_name="Authorized Recycling",
            money_text=f"₹{rule['recycle_recovery_min']} - ₹{rule['recycle_recovery_max']}",
            env_rating="good",
            co2e_avoided_text=f"{round(float(carbon_info['min']) * 0.25, 1)} - {round(float(carbon_info['max']) * 0.35, 1)} kg",
            summary_reason="Certified smelters reclaim metals; hazardous components safely neutralized.",
        ),
        ComparisonRow(
            option_name="Repair & Keep / Sell",
            money_text=f"Est Net: ₹{max(0, rule['resale_min'] - rule['repair_cost_max'])} - ₹{rule['resale_max'] - rule['repair_cost_min']}",
            env_rating="better" if economic_repair_favorable else "poor",
            co2e_avoided_text=f"{round(float(carbon_info['min']) * 0.85, 1)} - {round(float(carbon_info['max']) * 0.85, 1)} kg",
            summary_reason="Extends operational lifespan, delaying replacement hardware production.",
        ),
        ComparisonRow(
            option_name="Resell (Working)",
            money_text=f"₹{rule['resale_min']} - ₹{rule['resale_max']}",
            env_rating="much_better",
            co2e_avoided_text=f"{carbon_info['min']} - {carbon_info['max']} kg",
            summary_reason="Direct second life; prevents 100% of embodied manufacturing emissions.",
        ),
        ComparisonRow(
            option_name="Donate to Charity / School",
            money_text="Social Impact",
            env_rating="much_better",
            co2e_avoided_text=f"{carbon_info['min']} - {carbon_info['max']} kg",
            summary_reason="Bridges digital divide while delivering maximum circular benefit.",
        ),
    ]

    return DecisionOutput(
        recommended_tier=recommended_tier,
        options=options,
        comparison_table=comparison_table,
        hazards=hazards,
        safety_gate_triggered=False,
    )
