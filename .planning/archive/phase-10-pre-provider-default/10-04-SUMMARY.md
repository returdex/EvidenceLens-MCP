---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 04
subsystem: provider-startup
tags: [mcp, stdio, provider-config, fail-closed, security]
requires:
  - phase: 10-03
    provides: Provider startup verification and identified executable-boundary gap
provides:
  - Eager provider configuration validation before local stdio serving
  - Sanitized nonzero executable failure for provider configuration errors
  - Process-boundary regression coverage without MCP traffic
affects: [phase-10-verification, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [eager startup validation, sanitized executable error boundary, child-process contract testing]
key-files:
  created: []
  modified: [src/server.ts, tests/contract/review-tool.test.ts]
key-decisions:
  - "Construct one validated McpServer before serveStdio, then expose that instance through the SDK-required factory contract."
  - "Sanitize only PROVIDER_CONFIGURATION at the executable boundary while preserving main() rejection and unrelated-error behavior."
patterns-established:
  - "Executable startup tests close stdin and send no MCP bytes so transport activity cannot hide lazy validation."
requirements-completed: [SAFE-04, PROV-01]
duration: 2min
completed: 2026-09-07
---

# Phase 10 Plan 04: Eager Local Provider Startup Summary

**The production stdio executable now validates provider configuration before transport startup and emits one stable, sanitized nonzero diagnostic on configuration failure.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-06T14:18:00Z
- **Completed:** 2026-09-06T14:20:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added child-process coverage for missing, invalid, and conflicting provider configuration with stdin already closed and no MCP request sent.
- Moved production server construction ahead of `serveStdio`, closing the lazy-validation exit-zero path.
- Restricted executable diagnostics to `PROVIDER_CONFIGURATION: Provider configuration is invalid` and verified secrets, paths, endpoints, configuration details, causes, and stack syntax are absent.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reproduce the pre-protocol executable startup failure** - `6bac2e6` (test)
2. **Task 2: Validate and classify provider configuration before serving stdio** - `cd19e7d` (fix)

## Files Created/Modified

- `tests/contract/review-tool.test.ts` - Runs the built executable in isolated temporary working directories and audits process status and output.
- `src/server.ts` - Constructs the server eagerly and sanitizes provider-configuration failures only at the direct executable boundary.

## Decisions Made

- Reused the SDK's factory-only `serveStdio` contract as `() => server` after eager construction, preserving SDK compatibility without deferring validation.
- Kept `main()` rejection semantics intact; only the direct executable invocation catches and classifies configuration errors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first test edit contained an invalid regular-expression character class for escaping the temporary path. It was corrected before the RED commit, after which the regression failed for the intended lazy-startup reason.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Local executable startup now supplies process-boundary evidence for SAFE-04 and the startup portion of PROV-01.
- Remaining gap plans can tighten live configuration, schema/identity validation, and credentialed Docker proof independently.

## Known Stubs

None.

## Self-Check: PASSED

- Both modified files exist.
- Task commits `6bac2e6` and `cd19e7d` exist.
- Focused build and 31 contract/config tests pass with credentials unset.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-07*
