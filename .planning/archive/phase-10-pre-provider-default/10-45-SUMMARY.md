---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 45
subsystem: automatic-proof-cli
tags: [cli, fail-closed, immutable-build, replay, subprocess]
requires:
  - phase: 10-44
    provides: authenticated proof-chain and replay-safe state
provides:
  - Fixed zero-extra-argv automatic build and live package entrypoints
  - Git-archive build generation with exclusive producer claim and read-only image verification
  - Actual package subprocess coverage for argv and preflight boundaries
affects: [10-47, 10-49, 10-50, 10-51, PROV-01]
tech-stack:
  added: []
  patterns: [fixed repository paths, shell-free subprocesses, credential-after-gates]
key-files:
  created: [tests/scripts/automatic-live-review-cli.test.ts]
  modified: [scripts/automatic-live-review.mjs, tests/scripts/automatic-live-review.test.ts]
key-decisions:
  - "Production automatic dispatchers accept no options; test substitution is confined to the OS PATH boundary."
  - "Create the Docker context from the exact reviewed Git commit archive before the exclusive build producer runs."
requirements-completed: [SAFE-04]
duration: 6min
completed: 2026-09-13
---

# Phase 10 Plan 45: Fixed Automatic CLI Entrypoints Summary

**The advertised automatic package commands now enter fixed production preflight, immutable archive-build, verification, replay-state, credential, and guarded live-harness paths instead of terminating at an unconditional stub.**

## Accomplishments

- Replaced `AUTOMATIC_PREFLIGHT`-only `main` with literal `auto-build` and `auto-live-once` dispatch.
- Bound build execution to the canonical Phase 10 SOURCE/review tuple, exact reviewed Git archive, one exclusive generation, one image build, a build-free verifier, atomic canonical BUILD output, and strict proof-chain revalidation.
- Bound live execution to the canonical BUILD tuple, durable consumed state, credential-after-gates ordering, and the production `runReviewHarness`.
- Added actual `npm run` subprocess tests proving argv/path injection is rejected before any fake OS executable and both package commands reach their fixed fail-closed preflight.

## Task Commits

1. **RED: Require substantive automatic CLI dispatch** - `5c3978b`
2. **Task 1: Wire fixed automatic review commands** - `a34dd32`
3. **Task 2: Exercise automatic package commands** - `b76a36b`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Prepared an exact reviewed Git archive inside the fixed build dispatcher**
- **Found during:** Task 1
- **Issue:** Reusing the historical 10-22 handoff would not build the newly reviewed source identity.
- **Fix:** Materialize the exact reviewed commit into a private temporary context and generate a fresh exclusive handoff for the existing producer/verifier.
- **Files modified:** `scripts/automatic-live-review.mjs`
- **Commit:** `a34dd32`

## Known Stubs

None.

## Threat Model Results

- **T-10-45-01:** Fixed mode tokens and zero additional argv reject caller-selected paths, commands, images, or budgets.
- **T-10-45-02:** Git archive identity, image digest validation, and read-only verification bind source to image.
- **T-10-45-03:** Stable `AUTOMATIC_*` terminal codes prevent secret and path disclosure; credential access follows all build gates.
- **T-10-45-04:** Existing O_EXCL producer and live-state claims make generations durable and replay-safe.

## Verification

- Focused unit/subprocess suites: 2 files, 10/10 tests passed.
- Full provider-disabled regression: 43 files, 570/570 tests passed.
- TypeScript build and `git diff --check`: passed.
- Docker runs 0; credential reads 0; network requests 0; provider requests 0; paid requests 0.
- `github_actions_runs=0`, `workflow_dispatches=0`, `repository_dispatches=0`, `gh_dispatches=0`, `git_pushes=0`.

## Self-Check: PASSED

- All three implementation/test files exist.
- Commits `5c3978b`, `a34dd32`, and `b76a36b` exist in Git history.
- No untracked generated/runtime files remain.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
