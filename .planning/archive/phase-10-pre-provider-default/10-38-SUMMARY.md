---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 38
subsystem: testing
tags: [child-process, lifecycle, fail-closed, vitest]
requires:
  - phase: 10-37
    provides: automatic proof workflow and deep review finding BL-06
provides:
  - creation-time child lifecycle observation
  - exact exit and close agreement gate
  - adversarial lifecycle disconfirmation matrix
affects: [10-39, docker-review-real, PROV-01]
tech-stack:
  added: []
  patterns: [creation-time event capture, absolute lifecycle deadline, fail-closed terminal agreement]
key-files:
  created: [.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-38-SUMMARY.md]
  modified: [scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts]
key-decisions:
  - "Lifecycle authority comes only from separately observed events; process exitCode and signalCode properties are never proof."
  - "Success waits for both bounded output streams and one event-loop turn so late terminal races fail closed."
patterns-established:
  - "Child lifecycle observers attach immediately after spawn and before protocol work."
requirements-completed: [SAFE-04, PROV-01]
duration: 3min
completed: 2026-09-13
---

# Phase 10 Plan 38: Strict Child Lifecycle Authority Summary

**Docker review success now requires one observed exit and one observed close with identical clean metadata, completed streams, and no late terminal race.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-13T12:46:00Z
- **Completed:** 2026-09-13T12:49:15Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Replaced the property-based shutdown shortcut with a lifecycle observer installed immediately after child creation.
- Required exactly one exit and close event, identical code/signal metadata, stdout/stderr completion, code 0, and null signal before success.
- Added adversarial coverage for missing, reversed, disagreeing, duplicate, post-deadline, and late stream/error lifecycle evidence.
- Preserved one absolute bounded lifecycle deadline across protocol work and teardown.

## Task Commits

1. **Task 1 RED: Require observed exit and close agreement** - `6b01401` (test)
2. **Task 1 GREEN: Require observed exit and close agreement** - `e8c7cab` (fix)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Captures and validates authoritative child lifecycle evidence from process creation.
- `tests/scripts/docker-review-real.test.ts` - Exercises the complete adversarial lifecycle matrix.
- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-38-SUMMARY.md` - Records plan outcome and verification.

## Decisions Made

- Child process properties remain usable only for bounded cleanup decisions; they cannot supply exit or close proof.
- Both output streams must terminate before lifecycle success, and a one-turn quiescence window catches terminal-adjacent data and errors.

## Verification

- Focused lifecycle suite: 87/87 passed.
- Full offline suite: 519/519 passed across 40 files.
- `npm run build`: passed.
- `git diff --check`: passed.
- Acceptance matrix: exit-without-close, close-without-exit, both orders, code disagreement, signal disagreement, duplicate terminal events, close after deadline, and late stream/error races all exercised and passed.
- Budgets: Docker 0, credentials 0, network 0, provider requests 0, paid requests 0.
- GitHub Actions: `github_actions_runs=0`, `workflow_dispatches=0`, `repository_dispatches=0`, `gh_dispatches=0`, `git_pushes=0`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None. The empty collections and null checks found by the mechanical scan are runtime state/validation constructs, not UI or production stubs.

## Threat Model Results

- **T-10-38-01:** Mitigated by separately counting observed exit and close events.
- **T-10-38-02:** Mitigated by exact code and signal equality plus clean-exit requirements.
- **T-10-38-03:** Mitigated by a single creation-time absolute deadline and listener cleanup.
- No new network, authentication, filesystem, or schema trust boundary was introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BL-06 is closed and the authoritative lifecycle primitive is ready for downstream production diagnostic wiring.
- This plan contributes lifecycle evidence to PROV-01; complete credentialed proof remains a later Phase 10 plan responsibility.

## Self-Check: PASSED

- Created summary exists.
- RED commit `6b01401` and GREEN commit `e8c7cab` exist.
- All task acceptance criteria and plan-level verification commands passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
