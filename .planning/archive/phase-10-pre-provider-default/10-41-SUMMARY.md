---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 41
subsystem: provider-safety
tags: [deepseek, request-budget, hmac, retry, proof]
requires:
  - phase: 10-40
    provides: authenticated production diagnostic classification
provides:
  - Atomic single-use capability at the actual DeepSeek HTTP transport boundary
  - Authenticated receipt separating reservation from observed provider sends
  - Explicit proof-mode zero-retry policy
affects: [10-42, 10-44, 10-46, 10-51]
tech-stack:
  added: []
  patterns: [closure-owned one-shot capability, canonical HMAC receipt, explicit no-retry policy]
key-files:
  created: [src/providers/request-budget.ts, tests/providers/request-budget.test.ts]
  modified: [src/providers/types.ts, src/providers/deepseek.ts, src/providers/retry.ts, src/server.ts, tests/providers/deepseek.test.ts, tests/providers/retry.test.ts]
key-decisions:
  - "Count an observed provider request only in the synchronous guard immediately before transport.fetch."
  - "Use the existing per-generation diagnostic identity for a separate bounded provider-request receipt line."
  - "Proof mode rejects nonzero maxRetries rather than merely clamping it."
patterns-established:
  - "Reservation and observed HTTP-send facts remain separate and HMAC-authenticated."
  - "An uncertain transport outcome permanently consumes the single-use capability."
requirements-completed: [SAFE-04, PROV-01]
duration: 5min
completed: 2026-09-13
---

# Phase 10 Plan 41: Transport-Bound Provider Request Budget Summary

**A closure-owned one-shot token now guards the exact DeepSeek `transport.fetch` boundary and emits a canonical authenticated receipt with zero-retry proof semantics.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-13T13:06:00Z
- **Completed:** 2026-09-13T13:11:06Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added an immutable budget whose sequential and concurrent hostile callers can acquire at most once.
- Distinguished the fixed reservation from actual transport entry so pre-fetch failures report zero while accepted or uncertain fetches report one.
- Authenticated exact-schema receipts with a per-generation HMAC and emitted them through a bounded private stderr channel.
- Forced proof-mode requests through an explicit `none` retry policy that rejects any nonzero retry configuration.

## Task Commits

1. **Task 1 RED: Define atomic provider-request token tests** - `cedd192`
2. **Task 1 GREEN: Implement atomic request budget and receipt** - `ba5d3de`
3. **Task 2 RED: Guard DeepSeek transport and retry tests** - `539be30`
4. **Task 2 GREEN: Integrate transport guard and zero retries** - `e2de119`

## Files Created/Modified

- `src/providers/request-budget.ts` - One-shot budget, canonical receipt validation, and bounded private-channel proof emitter.
- `src/providers/types.ts` - Request budget and receipt contracts.
- `src/providers/deepseek.ts` - Guard immediately around the actual transport fetch and receipt emission for all proof outcomes.
- `src/providers/retry.ts` - Explicit non-looping no-retry policy with budget-error preservation.
- `src/server.ts` - Proof-mode request budget injection before diagnostic environment consumption.
- `tests/providers/request-budget.test.ts` - Race, forgery, immutability, receipt, and private-channel coverage.
- `tests/providers/deepseek.test.ts` - Pre-fetch zero, uncertain-fetch one, second-send rejection, and retry-configuration coverage.
- `tests/providers/retry.test.ts` - Mechanical no-retry policy coverage.

## Decisions Made

- The request capability transitions synchronously in the same callback immediately before `transport.fetch`, leaving no await/interleaving window.
- Receipt authority is independent from MCP tools/call intent and contains only the eight exact plan-defined keys.
- Ordinary provider operation retains its existing bounded retries; only proof-mode injection selects the non-looping policy.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test -- --run tests/providers/request-budget.test.ts tests/providers/deepseek.test.ts tests/providers/retry.test.ts` — PASS, 19/19 tests.
- `npm run build` — PASS.
- Acceptance gate — PASS: 1/16 concurrent acquires succeeded; pre-fetch observed 0; throwing fetch observed 1; second send blocked before transport; proof maxRetries must equal 0.
- External activity — Docker 0, credential reads 0, network/provider/paid requests 0.
- GitHub activity — Actions runs 0, workflow dispatches 0, repository dispatches 0, `gh` dispatches 0, pushes 0.

## Known Stubs

None.

## Next Phase Readiness

- Plan 10-42 can parse and durably bind the exact authenticated provider-request receipt to host proof state.
- No blocker remains within Plan 10-41 scope.

## Self-Check: PASSED

- All created files exist.
- All four plan commits exist in Git history.
- Focused tests and build pass after the final implementation.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
