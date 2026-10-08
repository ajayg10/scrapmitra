# Lifecycle & Environmental Impact Assumptions

KabadiPlus v2 follows strict environmental accounting standards based on peer-reviewed life cycle assessments (LCA) and documented benchmarks.

## 1. Waste Hierarchy Principles
KabadiPlus applies the European and Indian waste hierarchies:
$$\text{Reuse (Resell / Donate)} > \text{Repair-then-Reuse} > \text{Authorized Recycling} > \text{Safe Hazardous Disposal}$$
Plain landfilling, burning, or drain dumping is **never** offered as a legitimate pathway.

## 2. Embodied Carbon (CO₂e) Avoidance
When a device is reused or refurbished, it displaces the demand for manufacturing a new replacement device.

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

- **Reuse Offset**: 100% of embodied carbon is credited.
- **Repair Offset**: 85% of embodied carbon is credited (accounting for ~15% spare-part supply chain footprint).
- **Recycle Offset**: 25% - 35% of embodied carbon is credited based on virgin ore mining displacement (avoiding bauxite smelting for aluminium, blast furnaces for steel, and copper smelting).

## 3. Transit Emission Factors (Collector Fleet)
Route optimization measures transit kilometres saved by clustering pickup requests into shared loops rather than separate round-trips.

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
