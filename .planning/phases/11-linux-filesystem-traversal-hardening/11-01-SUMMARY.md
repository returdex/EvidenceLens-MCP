---
phase: 11-linux-filesystem-traversal-hardening
plan: 01
subsystem: filesystem
tags: [linux, nofollow, docker, security]
requires:
  - phase: 03-read-only-filesystem-boundary
    provides: canonical authorization and anchored reader
provides:
  - no-follow Linux component traversal
  - production Linux substitution regression
affects: [SAFE-01, phase-11-verification]
tech-stack:
  added: []
  patterns: [trusted proc descriptor hop followed by no-follow component opens]
key-files:
  created: [tests/filesystem/linux-anchored.mjs, scripts/test-linux-filesystem.sh]
  modified: [src/filesystem/policy.ts, src/filesystem/read.ts, tests/filesystem/policy.test.ts]
key-decisions:
  - Preserve canonical in-root symlink authorization while refusing substitution during the descriptor walk.
patterns-established:
  - Open every untrusted Linux path component with O_NOFOLLOW and fail closed when the flag is unavailable.
requirements-completed: [SAFE-01]
duration: 3min
completed: 2026-09-22
---

# Phase 11 Plan 01 Summary

**Linux intermediate directory opens now refuse symlinks, with a real production-image regression proving authorized reads and substitution denial.**

## Outcome and evidence

1. `b5c08be` — Linux root and reader require numeric `O_DIRECTORY`/`O_NOFOLLOW`; the trusted proc descriptor hop remains followable, while all later directory and leaf opens use no-follow. Canonical alias and injected-reader behavior remain covered.
2. `6658cba` — Added a credential-free `node:test` suite imported from production `dist` and a Docker runner with `--network none`, a read-only root, and a writable temporary fixture directory.

| Command | Exit | Observation |
|---|---:|---|
| `npm run build && npm test -- tests/filesystem/policy.test.ts tests/filesystem/read.test.ts` | 0 | 14/14 tests passed on macOS; build passed. |
| `bash scripts/test-linux-filesystem.sh` | 0 | Docker Linux Node runner passed 4/4 tests: nested read, in-root alias read, escaping alias denial, post-authorization intermediate symlink swap denial. |
| `git diff --check` | 0 | No whitespace errors. |

The Linux run used the built production image `evidencelens-phase11-filesystem:local` and no provider request or GitHub Actions run. The swap case returned `ACCESS_DENIED`; it did not return the outside fixture bytes.

## Deviations from Plan

None. The existing macOS test required a platform-independent `ACCESS_DENIED` assertion because macOS intentionally uses a different stable denial message.

## Issues Encountered

The first local test run expected the Linux-specific denial text on macOS. The assertion was narrowed to the stable error code, and the focused suite passed on rerun. The Linux container test supplies the production-path denial evidence.

## Next Phase Readiness

Plan 11-02 can review committed source `6658cbab065f740062017a136f7a1288363d046b`. SAFE-01 remains pending until independent phase verification.

## Self-Check: PASSED

Both task commits exist; the source and Linux production test satisfy Plan 11-01 acceptance criteria.
