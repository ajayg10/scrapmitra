# Impact assumptions

No emission factors are configured and no impact is calculated in Phase 1.

- A photo is not evidence that material was recycled. Track scanned/potential material separately from verified handover.
- Every later factor needs a source, geography, technology, unit, system boundary, publication date, and applicability limits.
- Recovery ratios and CO2e factors must not be inferred by an LLM or copied across incompatible recycling routes.
- Repeated scans and idempotent retries must not increment diverted mass twice.
- Any estimate must expose its assumptions and uncertainty; empty or missing factors yield unavailable, not zero.
- Admin aggregation and a documented minimum bucket size belong to Phase 10, alongside authorization and privacy tests.

The source file remains `data/emission_factors.json` with an empty `factors` list. No realistic-looking dashboard data has been fabricated.
