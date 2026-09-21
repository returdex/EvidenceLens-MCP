---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 24
subsystem: testing
tags: [diagnostics, json-rpc, redaction, provenance, fail-closed]
requires:
  - phase: 10-23
    provides: retained sanitized protocol non-pass and immutable live evidence
provides:
  - finite invariant-level protocol diagnostic registry
  - canonical non-secret structural feature fingerprints
  - exhaustive provider-disabled diagnostic collision and ambiguity tests
affects: [10-25, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [closed diagnostic taxonomy, allowlisted structural hashing, zero-budget ambiguous failure]
key-files:
  created: []
  modified:
    - scripts/docker-review-real.mjs
    - tests/scripts/docker-review-real.test.ts
key-decisions:
  - "Hash only canonical allowlisted path/code feature vectors; never hash rejected values or exception text."
  - "Unknown, duplicate, multi-issue, and unmapped vectors collapse to ambiguous with no_repair and a zero follow-up request budget."
patterns-established:
  - "Public harness errors remain unchanged while diagnostics use a separate finite structural vocabulary."
  - "Registry startup rejects duplicate ownership, regression IDs, and feature fingerprints."
requirements-completed: [SAFE-04, PROV-01]
duration: 4min
completed: 2026-09-13
---

# Phase 10 Plan 24: Non-Secret Protocol Diagnostics Summary

**A closed 59-invariant diagnostic registry now narrows protocol failures using only canonical structural features, with ambiguous cases permanently barred from paid follow-up.**

## Performance

- **Duration:** 4 min
- **Completed:** 2026-09-13T08:00:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Defined invariant-level categories across JSON-RPC, MCP tool results, public schemas, provider parsing, provenance, orchestration, disclosure, lifecycle, and bounded I/O.
- Added SHA-256 fingerprints derived exclusively from allowlisted `{path, code}` vectors and startup collision checks for identifiers, regressions, ownership, and fingerprints.
- Proved every registry entry offline and asserted unknown, duplicate, and multi-cause vectors produce `ambiguous`, `no_repair`, and `follow_up_request_budget: 0` without success grammar or private content.

## Task Commits

1. **Task 1 RED: Diagnostic taxonomy contract** - `f5f66ef` (test)
2. **Task 1 GREEN: Closed protocol diagnostic taxonomy** - `7b3bcba` (feat)
3. **Task 2 RED: Exhaustive diagnostic vectors** - `5d0b384` (test)
4. **Task 2 GREEN: Offline invariant reproduction** - `7b5613a` (feat)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Canonical diagnostic registry, collision assertions, structural classifier, and test mutation accessor.
- `tests/scripts/docker-review-real.test.ts` - Registry, redaction, ambiguity, pairwise uniqueness, and exhaustive vector tests.

## Decisions Made

- Kept each public registry entry to the exact six planned fields; private path/code ownership remains in a closed index and only its digest crosses the diagnostic boundary.
- Kept diagnostic classification separate from the existing public `[docker-review:<phase>] failed` serialization, so diagnostic evidence cannot impersonate PROV-01 success.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced a nonexistent focused test path with the live contract suites**
- **Found during:** Task 2 verification
- **Issue:** `tests/contract/review-handler.test.ts` does not exist in the repository, so Vitest silently selected only the other requested files.
- **Fix:** Ran the current handler boundary suites `tests/contract/review-provider.test.ts` and `tests/contract/review-tool.test.ts` explicitly.
- **Files modified:** None
- **Verification:** Both files passed, 64/64 tests.
- **Committed in:** No source change required.

---

**Total deviations:** 1 blocking verification correction. **Impact:** Expanded validation against the actual current contract suite without changing scope.

## Issues Encountered

None beyond the corrected stale test path above.

## Verification

- Provider-disabled focused plan suite: PASS, 4 discovered files and 139 tests.
- Current review handler boundary suites: PASS, 2 files and 64 tests.
- TypeScript build: PASS.
- Acceptance taxonomy grep: PASS, 32 implementation/test matches.
- Diff hygiene: PASS.
- Docker/provider/network/credential/paid requests: 0.

## Known Stubs

None.

## Threat Flags

None beyond T-10-24-01 through T-10-24-04. Diagnostics retain only fixed enum metadata and canonical allowlisted structural fingerprints.

## User Setup Required

None.

## Next Phase Readiness

- Plan 10-25 can consume deterministic invariant IDs and fingerprints when implementing automatic one-request state machinery.
- This plan performs no live proof and does not itself close PROV-01.

## Self-Check: PASSED

- Both modified files exist.
- Commits `f5f66ef`, `7b3bcba`, `5d0b384`, and `7b5613a` exist.
- Focused offline tests, live contract equivalents, build, taxonomy grep, and diff hygiene passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
