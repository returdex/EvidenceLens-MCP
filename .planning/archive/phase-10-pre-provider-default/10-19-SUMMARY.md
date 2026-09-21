---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 19
subsystem: infra
tags: [docker-compose, sentinel, immutable-image, secret-hygiene, tdd]
requires:
  - phase: 10-18
    provides: exact-commit private Docker proof context
provides:
  - credential-free dual-sentinel Compose derivation
  - canonical normalized review and proof service contracts
  - fixed no-mount docker argv bound to immutable image IDs
affects: [10-20, 10-21, 10-22, 10-23, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [exact-location sentinels, normalize-before-serialization, immutable-ID argv]
key-files:
  created: [scripts/proof-runtime-spec.mjs, tests/scripts/proof-runtime-spec.test.ts]
  modified: [compose.yaml, tests/smoke/docker-config.test.ts]
key-decisions:
  - "Activate both review and proof profiles during credential-free Compose resolution because Compose omits inactive profile services from config output."
  - "Map Compose's default provider network to an explicit bridge runtime flag while rejecting host networking and all mutable image references."
patterns-established:
  - "Sentinel normalization: require one exact global location per distinct sentinel and replace both before constructing any retained object."
  - "Runtime construction: validate the entire canonical service contract before emitting a fixed docker argv ending in a sha256 image ID."
requirements-completed: [SAFE-04, PROV-01]
duration: 4min
completed: 2026-09-13
---

# Phase 10 Plan 19: Credential-Free Immutable Runtime Specification Summary

**Dual-sentinel Compose parsing now yields a secret-free canonical contract and fixed hardened Docker argv bound only to a sha256 image ID.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-13T03:49:00Z
- **Completed:** 2026-09-13T03:53:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added an isolated proof Compose service with embedded fixtures, zero volumes, read-only root, tmpfs, dropped capabilities, no-new-privileges, retry zero, and finite provider controls.
- Derived review and proof services with two fixed non-secret sentinels, enforcing exact global counts and locations before immediate normalization.
- Added a complete immutable image runtime mapper that rejects tags, mounts, shells, host networking, duplicate options, extra environment, and mutated contracts.
- Passed 19 focused runtime tests, 5 Docker configuration tests, all 378 offline tests, a TypeScript build, and real credential-free Compose resolution.

## Task Commits

1. **Task 1 RED: credential-free Compose contract tests** - `0f9888d`
2. **Task 1 GREEN: dual-sentinel Compose derivation** - `9ccd0cb`
3. **Task 2 RED: immutable argv mutation tests** - `fc88ad0`
4. **Task 2 GREEN: fixed immutable image argv** - `0dc8264`

## Files Created/Modified

- `scripts/proof-runtime-spec.mjs` - Sanitized Compose runner, sentinel validation, normalized contracts, and immutable-ID argv mapping.
- `tests/scripts/proof-runtime-spec.test.ts` - Sentinel, secret-leak, mutation, and mutable-runtime rejection coverage.
- `compose.yaml` - Hardened proof profile using `Dockerfile.proof` and proof-only credential interpolation.
- `tests/smoke/docker-config.test.ts` - Static proof-profile and interpolation regression assertions.

## Decisions Made

- Both `review` and `proof` profiles are activated for config derivation so the two contracts can be validated together without credentials.
- Only a strict `sha256:<64 lowercase hex>` image identity is accepted; tags, pulls, builds, volumes, mounts, and shell commands are impossible through the emitted argv.
- The normalized `<runtime-secret>` slot is retained as a non-secret marker; actual credential injection remains a later spawn-time responsibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Activated the review profile explicitly during Compose derivation**
- **Found during:** Task 1 real Compose verification
- **Issue:** `docker compose --profile proof config` omitted the inactive review service, so the required review sentinel could not be validated.
- **Fix:** Kept the required proof profile and additionally activated the review profile in the sanitized fixed argv.
- **Files modified:** `scripts/proof-runtime-spec.mjs`
- **Verification:** Real credential-free Compose derivation returned both normalized contracts and no sentinel content.
- **Committed in:** `9ccd0cb`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** Required for complete dual-service validation; it adds no credential, network, build, or runtime activity.

## Issues Encountered

- Initial test expectations named the proof interpolation source rather than the container key and assumed an offline network. They were corrected to assert the actual container key and reject host networking; the live proof must retain provider connectivity.

## Known Stubs

None.

## Threat Flags

None beyond T-10-19-01 through T-10-19-03 already mitigated by the plan.

## User Setup Required

None - all verification was credential-free and offline.

## Next Phase Readiness

- Plan 10-20 can consume one complete canonical secret-free runtime contract.
- No Docker image was built or run, no real credential was read, and no provider or paid request was made.
- PROV-01 remains operationally open until the later separately authorized live proof succeeds.

## Self-Check: PASSED

- All four implementation/test files and this summary exist.
- Task commits `0f9888d`, `9ccd0cb`, `fc88ad0`, and `0dc8264` exist.
- Focused tests, all 378 offline tests, build, real sanitized Compose derivation, and diff hygiene passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
