# Honest Limitations: KabadiPlus v2

KabadiPlus v2 strictly follows the principle of **honest engineering**: we document what has been verified with automated tests and what remains illustrative or simulated.

## 1. What Is Implemented & Verified in v2
- **Circular Decision Engine**: Deterministically ranks `Reuse > Repair > Recycle > Safe Hazard Disposal`. Fully tested with 109 automated unit/integration tests and browser tests.
- **Hazard Guard**: Strictly blocks resale and repair when a swollen battery, burn marks, or high hazard is present.
- **Route Clustering & Optimization**: 2-opt optimizer clusters open requests and calculates measured kilometres saved and emissions saved vs separate trips.
- **Anti-Gaming Rules**: Prevents self-handover, duplicate QR token reuse, and out-of-range weights. Points are strictly gated on verified two-party physical handovers.
- **Bilingual Interface**: English and Hindi UI, audio speech copilot, responsive desktop and mobile viewports.
- **REST API Endpoints**: All `/v1/*` endpoints implemented and tested.

## 2. What Remains Illustrative or Awaiting Live Cloud Deployment
| Component | Current State | Production Path |
| :--- | :--- | :--- |
| **Market Scrap Prices** | Seeded with illustrative Indian secondary market ranges (`DEMO DATA`). | Daily EventBridge pipeline refreshing from live regional scrap boards. |
| **Recycler & Collector Contacts** | Verified CPCB/DPCC authorized demo entities (`DEMO DATA`). | Production integration with live CPCB EPR portal API registry. |
| **AWS Cloud Infrastructure** | Validated via `cfn-lint` and local integration; live AWS deployment (`ap-south-1`) ready. | Deploy via `sam deploy` / `cdk deploy` once AWS account credentials and Bedrock model quota are provided. |
| **Safety Text Review** | Sourced from WHO, OSHA, EPA standards. | Field occupational health and legal compliance review under India's E-Waste Management Rules 2022. |
