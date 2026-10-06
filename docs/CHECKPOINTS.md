# Phase gates

Do not enter a phase until its predecessor's checkpoint passes. Do not replace real-photo/device checks with mock results.

| Phase | Checkpoint | Current status |
| --- | --- | --- |
| 1. Foundations | Every part/hazard resolves; consistency tests and shell build pass | See PHASE_1_CHECKPOINT.md |
| 2. Vision | 10+ real photos produce validated outputs; model access confirmed | Not started |
| 3. Value and safety | Exact expected ranges and warnings for known inputs, including missing rates | Not started |
| 4. API | Curl obtains a full appraisal; ownership, idempotency, errors and rate limits checked | Not started |
| 5. PWA | Capture/upload/result/re-shoot works on low-end phone under throttling | Not started |
| 6. Voice | Hindi Listen works on a real phone; supported regional voices verified | Not started |
| 7. Recyclers | Verified nearest accepting recycler after scan, location/city fallback | Not started |
| 8. Deploy/evaluate | Public AWS URL works on fresh device; 15+ real-photo report | Not started |
| 9. P1 | Agent fallback/trace, offer check, corrections, safe guides, pile mode | Not started |
| 10. P2 | Impact provenance, aggregate privacy, tested Cedar allow/deny paths | Not started |
| 11. Polish | Accessibility, failures, performance and README reflect measured behavior | Not started |

## First action for Phase 2

Write `backend/prompts/vision_system.md` using the generated taxonomy and catalog weight priors, clearly labelling the latter as uncalibrated. Add the vision-client interface and mock/recorded adapter before any live Bedrock call. Confirm AWS region and an invokable model with the owner before account-specific configuration. Obtain at least ten real photos with ground truth; no actual photos were attached to this task.
