---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 61
subsystem: immutable-build-evidence
tags: [docker, stale-authority, replacement-build, fail-closed]
requires:
  - phase: 10-57
    provides: current terminal-owner source certification
provides:
  - owner-only byte-exact archive of the superseded build with authority false
  - one replacement immutable image bound to current 10-57 certification
affects: [10-59-live-generation, 10-60-proof-sync]
tech-stack:
  added: []
  patterns: [stale authority revocation, single replacement credential-free build]
key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-61-STALE-BUILD.json
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-61-SUMMARY.md
  modified:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-58-FINAL-BUILD.json
key-decisions:
  - "The superseded image remains auditable only through an authority:false wrapper containing its exact committed bytes."
  - "The replacement build consumed the authorized one-build budget and no further build is permitted."
requirements-completed: [SAFE-04]
duration: 4min
completed: 2026-09-14
---

# Phase 10 Plan 61: Replacement Corrected-Source Image Summary

**The superseded image was preserved without authority, and exactly one credential-free build produced a fresh immutable image bound to the current 10-57 certification.**

## Performance

- **Duration:** 4 min
- **Completed:** 2026-09-14T03:30:14Z
- **Tasks:** 2
- **Files modified:** 3 planning artifacts

## Accomplishments

- Preserved the exact committed `3b68813` build bytes and SHA-256 `4b646371c56c83145760691411f1a603e292d3326e2b2c21d6545383f9775809` inside an owner-only stale wrapper.
- Explicitly revoked the old generation and image with `authority:false` and verified rejection by the build authority validator.
- Invoked `npm run review:auto-build` exactly once with fixed empty argv and produced replacement image `sha256:e200ea990c46407fcc706208217d97a3ddc184aeb6a70a3134b98b1252882368`.
- Bound fresh generation `6c0db5a71894f79b1983b4d3b8d8a6d4ecb21e61a1cff8b233bcd341a6e3485c` to reviewed commit `26ba4806d9ef25717b0d1c180bd62aa4216cb634`.
- Passed 57 isolated CLI/proof-chain tests and fixed `build-auto` validation without rebuilding.

## Task Commits

1. **Task 1: Archive the stale build without granting authority** — `abc043f` (chore)
2. **Task 2: Perform the single replacement build** — `7ef57d2` (chore)

## Decisions Made

- Stored the original build bytes as base64 inside a strict stale envelope so byte equality and the authority revocation can be verified together.
- Removed the stale canonical path only after the archive was reopened, hashed, mode-checked, and validated; the production command then exclusively recreated the canonical build path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Kept PROV-01 open until live proof exists**
- **Found during:** State synchronization
- **Issue:** Mechanical requirement completion would claim provider proof from a credential-free image build alone.
- **Fix:** Kept PROV-01 unchecked and recorded that Plan 10-59 remains required.
- **Files modified:** `.planning/REQUIREMENTS.md`, this summary

## Verification

- Old committed bytes matched the pre-build canonical file byte-for-byte.
- Stale archive mode: `0600`; archive SHA-256: `8f85f19426bbd1f8fa8bdd7b21d9407169061b39a4e332d82fcc4ddb98e5bde4`.
- Replacement evidence SHA-256: `6bb0c335653922fe7f114038a2ffcd5a02666a5510bbc9d6eabe5eba40303383`.
- Replacement generation and image identity both differ from the stale identities.
- `build-auto`: ready and passed.
- Isolated test suite: 57/57 passed.
- `git diff --check`: passed.

## Side Effects

Docker builds/runs: 1/0. Verifier builds: 0. Credential reads: 0. MCP/provider/network/paid requests: 0/0/0/0. Retries, alternate builds, fallbacks, and diagnostic builds: 0. GitHub Actions, pushes, and dispatches: 0.

## Known Stubs

None.

## Next Phase Readiness

Plan 10-59 may consume only the replacement canonical image. The replacement build budget is exhausted and no further build is permitted.

## Self-Check: PASSED

Both evidence artifacts exist, both task commits exist, the old bytes remain recoverable and hash-identical, and the replacement passes fixed no-rebuild authority validation.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-14*
