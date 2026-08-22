---
phase: 02-evidence-ingestion-and-multimodal-context
plan: 02
subsystem: testing
tags: [typescript, vitest, evidence, text, csv, tsv, provenance, sha256]

requires:
  - phase: 02-evidence-ingestion-and-multimodal-context
    provides: Strict normalized evidence schemas and typed text/table references from Plan 02-01
provides:
  - SHA-256 hashing for original text and table bytes or strings
  - Central parser limits for text, tables, PDFs, images, and visual payloads
  - Contract-valid line-addressable text and sheet-aware CSV/TSV normalizers
  - Explicit partial extraction, size, row, column, and formula-literal warnings
affects: [phase-02, phase-03, phase-04]

tech-stack:
  added: []
  patterns:
    - Normalize explicit bytes or strings only; production normalizers do not read filesystem paths
    - Hash original input before bounded extraction and expose lowercase SHA-256 provenance
    - Preserve table header context through the complete header row plus stable column coordinates

key-files:
  created:
    - src/evidence/hash.ts
    - src/evidence/limits.ts
    - src/evidence/text.ts
    - src/evidence/table.ts
    - tests/evidence/text-normalizer.test.ts
    - tests/evidence/table-normalizer.test.ts
    - tests/fixtures/evidence/text/assignment.txt
    - tests/fixtures/evidence/tables/rubric.csv
  modified: []

key-decisions:
  - "Use conservative centralized parser limits and represent bounded extraction as partial with explicit warnings."
  - "Treat formula-like CSV/TSV cell values as literal text and never evaluate or coerce them."
  - "Preserve table header context structurally via the complete header row and one-based column/A1 references without widening the existing strict contract."

patterns-established:
  - "Text normalizers emit one-based line references, including preserved blank lines."
  - "Table normalizers default CSV/TSV evidence to Sheet1 and emit one-based A1 cell references."

requirements-completed: [EVID-01, EVID-04, EVID-05]

metrics:
  duration: 4 min
  completed: 2026-08-22
---

# Phase 2 Plan 2: Text and Table Normalizers Summary

**Deterministic text and CSV/TSV evidence normalization with SHA-256 provenance, line/cell references, centralized limits, and injection-safe warnings**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-22T11:30:06Z
- **Completed:** 2026-08-22T11:34:10Z
- **Tasks:** 3 completed
- **Files modified:** 8

## Accomplishments

- Added RED Vitest coverage and deterministic assignment/rubric fixtures for hashes, line/cell references, schema validation, limits, and formula-like values.
- Implemented shared lowercase SHA-256 hashing and conservative limits covering all Phase 2 parser payload classes.
- Implemented text and CSV/TSV normalizers that preserve source identity, original-input hash, extraction metadata, blank lines, sheet/row/column/A1 references, and explicit partial/warning states.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing text and table normalizer tests with fixtures** - `eaa5d09` (test)
2. **Task 2: Implement text normalization and shared hash/limit helpers** - `45f81f1` (feat)
3. **Task 3: Implement table normalization with sheet/row/column/cell context** - `5ef70f9` (feat)

## Files Created/Modified

- `src/evidence/hash.ts` - Shared SHA-256 helper for strings and byte arrays.
- `src/evidence/limits.ts` - Central text, table, PDF, image, pixel, and visual payload caps.
- `src/evidence/text.ts` - Bounded text decoding with one-based line references and warnings.
- `src/evidence/table.ts` - CSV/TSV parsing with sheet-aware A1 references and formula-literal warnings.
- `tests/evidence/text-normalizer.test.ts` - Text/hash/limit/schema coverage.
- `tests/evidence/table-normalizer.test.ts` - Table context/formula/limit/schema coverage.
- `tests/fixtures/evidence/text/assignment.txt` - Five-line fixture containing a blank line.
- `tests/fixtures/evidence/tables/rubric.csv` - Header plus three rubric rows and formula-like values.

## Decisions Made

- Kept parser limits outside any parsing implementation so future parser dependencies cannot silently bypass project caps.
- Kept the existing strict table reference contract unchanged; header context remains addressable through the preserved header row and shared column/A1 coordinates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the known SHA-256 test vector**
- **Found during:** Task 3 verification
- **Issue:** The newly added test used an incorrect expected digest for the `EvidenceLens` string.
- **Fix:** Replaced it with the independently verified lowercase SHA-256 digest.
- **Files modified:** `tests/evidence/text-normalizer.test.ts`
- **Verification:** Targeted text/table tests and the full suite passed.
- **Committed in:** `5ef70f9`

---

**Total deviations:** 1 auto-fixed (Rule 1: 1)
**Impact on plan:** Test-only correction; no scope creep and no production behavior change.

## Issues Encountered

The initial RED test run failed because the planned normalizer modules did not yet exist; this was the expected TDD RED gate. No unresolved issues remain.

## Known Stubs

None. The normalizers return contract-valid metadata and do not contain placeholder data or unimplemented paths.

## Threat Flags

None. The implementation stays within the declared text/table parser trust boundaries and applies the planned hash, size-limit, formula-literal, and metadata controls.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Text and table evidence can now be passed to later filesystem-bound and review orchestration plans as contract-valid normalized metadata. PDF and image normalizers can reuse the centralized limits and hash helper.

## Verification

- `npm test -- tests/evidence/text-normalizer.test.ts tests/evidence/table-normalizer.test.ts` - passed, 5 tests.
- `npm test` - passed, 6 files and 25 tests.
- `npm run build` - passed.
- `grep -v '^#' src/evidence/table.ts | grep -q CELL_FORMULA_LITERAL` - passed.

## Self-Check: PASSED

- All eight created implementation, test, and fixture files exist on disk.
- Task commits `eaa5d09`, `45f81f1`, and `5ef70f9` exist in git history.
- Full tests and build passed after the final source/test changes.

---
*Phase: 02-evidence-ingestion-and-multimodal-context*
*Completed: 2026-08-22*
