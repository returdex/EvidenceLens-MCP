---
phase: 04-review-orchestration-and-findings
plan: 01
subsystem: review-contracts
tags: [typescript, zod, vitest, provenance, security]

requires:
  - phase: 02-evidence-ingestion-and-multimodal-context
    provides: Strict normalized evidence references, hashes, and bounded visual payloads
  - phase: 03-read-only-filesystem-boundary
    provides: Safe canonical filesystem provenance and deterministic 0.1.2 review responses
provides:
  - Strict provider-neutral observation, finding, citation, and analyzer metadata schemas
  - Deterministic duplicate evidence-id rejection and normalized-provenance citation binding
  - Deterministic required-role validation and sanitized INVALID_REVIEW_ROLES taxonomy
affects: [04-02 deterministic analyzer, 04-03 MCP orchestration]

tech-stack:
  added: []
  patterns:
    - Strict Zod discriminated unions and bounded review text at the client contract boundary
    - Cross-object response validation binds citations to normalized evidence hashes, references, locations, and visual payloads
    - Sorted required-role diagnostics with stable generic public errors

key-files:
  created:
    - src/review/roles.ts
    - tests/review/roles.test.ts
  modified:
    - src/contracts/review.ts
    - src/errors.ts
    - src/tools/review.ts
    - tests/contracts/review-contract.test.ts
    - tests/contract/evidence-contract.test.ts

key-decisions:
  - "Use deterministic-rules/1.0.0 as the provider-independent analyzer identity; provider/model fields remain absent until Phase 5."
  - "Require finding evidenceIds to equal the sorted unique citation evidence-id set and validate citation provenance against normalized response evidence."
  - "Keep required role diagnostics internal and expose only INVALID_REVIEW_ROLES with its fixed generic message."

patterns-established:
  - "Finding fields separately represent observation, interpretation, optional uncertainty, follow-up checks, and typed citations."
  - "Visual PDF citations require a matching retained visualPayloads page and payload hash; image/screenshot citations are intrinsically visual."

requirements-completed: [REVW-01, REVW-03, REVW-04, SAFE-03]

metrics:
  duration: 4 min
  completed: 2026-08-22
---

# Phase 4 Plan 1: Review Contract and Role Gate Summary

**Auditable provider-neutral findings and citations with deterministic duplicate-id, provenance, role, and analyzer metadata validation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-22T17:35:00Z
- **Completed:** 2026-08-22T17:39:29Z
- **Tasks:** 2 completed
- **Files modified:** 7 implementation/test files

## Accomplishments

- Added `reviewFindingTypeSchema`, `findingConfidenceSchema`, `reviewObservationSchema`, `reviewCitationSchema`, and expanded `reviewFindingSchema` with bounded strict fields, all four finding categories, optional non-empty uncertainty, required follow-up checks, and unique sorted evidence identity.
- Added typed citation locations using `normalizedEvidenceReferenceSchema`, visual rules for image/screenshot and retained PDF pages, and response-level binding to normalized evidence IDs, hashes, source references, locations, and payload hashes.
- Added deterministic duplicate evidence-id issues at `["evidence", index, "id"]`, unique response finding IDs, fixed `deterministic-rules`/`1.0.0` metadata, and the `requiredReviewRoles`/`validateReviewRoles` gate.
- Preserved Phase 2 inline content and normalized evidence semantics, Phase 3 filesystem provenance/security behavior, read-only/no-provider boundaries, and version `0.1.2`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define findings, citations, and provider-neutral observation schemas** - `9981e08` (test, RED), `41bb8f5` (feat, GREEN), `85521f0` (fix: provenance binding)
2. **Task 2: Enforce the four required review roles and stable validation errors** - `594ca40` (feat)

## Files Created/Modified

- `src/contracts/review.ts` - Strict request duplicate gate, observation/finding/citation schemas, response analyzer metadata, and provenance invariants.
- `src/review/roles.ts` - Required role list and deterministic sorted missing/duplicate result.
- `src/errors.ts` - `INVALID_REVIEW_ROLES` and stable generic serialization.
- `src/tools/review.ts` - Fixed analyzer identity/version in successful response metadata.
- `tests/contracts/review-contract.test.ts` - Finding categories, strictness, duplicate IDs, citations, metadata, and provenance coverage.
- `tests/contract/evidence-contract.test.ts` - Updated response fixture for additive deterministic analyzer metadata.
- `tests/review/roles.test.ts` - Required-role and sanitized-error coverage.

## Decisions Made

- Analyzer identity is provider-independent and deterministic (`deterministic-rules`, `1.0.0`); provider/model versioning is deferred to Phase 5.
- Citation authority comes from normalized evidence in the response, never from caller-supplied paths or hashes alone.
- Role validation does not inspect role text, references, or filesystem content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security/Repudiation] Added response-level citation provenance binding**
- **Found during:** Task 1 verification
- **Issue:** Standalone citation fields could be syntactically valid while referring to an unknown evidence item or mismatched hash/reference/location.
- **Fix:** Added cross-object `reviewResponseSchema` validation for normalized evidence identity and retained PDF/image visual payload hashes, with focused forged-citation coverage.
- **Files modified:** `src/contracts/review.ts`, `tests/contracts/review-contract.test.ts`
- **Verification:** Focused suite, full suite, and build passed.
- **Committed in:** `85521f0`

**2. [Rule 3 - Compatibility] Updated legacy response fixtures for required analyzer metadata**
- **Found during:** Task 1 GREEN verification
- **Issue:** Existing Phase 1–3 contract fixtures omitted the newly required additive analyzer fields and used pre-0.1.2 metadata.
- **Fix:** Updated the affected contract fixture to assert `0.1.2`, `deterministic-rules`, and `1.0.0`; no production compatibility boundary or normalized evidence shape was weakened.
- **Files modified:** `tests/contract/evidence-contract.test.ts`, `tests/contracts/review-contract.test.ts`
- **Verification:** Full 71-test suite and build passed.
- **Committed in:** `41bb8f5`

**Total deviations:** 2 auto-fixed (Rule 2: 1, Rule 3: 1)
**Impact on plan:** Both changes were required to satisfy the threat model or preserve the additive Phase 2/3 contract; no provider, network, Docker, filesystem-read, or release scope was added.

## Issues Encountered

None blocking. Existing PDF.js fixture warnings about indexing/font fallback remain non-fatal and pre-date this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 04-02 can consume `ReviewFinding`, `ReviewCitation`, `ReviewObservation`, and deterministic analyzer metadata directly. The role gate is available for Plan 04-03 handler wiring. No provider/model/network calls, Docker artifacts, or release changes were introduced.

## Known Stubs

None in the files created or modified by this plan. Empty findings remain intentional until Plan 04-02/04-03 wires the deterministic analyzer.

## Verification

- `npm test -- --run tests/contracts/review-contract.test.ts tests/review/roles.test.ts` - passed, 2 files and 11 tests.
- `npm run build` - passed.
- `npm test` - passed, 14 files and 71 tests.
- `git diff --check` - passed.
- Version scan reports only existing `0.1.2` values in the requested source/package/version/docs scope.
- Forbidden provider/network/Docker/process/mutation scan found no implementation matches in the new review/contract code; the only matches were intentional negative-test strings.

---
*Phase: 04-review-orchestration-and-findings*
*Completed: 2026-08-22*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/04-review-orchestration-and-findings/04-01-SUMMARY.md`.
- Implementation/test files listed above exist.
- Task commits `9981e08`, `41bb8f5`, `85521f0`, and `594ca40` exist in git history.
