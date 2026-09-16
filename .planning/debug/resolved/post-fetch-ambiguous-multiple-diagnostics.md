---
status: resolved
trigger: "Plan 10-105 emitted ambiguous closed diagnostic after one post-fetch provider failure despite nine-category support"
---

# Debug Session: post-fetch-ambiguous-multiple-diagnostics

## Symptoms

- Expected behavior: a terminal fetch failure maps to exactly one authenticated closed diagnostic category.
- Actual behavior: one authenticated provider send, post_fetch_non_pass, but diagnostic classified ambiguous; lifecycle and proof validation pass.
- Error messages: sanitized ambiguous only.
- Timeline: first real request after closed fetch-category instrumentation.
- Reproduction: consumed Plan 10-105 cannot replay; use offline injected fetch failures only.

## Current Focus

- hypothesis: confirmed — shared environment names caused request-proof initialization to consume the child-diagnostic capability before it could be constructed.
- test: full provider-disabled suite, focused production-stack cardinality suite, TypeScript build, and git diff check.
- expecting: all checks green; a future fresh live generation emits one authenticated terminal category while genuinely duplicate/conflicting frames remain ambiguous.
- next_action: archived after human verification; continue source/image recertification without replaying Plan 10-105

## Evidence

- timestamp: 2026-09-16T00:00:00+10:00
  checked: repository state and sealed history
  found: HEAD is sealed evidence commit 3b4c09d; production diagnostic implementation is commit a947cdd; only the active debug file is untracked.
  implication: investigation can preserve the consumed live attempt and isolate behavior entirely with injected offline failures.

- timestamp: 2026-09-16T00:05:00+10:00
  checked: fetchWithRetry, DeepSeek adapter, review orchestration, and child diagnostic sink
  found: fetchWithRetry is the sole producer for terminal fetch categories; the child sink is one-shot and existing adapter tests observe exactly one feature for all nine categories.
  implication: the duplicate-producer hypothesis is refuted; multiple authenticated frames cannot be emitted by this production sink.

- timestamp: 2026-09-16T00:08:00+10:00
  checked: server initialization order and environment capability names
  found: request-budget and child-diagnostic modules both use EVIDENCELENS_DIAGNOSTIC_GENERATION/KEY; createServer initializes request proof first, whose loader deletes both before the diagnostic loader runs.
  implication: the live diagnostic sink is deterministically no-op while request receipt authentication remains active, explaining the exact sealed evidence.

- timestamp: 2026-09-16T00:18:00+10:00
  checked: independent capability namespaces and exact production-stack offline injection
  found: both channels initialize and authenticate from one environment; all nine terminal fetch categories traverse server -> review tool -> DeepSeek provider -> retry with exactly one diagnostic feature.
  implication: the fix restores the missing production frame without changing the classifier's fail-closed behavior for duplicate or conflicting external frames.

- timestamp: 2026-09-16T00:20:00+10:00
  checked: regression verification
  found: focused tests pass 167/167; full provider-disabled suite passes 658/658; TypeScript build and git diff --check pass.
  implication: original mechanism is corrected and adjacent diagnostic, receipt, orchestration, and proof behavior remains green offline.

- timestamp: 2026-09-17T00:00:00+10:00
  checked: human verification checkpoint
  found: user confirmed the reported root cause, fix, and offline verification results.
  implication: session may be archived without replaying the consumed live generation or performing further execution.


## Eliminated

- hypothesis: fetchWithRetry and an outer provider boundary emit multiple authenticated frames for one failure.
  evidence: no outer terminal-fetch emitter exists; the child sink accepts only its first allowlisted feature; provider tests record exactly one feature for all nine categories; sealed evidence marks stream_truncated=true, which denotes no parseable single frame rather than proof of duplicate emission.
  timestamp: 2026-09-16T00:05:00+10:00


## Resolution

- root_cause: request receipt and child diagnostic capabilities share the same environment names; request proof initialization consumes/deletes them before diagnostic initialization, disabling production diagnostic emission.
- fix: assigned the child diagnostic capability distinct EVIDENCELENS_CHILD_DIAGNOSTIC_* names, forwarded both capability pairs into the Docker child, and added coexistence plus nine-category production-stack regressions.
- verification: focused 167/167; full provider-disabled 658/658; npm run build passed; git diff --check passed; no provider/network/GitHub Actions/replay.
- files_changed:
  - src/providers/diagnostics.ts
  - scripts/docker-review-real.mjs
  - tests/providers/diagnostics.test.ts
  - tests/contract/review-tool.test.ts
  - tests/scripts/docker-review-real.test.ts
