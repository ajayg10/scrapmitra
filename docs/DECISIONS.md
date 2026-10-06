# Phase 1 decisions

| Choice | Decision and reason |
| --- | --- |
| Backend | Python 3.12 and Pydantic v2. Fits the brief and the future Bedrock/Strands adapters. No cloud SDK is used yet. |
| Frontend | React + Vite + TypeScript + Tailwind; Node 24 for development and CI. Dependencies are locked in `package-lock.json`. |
| Infra | AWS SAM. The brief permits SAM instead of CDK. The Phase 1 storage template is syntax-checked; account and runtime resources remain later work. |
| Python dependencies | `uv.lock` and `uv sync --frozen`; CI uses the same uv version as local verification. |
| Deployment settings | Region, Bedrock model/inference profile, hosting choice, and custom domain await the owner. No cloud deployment has occurred. |
| Taxonomy | `data/taxonomy.json` is authoritative. Python literals, TS unions, icon types, and the prompt taxonomy fragment are generated. |
| Vision grade vs market grade | Keep `low/mid/high/na` in vision output. Derive `bare_bright/insulated/clean/mixed/…` for price lookup from the part catalog. The model cannot select a more profitable price grade. |
| Missing hazard coverage | Add `HAZ_ASBESTOS_SUSPECTED` plus `suspect_insulation`, `mercury_lamp`, and `sealed_container`. These fill gaps between the requested safety coverage and the starter enums. A photograph does not diagnose asbestos. |
| Bilingual seed shape | Store parallel `text.en` and `text.hi` blocks containing warning, do/don't, exposure escalation, and disposal route. This avoids mixed-language arrays in the original sample key design. |
| Hazard provenance | Safety text is project-authored, conservative draft material. Primary-source scope is recorded. Expert review remains pending, not implied by having a URL. |
| Device hazards | `possible_hazards` are precautionary class defaults, not proof of a visible hazard. For example, older LCD backlights may contain mercury; this is not claimed for every LED screen. |
| Unknown parts | Resolve to `other/na`; leave monetary values null. Later valuation must disclose excluded parts and incomplete totals. |
| Price basis | Illustrative scrap values only. No reuse/resale premium, no live pricing claim, no guaranteed offer. Copper windings conservatively map to insulated material. |
| Guest ownership | A body `owner_id` is not authentication. A later API must issue a signed guest session, derive owner server-side, and authorize image keys/scan access against it. Phase 1 has contracts only. |
| Upload cap | The request contract caps claimed size at 300 KiB. The future S3/API implementation must verify actual bytes, decode the image, and strip metadata again; JSON validation alone is not a storage limit. |
| Logging | Future traces must redact tokens, signed URLs, image content, owner identifiers, and location. Photos can contain sensitive data even without a name field. |
| Recyclers | Empty until official Indian records and categories are checked. No fictional phone numbers or placeholder links. |
| Impact | Empty factors. A scan is not proof of diversion. Future reporting must distinguish potential recovery from confirmed handover. |
| Photos and metrics | No real-image fixtures were supplied. No fabricated recognition accuracy, safety recall, latency, or cost statistics. |
| Incremental work | Photo capture, PWA caching, Bedrock retries, deterministic valuation, hazard enforcement, voice, and recycler routing follow their own checkpoints. No placeholder successes. |

## Deliberate changes to the brief

- Phase 1 adds a hazard ID and three part IDs so requested hazard categories can resolve consistently.
- The API contract omits caller-controlled ownership, and `value_range` can be null when nothing is priceable. `valuation_complete` makes partial totals explicit.
- Vision part IDs must be unique per single-device observation to avoid counting the same part twice. Multiple instances should be combined by the vision pipeline; pile mode will have separate per-item observations later.
- The safe re-shoot wording must ask for another exterior angle; it must not encourage an untrained user to open a microwave, CRT, battery pack, or other hazardous equipment.
- A daily seed refresh must preserve the market source's true observation date. It must not mark unchanged illustrative data as fresh market evidence.
- Seven-day S3 expiration is a lifecycle target with asynchronous removal, not a promise of deletion at an exact timestamp. Longer image retention on explicit correction consent needs a separate retention design before implementation.

## Primary technical references consulted

- [AWS Python Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [SAM template anatomy](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-template-anatomy.html)
- [Vite getting started](https://vite.dev/guide/)
- [Pydantic strict mode](https://pydantic.dev/docs/validation/2.12/concepts/strict_mode/)
- [uv in GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/)
- [CloudFormation linter](https://github.com/aws-cloudformation/cfn-lint)

Safety-source URLs, access dates, and limited scopes are in `data/sources.json`; they do not establish Indian legal compliance or professional approval of the draft rules.
