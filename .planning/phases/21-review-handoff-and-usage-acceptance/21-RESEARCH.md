# Phase 21 — Targeted handoff and usage research

2026-10-05, inline; source inspection plus one actual pinned-binary loopback fixture. No real credentials read, real model call, auth change or external case transmission.

## Findings

1. `codex-runner.mjs` accepts a single turn.completed and discards its usage. `completeCodexRun` currently publishes execution/result only. Add an allowlisted collector and a separate local metrics record; do not put runtime telemetry into the model's response schema.
2. The [official non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode) shows terminal usage fields for input, cached input, output and reasoning output. Documentation alone does not prove the installed binary or real account reports every field.
3. Fresh `protocolFixture('success',{permitInstallationMetadata:true})` on the pinned actual binary returned exit 0, one synthetic model request, unchanged synthetic auth and installation files. Terminal: `usage={input_tokens:10,cached_input_tokens:0,output_tokens:10,reasoning_output_tokens:0}`. No model identity was present in that terminal. This is synthetic gateway data, not account consumption evidence.
4. `readCodexResult` only serves succeeded runs. RUN-03 needs a scoped reader for all states; use index/lifecycle/execution plus optional metrics. Require an explicit expected latest run for default display and an explicit historical-run mode. Do not fall back to earlier success.
5. `MODEL_RESULT_SCHEMA` carries coverage/findings/limitations but no requirement IDs or cross-run states. The host's existing baseline/recheck workflow owns those judgments. Add bounded host annotations with current references, not keyword inference or model schema expansion.
6. `prompt-store` already enforces private ownership, no symlinks, bounded JSON, lock/index recheck and scoped deletion. Extend those same paths for known metrics/handoff sidecars; do not export a generic filename writer. Unknown files remain preserved.
7. Installer uses directory symlinks. New helpers must use sibling imports and a realpath entry guard; repo builds/dependencies must not be required for installed operation. Copy installation also needs a test, since symlinks alone can mask repo-relative imports.

## Architectural Responsibility Map

| Layer | Responsibility | Not its responsibility |
|---|---|---|
| codex-metrics.mjs | Numeric field validation/provenance, configured vs reported model | Billing, quota deltas, arbitrary event archive |
| codex-runner.mjs | One existing event stream, terminal/cancel boundaries, trusted metrics collection | New transport, retry, semantic scoring |
| prompt-store.mjs | Safe run-bound sidecars, coherent reads and deletion | Model-chosen paths, fuzzy issue matching |
| review-handoff.mjs | Deterministic summary/full projection, bounded rendering | Hiding Low findings or inventing rubric satisfaction |
| review-recheck.mjs | Validate host mappings/evidence and project current actions | Determine semantic truth from keywords |
| review-records.mjs | Installed local record inspection and explicit annotation | Dispatch, new public Skill command, history scraping |
| Host Skill workflow | Source admission, R/F interpretation, actual user focus and semantic judgments | Claim independent automated grading from structural checks |

## Resolved design questions

- Choose optional private sidecars rather than rewriting historical schema versions. Missing old sidecar means unavailable metadata, not zero usage or invalid old review. Corrupt present sidecars must be reported, not treated as missing.
- Keep token fields individually. No synthetic grand total is needed; cached/reasoning breakdowns are not summed a second time. Reject negative, non-integer, unsafe, string and contradictory numeric breakdowns as unavailable/invalid metadata with fixed reasons; do not save arbitrary strings from events.
- Persist valid terminal observations even if final review validation fails, while marking event scope and unsuccessful run status; without a terminal record usage is unavailable and remote consumption unknown. Duplicate terminals remain a protocol failure, never summed.
- Configure/observe distinction: trusted launch args can identify requested model; absent effective-model evidence stays unavailable. No extra model-catalog, account-usage or billing call.
- Recheck annotations are host-authored, bounded, evidence-bound and separate from immutable model output. Absence in a new findings list never proves resolution. Prior summaries need admission before read and cannot bypass artifact_only/exclusion rules.
- Initial real review and real recheck use synthetic assignment material. A1.3 is an offline judgment/reference case, not an automatic live dataset. No exact score target or complete-coursework semantic acceptance.

## Validation Architecture

Node tests create real private temp stores and synthetic protocol processes. New tests cover metrics, handoff, recheck and record CLI; existing result/runner/retention/source-boundary tests guard compatibility. One owning task creates each new test before it is a dependent gate. Fast suites target 30 s; actual binary batches are separately bounded to 120 s, with a live run bounded by the existing 120 s review deadline plus cleanup. Planning-only fixture probe above completed in under 1 s.

Manual acceptance validates actual installed Skill discovery/usage and the semantic adequacy of the two small live results, with exact prompt hashes and separate usage provenance. The complete A1.3 model evaluation, historical Claude material and RR/FM changes remain deferred and non-blocking. See VALIDATION for all task mappings.
