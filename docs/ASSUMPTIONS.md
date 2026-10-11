# Prototype Lifecycle & Environmental Impact Assumptions

This document describes the prototype's configured assumptions; it is not evidence of independently validated or audited impact. Public estimates must be presented as illustrative until the source data and applicability are verified.

## 0. Reading Estimate Sources

- **Money:** `data/decision_rules.json` contains static demo resale, repair-cost, and recycling-recovery ranges. Its source fields describe broad Indian-market benchmark categories, not dated dealer quotes or an actively refreshed price feed. The rule bands do not model exact model/grade, locality, buyer demand, or repair scope. For repair, the engine displays estimated net resale as the resale range less the repair-cost range.
- **Device CO₂e:** `data/emission_factors.json` contains broad device-category factor ranges with assumption IDs. Its metadata names ITU-T L.1410, Fraunhofer IZM, and ecoinvent as benchmark references, but the file does not provide item-level citations, publication details, geography, or a verified system boundary for each value. Treat these as provisional assumptions, not measured footprints.
- **Offline scan fallback:** the sample INR and CO₂e values in `frontend/src/App.tsx` are hard-coded demo examples. They are not generated from the decision-rule or factor files.
- **Decision-engine credits:** the implementation credits 100% of the factor band for reuse, 85% for repair, and 25–35% for recycling. These are model assumptions, not guarantees that replacement production or virgin-material production was actually displaced.
- **Personal impact endpoint:** verified ledger entries currently use a fixed `3.5 kg CO₂e per kg` heuristic. The empty-ledger starting value (`29.8 kg CO₂e`) is seeded demo data. Neither value is calculated from the device factor table or supported by a device-specific source.
- **Route impact:** estimated CO₂e is calculated as modelled saved kilometres multiplied by the default three-wheeler CNG factor (`0.095 kg CO₂e/km`). Stop coordinates are approximate and the factor is a prototype assumption; actual routes, vehicles, fuel use, and emissions may differ. The collector earnings range is also fixed demo content, not a sourced wage or payout estimate.

Do not describe these estimates as live prices, verified emissions savings, or audited impact. A production estimate needs traceable source citations and dates, geography, technology, unit, system boundary, applicability limits, and uncertainty for each factor; unavailable inputs must remain unavailable rather than being presented as zero or as precise fact.

## 1. Waste Hierarchy Principles
KabadiPlus applies the European and Indian waste hierarchies:
$$\text{Reuse (Resell / Donate)} > \text{Repair-then-Reuse} > \text{Authorized Recycling} > \text{Safe Hazardous Disposal}$$
Plain landfilling, burning, or drain dumping is **never** offered as a legitimate pathway.

## 2. Embodied Carbon (CO₂e) Avoidance
The following are the prototype's broad factor bands for illustrative estimates. Reuse or refurbishment is assumed to displace some demand for a new replacement device; actual displacement is not measured.

| Device Category | Embodied Footprint (kg CO₂e) | Assumption ID | Reference Baseline |
| :--- | :--- | :--- | :--- |
| **Mobile Phone (Smartphone)** | 35.0 - 65.0 kg | `LCA_ITU_SMARTPHONE` | ITU-T L.1410 (80% manufacturing, 20% logistics) |
| **Feature Phone** | 15.0 - 30.0 kg | `LCA_FEATURE_PHONE` | Generic keypad phone LCA benchmark |
| **Laptop / Notebook** | 180.0 - 320.0 kg | `LCA_DELL_LAPTOP` | Dell / Apple Product Environmental Reports |
| **Desktop CPU Tower** | 250.0 - 450.0 kg | `LCA_PC_TOWER` | Fraunhofer IZM Desktop PC LCA |
| **LED Television (32"-55")** | 180.0 - 380.0 kg | `LCA_SMART_TV` | Smart TV manufacturing footprint |
| **Washing Machine** | 220.0 - 420.0 kg | `LCA_WASHING_MACHINE` | Major home appliance life-cycle reports |
| **Refrigerator** | 280.0 - 550.0 kg | `LCA_REFRIGERATION` | Compressor + insulation blowing agent footprint |
| **Air Conditioner** | 350.0 - 700.0 kg | `LCA_SPLIT_AC` | Refrigerant charge + copper/aluminium coils |
| **Ceiling Fan** | 45.0 - 90.0 kg | `LCA_DOMESTIC_FAN` | Copper winding + electrical steel stamping |

- **Reuse credit assumption**: 100% of the factor band.
- **Repair credit assumption**: 85% of the factor band.
- **Recycle credit assumption**: 25% - 35% of the factor band. This is a coarse prototype proxy; it is not tied to measured recovery yields or a specific recycler's process.

## 3. Transit Emission Factors (Collector Fleet)
Route optimization estimates transit kilometres saved by clustering pickup requests into shared loops rather than separate round-trips. Distances use approximate coordinates and modelled routes, not odometer readings.

| Vehicle Type | Emission Factor (kg CO₂e / km) | Fuel / Source |
| :--- | :--- | :--- |
| **Two-Wheeler (Electric)** | 0.020 kg CO₂e / km | Grid average electricity (India CEA baseline) |
| **Two-Wheeler (Petrol)** | 0.045 kg CO₂e / km | Standard 100-125cc commuter motorcycle |
| **Three-Wheeler (CNG - Auto/Loader)** | 0.095 kg CO₂e / km | Standard Delhi-NCR CNG cargo three-wheeler |
| **Light Commercial Vehicle (Diesel)** | 0.180 kg CO₂e / km | Tata Ace / Mahindra Bolero Maxi Truck |

### Route Savings Math
$$\text{Baseline km} = \sum_{i=1}^{n} 2 \times \text{distance}(\text{collector\_base}, \text{stop}_i)$$
$$\text{Route km} = \text{Tour distance}(\text{collector\_base} \to \text{stop}_1 \to \dots \to \text{stop}_n \to \text{collector\_base})$$
$$\text{Saved km} = \max(0, \text{Baseline km} - \text{Route km})$$
$$\text{CO}_2\text{e Saved (kg)} = \text{Saved km} \times \text{Vehicle Factor}$$

## 4. Integrity Standard
- No points or kg diversion claims are generated from photo uploads or scan requests.
- Impact credits and Eco Points are strictly awarded upon **verified two-party physical handover** (collector weight entry + citizen OTP/tap confirmation).
