---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 12
subsystem: credentialed-docker-proof
tags: [stdio, json-rpc, fifo, bounded-memory, sanitization, tdd]
requires:
  - phase: 10-11
    provides: latest authorized Docker MCP protocol non-pass and truthful open PROV-01 state
provides:
  - Bounded FIFO delivery for early, split, and coalesced Docker MCP stdout events
  - Sanitized terminal handling for overflow, timeout, child exit, and child error
  - Credential-free adversarial parser ordering and cleanup coverage
affects: [PROV-01, SAFE-04, docker-review-real, phase-10-verification]
tech-stack:
  added: []
  patterns: [waiter-or-bounded-FIFO delivery, queued-first consumption, terminal parser cleanup]
key-files:
  created: []
  modified: [scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts]
key-decisions:
  - "Bound pending stdout events at eight, enough for the three-request proof while limiting untrusted retained output."
  - "Consume accepted FIFO events before terminal state, but clear all retained data on overflow and ignore subsequent stdout."
patterns-established:
  - "Each complete stdout line is delivered exactly once to the oldest waiter or appended once to a bounded FIFO."
requirements-completed: [SAFE-04]
duration: 5min
completed: 2026-09-07
---

# Phase 10 Plan 12: Bounded FIFO Stdio Delivery Summary

**The Docker MCP proof client now preserves early and coalesced JSON-RPC events in wire order while terminating safely on bounded queue pressure, timeout, exit, and error.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-07T02:10:00Z
- **Completed:** 2026-09-07T02:15:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Reproduced the destructive-drain defect with offline tests for coalesced notification/response pairs, early responses, FIFO order, split input, malformed lines, overflow, and cleanup.
- Added an eight-event pending FIFO that always serves queued events before registering a new waiter and never exceeds its fixed capacity.
- Added sanitized terminal states that detach stdout/child listeners, cancel waiter timers, clear overflow data, and ignore all later child output.
- Verified 38 focused parser tests, all 319 credential-free tests, the TypeScript build, and diff hygiene without Docker, credentials, network, or provider calls.

## Task Commits

1. **Task 1: Lock the bounded ordered event-delivery contract offline** - `3c9df26` (test, RED)
2. **Task 2: Implement bounded FIFO delivery and terminal cleanup** - `8415f32` (fix, GREEN)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Implements waiter-or-FIFO delivery, queued-first reads, finite overflow, and deterministic terminal cleanup.
- `tests/scripts/docker-review-real.test.ts` - Exercises ordering, exact delivery, malformed input, capacity boundaries, timeout, exit, error, and sanitization entirely offline.

## Decisions Made

- Selected a fixed capacity of eight pending events: deliberately small for a client that performs only three sequential MCP requests, while allowing ordinary notifications and coalescing.
- Preserved accepted queued events across non-overflow terminal signals so they remain observable in order; overflow alone clears pending data and the partial buffer to fail closed under pressure.
- Represented malformed and terminal conditions with boolean-only internal markers so raw JSON, errors, paths, stacks, causes, and secrets cannot reach public diagnostics.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The RED suite intentionally timed out on early/FIFO cases under the old destructive drain. A short test timeout was used only to capture the expected failing evidence; normal verification uses the standard timeout and passes.

## Authentication Gates

None.

## Threat Mitigations

- **T-10-12-01:** Every parsed event follows one waiter-or-FIFO path, and queued events are consumed in strict insertion order.
- **T-10-12-02:** Pending storage is capped at eight; the ninth queued event triggers one terminal overflow, clears retained data, detaches listeners, and ignores later output.
- **T-10-12-03:** Malformed, overflow, exit, error, and timeout events contain no external content and map to existing allowlisted diagnostics.
- **T-10-12-04:** A notification can no longer discard a matching response coalesced into the same stdout chunk.
- **T-10-12-05:** Terminal settlement clears waiter timers/listeners and a timed-out waiter cannot consume later data.

## Known Stubs

None.

## User Setup Required

None - this plan used only credential-free test doubles and made no Docker, network, provider, or paid request.

## Next Phase Readiness

- The parser-loss cause of the prior protocol non-pass is closed and ready for Plan 10-13's separately authorized proof.
- PROV-01 remains open until that new credentialed Docker MCP proof succeeds and passes the retained-evidence audit.

## Self-Check: PASSED

- Both modified implementation/test files and this summary exist.
- Task commits `3c9df26` and `8415f32` exist.
- All 38 focused tests, all 319 routine offline tests, TypeScript build, and `git diff --check` pass.
- No Docker live proof, credential read, network call, or paid provider request was executed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-07*
