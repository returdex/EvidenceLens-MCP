---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 05
subsystem: provider-configuration
tags: [deepseek, configuration, live-test, fail-closed, vitest]

requires:
  - phase: 10-03
    provides: credential boundary documentation and adapter live-test contract
provides:
  - Side-effect-free credential-source presence predicate
  - Exact absent-versus-defective provider configuration regression matrix
  - Live adapter skip gate that propagates supplied configuration defects
affects: [10-07, provider-live-testing, phase-10-verification]

tech-stack:
  added: []
  patterns: [filesystem-metadata-only source probing, validation-after-presence gating]

key-files:
  created: []
  modified: [src/providers/config.ts, tests/providers/config.test.ts, tests/providers/deepseek-live.test.ts]

key-decisions:
  - "Treat an own DEEPSEEK_API_KEY environment property as supplied even when its value is blank or undefined, leaving validation to reject it."
  - "Use lstat metadata only for local source presence, convert only ENOENT to absence, and propagate every other probe defect."

patterns-established:
  - "Presence before validation: skip only when neither credential source exists, then validate supplied input without catch-to-skip behavior."
  - "Secret-free probing: determine source presence without reading, printing, validating, or sending credential content."

requirements-completed: [SAFE-04, PROV-01]

duration: 2min
completed: 2026-09-07
---

# Phase 10 Plan 05: Exact Live Credential Gate Summary

**Metadata-only credential-source detection now distinguishes genuine absence from defective supplied configuration, so opt-in DeepSeek validation skips once and fails closed everywhere else.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-06T14:21:50Z
- **Completed:** 2026-09-06T14:23:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added a credential-free matrix covering blank environment entries plus malformed, conflicting, unreadable, non-regular, invalid-model, invalid-URL, and out-of-range file configuration.
- Exported `hasProviderCredentialSource` with own-property and `lstat` checks that never inspect credential or configuration content.
- Removed the live adapter test's blanket catch so every supplied configuration defect remains a visible sanitized failure.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the exact absent-versus-defective credential-source matrix** - `c469d5c` (test)
2. **Task 2: Gate live-test skip on source absence and propagate configuration defects** - `6d29636` (fix)

## Files Created/Modified

- `src/providers/config.ts` - Adds the side-effect-free source-presence predicate.
- `tests/providers/config.test.ts` - Exercises the exact absence boundary and sanitized defective-source failures offline.
- `tests/providers/deepseek-live.test.ts` - Skips only on source absence and validates all supplied configuration normally.

## Decisions Made

- Environment ownership, not credential value, determines whether the environment source was supplied; blank and explicitly undefined entries are therefore present and invalid.
- Local path presence is determined with `lstatSync`, including directories and unreadable files, while only `ENOENT` means absent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None. Empty objects in provider parsing are intentional representations of absent optional configuration, not incomplete runtime wiring.

## User Setup Required

None - verification was credential-free and made no network calls.

## Next Phase Readiness

- Adapter-only live testing now exposes invalid local or environment configuration rather than reporting a successful skip.
- Complete PROV-01 proof still depends on the separately authorized credentialed Docker MCP plan 10-07.

## Self-Check: PASSED

- Modified source and test files exist.
- Task commits `c469d5c` and `6d29636` are present in Git history.
- Focused offline tests pass 15/15, TypeScript builds, and `git diff --check` reports no errors.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-07*
