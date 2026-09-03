---
phase: 09-public-provider-attribution-and-determinism-contract
plan: 03
subsystem: api
tags: [zod, provider-boundary, provenance, error-sanitization, tdd]

requires:
  - phase: 09-02
    provides: Strict provider result validation, public attribution, and deterministic regression oracles
provides:
  - Bidirectional PDF page/hash provenance enforcement
  - Source-specific sanitized provider and analyzer exception boundaries
  - Isolated provider attribution grammar and executable INVALID_REQUEST documentation contract
affects: [phase-10-provider-startup-e2e, MCP-02, SAFE-03]

tech-stack:
  added: []
  patterns: [page-addressed PDF provenance validation, source-owned exception translation, executable documentation examples]

key-files:
  created: []
  modified:
    - src/contracts/review.ts
    - src/tools/review.ts
    - tests/contract/review-provider.test.ts
    - tests/contract/public-contract-docs.test.ts
    - docs/mcp-contract.md

key-decisions:
  - "Validate PDF visual provenance in both the citation child schema and the complete response against the retained payload for the cited page."
  - "Translate analyzer throws at the analyzer seam and keep the complete provider-owned parse/read/namespace/projection path inside one sanitized provider boundary."
  - "Exercise attribution grammar only from a valid provider-backed response containing a provider-prefixed finding."

patterns-established:
  - "PDF provenance: non-visual citations carry no visual hash; visual citations require an exact retained page/hash pair."
  - "Failure ownership: provider-return access maps to PROVIDER_FAILURE, analyzer execution maps to INTERNAL_ERROR, and final merged validation remains outside provider translation."

requirements-completed: [MCP-02, SAFE-03]

duration: 8 min
completed: 2026-09-03
---

# Phase 09 Plan 03: Public Provider Attribution and Determinism Contract Summary

**Bidirectional PDF provenance, fail-closed hostile provider handling, source-correct analyzer errors, and an executable stable INVALID_REQUEST contract**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-03T10:18:21Z
- **Completed:** 2026-09-03T10:26:26Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- PDF citations now reject every hash on non-visual claims and accept visual claims only when page number and SHA-256 identify the same retained page payload.
- Throwing provider getters and Proxy traps collapse to the exact sanitized `PROVIDER_FAILURE`, while analyzer TypeError, RangeError, Error, and non-Error throws collapse to `INTERNAL_ERROR` without changing real request/limit classifications.
- Provider name/model grammar tests now retain a real provider finding and isolate each child rule; the normative INVALID_REQUEST JSON block is parsed and compared against actual handler output.

## Task Commits

Each task followed a committed RED/GREEN cycle:

1. **Task 1 RED: PDF provenance regressions** - `ba395da` (test)
2. **Task 1 GREEN: Bidirectional PDF page/hash enforcement** - `60cd93a` (feat)
3. **Task 2 RED: Provider/analyzer exception boundary regressions** - `fb4c635` (test)
4. **Task 2 GREEN: Source-specific provider and analyzer translation** - `2150e7f` (feat)
5. **Task 3 RED: Isolated attribution grammar and executable docs contract** - `b8560c3` (test)
6. **Task 3 GREEN: Runtime-accurate INVALID_REQUEST example** - `c7fb36d` (docs)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `src/contracts/review.ts` - Enforces PDF visual/non-visual invariants and exact retained page/hash matching.
- `src/tools/review.ts` - Adds analyzer-owned INTERNAL_ERROR translation and one provider-owned parse/read/namespace/projection catch.
- `tests/contract/review-provider.test.ts` - Covers PDF provenance, hostile returned objects, analyzer throws, classification controls, and isolated attribution grammar.
- `tests/contract/public-contract-docs.test.ts` - Extracts the Error response JSON and compares it with exact runtime output.
- `docs/mcp-contract.md` - Publishes the stable `Invalid request` message.

## Decisions Made

- A PDF may be visual or non-visual, unlike text/table and image-only citation rules; visual PDF acceptance is determined by retained page-addressed payload provenance.
- Native provider call throws retain provider request-failure identity internally, while every non-ProviderError raised while consuming a returned object becomes `PROVIDER_INVALID_RESPONSE`; both remain one public `PROVIDER_FAILURE`.
- Final deterministic-plus-provider response parsing remains outside provider translation so local composition defects cannot be mislabeled as provider faults.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial wrong-page regression used the two-page scanned fixture whose rendered pages have identical hashes. The test was corrected during GREEN to cite a nonexistent second page while only page one has a retained payload, preserving the intended page-addressed failure condition.
- Existing PDF.js indexing/font warnings appeared during focused and full suites; they remained non-failing, pre-existing, and outside this plan's scope.

## User Setup Required

None - all verification is credential-free and no-network.

## Known Stubs

- `docs/mcp-contract.md:72` mentions the existing placeholder image used only by the explicit opt-in live provider test. It is intentional documentation of a credentialed fixture and does not affect routine verification or Phase 09 behavior.

## Verification

- Focused provider/docs contract suite: 2 files, 31 tests passed.
- Strict TypeScript build: passed.
- Full default credential-free/no-network suite: 26 files, 158 tests passed; `tests/providers/deepseek-live.test.ts` remained excluded.
- `git diff --check`: passed.
- 09-01 and 09-02 plan SHA-256 checks: passed byte-for-byte.
- Scope exclusion check: only the five planned files changed; no Phase 10 startup/Docker/live-provider or Phase 11 filesystem files changed.

## TDD Gate Compliance

- Task 1: `ba395da` RED failed on acceptance of a non-visual PDF arbitrary hash; `60cd93a` GREEN passed 17 focused tests and strict build.
- Task 2: `fb4c635` RED exposed analyzer/provider TypeError misclassification; `2150e7f` GREEN passed 20 focused tests, strict build, and the full suite.
- Task 3: `b8560c3` RED failed only on the stale documented message after attribution grammar passed; `c7fb36d` GREEN passed 31 focused tests and strict build.

## Next Phase Readiness

- MCP-02 and SAFE-03 gap-closure behavior is implemented and ready for independent Phase 09 re-verification.
- Phase 10 Docker/provider startup and live full-boundary E2E remain intentionally untouched.
- Phase 11 filesystem traversal work remains intentionally untouched.

---
*Phase: 09-public-provider-attribution-and-determinism-contract*
*Completed: 2026-09-03*

## Self-Check: PASSED

- All five planned implementation, test, and documentation files exist.
- Task commits `ba395da`, `60cd93a`, `fb4c635`, `2150e7f`, `b8560c3`, and `c7fb36d` exist in Git history in RED/GREEN order.
- Focused tests, strict build, full default suite, whitespace check, completed-plan hashes, and scope exclusion checks all pass.
