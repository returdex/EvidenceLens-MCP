---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 17
subsystem: testing
tags: [mcp, docker, stdio, transcript, offline]
requires:
  - phase: 10-16
    provides: bounded close-gated Docker MCP subprocess lifecycle
provides:
  - shared production orchestration seam for deterministic full-transcript testing
  - passing provider-disabled Docker MCP proof across four filesystem fixtures
affects: [phase-10-immutable-proof, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [production-entrypoint injection, deterministic Buffer transcript, close-gated success]
key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-17-SUMMARY.md
  modified:
    - scripts/docker-review-real.mjs
    - tests/scripts/docker-review-real.test.ts
key-decisions:
  - "Use one exported runReviewHarness for both CLI main and deterministic transcript tests, injecting only process-boundary seams."
  - "Keep Docker smoke provider-disabled and treat it solely as local container/protocol evidence, not credentialed proof."
patterns-established:
  - "Full transcript tests exercise the production StdioClient, lifecycle, structural validator, and final output path unchanged."
requirements-completed: [SAFE-04]
duration: 3min
completed: 2026-09-13
---

# Phase 10 Plan 17: Deterministic Harness and Offline Docker Proof Summary

**One production orchestration seam now proves the exact MCP transcript deterministically, while the actual provider-disabled container passes the four-fixture filesystem boundary**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-12T17:39:00Z
- **Completed:** 2026-09-12T17:41:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Exported `runReviewHarness` and routed `main()` through it without bypassing `StdioClient`, `performMcpReview`, `assertStructuralReview`, or `completeProofLifecycle`.
- Added a Buffer-based deterministic child transcript proving initialize, id-less `notifications/initialized`, tools/list, exact four-fixture tools/call, and success only after a consistent clean close.
- Passed the actual provider-disabled Docker smoke, including read-only mount rejection and sanitized missing-key startup failure.
- Passed 71 focused tests, 351 full offline tests, TypeScript build, and diff hygiene without a provider request.

## Task Commits

1. **Task 1 RED: Add failing production harness transcript test** - `c68de9e` (test)
2. **Task 1 GREEN: Expose deterministic review harness orchestration** - `14ce236` (feat)
3. **Task 2: Re-prove provider-disabled Docker boundary** - `e6bed0a` (test)
4. **Task 1 REFACTOR: Remove superseded module constants** - `e817f71` (refactor)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Exports the production orchestration seam and keeps CLI main on the identical code path.
- `tests/scripts/docker-review-real.test.ts` - Drives the full live-shaped MCP transcript through that production seam.

## Decisions Made

- Offline simulation injects only spawn/environment/final-output boundaries; protocol parsing, request construction, structural validation, and lifecycle completion remain production code.
- The offline Docker result is retained only as local structural evidence. It does not satisfy PROV-01 or authorize a provider call.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Docker Desktop was initially stopped. It was started locally and the same provider-disabled smoke then passed; no review-profile or provider command was run.

## Verification

- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test -- --run tests/scripts/docker-review-real.test.ts` - PASS, 70 tests.
- `npm run docker:smoke` - PASS, four fixtures, provider disabled, read-only mount enforced, missing-key startup failed closed.
- Focused harness/E2E command - PASS, 2 files and 71 tests.
- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test` - PASS, 28 files and 351 tests.
- `npm run build` - PASS.
- `git diff --check` - PASS.
- No `docker:review:real`, review profile, adapter-live, credential read, external provider request, retry, or paid request occurred.

## Known Stubs

None.

## User Setup Required

None - the plan is credential-free.

## Next Phase Readiness

- The locally controlled harness, MCP lifecycle, filesystem fixtures, and Docker boundary are proven for the immutable proof-image plans.
- PROV-01 remains open pending a later separately authorized credentialed proof.

## Self-Check: PASSED

- Both modified files and this summary exist.
- Task commits `c68de9e`, `14ce236`, `e6bed0a`, and `e817f71` exist in git history.
- Focused transcript, Docker smoke, full offline suite, build, and diff checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
