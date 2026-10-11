# Impact assumptions

The prototype currently contains illustrative factors in `data/emission_factors.json` and demo impact calculations. They are not a production-validated factor set. In particular, the personal impact endpoint uses a fixed `3.5 kg CO₂e/kg` heuristic for ledger entries and a seeded `29.8 kg CO₂e` starting value for accounts without entries; neither is calculated from the device factor table. See `ASSUMPTIONS.md` for the current calculation paths and their limits.

- A photo is not evidence that material was recycled. Track scanned/potential material separately from verified handover.
- Every production factor needs a source, geography, technology, unit, system boundary, publication date, applicability limits, and uncertainty.
- Recovery ratios and CO2e factors must not be inferred by an LLM or copied across incompatible recycling routes.
- Repeated scans and idempotent retries must not increment diverted mass twice.
- Any estimate must expose its assumptions and uncertainty; empty or missing factors yield unavailable, not zero.
- Admin aggregation and a documented minimum bucket size belong to Phase 10, alongside authorization and privacy tests.

Do not present the current demo dashboard values as measured or audited environmental impact.
