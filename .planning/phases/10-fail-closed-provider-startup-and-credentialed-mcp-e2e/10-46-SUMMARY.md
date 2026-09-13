---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 46
subsystem: provider-proof-boundary
tags: [diagnostics, hmac, request-budget, deepseek, fail-closed]
requires: [10-45]
provides:
  - Canonical BL-02, BL-05, and WR-01 provider disconfirmation evidence
  - Single-owner proof invocation around the actual transport.fetch boundary
  - Secret-erasing child proof environment initialization
affects: [10-47, 10-48, 10-49, 10-50, 10-51, 10-52]
tech-stack:
  added: []
  patterns: [synchronous one-shot capability claim, canonical HMAC frames, reservation-versus-observation accounting]
key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-46-PROVIDER-DISCONFIRMATION.json
  modified:
    - src/providers/deepseek.ts
    - src/providers/diagnostics.ts
    - src/providers/request-budget.ts
    - tests/providers/diagnostics.test.ts
    - tests/providers/request-budget.test.ts
    - tests/providers/deepseek.test.ts
    - tests/contract/review-provider.test.ts
key-decisions:
  - Claim the proof-mode provider invocation synchronously before request construction so hostile concurrent calls cannot consume the sole receipt.
  - Delete proof generation and key environment properties immediately after capture, including invalid proof identities.
  - Treat canonical child diagnostic field order as part of the authenticated frame contract.
metrics:
  duration: 6 min
  tasks: 1
  files: 8
  completed: 2026-09-13
---

# Phase 10 Plan 46: Provider Boundary Disconfirmation Summary

The production DeepSeek boundary now owns a single proof invocation and authenticated child evidence shows exact reservation-versus-observed request counts without Docker, credentials, network, or provider activity.

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-13T13:51:00Z
- **Completed:** 2026-09-13T13:57:10Z
- **Tasks:** 1
- **Files modified:** 8

## Accomplishments

- Disconfirmed BL-02 using real DeepSeek response throw sites, provenance validation, orchestration identity checks, and exact bounded HMAC child-frame parsing.
- Disconfirmed BL-05 at the actual `transport.fetch` boundary: sequential and concurrent hostile second reviews fail before a second transport invocation, while proof mode enforces zero retries.
- Disconfirmed WR-01 with separate monotonic `reservation_count=1` and `observed_provider_requests=0|1` evidence for tools/call failures, request-construction failures, entered fetch, and throwing fetch.
- Persisted a canonical three-finding matrix with the exact command digest, named tests, production owners, passing counts, and zero external/GitHub Actions side effects.

## Task Commits

1. **Task 1 RED: expose retained request proof secrets** - `4ba96ee`
2. **Task 1 GREEN: enforce provider proof boundaries** - `aeaed65`
3. **Task 1 evidence: record provider disconfirmation matrix** - `49105d3`

## Files Created/Modified

- `10-46-PROVIDER-DISCONFIRMATION.json` - Canonical BL-02/BL-05/WR-01 result and side-effect accounting.
- `src/providers/deepseek.ts` - Claims the single proof invocation before any async or transport work.
- `src/providers/diagnostics.ts` - Requires the exact canonical authenticated frame key order.
- `src/providers/request-budget.ts` - Erases captured proof identity from the child environment.
- Provider and contract tests - Cover forged/multiple diagnostics, receipt forgery, hostile sequential/concurrent sends, tools/call and request-construction pre-fetch failures, entered/throwing fetch counts, zero retries, and secret non-disclosure.

## Decisions Made

- The first proof-mode `review()` call owns terminal receipt emission even if it fails before fetch; later calls cannot steal or duplicate that receipt.
- Reservation is conservative authorization state, while observation changes only immediately before the real injected transport is invoked.
- Diagnostic authentication covers canonical serialization as well as schema, cardinality, allowlist, generation, bounds, and MAC.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Erased request-proof identity from the child environment**
- **Found during:** Task 1 RED
- **Issue:** The diagnostic initializer erased generation/key values, but the request-receipt initializer retained the same secret-bearing environment properties.
- **Fix:** Capture and delete both properties before validation or capability exposure.
- **Files modified:** `src/providers/request-budget.ts`, `tests/providers/request-budget.test.ts`
- **Verification:** Focused request-budget test passes.
- **Commit:** `aeaed65`

**2. [Rule 1 - Bug] Prevented a concurrent second review from consuming the first invocation's receipt**
- **Found during:** Task 1 hostile concurrent transport test
- **Issue:** The HTTP-send budget blocked a second fetch, but both review invocations entered `finally` and attempted receipt emission.
- **Fix:** Added a synchronous one-shot invocation claim before the proof-mode try/finally boundary.
- **Files modified:** `src/providers/deepseek.ts`, `tests/providers/deepseek.test.ts`
- **Verification:** Exactly one transport call and one receipt are observed across concurrent reviews.
- **Commit:** `aeaed65`

**3. [Rule 2 - Security] Enforced canonical diagnostic frame ordering**
- **Found during:** Task 1 exact-frame adversarial matrix
- **Issue:** An authenticated but non-canonically ordered object passed the frame parser.
- **Fix:** Require the six frame keys in their exact canonical order.
- **Files modified:** `src/providers/diagnostics.ts`, `tests/providers/diagnostics.test.ts`
- **Verification:** Reordered authenticated frames are rejected.
- **Commit:** `aeaed65`

**Total deviations:** 3 auto-fixed (1 bug, 2 missing security/correctness requirements). **Impact:** All changes directly tighten the plan's child-channel and real request-boundary guarantees.

## Verification

- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test -- --run tests/providers/diagnostics.test.ts tests/providers/request-budget.test.ts tests/providers/deepseek.test.ts tests/providers/retry.test.ts tests/providers/provider-contract.test.ts tests/contract/review-provider.test.ts` — PASS, 6 files / 78 tests.
- `npm run build` — PASS.
- `git diff --check` — PASS.
- Canonical JSON parse/finding/side-effect assertion — PASS, three mapped findings and every external counter zero.

## External Side Effects

- Docker builds/runs: 0
- Credential reads: 0
- Network/provider/paid requests: 0
- GitHub Actions runs and all dispatch variants: 0
- Git pushes: 0

## Known Stubs

None.

## Self-Check: PASSED

- Canonical evidence file exists and parses.
- All three task commits exist in Git history.
- Every task acceptance criterion and plan-level verification command passed.
