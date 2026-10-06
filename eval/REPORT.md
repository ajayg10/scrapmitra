# Evaluation report — not yet run

Real images: **0**. Model invocations: **0**. Part-ID accuracy: **not measured**. Hazard recall: **not measured**. Price-range sanity on real photos: **not measured**. Latency: **not measured**. Cost per scan: **not measured**.

Foundation tests exercise synthetic contracts and catalog invariants; they are not image evaluation. No accuracy percentages or fabricated per-image outcomes are reported.

Phase 2 requires at least ten real images and Phase 8 at least fifteen. Each entry in `labels.json` should record an image path, provenance/consent, expected device, part IDs and hazard IDs, and any ambiguous labels. Keep EXIF-free photos out of Git unless their publication is explicitly permitted. The future `run_eval.py` must list individual failures and refuse to declare success on an empty manifest.
