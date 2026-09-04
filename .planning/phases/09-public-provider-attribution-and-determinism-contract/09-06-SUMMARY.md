---
phase: 09-public-provider-attribution-and-determinism-contract
plan: 06
subsystem: api
tags: [provider-boundary, ownership, transient-cleanup, deterministic-snapshot, strict-schema, tdd]

requires:
  - phase: 09-05
    provides: Provider-authored token guard, analyzer isolation, best-effort payload cleanup, and runtime-exact documentation
provides:
  - Runtime-strict three-field provider inference projection with request-only recursive freezing
  - Unconditional post-analysis cleanup with source-correct INTERNAL_ERROR precedence
  - Stable-reference claim/token/payload scrubbing and trusted deterministic finding snapshots
  - Executable whole-result rejection semantics for unknown/private provider result fields
affects: [phase-09-verification, phase-10-provider-startup-e2e, MCP-02, SAFE-03]

tech-stack:
  added: []
  patterns: [request-owned deep copy before freeze, registered cleanup lifecycle, parsed deep-frozen analyzer snapshot, strict whole-result rejection]

key-files:
  created: []
  modified:
    - src/providers/types.ts
    - src/tools/review.ts
    - src/review/analysis.ts
    - tests/review/analysis.test.ts
    - tests/contract/review-provider.test.ts
    - tests/contract/public-contract-docs.test.ts
    - docs/mcp-contract.md

key-decisions:
  - "Project production ProviderConfig into a fresh strict model/temperature/maxTokens object before fingerprinting and freezing any provider request."
  - "Register original and isolated cleanup closures before reading provider configuration, and preserve pending setup/analyzer/provider errors over cleanup faults."
  - "Treat validated analyzer findings as a server-owned deep-copied frozen snapshot for collision checks, provider projection, and final merge."
  - "Reject the entire provider result when strict validation sees any unknown or private extra field; never describe this as discard-and-continue."

patterns-established:
  - "Ownership boundary: only request-owned copies are recursively frozen; caller configuration and nested objects remain mutable."
  - "Cleanup boundary: every registered analysis closure runs in finally, with first pending subsystem error retaining precedence."
  - "Snapshot boundary: analyzer-owned findings are never read again after validation, deep copy, and freeze."

requirements-completed: [SAFE-03]

duration: 10 min
completed: 2026-09-04
---

# Phase 09 Plan 06: Provider Ownership, Cleanup, and Determinism Closure Summary

**Strict three-key provider inference, ownership-safe freezing, complete transient claim scrubbing, race-proof deterministic snapshots, and whole-result extra-field rejection**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-04T12:59:01Z
- **Completed:** 2026-09-04T13:08:44Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Runtime-projects production-shaped eight-field provider configuration into exactly `model`, `temperature`, and `maxTokens`, validates it strictly before provider invocation, and freezes only request-owned copies.
- Places inference setup, analyzer isolation/execution, provider execution, projection, and merge under one registered-cleanup `try/catch/finally` boundary with sanitized source-correct errors.
- Clears retained original and isolated claim objects, original/current token arrays, top-level claim arrays, payload text/table cells, and mutable buffers best-effort across success and failure paths.
- Deep-copies and freezes validated analyzer findings so microtask/timer mutations cannot affect collision checks or the final public result.
- Aligns normative documentation with runtime: unknown/private provider result extras reject the entire result as sanitized `PROVIDER_FAILURE`.

## Task Commits

Each TDD task was committed as a RED/GREEN pair:

1. **Task 1 RED: Production inference ownership and setup lifecycle regressions** - `5312087` (test)
2. **Task 1 GREEN: Strict inference projection and registered cleanup boundary** - `81aac71` (fix)
3. **Task 2 RED: Stable-reference cleanup and async snapshot race regressions** - `992bb30` (test)
4. **Task 2 GREEN: Claim scrubbing and trusted analyzer snapshots** - `ffbbb29` (fix)
5. **Task 3 RED: Strict result rejection documentation and extra-field matrix** - `ef6d7db` (test)
6. **Task 3 GREEN: Whole-result rejection contract documentation** - `0bc1f6e` (docs)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `src/providers/types.ts` - Adds the strict runtime `providerInferenceSettingsSchema` and schema-derived inference type.
- `src/tools/review.ts` - Projects request-owned inference, registers cleanup lifecycle observers, normalizes setup errors, and merges only trusted analyzer snapshots.
- `src/review/analysis.ts` - Scrubs stable claim, token-array, top-array, payload, cell, and buffer references while continuing after local faults.
- `tests/review/analysis.test.ts` - Directly verifies original analysis cleanup and first-error-continue behavior.
- `tests/contract/review-provider.test.ts` - Covers production config ownership, runtime validation, setup registration, isolated cleanup, async mutation, and six strict extra fields.
- `tests/contract/public-contract-docs.test.ts` - Enforces fenced-code-aware whole-result rejection language and rejects silent-discard claims.
- `docs/mcp-contract.md` - Separates request-side inference projection from result-side strict rejection.

## Decisions Made

- Runtime schema validation, not TypeScript `Pick`, defines the provider-visible inference boundary.
- The narrow `handleReviewRequestForTest` observer receives only already-registered original/isolated lifecycle references and is not part of handler options, MCP fields, or provider DTOs.
- Cleanup errors become fresh `INTERNAL_ERROR` only when no earlier setup/analyzer/provider error is pending.
- `MCP-02` remains pending independent Phase 09 verification; `SAFE-03` remains complete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Bug] Replaced ambiguous numeric sentinel substring checks**
- **Found during:** Task 1 GREEN
- **Issue:** A raw sentinel value such as `2` naturally appeared in hashes and version strings, causing a false-positive leakage assertion.
- **Fix:** Checked configuration-specific serialized key/value fragments while retaining unique secret/URL/holder sentinel checks.
- **Files modified:** `tests/contract/review-provider.test.ts`
- **Verification:** Task 1 focused suite passed 34/34.
- **Committed in:** `81aac71`

**2. [Rule 3 - Blocking] Corrected strict TypeScript ownership expressions**
- **Found during:** Task 2 GREEN
- **Issue:** Closure narrowing for a captured token array and readonly typing for a runtime-frozen Zod array blocked compilation.
- **Fix:** Captured the narrowed token array in a stable local and kept runtime freeze semantics without imposing an incompatible compile-time readonly result type.
- **Files modified:** `src/review/analysis.ts`, `src/tools/review.ts`
- **Verification:** Strict build and 180-test full suite passed.
- **Committed in:** `ffbbb29`

**3. [Rule 1 - Documentation Regression] Preserved the complete non-public provider data clause**
- **Found during:** Task 3 GREEN
- **Issue:** The first strict-rejection wording split the existing complete non-public list across sentences, failing the executable documentation contract.
- **Fix:** Kept whole-result rejection and consolidated all internal provider data categories into the same normative clause.
- **Files modified:** `docs/mcp-contract.md`
- **Verification:** Focused docs/provider suite passed 51/51.
- **Committed in:** `0bc1f6e`

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 3).
**Impact on plan:** All fixes were necessary to keep the planned tests precise and the existing public documentation contract intact; no scope expansion occurred.

## Issues Encountered

- Existing PDF.js indexing/font warnings remained non-failing and outside this plan's scope.

## User Setup Required

None - all verification was credential-free and no-network; the DeepSeek live provider was not invoked.

## Known Stubs

- `docs/mcp-contract.md:72` retains the pre-existing reference to a placeholder fixture image used only by the explicit opt-in live provider test. It is intentional fixture documentation and does not affect routine verification.

## Verification

- Focused analysis/provider/docs suite: 3 files, 55 tests passed.
- Strict TypeScript build: passed.
- Full default credential-free/no-network suite: 26 files, 180 tests passed; `tests/providers/deepseek-live.test.ts` remained excluded.
- `git diff --check`: passed.
- 09-01 through 09-05 PLAN/SUMMARY SHA-256 gate: all 10 files unchanged byte-for-byte.
- Dynamic repository scope gate: passed; only the seven declared files plus allowed planning metadata changed from the 09-06 plan baseline.
- All seven high-severity threat mitigations have focused automated coverage; no endpoint, credential, network, Docker/startup, or filesystem surface was added.

## TDD Gate Compliance

- Task 1: `5312087` RED failed exactly on runtime inference leakage, invalid-value classification, and missing cleanup registration; `81aac71` GREEN passed focused tests and build.
- Task 2: `992bb30` RED failed exactly on original/isolated retained claims, first-error cleanup continuation, and async analyzer mutation; `ffbbb29` GREEN passed focused tests, build, and full suite.
- Task 3: `ef6d7db` RED failed on the existing silent-discard documentation claim while all strict runtime cases passed; `0bc1f6e` GREEN passed semantic, handler, build, and full-suite gates.

## Next Phase Readiness

- Plan 09-06 is fully implemented and ready for independent Phase 09 verification.
- ROADMAP may show 6/6 plan execution, but Phase 09 and `MCP-02` must remain pending until that verifier succeeds.
- Phase 10 credentialed startup/E2E and Phase 11 Linux filesystem hardening remain untouched.

---
*Phase: 09-public-provider-attribution-and-determinism-contract*
*Completed: 2026-09-04*

## Self-Check: PASSED

- Summary and all seven planned implementation/test/documentation files exist.
- All six Task 1-3 RED/GREEN commits exist in Git history in the required order.
- Focused tests, strict build, full no-network suite, whitespace, prior-file hashes, truthful state, requirement status, and dynamic scope gates pass.
