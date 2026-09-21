---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 164
subsystem: provider-proof-chain
tags: [docker, immutable-image, exact-source, local-build, provenance]

requires:
  - phase: 10-163
    provides: exact provider-default source identity with clean deep and ASVS reviews
provides:
  - one READY linux/arm64 Docker image built from the exact certified Git archive
  - immutable image authority bound to source, content, config, runtime, daemon, Compose fixtures, and certifiers
  - independent no-rebuild authentication of the promoted local image
affects: [10-165, one-send-live-proof, provider-default-recovery]

tech-stack:
  added: []
  patterns: [exact Git archive build context, single-build promotion, independent no-rebuild verification]

key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-164-FINAL-BUILD.json
  modified: []

key-decisions:
  - "Promote generation 0cd325ba028813cb93aa86c5fe7ece14711d4655c2765d09d761b4b2a09ff4a5 as the sole READY Plan 10-164 image after one successful local producer build and zero verifier rebuilds."
  - "Preserve the exact Plan 10-163 source identity; no production or test source changed during Plan 10-164."

patterns-established:
  - "The build producer consumes only a Git archive of the certified commit and grants authority only after an independent existing-image inspection."

requirements-completed: [SAFE-04, PROV-01]

duration: 2min
completed: 2026-09-22
---

# Phase 10 Plan 164: Immutable Local Image Summary

**A fresh linux/arm64 image built once from the exact Plan 10-163 Git archive is READY and independently authenticated without credentials, provider traffic, container review execution, or GitHub activity.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-21T17:35:06Z
- **Completed:** 2026-09-21T17:37:20Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Reauthenticated the exact Plan 10-163 source, review, and security tuple before any Docker build.
- Built generation `0cd325ba028813cb93aa86c5fe7ece14711d4655c2765d09d761b4b2a09ff4a5` exactly once from certified commit `d8e9e050c61bed3bc06530da65ce9ef692b09aac`.
- Promoted immutable image `sha256:c3262ca866b49ad59473efc48755b2a5e45732645725d5a50ed2279a6d537a57` with source, content, config, runtime, daemon, Compose fixture, and certifier bindings.
- Verified the existing image in a fresh process with `build_count=1` and `verifier_build_count=0`, then confirmed it remains present through read-only image inspection.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build, promote and independently authenticate the exact-source image** - `dce7dc4` (chore)

## Files Created/Modified

- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-164-FINAL-BUILD.json` - Canonical READY authority for the sole promoted local image.

## Decisions Made

- The only image authorized for Plan 10-165 is generation `0cd325ba...ff4a5` / image `sha256:c3262ca...37a57`.
- No build retry was required; one successful producer attempt and zero verifier builds are recorded in the authority artifact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used the fixed registry's required exact paths for direct audit commands**
- **Found during:** Task 1 pre-build review authentication
- **Issue:** The plan's abbreviated `node scripts/audit-proof-chain.mjs reviews-auto` command omitted the three exact fixed paths required by the audit CLI and returned `PROOF_CHAIN_ARGV` before Docker activity.
- **Fix:** Re-ran `reviews-auto` with the registry-defined 10-163 SOURCE, REVIEW, and SECURITY paths; used the same exact fixed tuple for the independent `build-auto` audit.
- **Files modified:** None
- **Verification:** Both corrected fixed audits passed; the zero-extra-argv `npm run review:auto-build` producer remained unchanged.
- **Committed in:** No code change required; recorded in this summary.

---

**Total deviations:** 1 auto-resolved blocking command mismatch. **Impact on plan:** No production source or authority contract changed; the correction made the direct verification invocation match the existing fixed-path CLI contract.

## Issues Encountered

- One abbreviated pre-build audit invocation failed before Docker access with `PROOF_CHAIN_ARGV`. The corrected fixed-path invocation passed. Local Docker build attempts: 1 successful, 0 failed, 0 retries.

## Verification

- Fixed `reviews-auto` over the exact three Plan 10-163 paths: PASS.
- Zero-extra-argv `npm run review:auto-build`: PASS.
- Fresh-process fixed `build-auto` over the exact four Plan 10-164/163 paths: PASS.
- Immutable image inspect by recorded SHA-256 image ID: PASS.
- Build authority: `build_count=1`, `verifier_build_count=0`, status `ready`.
- `git diff --check`: PASS.
- External effects: credential reads 0; provider/network/paid requests 0; container review runs 0; GitHub Actions/dispatch/push 0.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-165 may authenticate and consume only the recorded immutable image.
- No provider request or GitHub Actions quota was consumed in this plan.

## Self-Check: PASSED

- `10-164-FINAL-BUILD.json` exists and authenticates the locally present immutable image.
- Task commit `dce7dc4` exists in repository history.
- All corrected fixed-path task and plan verification checks passed with one producer build and zero verifier rebuilds.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-22*
