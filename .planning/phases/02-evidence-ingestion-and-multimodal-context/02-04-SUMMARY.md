---
phase: 02-evidence-ingestion-and-multimodal-context
plan: 04
subsystem: testing
tags: [typescript, vitest, mcp, zod, evidence, provenance, contracts]

requires:
  - phase: 02-01
    provides: Strict review and normalized evidence schemas with references, hashes, metadata, and warnings
  - phase: 02-02
    provides: Text/table normalizers, shared hashing, and parser limits
  - phase: 02-03
    provides: PDF/image normalizers with bounded visual payload preservation
provides:
  - Exact Phase 2 content-bearing review request validation
  - Public evidence dispatcher wired into the MCP review tool
  - Protocol-level normalized evidence coverage and Phase 2 contract documentation
affects: [phase-02, phase-03, phase-04, phase-05]

tech-stack:
  added: []
  patterns:
    - Explicit content is normalized in request order; metadata-only evidence remains an empty normalized list
    - Strict canonical base64 and UTF-8 byte bounds are enforced at the MCP trust boundary
    - Parser failures become sanitized stable tool errors while review remains read-only and findings-free

key-files:
  created:
    - src/evidence/index.ts
    - tests/contract/review-normalized-evidence.test.ts
  modified:
    - src/contracts/review.ts
    - src/evidence/limits.ts
    - src/tools/review.ts
    - tests/contracts/review-contract.test.ts
    - docs/mcp-contract.md
    - README.md

key-decisions:
  - "Keep reference opaque and derive inline identity only for explicit content without a reference; never read paths from requests."
  - "Allow line-oriented text/table content while rejecting unsafe control characters, and enforce decoded byte caps before parser fan-out."
  - "Return normalized evidence metadata only; findings, provider calls, filesystem access, writes, and review orchestration remain out of scope."

patterns-established:
  - "normalizeEvidenceItems dispatches supported evidence types in input order and skips metadata-only items."
  - "MCP contract tests validate both direct handler results and tools/call behavior, including the sole read-only tool registry."

requirements-completed: [EVID-01, EVID-02, EVID-03, EVID-04, EVID-05]

metrics:
  duration: 12 min
  completed: 2026-08-22
---

# Phase 2 Plan 4: Review Tool Integration Summary

**MCP review integration for bounded text/table/PDF/image content with schema-valid normalized provenance and explicit no-provider/no-findings boundaries**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-22T11:37:00Z
- **Completed:** 2026-08-22T11:49:31Z
- **Tasks:** 3 completed
- **Files modified:** 8

## Accomplishments

- Added RED contract coverage for all supported content types, strict payload combinations, base64/byte limits, opaque references, MCP protocol invocation, and read-only tool discovery.
- Added the public normalizer dispatcher and integrated normalized evidence into deterministic review responses while preserving empty findings and sanitized parser errors.
- Documented the exact Phase 2 request and response contract, provenance fields, warnings, visual payload behavior, parser limits, and non-capabilities.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing review tool normalized-evidence contract tests** - `4f8a6b1` (test)
2. **Task 2: Wire dispatcher and review handler normalized output** - `0bbc177` (feat)
3. **Task 3: Document Phase 2 normalized evidence behavior and verify boundaries** - `ae9780a` (docs)

**Plan metadata:** `6723346` (docs: complete plan)

## Files Created/Modified

- `src/contracts/review.ts` - Type-specific UTF-8/base64/MIME validation and byte bounds.
- `src/evidence/index.ts` - Ordered public dispatcher over text, table, PDF, image, and screenshot normalizers.
- `src/evidence/limits.ts` - Named public Phase 2 byte-limit constants.
- `src/tools/review.ts` - Normalized output integration and stable parser-error mapping.
- `tests/contract/review-normalized-evidence.test.ts` - Direct handler and MCP protocol contract coverage.
- `tests/contracts/review-contract.test.ts` - Updated Phase 1 schema expectation for bounded Phase 2 content.
- `docs/mcp-contract.md` - Exact request/response contract and scope documentation.
- `README.md` - Phase 2 summary and verification commands.

## Decisions Made

- Used explicit request bytes only; `reference` remains opaque and never grants filesystem permission.
- Preserved parser module responsibilities and order through a small dispatcher rather than adding a new service layer.
- Kept the response deterministic, provider-free, read-only, and findings-free until later phases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Allowed structural line breaks in text/table content**
- **Found during:** Task 2 verification
- **Issue:** Applying the existing all-control-character reference rule to content rejected valid newline-delimited text and CSV/table payloads.
- **Fix:** Added a content-specific control-character rule that permits newline, carriage return, and tab while rejecting unsafe control bytes.
- **Files modified:** `src/contracts/review.ts`
- **Verification:** Full contract and normalizer suite passed; content-bearing text/table integration passed.
- **Committed in:** `0bbc177`

**2. [Rule 3 - Blocking] Updated stale Phase 1 schema assertion**
- **Found during:** Task 2 full-suite verification
- **Issue:** An existing contract test still required all evidence content to be rejected, conflicting with the planned Phase 2 request contract.
- **Fix:** Updated the assertion to accept bounded text content while retaining rejection of the unsupported `path` field.
- **Files modified:** `tests/contracts/review-contract.test.ts`
- **Verification:** Full suite passed with 34 tests.
- **Committed in:** `0bbc177`

---

**Total deviations:** 2 auto-fixed (Rule 1: 1; Rule 3: 1)
**Impact on plan:** Both changes were directly required for the exact contract and test-suite correctness; no architectural scope or security boundary was expanded.

## Issues Encountered

PDF.js emitted non-fatal fixture warnings about indexing/font fallback during tests; existing parser behavior and all assertions passed, and no raw parser details are returned to clients.

## Known Stubs

None. Normalized output is wired to explicit parser content; metadata-only evidence intentionally returns an empty normalized list because no content was supplied.

## Threat Flags

None. The implementation stays within the declared MCP validation, dispatcher, normalized response, parser-limit, provenance, and read-only tool trust boundaries.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 2 evidence normalization is complete and ready for Phase 3 allowlisted read-only filesystem enforcement. This plan intentionally does not add allowlist enforcement, provider integration, findings orchestration, Docker, or a GitHub Release.

## Verification

- `npm test -- tests/contract/review-normalized-evidence.test.ts tests/contract/review-tool.test.ts` - passed, 13 tests.
- `npm test` - passed, 9 files and 34 tests.
- `npm run build` - passed.
- Documentation grep gates for normalizedEvidence, canonical base64, all named limits, opaque references, content hash, no allowlisted filesystem enforcement, and no provider - passed.
- Dispatcher source grep and `git diff --check` - passed.
- Safety scan found no provider calls, writes, Docker additions, or unrestricted path reads in intentional changes.

## Self-Check: PASSED

- All eight created/modified implementation, test, and documentation files exist on disk.
- Task commits `4f8a6b1`, `0bbc177`, and `ae9780a` exist in git history.
- Targeted tests, full tests, build, documentation gates, source checks, and safety checks passed.

---
*Phase: 02-evidence-ingestion-and-multimodal-context*
*Completed: 2026-08-22*
