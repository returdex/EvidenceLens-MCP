---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 10
subsystem: live-proof-security
tags: [evidence-audit, grammar, provenance, sanitization, tdd]
requires:
  - phase: 10-07
    provides: finite retained-evidence audit and truthful protocol non-pass
provides:
  - Exact four-fixture success evidence grammar
  - Positive safe-integer finding-count validation
  - Credential-free adversarial count and finite-allowlist regressions
affects: [PROV-01, SAFE-04, phase-07-verification, phase-10-verification]
tech-stack:
  added: []
  patterns: [anchored finite evidence grammar, safe-integer proof counts]
key-files:
  created: []
  modified: [scripts/audit-live-evidence.mjs, tests/scripts/audit-live-evidence.test.ts]
key-decisions:
  - "Accept success only for exactly four fixtures and a positive JavaScript safe-integer finding count."
  - "Preserve the producer's current `findings` noun for both one and multiple findings."
patterns-established:
  - "Editable retained proof must match an anchored five-line allowlist and mutually consistent planning state."
requirements-completed: [SAFE-04]
duration: 2min
completed: 2026-09-07
---

# Phase 10 Plan 10: Exact Live Evidence Count Summary

**Retained success evidence now proves exactly four fixtures and at least one bounded finding while rejecting malformed, injected, and impossible count claims.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-06T18:01:00Z
- **Completed:** 2026-09-06T18:03:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added table-driven adversarial coverage for zero, non-four, signed, fractional, padded, missing, injected, non-finite, leading-zero, and overflow-like counts.
- Restricted success to exactly `4 fixtures` and a positive finding count representable as a JavaScript safe integer.
- Preserved all seven sanitized failure categories, no-authorization handling, five-line evidence structure, and Phase 7/PROV-01 cross-file consistency checks.

## Task Commits

1. **Task 1: Define adversarial live-evidence count grammar** - `fc11594` (test, RED)
2. **Task 2: Require exact four-fixture positive-finding evidence** - `085b4e8` (fix, GREEN)

## Files Created/Modified

- `tests/scripts/audit-live-evidence.test.ts` - Covers exact valid production outcomes and broad adversarial, state-consistency, and disclosure cases.
- `scripts/audit-live-evidence.mjs` - Enforces the anchored four-fixture, positive safe-integer finding grammar.

## Decisions Made

- Used `Number.isSafeInteger` after an anchored positive-decimal match so arbitrarily large digit strings cannot become meaningful proof counts.
- Retained the existing plural `findings` token for a count of one because that is the current producer grammar.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Authentication Gates

None.

## Threat Mitigations

- **T-10-10-01:** Only exact four-fixture evidence with a positive bounded finding count can be treated as success.
- **T-10-10-02:** Anchoring and finite line-count enforcement reject padding, trailing text, duplicate blocks, control characters, and newline injection.
- **T-10-10-03:** Existing disclosure cases continue to reject JSON-RPC, filesystem paths, endpoints, keys/config, provider/model prose, causes, and stacks.
- **T-10-10-04:** Passed evidence still requires Phase 7 `passed`, checked PROV-01, and a `Complete` trace entry; non-pass evidence requires the inverse state.

## Known Stubs

None.

## User Setup Required

None - all verification was credential-free and made no Docker, network, provider, or paid request.

## Next Phase Readiness

- The retained-evidence false-positive path is closed and ready for Phase 10 re-verification.
- PROV-01 remains open until Plan 10-11 obtains a separately authorized successful credentialed Docker MCP proof.

## Self-Check: PASSED

- Both modified files exist and commits `fc11594` and `085b4e8` are present.
- All 53 focused evidence-audit tests and all 310 routine offline tests pass.
- TypeScript build, the current honest non-pass evidence audit, and `git diff --check` pass.
- No Docker live proof, credential use, network call, or paid provider request was executed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-07*
