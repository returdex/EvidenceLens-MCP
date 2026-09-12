---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 16
subsystem: testing
tags: [mcp, subprocess, stdio, json-rpc, fail-closed]
requires:
  - phase: 10-14
    provides: strict JSON-RPC matching and initialized lifecycle
provides:
  - byte-bounded Docker MCP stdout, stderr, and parsed event handling
  - sanitized stdin failure and close-gated subprocess settlement
affects: [phase-10-docker-proof, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [raw-byte prospective limits, close-gated child lifecycle, idempotent sanitized settlement]
key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-16-SUMMARY.md
  modified:
    - scripts/docker-review-real.mjs
    - tests/scripts/docker-review-real.test.ts
key-decisions:
  - "Treat child exit as metadata only and require a consistent close event before terminal success."
  - "Apply 32MB per-line stdout, 1MB cumulative stderr, and eight-event queue limits before retaining untrusted data."
patterns-established:
  - "All writable and readable child-stream failures converge on one sanitized terminal event."
requirements-completed: [SAFE-04]
duration: 4min
completed: 2026-09-13
---

# Phase 10 Plan 16: Bounded Docker MCP I/O Lifecycle Summary

**A close-gated Docker MCP subprocess state machine with sanitized write failures and exact stdout, stderr, and event-queue ceilings**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-12T17:33:00Z
- **Completed:** 2026-09-12T17:37:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added executable RED coverage for asynchronous EPIPE, synchronous write throws, raw-byte overflow, and exit/close metadata races.
- Exported and enforced `MAX_STDOUT_LINE_BYTES = 32_000_000`, `MAX_STDERR_BYTES = 1_000_000`, and `MAX_PENDING_EVENTS = 8`.
- Changed child exit to metadata-only state and made consistent close metadata mandatory before terminal completion.
- Removed the duplicate unbounded stderr accumulator and kept all public failures within the existing seven sanitized categories.

## Task Commits

1. **Task 1: RED-map every subprocess transition, race, and resource ceiling** - `e6a6eed` (test)
2. **Task 2: GREEN-implement one idempotent bounded I/O lifecycle** - `2a15046` (fix)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Implements byte-bounded parsing, write-side error handling, backpressure-aware writes, and close-gated lifecycle settlement.
- `tests/scripts/docker-review-real.test.ts` - Exercises EPIPE, synchronous write failure, exact exported ceilings, overflow cleanup, and exit/close ordering.

## Decisions Made

- Byte limits are measured prospectively on raw Buffer chunks so split UTF-8 sequences cannot bypass ceilings.
- Backpressured writes require both callback completion and drain; their timeout consumes the same absolute request budget.
- Stream error listeners remain installed after operational detachment so late errors cannot escape as uncaught EventEmitter failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed the second unbounded stderr retention path**
- **Found during:** Task 2 full-source verification
- **Issue:** `main()` separately concatenated stderr even after `StdioClient` gained a byte ceiling.
- **Fix:** Removed the duplicate accumulator and kept private stderr out of failure construction.
- **Files modified:** `scripts/docker-review-real.mjs`
- **Verification:** 350 offline tests and TypeScript build passed.
- **Committed in:** `2a15046`

**2. [Rule 2 - Missing Critical] Made write backpressure consume the request deadline**
- **Found during:** Task 2 implementation review
- **Issue:** A callback-only write wrapper could settle before drain or hang outside the absolute request budget.
- **Fix:** Require callback plus drain when `write()` returns false and use an unref'ed timer bounded by the request deadline.
- **Files modified:** `scripts/docker-review-real.mjs`
- **Verification:** Focused and full offline suites passed.
- **Committed in:** `2a15046`

---

**Total deviations:** 2 auto-fixed (2 missing critical functionality). **Impact:** Both changes are required for the plan's bounded-memory and finite-time guarantees; no scope expansion.

## Issues Encountered

- The RED suite failed in eight intended ways against the old source, including one captured unhandled rejection caused by the missing stdin error path. GREEN eliminated all failures.

## Verification

- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test -- --run tests/scripts/docker-review-real.test.ts` - PASS, 69 tests.
- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test` - PASS, 28 files and 350 tests.
- `npm run build` - PASS.
- `git diff --check` - PASS.
- No Docker, network, credential, adapter-live, or paid-provider command was executed.

## Known Stubs

None.

## User Setup Required

None - this plan is entirely offline.

## Next Phase Readiness

- The harness is ready for the credential-free protocol simulation in Plan 10-17.
- PROV-01 remains open pending later immutable-image and separately authorized live-proof plans.

## Self-Check: PASSED

- Both modified implementation/test files and this summary exist.
- Task commits `e6a6eed` and `2a15046` exist in git history.
- All focused, full offline, build, and diff-hygiene checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
