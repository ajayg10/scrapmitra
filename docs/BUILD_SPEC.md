# KabadiPlus: Master Build Prompt

> Paste everything below the line into Claude Code / Cursor / any coding agent. Work phase by phase. Do not start a phase until the previous phase's checkpoint passes.

---

## 0. ROLE AND MISSION

You are a senior full-stack, cloud and applied-AI engineer. Build **KabadiPlus** from scratch: a voice-first, AI-powered e-waste appraisal and safety assistant for India's informal recyclers (kabadiwalas), deployed on AWS.

Target: a national-level hackathon submission, **Waste & Energy track** (sub-themes: e-waste, informal recyclers, segregation/recycling), hosted by AWS. Eligibility requires either using an AWS open-source tool ("Build It": Strands Agents SDK, Cedar, SAM CLI, etc.) or deploying on AWS ("Ship It"). This build does BOTH.

Judging philosophy to obey at every decision:
- "A small problem solved well beats a big one solved vaguely."
- "One feature that runs beats five that almost do."
- "Would someone who isn't on your team know what to do with it?"

So: the golden path (photo to appraisal to safety to voice to recycler) must be flawless, deterministic in behaviour, and understandable in under 10 seconds by a stranger. Everything else is layered on top only after that works.

## 1. PROBLEM CONTEXT

India generates millions of tonnes of e-waste yearly, and an estimated 80-90% is handled by the informal sector. Informal workers:
1. Do not know what valuable parts are inside a device (PCBs, copper windings, compressors, intact chips), so middlemen underpay them.
2. Handle hazardous components unsafely (Li-ion batteries, CRT lead glass, mercury in CFLs/tubes, refrigerant gas in ACs/fridges, capacitors, toner), burning or breaking them.
3. Cannot easily reach authorized recyclers, so material leaks to open burning and dumping.

Users are often low-literacy, on low-end Android phones, on weak 2G/3G/4G, and speak Hindi or a regional language. Design for them first.

## 2. USERS AND ROLES

| Role | Who | Needs | Access |
|---|---|---|---|
| Picker (default, guest) | Kabadiwala / citizen | Scan, price range, safety, voice, recycler contact | No login. Sees only own scans (device-scoped anonymous ID) |
| Certified buyer | Authorized aggregator/recycler | See incoming listings near them | Login (Cognito) |
| Municipal / NGO admin | City body | Aggregate impact, hazard hotspots | Login (Cognito), aggregates only, no personal data |

## 3. CORE ENGINEERING PRINCIPLE (non-negotiable)

**The LLM sees and explains. Code and data tables decide money and safety.**
- Vision model: identifies device and parts, outputs structured JSON constrained to a fixed enum taxonomy.
- Value Engine: pure deterministic code + DynamoDB price table. No LLM arithmetic, no LLM-invented prices.
- Hazard Guard: rule table lookup. No LLM-invented safety advice. The LLM may only rephrase approved text into the user's language, never add or remove steps.
- Never present a single fake-precise price. Always show a range, a confidence band, the price source and its last-updated date.
- Never claim certainty. When confidence is low, ask for another photo.

## 4. FEATURES (priority order)

### P0: GOLDEN PATH (must be flawless before anything else)

**F1. Snap & Scan**
- Home screen: one huge camera button, language switcher (Hindi default if device language is Hindi, else English), no signup, no onboarding wall.
- Capture via `<input type="file" accept="image/*" capture="environment">` plus gallery option.
- Client-side compression (canvas or `browser-image-compression`): max 1280px longest side, JPEG ~0.7, target under 300 KB. EXIF stripped (privacy, location).
- Upload directly to S3 using a presigned PUT URL from `POST /upload-url`. Show progress and retry on failure. Queue-and-retry if offline.

**F2. Vision Inspection (Amazon Bedrock multimodal)**
- Call a Bedrock multimodal model (Amazon Nova family or Claude; confirm which your account/region can access first, and make the model ID an env var).
- Returns STRICT JSON validated against a schema (see section 8). Part IDs and hazard IDs are restricted to the enums in section 7.
- On invalid JSON or unknown enum: one automatic retry with the validation error fed back. On second failure return a friendly "try another photo" response, never a crash.
- If `overall_confidence < 0.6`: response includes `needs_more_photos: true` and a `suggested_angle` (e.g. "show the back panel", "open the case if safe"). UI shows a guided re-shoot.
- Prompt must instruct the model: never guess brand/capacity if unreadable, list unknowns, and estimate weights conservatively using typical device-class weight priors supplied in the prompt.

**F3. Value Engine (deterministic)**
- For each part: `value_min = weight_kg * price_per_kg_min[material_grade]`, `value_max` likewise with max price. Weight is itself a range (`weight_g_min`, `weight_g_max`) derived from the part's `est_weight_g` +/- the class uncertainty.
- Total = sum of parts, then apply a `dealer_margin_discount` range to show "what a fair dealer can pay you" (configurable, default 10-25%).
- Prices read from DynamoDB `ScrapPrices`; each row has `source`, `last_updated`, `grade`.
- UI always shows: range in INR, "based on [source], updated [date]", and a confidence label (High / Medium / Low) derived from vision confidence and price freshness.
- A scheduled Lambda (EventBridge, daily) refreshes prices. For the hackathon it may refresh from a curated seed file or an editable admin JSON, but the pipeline structure must exist and be documented honestly (seed vs live).

**F4. Hazard Guard (rule-based)**
- DynamoDB `HazardRules` keyed by `hazard_id` with severity, icon, plain-language warning (EN + HI minimum), DO list, DON'T list, exposure first-aid, and disposal route.
- Hazards render as a red banner with an icon ABOVE the price, always, and are never collapsible when severity is HIGH.
- Coverage: Li-ion/Li-poly battery, lead-acid battery, CRT (lead glass, phosphor), CFL/tube (mercury), AC/fridge refrigerant and compressor oil, capacitors, toner/ink cartridges, broken LCD/LED panels, PCB burning fumes (brominated flame retardants), asbestos-era insulation (rare), unknown-sealed-container.
- Acceptance: 100% of eval images containing a hazardous part must trigger the right hazard.

**F5. Voice Layer**
- All user-facing result text is available in Hindi and English minimum; add one more regional language (e.g. Tamil or Marathi or Bengali) if time allows, via i18n JSON for static UI strings and Amazon Translate (or the Bedrock model, constrained) for dynamic text.
- One-tap big "Listen" button using Amazon Polly (neural voice). **Verify Polly's supported languages and voices for your region first**; for unsupported languages, fall back to the browser `SpeechSynthesis` API and say so in the README.
- Cache synthesized audio in S3 keyed by hash of (text, lang, voice) to cut cost and latency.
- Optional voice input with Amazon Transcribe (or browser SpeechRecognition fallback) for queries such as "isse kitna milega?". Keep this optional; text and buttons must fully work without it.
- Audio script order: hazards first, then parts, then price range, then next action.

**F6. Recycler Connect**
- DynamoDB `Recyclers`: name, city, state, lat, lng, accepted categories, authorization reference (e.g. CPCB/SPCB authorization, field kept generic and verified by you before claiming), phone, WhatsApp, opening hours, verified flag.
- Seed only entries you can verify from public official lists; label the rest "demo data" in the UI and README. Do not invent phone numbers of real businesses.
- Nearest search: browser geolocation (ask permission, fall back to pin-code/city picker), then haversine over the seed set (or Amazon Location Service if time permits).
- Actions: Call, WhatsApp (`https://wa.me/<number>?text=<prefilled scan summary, URL-encoded>`), Directions (maps deep link).
- Route only to authorized recyclers. Show distance and accepted categories.

### P1: DIFFERENTIATORS (only after P0 passes all checkpoints)

**F7. Agent orchestration (Strands Agents SDK; the "Build It" proof)**
- Implement an agent with tools: `identify_parts`, `lookup_price`, `check_hazards`, `find_recycler`, `explain_in_language`, `request_better_photo`.
- The agent decides tool order, calls `request_better_photo` on low confidence, and must obtain price and hazard data ONLY via tools.
- Log every tool call with inputs/outputs (redact nothing sensitive since none is stored). Surface a collapsible **"How I decided"** panel in the UI showing the trace in plain language.
- Keep the P0 deterministic pipeline as a fallback path if the agent fails or times out. The agent wraps the pipeline; it never replaces its safety guarantees.

**F8. Safe Dismantling Guide**
- For the top-value parts, show 3-5 icon-led steps from a curated `DismantleGuides` table (not LLM-generated), always starting with "remove/avoid the hazardous part first".
- Each step: icon, 6-10 word instruction, audio.

**F9. Fair Price Meter**
- User enters or speaks the price a middleman offered. `POST /offer-check` compares to the estimated range: GREEN (within or above), AMBER (up to 25% below min), RED (more than 25% below).
- Returns a polite counter-offer sentence in the user's language, using the estimated range and part breakdown ("Is mein tamba aur PCB hai, kam se kam Rs X milna chahiye").
- Rule-based verdict; language rendering only may use the LLM/Translate.

**F10. Pile Mode**
- Photograph a cart/pile; model detects multiple items, returns items[] each with parts, plus combined totals and per-item breakdown. Cap items per photo (e.g. 8) and flag "overlapping items, estimate is rough".
- Reuse the same Value Engine and Hazard Guard per item, deduplicating hazard banners.

**F11. Correction Loop**
- "Ye galat hai / This isn't right" lets the user pick the right device/part from a list.
- Store `{scan_id, original_prediction, user_correction, image_key}` in `Corrections` (with consent line: "Help us improve; image kept 7 days" or opt-in to keep longer).
- Show a counter on the admin dashboard to demonstrate the improvement path. Document how corrections would feed evaluation and later fine-tuning or prompt few-shot examples.

### P2: IMPACT AND GOVERNANCE

**F12. Impact Ledger**
- Each scan writes an estimate: `kg_diverted_est`, `co2e_avoided_est`, `hazards_flagged[]`, `inr_value_est_range`, `city`, `device_type`.
- Emission and recovery factors live in `/data/emission_factors.json` with sources and assumptions documented in `/docs/IMPACT_ASSUMPTIONS.md`. Label all figures "estimates".

**F13. Admin Dashboard**
- React page with charts: scans over time, kg diverted by material, hazard hotspots by city/area (aggregated, k-anonymity threshold so tiny buckets are hidden), top recovered materials, corrections count.
- Seed realistic demo data, clearly labelled "DEMO DATA" in the UI and README.

**F14. Role-based access (Cedar / Amazon Verified Permissions)**
- Define Cedar policies for the three roles in section 2. Enforce in the API layer (Lambda authorizer or middleware) with unit tests for allow and deny cases.
- Pickers: own scans only. Buyers: listings and recycler profile. Admins: aggregate endpoints only, never raw scan images or personal identifiers.

## 5. TECH STACK

**Frontend**
- React + Vite + TypeScript, Tailwind CSS.
- PWA: `vite-plugin-pwa`, installable, offline app shell, service worker caching of UI and i18n bundles, background retry for failed uploads.
- i18n: `react-i18next` with `/locales/en.json`, `/locales/hi.json` (+ one regional).
- Design: high contrast, min 48px tap targets, icon-led, 6th-grade reading level, minimal text, works at 360px width, tested on a throttled network.
- Charts (admin): Recharts.
- Hosting: AWS Amplify Hosting (or S3 + CloudFront).

**Backend**
- API Gateway (HTTP API) to AWS Lambda (Python 3.12 or Node 20; pick one and stay consistent).
- Pydantic (Python) or Zod (Node) for strict request/response and vision-JSON validation.
- Powertools for AWS Lambda for logging, tracing, metrics, idempotency.

**AI / ML**
- Amazon Bedrock multimodal model for vision (model ID via env var; confirm access in your region early, as approval can take time).
- Strands Agents SDK for orchestration (P1).
- Amazon Translate (or constrained Bedrock) for dynamic translation.
- Amazon Polly (neural) for speech; Amazon Transcribe for optional voice input.

**Data**
- S3: `uploads` bucket (lifecycle rule: delete after 7 days; block public access; CORS limited to the app origin), `audio-cache` bucket.
- DynamoDB tables (on-demand): `ScrapPrices`, `HazardRules`, `Recyclers`, `DismantleGuides`, `Scans`, `Corrections`, `ImpactAgg`, `OfferChecks`.
- EventBridge Scheduler for the price-refresh Lambda.

**Auth and policy**
- Cognito (admin and buyer only; pickers are anonymous with a device-scoped random ID).
- Cedar policies (Verified Permissions or local Cedar evaluation).

**Infra as code and tooling**
- AWS CDK (TypeScript) or SAM: one-command deploy (`npm run deploy`) and one-command teardown.
- Local mode: SAM CLI and/or LocalStack, with the Bedrock call behind an interface so a mock/recorded-response adapter lets the app run with zero cloud cost.
- Tests: pytest/vitest for units, a contract test for the vision JSON schema, Playwright for the golden-path E2E.
- CI: GitHub Actions running lint, tests, and `cdk synth`.

## 6. ARCHITECTURE

```
[PWA on phone]
   |  1. POST /upload-url ---------------------> [API GW] -> [Lambda: presign] -> S3
   |  2. PUT image (compressed) ---------------> S3 (uploads, 7-day lifecycle)
   |  3. POST /scan {image_key, lang} ---------> [API GW] -> [Lambda: scan-orchestrator]
   |                                                  |-> Bedrock vision (strict JSON)
   |                                                  |-> validate vs enum taxonomy (retry once)
   |                                                  |-> Value Engine  <-> DynamoDB ScrapPrices
   |                                                  |-> Hazard Guard  <-> DynamoDB HazardRules
   |                                                  |-> Translate (dynamic text) / i18n
   |                                                  |-> write Scans + ImpactAgg
   |  <-------------- appraisal JSON -----------------+
   |  4. POST /speech {text, lang} -------------> [Lambda] -> Polly -> S3 audio-cache -> signed URL
   |  5. GET /recyclers?lat&lng&cat -----------> [Lambda] -> DynamoDB Recyclers (haversine)
   |  6. POST /offer-check, /scan/{id}/correct -> [Lambda] -> DynamoDB
   v
[Admin dashboard] -> GET /impact/summary -> [Cedar authz] -> ImpactAgg (aggregates only)

[EventBridge daily] -> [Lambda: price-refresh] -> ScrapPrices
[Strands Agent (P1)] wraps steps 3-5 as tools, with a deterministic fallback
```

## 7. TAXONOMY (the contract between AI and code)

Define in `/data/taxonomy.json` and import everywhere (prompt, validator, Value Engine, UI icons).

**device_type enum (starter set):** `mobile_phone`, `feature_phone`, `laptop`, `desktop_cpu`, `crt_monitor`, `lcd_monitor`, `crt_tv`, `led_tv`, `keyboard`, `mouse`, `printer`, `router_modem`, `charger_adapter`, `cables_wires`, `ceiling_fan`, `microwave`, `washing_machine`, `refrigerator`, `air_conditioner`, `inverter_ups`, `battery_pack`, `cfl_tube_light`, `power_bank`, `speaker_audio`, `unknown`.

**part_id enum (starter set):** `pcb_low_grade`, `pcb_mid_grade`, `pcb_high_grade`, `copper_wire`, `copper_winding_motor`, `copper_transformer`, `aluminium_heatsink`, `aluminium_body`, `steel_frame`, `brass_fitting`, `plastic_abs`, `li_ion_cell`, `lead_acid_cell`, `compressor_unit`, `crt_tube`, `lcd_panel`, `ram_chip`, `cpu_chip`, `hdd_drive`, `capacitor_large`, `magnet_neodymium`, `toner_cartridge`, `unknown_part`.

**hazard_id enum:** `HAZ_LI_ION`, `HAZ_LEAD_ACID`, `HAZ_CRT_LEAD`, `HAZ_MERCURY`, `HAZ_REFRIGERANT`, `HAZ_CAPACITOR_CHARGE`, `HAZ_TONER_DUST`, `HAZ_BROKEN_GLASS_LCD`, `HAZ_PCB_BURN_FUMES`, `HAZ_UNKNOWN_SEALED`.

**material_class + grade:** `copper` (bare bright, insulated), `aluminium` (clean, mixed), `brass`, `steel`, `pcb` (low, mid, high), `battery_cell`, `plastic`, `compressor`, `other`.

Adding a value requires updating the taxonomy file, the prompt, the validator, price/hazard seeds, and the icon map in one commit. Add a test that fails if any enum is missing from any seed or icon map.

## 8. DATA CONTRACTS

**Vision output schema (validate strictly):**
```json
{
  "device_type": "enum",
  "brand_guess": "string|null",
  "condition": "working|damaged|burnt|unknown",
  "parts": [
    {"part_id": "enum", "name": "string", "material_class": "enum",
     "grade": "low|mid|high|na", "est_weight_g": 0, "confidence": 0.0}
  ],
  "hazards_detected": ["hazard enum"],
  "overall_confidence": 0.0,
  "needs_more_photos": false,
  "suggested_angle": "string|null",
  "unknowns": ["string"]
}
```

**DynamoDB items (key design):**
- `ScrapPrices`: PK `material_class`, SK `grade`; attrs `price_per_kg_min`, `price_per_kg_max`, `currency`, `source`, `last_updated`, `region`.
- `HazardRules`: PK `hazard_id`; attrs `severity`, `icon`, `warning_en`, `warning_hi`, `do[]`, `dont[]`, `exposure_help`, `disposal_route`.
- `Recyclers`: PK `recycler_id`; attrs `name`, `city`, `state`, `lat`, `lng`, `categories[]`, `authorization_ref`, `phone`, `whatsapp`, `verified`, `is_demo`; GSI on `city`.
- `Scans`: PK `owner_id` (device or user), SK `scan_id`; attrs `device_type`, `parts[]`, `value_min`, `value_max`, `hazards[]`, `confidence`, `lang`, `created_at`, `ttl`.
- `Corrections`: PK `scan_id`, SK `correction_id`; attrs `original`, `corrected`, `consent_keep_image`.
- `ImpactAgg`: PK `city#YYYY-MM`, SK `metric`; attrs counters. Write via atomic `ADD`.
- `OfferChecks`: PK `scan_id`, SK `ts`; attrs `offered`, `verdict`.

**Seed data:** `/data/seed/*.json` with realistic but clearly labelled illustrative values and a `source` field. Never present seed prices as live market data. Prices must be editable without a code change.

## 9. API (all JSON; versioned under `/v1`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/upload-url` | Presigned S3 PUT URL (content-type and size limited) |
| POST | `/v1/scan` | `{image_key, lang, owner_id}` returns full appraisal JSON |
| POST | `/v1/scan/pile` | Pile Mode multi-item appraisal |
| POST | `/v1/speech` | `{text, lang}` returns signed audio URL (cached) |
| GET | `/v1/recyclers` | `?lat&lng&cat` nearest authorized recyclers |
| POST | `/v1/scan/{id}/correct` | Save user correction |
| POST | `/v1/offer-check` | `{scan_id, offered_price}` returns verdict + counter line |
| GET | `/v1/impact/summary` | Admin aggregates (Cedar-protected) |
| GET | `/v1/health` | Liveness and config sanity |

Requirements: request validation, consistent error shape `{error_code, message_user_friendly, message_dev}`, idempotency on scan, rate limiting (API Gateway throttling plus per-owner limits), CORS locked to the app origin.

**Appraisal response must contain:** `scan_id`, `device`, `parts[]` (with per-part value range), `hazards[]` (full rule text in requested language), `value_range`, `confidence_label`, `price_source`, `price_last_updated`, `needs_more_photos`, `audio_script`, `next_actions` (recycler suggestions), and an optional `agent_trace[]`.

## 10. VISION PROMPT REQUIREMENTS

Write `/backend/prompts/vision_system.md` containing:
1. Role: expert in Indian e-waste and scrap components.
2. The full enum taxonomy, instructing the model to use ONLY these values (`unknown_part` if unsure).
3. Typical weight priors per device class so weight estimates are grounded.
4. Rules: do not guess unreadable text, list unknowns, lower confidence when the photo is blurry/dark/partial, flag hazards if any hazardous component might be present (err on the side of warning).
5. Output: JSON only, matching the schema, no prose, no markdown fences.
6. 3 few-shot examples (phone motherboard, microwave, CRT TV) with expected JSON.
Also write the validator that strips fences, parses, validates against the schema and enums, and returns a precise error string for the retry.

## 11. SECURITY, PRIVACY, RESPONSIBLE AI

- No PII by default; anonymous device IDs; EXIF stripped client-side and again server-side.
- Presigned URLs only, with short expiry; private buckets; least-privilege IAM per Lambda (no wildcard resources); no secrets in the repo (use env/SSM).
- Images auto-deleted after 7 days unless the user opts in via the correction consent.
- Cedar enforcement tested for deny paths.
- Prompt-injection hygiene: image text is untrusted data; the model output is validated and never executed; tools accept only validated enum inputs.
- Safety framing: the app reduces harm but is not a substitute for trained handling; hazard text says to avoid dismantling when unsure.
- Be honest in the UI and README about estimates, demo data and limitations.
- Positioning: a tool that raises kabadiwalas' bargaining power and safety, not a replacement for them.
- Regulatory framing: reference India's E-Waste (Management) Rules and the CPCB authorized-recycler lists as the basis for "authorized" routing. Verify current rule details yourself before stating specifics anywhere in the app or docs.

## 12. REPOSITORY STRUCTURE

```
kabadiplus/
  frontend/            React + Vite + TS PWA, locales, components, pages (Scan, Result, Recyclers, Admin)
  backend/
    functions/         upload_url, scan, speech, recyclers, correct, offer_check, impact, price_refresh
    core/              value_engine, hazard_guard, vision_client, validator, i18n_text, geo
    agent/             strands_agent.py, tools/
    prompts/           vision_system.md
  infra/               CDK/SAM stacks (storage, api, auth, schedule), cedar policies
  data/                taxonomy.json, emission_factors.json, seed/*.json
  eval/                test_images/, labels.json, run_eval.py, REPORT.md
  docs/                ARCHITECTURE.md (+ diagram), IMPACT_ASSUMPTIONS.md, LIMITATIONS.md
  .github/workflows/   ci.yml
  README.md
```

## 13. BUILD PHASES AND CHECKPOINTS

Work strictly in this order; stop and verify at each checkpoint.

1. **Foundations:** repo scaffold, taxonomy.json, seed data, shared types, CI skeleton. *Checkpoint:* any `part_id`/`hazard_id` resolves in code; enum-consistency test passes.
2. **Vision pipeline:** prompt, Bedrock client behind an interface (+ mock adapter), validator, retry. *Checkpoint:* 10+ real photos return valid JSON.
3. **Value Engine and Hazard Guard:** pure functions with unit tests (including edge cases: zero weight, unknown part, missing price). *Checkpoint:* known inputs give expected ranges and warnings.
4. **Backend API:** `/upload-url`, `/scan`, error handling, throttling. *Checkpoint:* a curl call returns the complete appraisal JSON.
5. **PWA scan flow:** capture, compress, upload, result screen, red hazard banner above price, low-confidence re-shoot flow. *Checkpoint:* works on a real low-end phone over throttled mobile data.
6. **Voice:** i18n, Translate, Polly with S3 cache, SpeechSynthesis fallback. *Checkpoint:* Listen button works in Hindi on the phone.
7. **Recycler Connect:** geolocation or city fallback, nearest search, Call/WhatsApp/Directions. *Checkpoint:* nearest recycler appears after a scan.
8. **Deploy and evaluate:** CDK deploy, public URL, eval script with 15+ images, README. *Checkpoint:* the public URL works from a fresh device with no setup. (This is the safe P0 submission.)
9. **P1:** Strands agent plus trace panel, Fair Price Meter, Correction Loop, Dismantling Guide, Pile Mode (in that order).
10. **P2:** Impact Ledger, Admin Dashboard, Cedar roles with tests.
11. **Polish:** accessibility pass, empty/error states, loading skeletons, performance budget, final README.

## 14. DEFINITION OF DONE

- A stranger completes a scan in under 30 seconds with no instructions.
- Hazard banner appears for 100% of eval images that contain a hazardous part.
- Eval report in `/eval/REPORT.md` states part-ID accuracy, hazard recall, and price-range sanity on 15+ real images, with failures listed honestly.
- App is usable on a low-end Android on throttled 3G: first meaningful screen under about 3 seconds, scan response under about 10 seconds (measure and report actual numbers).
- The golden path runs identically on every attempt: no flaky steps, no manual setup between runs.
- Deployed on AWS with a public URL; `npm run deploy` and teardown both work from a clean clone.
- Cedar deny-path tests pass; no secrets in git; S3 lifecycle rule verified.
- README contains: problem, setup, architecture diagram, taxonomy explanation, assumptions, limitations, cost-per-scan estimate (measured, not guessed), and the "LLM sees, code decides" rationale.

## 15. WORKING RULES FOR YOU (THE AGENT)

- Ask me before choosing anything that depends on my AWS account (region, Bedrock model access, domain). Otherwise make sensible defaults and record them in `docs/DECISIONS.md`.
- Keep commits small and phase-labelled. Run tests before declaring a phase done.
- Never fabricate data presented as real: prices, recycler contacts, statistics, accuracy numbers. Label seed/demo data everywhere it appears.
- Prefer boring, reliable choices over clever ones. If a P1/P2 feature threatens the P0 path, cut it.
- At the end of each phase, output: what was built, how to verify it, known gaps, and the next phase's first step.

Start with Phase 1. Before writing code, restate the plan for Phase 1 in five lines and list any questions about my AWS setup.