---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 42
subsystem: provider-proof
tags: [hmac, receipt, request-budget, durable-state, mcp]
requires:
  - phase: 10-41
    provides: transport-bound one-shot request budget and signed adapter receipt
provides:
  - host authentication of exactly one adapter HTTP-send receipt
  - durable distinct MCP tools/call, reservation, and observed HTTP-send counters
  - automatic live execution bound directly to the production review harness
affects: [10-43, 10-44, 10-51, PROV-01]
tech-stack:
  added: []
  patterns: [bounded authenticated child receipt channel, monotonic distinct proof counters]
key-files:
  created: []
  modified: [scripts/docker-review-real.mjs, scripts/automatic-live-review.mjs, scripts/live-proof-state.mjs, tests/scripts/docker-review-real.test.ts, tests/scripts/automatic-live-review.test.ts, tests/scripts/live-proof-state.test.ts]
key-decisions:
  - "Only an exact per-generation HMAC-authenticated adapter receipt can establish an observed provider HTTP send."
  - "MCP tools/call, request reservation, and observed transport send remain separate monotonic durable counters."
patterns-established:
  - "Receipt cardinality: missing, duplicate, malformed, stale, forged, impossible, or post-terminal frames never establish an observed send."
requirements-completed: [SAFE-04, PROV-01]
duration: 7min
completed: 2026-09-13
---

# Phase 10 Plan 42: Authenticated Adapter Receipt Ingestion Summary

**The host now authenticates one adapter-bound HTTP-send receipt and persists MCP intent, reservation, and observed billable traffic as three independent counters.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-13T13:17:51Z
- **Completed:** 2026-09-13T13:24:30Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- Added a bounded stderr receipt collector that accepts exactly one schema-exact, generation-bound HMAC receipt before child termination.
- Replaced the ambiguous provider-attempt counter with durable `mcp_tools_call_count`, `reservation_count`, and `observed_provider_requests` fields.
- Bound stateful automatic live execution to `runReviewHarness` and removed the injectable `spawnOnce` outcome authority.
- Proved observed counts of both zero (pre-fetch) and one (guarded fetch), plus rejection of forged, missing, duplicate, stale, impossible, advisory, and late evidence.

## Task Commits

1. **Task 1 RED: receipt and counter contract** - `a965b79` (test)
2. **Task 1 GREEN: authenticated receipt ingestion and durable accounting** - `06cf965` (feat)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Authenticates bounded adapter receipt frames and reports separate host-observed evidence.
- `scripts/automatic-live-review.mjs` - Uses the fixed production harness and records only its authenticated request evidence.
- `scripts/live-proof-state.mjs` - Validates and durably advances three distinct monotonic counters.
- `tests/scripts/docker-review-real.test.ts` - Covers exact receipt authentication/cardinality and hostile frames.
- `tests/scripts/automatic-live-review.test.ts` - Locks direct production-harness integration and absence of `spawnOnce` authority.
- `tests/scripts/live-proof-state.test.ts` - Covers zero/one observed sends and rejection of advisory or impossible counter values.

## Decisions Made

- A host-known tools/call may establish only `mcp_tools_call_count`; it cannot establish an HTTP send.
- Missing or invalid receipt evidence records no observed send and cannot turn any outcome into pass.
- Request authorization remains consumed after any non-pass and all durable counters are monotonic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The initial RED suite passed because implementation edits had been drafted first. The two production files were restored to their committed state, the RED suite was rerun with 13 expected failures, and the failing tests were committed before reapplying the implementation.

## Security Notes

- Threat T-10-42-01 is mitigated through per-generation HMAC verification, exact schema/key order, bounded size, and exact-one cardinality.
- Threat T-10-42-02 is mitigated by independent durable counters.
- Threat T-10-42-03 is mitigated by removing `spawnOnce`; automatic production execution calls the reviewed harness directly.
- No new network endpoint, credential source, filesystem trust boundary, or schema outside the planned proof-state change was introduced.

## Execution Budgets

- Docker runs: 0
- Credential reads: 0
- Network/provider/paid requests: 0
- GitHub Actions runs: 0
- `workflow_dispatch`: 0
- `repository_dispatch`: 0
- `gh` dispatches: 0
- Git pushes: 0

## Verification

- Focused suite: 4 files, 126 tests passed.
- Full offline regression: 42 files, 545 tests passed.
- TypeScript build: passed.
- Stub scan: no goal-blocking stubs found.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 10-43 and 10-44 can now consume exact host-authenticated request evidence without treating MCP intent or an advisory callback as billable traffic.

## Self-Check: PASSED

- All six declared modified files exist.
- RED commit `a965b79` and GREEN commit `06cf965` exist.
- Focused acceptance suite, full offline regression, and build all pass.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
