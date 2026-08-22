---
phase: 03-read-only-filesystem-boundary
plan: 01
subsystem: filesystem
tags: [typescript, zod, vitest, filesystem, security, provenance]

requires:
  - phase: 02-evidence-ingestion-and-multimodal-context
    provides: Strict Phase 2 evidence contract, explicit content normalizers, and opaque references
provides:
  - Strict optional filesystem source schema with root-id and relative-path validation
  - Exact EVIDENCELENS_ALLOWED_ROOTS parsing and sanitized configured-root validation
  - Canonical read-only authorization with segment-aware containment and safe logical provenance
affects: [phase-03, phase-04, phase-05]

tech-stack:
  added: []
  patterns:
    - Filesystem requests carry only a configured root id and control-safe POSIX relative path
    - Root and target canonicalization use injected read-only primitives for deterministic policy tests
    - Authorized results expose stable logical provenance while keeping configured absolute roots internal

key-files:
  created:
    - src/filesystem/policy.ts
    - tests/contract/filesystem-source.test.ts
    - tests/filesystem/policy.test.ts
  modified:
    - src/contracts/review.ts

key-decisions:
  - "Keep filesystem as an optional source object and reject ambiguity with inline content, while preserving opaque reference semantics."
  - "Use the exact id=absolute-path comma/semicolon grammar with no escaping and stable sanitized configuration errors."
  - "Canonicalize both configured roots and candidate targets, then use segment-aware relative containment so escaping symlinks are denied."

patterns-established:
  - "FilesystemPolicy.authorize is the only policy operation and returns rootId, normalized relativePath, resolvedPath, and filesystem:// provenance."
  - "In-root symlinks are allowed after canonical containment; escaping symlinks, missing targets, directories, and unsafe paths are denied uniformly."

requirements-completed: [SAFE-01, SAFE-02]

metrics:
  duration: 4 min
  completed: 2026-08-22
---

# Phase 3 Plan 1: Read-Only Filesystem Boundary Summary

**Strict filesystem evidence sources and canonical configured-root authorization with symlink-safe logical provenance**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-22T12:45:00Z
- **Completed:** 2026-08-22T12:49:20Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Added `filesystemSourceSchema` and integrated it into the strict review evidence input without changing Phase 2 explicit text, table, PDF, image, screenshot, or opaque-reference behavior.
- Implemented exact `EVIDENCELENS_ALLOWED_ROOTS` grammar parsing, canonical root validation, duplicate/collision detection, and sanitized configuration failures.
- Implemented authorization-only canonical containment with stable root IDs, normalized logical paths, `filesystem://` provenance, and escaping-symlink denial.
- Added adversarial contract and policy tests covering grammar, traversal, absolute paths, controls, missing/dir targets, unreadable roots, canonical collisions, and symlink behavior.

## Task Commits

Each TDD task was committed atomically with RED and GREEN gates:

1. **Task 1: Add strict filesystem source schema and adversarial contract tests** - `484a51b` (test, RED), `a05f4ea` (feat, GREEN)
2. **Task 2: Implement configured-root canonicalization and authorization** - `75151eb` (test, RED), `fcbabda` (feat, GREEN)

**Plan metadata:** pending

## Files Created/Modified

- `src/contracts/review.ts` - Strict filesystem source schema, path safety checks, source/content exclusivity, and inferred type.
- `src/filesystem/policy.ts` - Allowed-root grammar, canonicalization, authorization, safe provenance, and read-only primitive injection.
- `tests/contract/filesystem-source.test.ts` - Filesystem/content exclusivity, unsafe path syntax, and Phase 2 regression coverage.
- `tests/filesystem/policy.test.ts` - Root configuration, containment, symlink, stable-id, and sanitized-error coverage.

## Decisions Made

- Kept `reference` opaque and non-authorizing; filesystem authorization requires the explicit source object.
- Preserved configured root IDs exactly rather than deriving IDs from absolute paths.
- Allowed in-root symlinks after canonical resolution, while always denying symlink escapes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected an invalid malformed-grammar test case**
- **Found during:** Task 2 (policy implementation verification)
- **Issue:** The initial test classified a semicolon-separated pair as malformed even though semicolon is an explicitly supported entry separator.
- **Fix:** Removed that valid case from the malformed-input table; semicolon parsing remains covered by the acceptance test.
- **Files modified:** `tests/filesystem/policy.test.ts`
- **Verification:** Targeted policy and contract tests passed; full suite passed.
- **Committed in:** `fcbabda`

---

**Total deviations:** 1 auto-fixed (Rule 1: 1)
**Impact on plan:** Test-only correction aligned coverage with the exact specified grammar; no scope or security boundary changed.

## Issues Encountered

- PDF.js emitted existing non-fatal fixture warnings during the full suite (PDF object indexing, font fallback, and standard font data); all 47 tests and the build passed.

## Known Stubs

None. No content reader, recursive indexer, or mutation operation was added; the authorization result is the intentional boundary output for the next plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The filesystem source contract and root authorization boundary are ready for a future read-only content reader. The current policy performs no content I/O and exposes no mutation API.

## Verification

- `npm test -- tests/contract/filesystem-source.test.ts tests/contract/review-normalized-evidence.test.ts` - passed.
- `npm test -- tests/filesystem/policy.test.ts tests/contract/filesystem-source.test.ts` - passed, 10 tests.
- `npm test` - passed, 11 files and 47 tests.
- `npm run build` - passed.
- Mutation scan `rg -n "writeFile|writeFileSync|unlink|rename|mkdir|chmod|rm\(" src/filesystem` - no matches.
- `git diff --check` - passed.

---
*Phase: 03-read-only-filesystem-boundary*
*Completed: 2026-08-22*

## Self-Check: PASSED

- All four planned implementation/test files and this SUMMARY exist on disk.
- TDD RED/GREEN commits `484a51b`, `a05f4ea`, `75151eb`, and `fcbabda` exist in git history.
- Targeted tests, full tests, build, mutation scan, and whitespace checks passed.
