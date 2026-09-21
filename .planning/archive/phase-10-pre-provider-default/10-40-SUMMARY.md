---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 40
subsystem: provider-diagnostics
tags: [hmac, stderr, docker-harness, fail-closed, bounded-io]
requires:
  - phase: 10-39
    provides: authenticated proof-child diagnostic frames and production owner emission
provides:
  - per-live-generation diagnostic credentials passed only to the fixed Docker child
  - bounded stderr frame collection and one-time outer failure classification
  - zero-budget no-repair routing for every ambiguous or unauthenticated channel outcome
affects: [10-41, docker-review-real, PROV-01]
tech-stack:
  added: []
  patterns: [ephemeral per-generation child credentials, classify-once failure boundary, stdout-stderr protocol separation]
key-files:
  created: []
  modified: [scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts]
key-decisions:
  - "The host passes diagnostic values through named Docker environment forwarding flags, never as command-line values."
  - "Only one authenticated pre-terminal stderr frame can authorize an allowlisted repair classification; every other observation is ambiguous with zero follow-up budget."
patterns-established:
  - "Diagnostic collection is ephemeral, bounded, detached at teardown, and retains only the classifier's allowlisted projection."
requirements-completed: [SAFE-04, PROV-01]
duration: 5min
completed: 2026-09-13
---

# Phase 10 Plan 40: Host Child Diagnostic Classification Summary

**The Docker review harness now authenticates one bounded child stderr feature per live generation and converts every untrusted channel outcome into a zero-request ambiguous classification.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-13T13:00:55Z
- **Completed:** 2026-09-13T13:05:55Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Generated independent 32-byte HMAC keys and 64-hex generation identifiers for each live child and forwarded their environment names through the fixed Compose invocation.
- Collected only prefixed stderr candidates under the existing stream cap, authenticated one exact frame, and invoked the production diagnostic classifier exactly once at the outer failure boundary.
- Proved absent, duplicate, conflicting, bad-MAC, stale-generation, detail-bearing, stdout-confused, post-terminal, and oversized frames all retain only `ambiguous`, `no_repair`, and follow-up budget 0.
- Removed diagnostic listeners, cleared bounded buffers and key bytes, and deleted diagnostic environment properties during teardown without changing public MCP stdout or sanitized thrown errors.

## Task Commits

1. **Task 1 RED: Require host diagnostic channel classification** - `ba32b22` (test)
2. **Task 1 GREEN: Authenticate host child diagnostics** - `6bc4c59` (feat)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Per-generation credential injection, bounded diagnostic collection, authenticated parsing, classify-once retention, and teardown erasure.
- `tests/scripts/docker-review-real.test.ts` - Injected child-to-harness success and adversarial channel matrix.

## Decisions Made

- Docker receives `-e NAME` forwarding arguments while values remain confined to the spawned process environment; this avoids exposing the HMAC key in argv.
- A frame observed after either terminal event is invalid even if its HMAC is otherwise valid.
- Retention callbacks cannot mask or replace the owning sanitized harness failure.

## Verification

- RED gate: the new harness matrix failed 8 cases before implementation because diagnostic credentials, parsing, classification, and retention were absent.
- Focused suites: 100/100 passed across `docker-review-real.test.ts` and `diagnostics.test.ts`.
- Full offline regression: 535/535 passed across 41 test files.
- `npm run build`: passed.
- `git diff --check`: passed.
- External budgets: Docker 0, credential reads 0, network 0, provider requests 0, paid requests 0.
- GitHub Actions: `github_actions_runs=0`, `workflow_dispatches=0`, `repository_dispatches=0`, `gh_dispatches=0`, `git_pushes=0`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced a missing historical diagnostic reference with the canonical available record**
- **Found during:** Task 1 mandatory read-first gate
- **Issue:** The plan referenced `10-24-DIAGNOSTIC.json`, which does not exist; the phase's canonical sealed diagnostic record is `10-29-DIAGNOSTIC.json`.
- **Fix:** Read `10-29-DIAGNOSTIC.json` and its owning plan references to confirm the fixed schema/status context. No planning file was mutated.
- **Files modified:** None
- **Verification:** Repository-wide path search found only `10-29-DIAGNOSTIC.json` and confirmed its downstream use.
- **Committed in:** Not applicable (read-only execution adjustment)

---

**Total deviations:** 1 auto-fixed (1 blocking reference correction). **Impact on plan:** No implementation scope change; the live host-channel contract was executed exactly as specified.

## Issues Encountered

- The first RED test run contained an invalid escaped lookahead in a test-only regular expression. It was corrected before the valid RED gate run; the resulting failures were exclusively the intended missing production behavior.

## Known Stubs

None. Empty arrays and optional values in the modified files are bounded accumulators, terminal state, or test capture containers, not production stubs.

## Threat Model Results

- **T-10-40-01:** Mitigated with a fresh 32-byte per-generation HMAC key, generation binding, and the existing constant-time verifier.
- **T-10-40-02:** Mitigated with exact one-frame cardinality, pre-terminal timing, strict schema/sequence checks, the 4 KiB frame bound, and the existing 1 MB cumulative stderr cap.
- **T-10-40-03:** Mitigated by retaining only invariant ID, fingerprint, tier, regression ID, permitted files, and repair/budget fields; raw stderr, keys, MACs, generation IDs, and error details are discarded.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: host-authenticated-child-stderr | `scripts/docker-review-real.mjs` | Completes the proof-child diagnostic trust boundary with per-generation secret injection and authenticated host parsing. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-41 can enforce request accounting at the transport owner using the retained allowlisted host diagnosis.
- This plan made no Docker invocation or provider request and does not itself claim a successful credentialed proof.

## Self-Check: PASSED

- Both modified implementation/test files exist.
- RED/GREEN commits `ba32b22` and `6bc4c59` exist in git history.
- All acceptance criteria, focused tests, full offline regression, build, and diff checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
