# Architecture & Engineering Decisions: KabadiPlus v2

## AWS Account & Infrastructure Decisions (Confirmed with Project Owner)
| Decision | Value / Choice | Rationale |
| :--- | :--- | :--- |
| **AWS Region** | `ap-south-1` (Asia Pacific - Mumbai) | Lowest latency for India-based mobile users and local data residency alignment. |
| **Bedrock Multimodal Model** | Amazon Nova (`amazon.nova-pro-v1:0` / `amazon.nova-lite-v1:0`) with fallback to Claude 3.5 Sonnet | State-of-the-art vision extraction natively supported on Bedrock with low per-token inference cost. |
| **Hosting Mode** | Local PWA preview & S3/CloudFront SPA distribution | PWA installable on Android; static assets cached on CloudFront edge locations across India. |
| **Local Evaluation Adapter** | `MockVisionClient` | Zero-cloud-cost testing, reproducible evaluation runs, and offline developer velocity. |

## Core System Decisions

| Area | Decision & Rationale |
| :--- | :--- |
| **The Headline Value** | A previous hackathon submission lost points for being "a single AI call". In v2, the vision call is merely an input; the core product value is the deterministic Circular Decision Engine, the batch route clustering engine, and the two-party verified handover ledger. |
| **Waste Hierarchy** | The engine evaluates `Reuse (Sell / Donate) > Repair-then-Reuse > Authorized Recycling > Safe Hazardous Disposal`. Plain landfilling or burning is never an option. |
| **Safety Overrides Economics** | If a device has a swollen battery, burn marks, or compromised high-severity component, resale and repair are strictly blocked. It routes only to authorized hazardous disposal. |
| **Route Clustering** | A greedy 2.0 km radius groups pickup requests. 2-opt route optimization measures real distance saved vs separate trips, preventing fuel burn and air pollution. |
| **Anti-Gaming** | Eco Points are awarded only upon verified physical handover. Single-use QR tokens prevent reuse fraud; weight sanity checks catch abnormal inputs; self-handover is prevented. |
| **Honesty & Transparency** | All seed prices, demo collectors, demo households, and recyclers are explicitly labelled `DEMO DATA`. No fictional phone numbers of real businesses. |
