# Phase 1 checkpoint

Verified on 2026-10-07 in Asia/Kolkata (2026-10-06 UTC).

## Built

- React/Vite/TypeScript/Tailwind local shell with English/Hindi language switching and device-catalog browsing.
- Python 3.12 strict Pydantic vision/request/appraisal contracts and read-only catalog access.
- Canonical 25-device / 26-part / 11-hazard taxonomy, 13 price rows, bilingual hazard drafts, icon mappings, and generated Python/TypeScript/JSON Schema artifacts.
- Data-consistency and invalid-input tests, dependency locks, CI skeleton, and a SAM storage scaffold.
- Decisions, limitations, architecture, impact assumptions, and future evaluation gates.

## Required foundation checks: PASS

| Check actually run | Result |
| --- | --- |
| Generated Python enums, TypeScript unions/icons, prompt taxonomy freshness | Passed |
| Pydantic JSON Schema and generated TypeScript API freshness | Passed |
| Ruff checks | Passed |
| Pytest foundation/contract tests | **95 passed** |
| Every part/hazard resolves in seed and icon data | Passed, included above |
| Unknown enums, invalid weights/confidence, coercion, low-confidence contradictions | Rejected in tests |
| `cfn-lint infra/template.yaml` | Passed |
| TypeScript type checking and Vite production build | Passed |

Local tools: Python 3.12.14, Node 24.19.0, npm 11.9.0, uv 0.12.19. Exact package versions are in the lockfiles. The initial icon check caught a missing Router registry entry; it was fixed and the successful checks rerun.

Production output observed: JavaScript 302.65 kB / 95.56 kB gzip, CSS 12.08 kB / 3.58 kB gzip, HTML 0.65 kB / 0.38 kB gzip. These are build artifact sizes, **not** measured network/device load performance.

## Not verified or not implemented

- Browser-shell tests: authored but **not run**. The browser download returned an invalid archive. Visual/mobile behavior is not certified.
- GitHub Actions: configured, not executed on GitHub; no remote repository is connected.
- SAM CLI validation job: configured; locally the template was checked with cfn-lint, not SAM CLI.
- AWS provisioning, live lifecycle inspection, Bedrock/Polly access, and real-photo evaluation: not run.
- Photo scanning, calculated prices, runtime safety enforcement, PWA offline behavior, audio, verified recycler routing, and role authorization: later phases.
- Hazard text: draft, not professionally approved. Price and weight data: illustrative, not market- or field-validated.

## Reproduce

```sh
uv sync --frozen
npm ci
npm run check
npm run dev
```

## Next phase's first step

Implement the full vision system prompt plus a vision-client interface and recorded/mock adapter, then the live Bedrock adapter after the owner confirms region and model access. Obtain at least ten real, licensed or user-owned test photos with labels. Passing this foundation gate does not satisfy the real-photo checkpoint.
