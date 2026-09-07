---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 14
subsystem: testing
tags: [mcp, json-rpc, stdio, deadlines, protocol-validation]
requires:
  - phase: 10-12
    provides: bounded FIFO Docker stdout event delivery
  - phase: 10-13
    provides: retained post-FIFO live non-pass evidence
provides:
  - one absolute deadline for every proof-client request
  - strict JSON-RPC 2.0 response-envelope validation
  - validated MCP initialize result and initialized notification lifecycle
  - adversarial offline transport and transcript regressions
affects: [10-15, phase-07-provenance-closure, PROV-01]
tech-stack:
  added: []
  patterns: [absolute request deadline, strict response envelope, validated MCP initialization]
key-files:
  created: []
  modified:
    - scripts/docker-review-real.mjs
    - tests/scripts/docker-review-real.test.ts
key-decisions:
  - "Treat a matching-id malformed envelope as a sanitized method failure while unrelated ids and notifications remain skippable."
  - "Validate the negotiated initialize result before emitting the exact id-less notifications/initialized message."
patterns-established:
  - "Request timeout budgets are absolute and cannot be renewed by inbound traffic."
  - "Normal MCP operations begin only after strict initialize validation and initialized notification emission."
requirements-completed: [SAFE-04]
duration: 4min
completed: 2026-09-07
---

# Phase 10 Plan 14: Strict MCP Proof Client Summary

**A bounded JSON-RPC 2.0 proof client with absolute deadlines, validated MCP negotiation, and an exact initialized-handshake transcript**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-07T02:41:00Z
- **Completed:** 2026-09-07T02:45:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Enforced one request-scoped absolute deadline so notification traffic cannot renew a provider operation budget.
- Required ordinary JSON-RPC 2.0 response objects with the exact id and exactly one own `result` or `error` member.
- Validated negotiated protocol, capabilities, and server identity before sending the exact id-less `notifications/initialized` message.
- Added deterministic adversarial tests covering notification floods, invalid envelopes, malformed initialize results, redaction, and exact transcript order.

## Task Commits

Each task was committed atomically using TDD RED/GREEN gates:

1. **Task 1 RED: request transport regressions** - `64324fe` (test)
2. **Task 1 GREEN: bounded JSON-RPC requests** - `6c83944` (fix)
3. **Task 2 RED: MCP initialization regressions** - `de87d95` (test)
4. **Task 2 GREEN: complete MCP initialization lifecycle** - `b6e34d0` (fix)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Adds strict response validation, remaining-budget waits, initialize-result validation, initialized notification emission, and an offline lifecycle seam.
- `tests/scripts/docker-review-real.test.ts` - Adds deadline, envelope, malformed initialization, redaction, and exact outbound transcript coverage.

## Decisions Made

- A same-id invalid response fails immediately with the existing sanitized method category; unrelated ids and notifications remain ignored within the original deadline.
- The initialized notification is written only after the initialize result matches the requested protocol and contains ordinary capabilities and non-empty server metadata.
- `main()` remains the sole Docker entrypoint; the extracted lifecycle helper operates only on an injected stdio client for deterministic offline verification.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The expected TDD RED failures were resolved by the corresponding minimal production changes.

## Verification

- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test -- --run tests/scripts/docker-review-real.test.ts tests/scripts/audit-live-evidence.test.ts` — PASS, 114 tests.
- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test` — PASS, 28 files and 342 tests.
- `npm run build` — PASS.
- `git diff --check` — PASS.
- No Docker command, credential inspection, network diagnostic, or provider request was executed.

## Known Stubs

None. Empty arrays, objects, and strings found by the scan are intentional protocol defaults, runtime collections, test mutations, or validation comparisons; none flow to an unfinished UI or placeholder implementation.

## Threat Flags

None. The modified stdio trust boundary and its mitigations were already registered in the plan threat model; no new endpoint, credential path, file-access pattern, or schema boundary was introduced.

## Next Phase Readiness

- All offline protocol blockers from the prior Phase 10 review and verification are closed.
- Plan 10-15 may now request fresh explicit authorization for at most one zero-retry credentialed proof run.
- PROV-01 remains open until that separately authorized live run succeeds and its retained evidence is audited.

## Self-Check: PASSED

- Both modified source/test files exist.
- All four TDD task commits exist in git history.
- Every task acceptance criterion and plan-level offline verification command passed.
- No forbidden live or paid command was executed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-07*
