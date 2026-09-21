---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 09
subsystem: live-proof-security
tags: [docker, child-process, lifecycle, mcp, sanitization]
requires:
  - phase: 10-07
    provides: bounded zero-retry credentialed proof harness
provides:
  - Clean code-0/no-signal child completion as a prerequisite for proof success
  - Offline coverage for exit, signal, spawn-error, timeout, and prior-exit lifecycle states
affects: [PROV-01, SAFE-04, docker-review-real, phase-10-verification]
tech-stack:
  added: []
  patterns: [success-after-clean-shutdown, sanitized child lifecycle boundary]
key-files:
  created: []
  modified: [scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts]
key-decisions:
  - "Emit the proof success marker only after the Docker child reports code 0 with no signal."
  - "Map abnormal child lifecycle details to existing sanitized failure categories without retaining private process output."
patterns-established:
  - "A structurally valid MCP response is necessary but insufficient for proof success until clean child termination is observed."
requirements-completed: [SAFE-04]
duration: 3min
completed: 2026-09-07
---

# Phase 10 Plan 09: Clean Child Lifecycle Proof Summary

**The Docker proof harness now withholds success until a bounded child shutdown completes with code 0 and no signal, with every abnormal lifecycle state tested offline and sanitized.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-06T17:56:00Z
- **Completed:** 2026-09-06T17:59:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added an injected child lifecycle contract covering clean, nonzero, signaled, spawn-error, timeout, and already-exited states without Docker, credentials, network, or paid requests.
- Delayed the success marker until stdin closes and the child reports exactly code 0 with no signal.
- Removed exit/error listeners and shutdown timers after settlement while preserving finite sanitized failure categories.

## Task Commits

1. **Task 1: Define the complete child lifecycle proof contract** - `345c05e` (test, RED)
2. **Task 2: Await and validate clean child shutdown before success** - `c99a147` (fix, GREEN)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Adds bounded lifecycle settlement and success-after-clean-exit behavior.
- `tests/scripts/docker-review-real.test.ts` - Proves lifecycle ordering, abnormal termination sanitization, timeout bounds, and prior-exit handling offline.

## Decisions Made

- Treat any nonzero code or signal as a protocol non-pass after structural response validation.
- Treat child error events as Docker failures and shutdown expiry as timeout failures; no private code, signal, stderr, response, path, cause, or stack enters the diagnostic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial fake-timer timeout assertion attached its rejection handler after advancing time, which Vitest correctly reported as an unhandled rejection. The test was reordered to attach the assertion before advancing the clock.

## Threat Mitigations

- **T-10-09-01:** Success is emitted only after structural validation and the exact clean-exit predicate.
- **T-10-09-02:** Code and signal are retained only for the internal decision and exercised by offline tests.
- **T-10-09-03:** Lifecycle failures expose only allowlisted sanitized categories.
- **T-10-09-04:** Shutdown is bounded, prior exits are observed, and listeners/timers are detached after settlement.

## Known Stubs

None.

## User Setup Required

None - this plan used only offline test doubles and made no Docker or provider request.

## Next Phase Readiness

- The proof harness can no longer retain success after an abnormal child exit.
- PROV-01 remains open until Plan 10-10 hardens evidence counts and Plan 10-11 obtains a separately authorized successful credentialed proof.

## Self-Check: PASSED

- Both modified files exist.
- Task commits `345c05e` and `c99a147` exist.
- All 29 focused offline tests, the TypeScript build, and `git diff --check` pass.
- No Docker live proof, credential use, network call, or paid provider request was executed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-07*
