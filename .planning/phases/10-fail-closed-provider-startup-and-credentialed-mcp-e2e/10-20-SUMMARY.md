---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 20
subsystem: infra
tags: [evidence-schema, exactly-once, docker, fail-closed, tdd]
requires:
  - phase: 10-18
    provides: exact-commit owner-only private proof context
  - phase: 10-19
    provides: credential-free immutable runtime specification
provides:
  - acyclic source-review and immutable-image evidence schemas
  - fixed-path prepared build handoff authentication
  - irreversible per-generation producer claim with at-most-one build
  - authenticated build-free existing-image verifier
affects: [10-21, 10-22, 10-23, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [canonical bounded JSON, no-follow owner-only files, fsync-before-build state, exclusive generation claims]
key-files:
  created:
    - scripts/audit-live-readiness.mjs
    - scripts/docker-proof-produce.mjs
    - scripts/docker-proof-verify-existing.mjs
    - tests/scripts/audit-live-readiness.test.ts
    - tests/scripts/docker-proof-produce.test.ts
    - tests/scripts/docker-proof-verify-existing.test.ts
  modified: [package.json]
key-decisions:
  - "Bind build authority to one canonical fixed handoff path and reject alternate argv before any authentication or Docker seam."
  - "Persist an exclusive owner-only claim before the started state so concurrent producers cannot both build."
  - "Keep verification build-free: it authenticates the claim, completed descriptor and result before inspecting only the pinned image ID."
patterns-established:
  - "Acyclic evidence records contain independently recomputable facts and reject report/envelope/handoff self or cross hashes."
  - "BUILD_GENERATION claims are durable and irreversible; failure requires a separately planned generation rather than retry."
requirements-completed: [SAFE-04, PROV-01]
duration: 7min
completed: 2026-09-13
---

# Phase 10 Plan 20: Acyclic Evidence and Exactly-Once Build Boundary Summary

**Canonical acyclic evidence now crosses an owner-only, fsync-backed generation claim that permits one proof build while every later verifier remains build-free.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-12T17:55:00Z
- **Completed:** 2026-09-12T18:01:47Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added canonical bounded source-review and image-bound schemas that reject self, cross, mutual, envelope, handoff and report-commit-dependent identities.
- Added a credential-free `prepared-build-handoff` mode using fixed-path, no-follow, owner/mode, digest, reviewed commit/tree and archive checks with no external execution surface.
- Added a producer that authenticates one committed handoff, persists an exclusive generation claim and `started` state before exactly one direct build seam, then records canonical completed or sanitized failed state.
- Added a read-only verifier that authenticates the pinned result and only inspects its immutable image ID; it contains no build, buildx or Compose-build path.
- Proved concurrent/repeated producer calls cannot increase build count beyond one, while repeated verifier calls retain build count zero.

## Task Commits

1. **Task 1 RED: Define failing acyclic evidence audits** - `cbdeaa5` (test)
2. **Task 1 GREEN: Add acyclic readiness evidence schemas** - `70413a1` (feat)
3. **Task 2 RED: Add failing build-generation state tests** - `fd91ecb` (test)
4. **Task 2 GREEN: Enforce irreversible proof build generations** - `a221b63` (feat)
5. **Task 2 adversarial coverage: Race concurrent producer claims** - `131e9d5` (test)

## Files Created/Modified

- `scripts/audit-live-readiness.mjs` - Canonical evidence validation, cyclic-field rejection, prepared handoff audit and image-bound report audit.
- `scripts/docker-proof-produce.mjs` - Fixed-path committed-handoff authentication, exclusive claim, durable transitions and bounded producer output.
- `scripts/docker-proof-verify-existing.mjs` - Completed generation/result authentication and pinned-image-only verification.
- `tests/scripts/audit-live-readiness.test.ts` - Adversarial schema, identity, ownership, mode and zero-side-effect checks.
- `tests/scripts/docker-proof-produce.test.ts` - First/repeat/concurrent claim, argv and sanitized failure tests.
- `tests/scripts/docker-proof-verify-existing.test.ts` - Build-free repetition, tamper rejection and argv tests.
- `package.json` - Exact direct-Node producer and verifier commands.

## Decisions Made

- The committed handoff authenticates the original prepared descriptor digest; an exclusive claim retains that digest through started/completed states so concurrency cannot reopen authority.
- The producer emits only canonical bounded status data and one fixed sanitized error code; raw Docker errors and environment values never cross its output boundary.
- Result publication uses an atomic exclusive hard-link boundary, and descriptor transitions fsync both file bytes and their containing directory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added an exclusive concurrent generation claim**
- **Found during:** Task 2 security review
- **Issue:** A descriptor-only prepared-to-started rename allowed two concurrent processes to read `prepared` before either transition, risking two builds.
- **Fix:** Added a canonical owner-only O_EXCL claim record, durably published before `started`; subsequent or concurrent claims fail before Docker.
- **Files modified:** `scripts/docker-proof-produce.mjs`, `scripts/docker-proof-verify-existing.mjs`, `tests/scripts/docker-proof-produce.test.ts`
- **Verification:** Concurrent adversarial test produces one fulfilled claim, one rejected claim and exactly one build invocation.
- **Committed in:** `a221b63`, `131e9d5`

**2. [Rule 1 - Bug] Made exclusive result publication race-free**
- **Found during:** Task 2 implementation review
- **Issue:** Checking result absence before rename left a time-of-check/time-of-use overwrite window.
- **Fix:** Publish the already-fsynced temporary result with an atomic hard-link create, which fails if the result exists.
- **Files modified:** `scripts/docker-proof-produce.mjs`
- **Verification:** Producer and verifier adversarial suites plus full offline regression pass.
- **Committed in:** `a221b63`

---

**Total deviations:** 2 auto-fixed (1 missing critical security requirement, 1 race bug). **Impact:** Both changes are required to satisfy the plan's at-most-once guarantee; no scope expansion or external operation was introduced.

## Issues Encountered

- Initial archive validation incorrectly attempted JSON parsing of the private tar bytes. It was corrected to a bounded owner-only no-follow byte read and digest comparison before the generation claim.

## Verification

- Task 1 focused suite: PASS, 17 tests.
- Task 2 focused suites: PASS, 15 tests.
- Full provider-disabled offline suite: PASS, 33 files and 410 tests.
- `npm run build`: PASS.
- Exact package command assertion: PASS.
- `git diff --check`: PASS.
- No Docker build/run, Compose command, credential read, network/provider operation or paid request was executed; all external seams were mocks.

## Known Stubs

None.

## Threat Flags

None beyond T-10-20-01 through T-10-20-03 already mitigated by the plan.

## User Setup Required

None - implementation and verification were credential-free and offline.

## Next Phase Readiness

- Plan 10-21 can seal completed result/report evidence and reconstruct authority from durable state.
- Plan 10-22 can publish its inert BUILD handoff in a separate commit before invoking the single producer.
- PROV-01 remains operationally open until a later explicitly authorized credentialed proof succeeds.

## Self-Check: PASSED

- All six created files, modified `package.json` and this summary exist.
- Task commits `cbdeaa5`, `70413a1`, `fd91ecb`, `a221b63` and `131e9d5` exist.
- All focused, full offline, build, package-contract and diff-hygiene checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
