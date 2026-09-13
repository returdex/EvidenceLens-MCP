---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 25
subsystem: testing
tags: [automatic-live-review, crash-recovery, o-excl, durable-state, request-budget]
requires:
  - phase: 10-24
    provides: finite invariant-level protocol diagnostics and zero-budget ambiguity handling
provides:
  - fixed automatic build and live-once execution primitives
  - consume-before-spawn one-request enforcement
  - canonical nested proof state with idempotent zero-side-effect recovery
affects: [10-26, 10-28, 10-29, 10-35, 10-36, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [exclusive generation claims, write-ahead request intent, nested terminal outcomes, fsync-and-rename recovery]
key-files:
  created:
    - scripts/automatic-live-review.mjs
    - scripts/live-proof-state.mjs
    - tests/scripts/automatic-live-review.test.ts
    - tests/scripts/live-proof-state.test.ts
  modified:
    - package.json
key-decisions:
  - "Record provider-request intent durably while the live generation is consumed, before the only child spawn."
  - "Treat truthful inner non-pass as a successfully completed wrapper; reserve malformed or unrecoverable state for exit 50."
patterns-established:
  - "Recovery converts nonterminal durable states to conservative terminal failure without rebuilding, reading credentials, or spawning."
  - "All public live outcomes are fixed status enums and never retain credentials or child diagnostics."
requirements-completed: [SAFE-04, PROV-01]
duration: 5min
completed: 2026-09-13
---

# Phase 10 Plan 25: Automatic Live Review and Durable State Summary

**Exclusive automatic build/live primitives now enforce one finite side effect, while canonical nested journals recover every interrupted generation without repeating a build, credential read, spawn, or provider request.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-13T08:03:00Z
- **Completed:** 2026-09-13T08:07:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added literal `review:auto-build` and `review:auto-live-once` entrypoints, fixed control objects, strict argv rejection, O_EXCL claims, and consume-before-credential/spawn ordering.
- Added canonical build and live state machines with monotonic transitions, bounded counters, hash-linked journal revisions, owner-only reads, atomic rename, file/directory fsync, and nested wrapper completion.
- Proved interruptions around consume, spawn, result, and wrapper writes recover idempotently with no repeated side effects; all 464 provider-disabled tests pass.

## Task Commits

1. **Task 1 RED: Automatic runner contracts** - `eb55587` (test)
2. **Task 1 GREEN: Bounded automatic primitives** - `096b400` (feat)
3. **Task 2 RED: Crash recovery contracts** - `d8cb567` (test)
4. **Task 2 GREEN: Nested durable proof state** - `c1e9e94` (feat)

## Files Created/Modified

- `scripts/automatic-live-review.mjs` - Fixed automatic execution controls, exclusive claims, safe sequencing, and stateful live execution.
- `scripts/live-proof-state.mjs` - Canonical build/live journals, monotonic state transitions, durable request intent, wrapper completion, and recovery.
- `tests/scripts/automatic-live-review.test.ts` - Adversarial argv, replay, ordering, request-budget, secrecy, concurrency, and crash-boundary tests.
- `tests/scripts/live-proof-state.test.ts` - Terminal-state, malformed-state, monotonicity, request-intent, and idempotent recovery tests.
- `package.json` - Literal automatic build and live-once scripts.

## Decisions Made

- A provider attempt is counted before spawn. This deliberately over-counts a spawn failure rather than risking an unrecorded paid request after a crash.
- Recovery is conservative: prepared/started/consumed state without terminal evidence becomes a fixed non-pass and never resumes the side effect.
- Wrapper success describes durable recording, not inner proof success; inner `failed` and build failure states remain directly queryable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- Task 1 provider-disabled focused suite: PASS, 6/6 tests.
- Combined final focused suites: PASS, 23/23 tests.
- Full provider-disabled regression suite: PASS, 38 files and 464/464 tests.
- TypeScript build: PASS.
- Diff hygiene: PASS.
- Docker builds/runs: 0.
- Credential reads: 0.
- Network/provider/paid requests: 0.

## Known Stubs

None.

## Threat Flags

None beyond T-10-25-01 through T-10-25-04. New file and process boundaries use fixed inputs, owner-only canonical state, finite counters, sanitized outcomes, and bounded single-attempt controls.

## User Setup Required

None.

## Next Phase Readiness

- Plan 10-26 can certify the automatic runner and state schema before any Docker build or live request.
- PROV-01 remains open until a later plan records a successful audited live proof; this plan only supplies zero-budget-tested machinery.

## Self-Check: PASSED

- All four task commits exist.
- All four created files and the modified package manifest exist.
- Focused tests, full offline regression, build, acceptance-token scan, and diff hygiene passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
