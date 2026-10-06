# KabadiPlus

**Phase 1: foundations.** A voice-first e-waste appraisal and safety assistant for India's informal recyclers. The project is at the repository, data-contract, and frontend-shell stage. It is not yet a working scanner or an AWS deployment.

The intended golden path is **photo → safety warnings → estimated price range → listen → verified recycler**. The guiding rule is: **the model sees and explains; code and data tables decide money and safety.**

## Run the current project

Install Node.js 24, Python 3.12, and [uv](https://docs.astral.sh/uv/getting-started/installation/). From this directory:

```sh
uv sync --frozen
npm ci
npm run check
npm run dev
```

Open the localhost URL printed by Vite, normally `http://localhost:5173`. These commands work from the repository root in a terminal; on Windows, use PowerShell. The scripts select `.venv/Scripts/python.exe` on Windows and `.venv/bin/python` on Linux/macOS. `KABADIPLUS_PYTHON` can override the interpreter.

The frontend has English/Hindi switching, device-catalog browsing, responsive styling, and an explicitly disabled photo button. Hindi is the initial language when the browser language starts with `hi`. No uploads, permissions, location requests, accounts, or AWS calls occur in Phase 1. Dependency installation needs internet access; running the built shell does not need cloud services. Offline PWA/service-worker behavior has not been implemented.

## What is implemented

| Area | Phase 1 implementation |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind; bilingual shell and catalog |
| Taxonomy | 25 devices, 26 parts, 11 hazards; one canonical JSON file |
| Contracts | Strict Pydantic models; generated JSON Schema and TypeScript interfaces |
| Seeds | Part/device catalogs; 13 material-grade price rows; EN/HI draft hazard rules |
| Consistency | Python tests plus compile-time icon coverage and generated-file drift checks |
| Infrastructure | SAM storage template: eight DynamoDB tables and two private S3 buckets |
| CI | Checks on pushes/PRs plus a SAM syntax-validation job |
| Documentation | Decisions, architecture, data sources, limitations, and phase checkpoints |

There are **no verified recycler records**, **no real-photo evaluation results**, and **no emission factors** in this phase. They remain empty instead of being invented. Monetary seed values and weight priors are illustrative; their dates describe the seed revision, not a market check. Every hazard rule remains a draft pending occupational-safety and Hindi-language review. Hazard seeds are not surfaced as approved advice in the frontend.

## Repository map

```text
frontend/        Bilingual shell, icon registry, generated TypeScript contracts
backend/core/    Data access, Pydantic models, generated enum types
backend/tests/   Foundation and contract checks
backend/prompts/ Generated taxonomy fragment; full vision prompt is Phase 2
backend/functions/ and backend/agent/  Next-phase implementation boundaries
data/            Canonical taxonomy, icons, rules, policies, schemas, provenance
infra/           SAM storage scaffold and future authorization boundary
eval/            Empty real-image manifest and honest evaluation status
docs/            Design decisions, verification record, and original build brief
scripts/         Code generation and local check commands
```

## Updating the taxonomy or seed prices

1. Edit `data/taxonomy.json` when an enum or material grade changes.
2. Update the matching catalog, hazard rule, price mapping, and `data/icons.json` in the same commit.
3. Add an icon to `frontend/src/components/Icon.tsx` if a new icon name is used.
4. Run `npm run contracts`, then `npm run check`.

Do not hand-edit generated files. Python owns contract validation; exported JSON Schema captures structural rules, while cross-field rules such as confidence/re-shoot consistency also require the Python validator.

Seed prices are editable in `data/seed/scrap_prices.json` without altering application code. An `unpriced` entry uses `null`, never a fabricated zero-valued quote. The daily DynamoDB refresh pipeline is Phase 3/8 work. Current values are **not live market prices** and cannot support a real appraisal.

## AWS choices still needed

- Which AWS region should the application use?
- Which Bedrock multimodal model IDs or inference profiles can this account invoke there?
- Will hosting use its AWS-provided URL or an existing custom domain?

No region, model, or domain has been chosen for deployment. Do not paste access keys in chat or commit them. Later cloud setup will use the AWS SDK credential chain and scoped roles.

`npm run deploy` and `npm run teardown` currently exit with a clear **not implemented** message. They do not deploy the partial storage template. The infrastructure template can be checked locally with `uv run cfn-lint infra/template.yaml`; with AWS SAM CLI installed, use `sam validate --lint --template-file infra/template.yaml --region us-east-1` for syntax validation only. That validation region does not select a deployment region.

## Status and next checkpoint

See [Phase 1 verification](docs/PHASE_1_CHECKPOINT.md) for actual results and [all checkpoints](docs/CHECKPOINTS.md) for the remaining gates.

Optional browser-shell checks are scaffolded separately:

```sh
npx playwright install chromium
npm run test:shell
```

They were **not run** here because the Chromium download returned an invalid archive. Do not count them as passed, and do not confuse a desktop browser check with real low-end Android/3G evaluation. They are not a required Phase 1 enum-consistency gate.

**Phase 2 starts with the full vision prompt, a mock/recorded adapter, and the Bedrock adapter behind one interface.** Its real-photo checkpoint needs at least ten licensed or user-owned photos, ground-truth labels, and confirmed model access. The later 15-image evaluation must report failures, not infer success from schema tests.

The source archive includes a Git bundle with the phase-labelled local history. To restore that history into a separate directory, run `git clone kabadiplus-phase1.bundle kabadiplus-history` from the archive root. No GitHub remote or push is configured.

## Architecture and honest limits

See [Architecture](docs/ARCHITECTURE.md), [Decisions](docs/DECISIONS.md), [Limitations](docs/LIMITATIONS.md), and [Impact assumptions](docs/IMPACT_ASSUMPTIONS.md).

Cost per scan, photo-recognition accuracy, hazard recall, real-device latency, and measured diversion are **not measured**. There is no live scan to benchmark. The project does not claim current Indian regulatory authorization for any business. Official authorization evidence will be checked before contacts are added in Phase 7.
