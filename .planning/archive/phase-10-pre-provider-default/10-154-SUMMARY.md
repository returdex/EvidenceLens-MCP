---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 154
subsystem: provider-proof-infrastructure
tags: [docker, immutable-image, exact-source, provenance, max-tokens-8000]

requires:
  - phase: 10-153
    provides: certified 109-blob source archive and exact 8000-token runtime contract
provides:
  - immutable local image sha256:e137c04f140122575674c445a38b11a00de833e925901dcb8d49d336a23da1e0
  - READY generation 89fc17c9336561b527485fe11c037c7a784ee877259d2e6c3c96e597c04fe9d3
  - independently authenticated no-rebuild build authority for Plan 10-155
affects: [10-155, credentialed-live-proof, proof-chain]

tech-stack:
  added: []
  patterns: [exact Git archive build, immutable image identity, independent no-rebuild audit]

key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-154-FINAL-BUILD.json
  modified: []

key-decisions:
  - "Promote only generation 89fc17c9 as the READY Plan 10-154 image after one successful producer build and zero verifier rebuilds."
  - "Retain the exact Plan 10-153 source identity and certified 8000-token contract; no production or test source changed."

patterns-established:
  - "Build authority binds image ID plus content, config, runtime, daemon, Compose, fixture, manifest, tree, commit, and certifier identities."
  - "Independent build-auto verification reopens the existing immutable image without rebuilding it."

requirements-completed: [SAFE-04, PROV-01]

duration: 1 min
completed: 2026-09-21
---

# Phase 10 Plan 154: Exact Immutable 8000-Token Image Summary

**Exact Plan 10-153 certified source built into one immutable arm64 Linux image and independently authenticated without verifier rebuild, credentials, provider traffic, network proof, or GitHub Actions.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-09-20T14:10:17Z
- **Completed:** 2026-09-20T14:11:54Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Built READY generation `89fc17c9336561b527485fe11c037c7a784ee877259d2e6c3c96e597c04fe9d3` from the exact certified Git archive.
- Promoted immutable image `sha256:e137c04f140122575674c445a38b11a00de833e925901dcb8d49d336a23da1e0` with content, config, runtime, daemon, Compose, fixture, manifest, tree, commit, and certifier bindings.
- Independently audited the existing image through `build-auto` with `build_count: 1` and `verifier_build_count: 0`.
- Kept credential reads, provider requests, live network proof, GitHub Actions, and synchronization writes at zero.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build, promote and authenticate the exact-source immutable image** - `caccd9e` (feat)

## Files Created/Modified

- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-154-FINAL-BUILD.json` - READY `evidencelens.build.v2` authority for Plan 10-155.

## Certified Identity

| Identity | Value |
|---|---|
| Generation | `89fc17c9336561b527485fe11c037c7a784ee877259d2e6c3c96e597c04fe9d3` |
| Image ID | `sha256:e137c04f140122575674c445a38b11a00de833e925901dcb8d49d336a23da1e0` |
| Image content SHA-256 | `8c7b3e88f2d37d199c38ceb1f88e72dc9575432776c6311e9e5b3ae1cbe37b42` |
| Image config SHA-256 | `ad453e5db85b863299e92c7c1aa5b021e36250e6421b24bdcfd81eca12c5b7b3` |
| Runtime SHA-256 | `919ec7138a5a60b09288251d16ce265408566fa32f08ae9754e0fbd6414a7bc7` |
| Daemon identity SHA-256 | `047cf3fbf4c4eca91d5c31ccc59f53822162144f7eeb646c0cc7d70b6ca1df33` |
| Reviewed commit | `1b2ce2617818d705f884e8f52e33605ddc9ec85d` |
| Manifest SHA-256 | `6b34d456c6b8e8f9817f019b3ee971e5d7b8908c384b255bd832d7726ee0c91d` |
| Non-planning tree | `488f1df09f7504d22d78957a27a326b3efb438597d788e32deed62011ab974c2` |
| Final build artifact SHA-256 | `e5f86515e135e15828d45ee611aca70664d82ec6dc089b11850ccb7745117e1f` |

## Verification

- `node scripts/automatic-live-review.mjs auto-build`: READY, exactly one successful producer build.
- Provider-disabled focused suite: 3 files, 105/105 tests passed.
- `node scripts/audit-proof-chain.mjs build-auto ...`: `branch=ready`, `status=ready`, proof-chain audit passed.
- `git diff --check`: passed.
- Docker inspect confirmed the exact image exists locally as Linux/arm64.

## Decisions Made

- Kept the certified Plan 10-153 tuple byte-exact; no source or test edits were made.
- Used only the plan's exact no-argument `auto-build` entrypoint for producer execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Started the stopped local Docker daemon**
- **Found during:** Task 1
- **Issue:** The first pre-candidate invocation exited `AUTOMATIC_BUILD_FAILED` because Docker Desktop was not running; `docker version` reported `Server:null` and no candidate or authority artifact was created.
- **Fix:** Started Docker Desktop and waited until daemon version `29.8.0` was available before retrying the identical exact command once.
- **Files modified:** None
- **Verification:** The subsequent exact command produced the READY immutable image, and the independent no-rebuild audit passed.
- **Committed in:** No file change; outcome captured by `caccd9e`.

---

**Total deviations:** 1 auto-fixed (1 blocking environment issue). **Impact on plan:** No source identity, provider budget, network budget, or evidence authority changed; the failed pre-candidate attempt created no candidate artifact.

## Issues Encountered

- Docker Desktop was initially stopped. It was started locally; no credentials or external services were involved.

## Authentication Gates

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-155 may consume only the READY generation and immutable image recorded above.
- The live phase must preserve its one-provider-send, zero-retry/fallback/replay contract.

## Self-Check: PASSED

- Created FINAL-BUILD artifact exists and has SHA-256 `e5f86515e135e15828d45ee611aca70664d82ec6dc089b11850ccb7745117e1f`.
- Task commit `caccd9e` exists.
- All plan verification commands passed.
- No production/test source files were modified.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-21*
