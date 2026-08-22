---
phase: 02-evidence-ingestion-and-multimodal-context
plan: 01
subsystem: api
tags: [zod, typescript, vitest, evidence, provenance, sha256]

requires:
  - phase: 01-mcp-contract-and-skeleton
    provides: Strict Zod MCP request/response contracts and deterministic review tool
provides:
  - Strict normalized evidence metadata contract for all Phase 2 evidence types
  - SHA-256, source identity, extraction metadata, warning, reference, and visual payload schemas
  - Review response normalizedEvidence array with metadata-only empty response wiring
affects: [phase-02, phase-03, phase-04, phase-05]

tech-stack:
  added: []
  patterns:
    - Zod v4 strict schemas are the runtime and inferred TypeScript contract source
    - Typed discriminated references preserve text, PDF, image, screenshot, and table provenance
    - Visual payloads carry bounded descriptors and hashes without raw extracted content

key-files:
  created:
    - tests/contract/evidence-contract.test.ts
    - .planning/phases/02-evidence-ingestion-and-multimodal-context/02-01-SUMMARY.md
  modified:
    - src/contracts/review.ts
    - src/tools/review.ts
    - tests/contracts/review-contract.test.ts

key-decisions:
  - "Require lowercase 64-character SHA-256 hex digests for artifact and visual payload fingerprints."
  - "Use strict discriminated reference objects with explicit line, page, image, and table coordinates."
  - "Keep visual payloads metadata-only in this plan, with bounded dimensions and byte length."

requirements-completed: [EVID-05]

metrics:
  duration: 4 min
  completed: 2026-08-22
---

# Phase 2 Plan 1: Normalized Evidence Contract Summary

**Strict provenance-first normalized evidence schemas with bounded visual descriptors and deterministic empty-response wiring**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-22T11:24:30Z
- **Completed:** 2026-08-22T11:28:44Z
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- Added strict Zod schemas and inferred types for source identity, SHA-256 hashes, extraction metadata, warnings, typed references, visual payloads, and normalized evidence artifacts.
- Added contract coverage for text, PDF, image/screenshot, and table variants, including invalid hashes, control characters, invalid references, and oversized visual metadata.
- Required `normalizedEvidence` in successful review responses and returned `normalizedEvidence: []` for metadata-only deterministic reviews.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing normalized evidence contract coverage** - `7da830a` (test)
2. **Task 2: Implement normalized evidence schemas and response wiring** - `13318f4` (feat)

Additional blocking compatibility fix: `d0472a5` (fix: update stale Phase 1 response fixtures).

## Files Created/Modified

- `src/contracts/review.ts` - Strict Phase 2 evidence schemas, typed references, visual bounds, and response wiring.
- `src/tools/review.ts` - Includes an empty normalized evidence array in metadata-only success responses.
- `tests/contract/evidence-contract.test.ts` - RED/GREEN contract coverage for all normalized evidence variants and threat mitigations.
- `tests/contracts/review-contract.test.ts` - Updated Phase 1 response fixtures for the required response field.

## Decisions Made

- Chose lowercase SHA-256 hex validation and explicit extractor/version/timestamp/partial metadata for reproducible provenance.
- Chose structured discriminated references instead of encoding page, line, cell, or sheet details in opaque strings.
- Kept this plan metadata-only; raw evidence content, file access, parser behavior, provider calls, and allowlist enforcement remain later-plan work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated stale Phase 1 response fixtures**
- **Found during:** Task 2 (Implement normalized evidence schemas and response wiring)
- **Issue:** Two existing Phase 1 contract fixtures omitted the newly required `normalizedEvidence` response field, causing the full suite to fail.
- **Fix:** Added `normalizedEvidence: []` to both fixtures and asserted the metadata-only response remains empty.
- **Files modified:** `tests/contracts/review-contract.test.ts`
- **Verification:** Full `npm test` passed with 4 files and 20 tests; `npm run build` passed.
- **Committed in:** `d0472a5`

---

**Total deviations:** 1 auto-fixed (Rule 3: 1)
**Impact on plan:** Required compatibility update only; no scope creep or later-phase behavior was introduced.

## Issues Encountered

The first full-suite run caught the stale Phase 1 fixtures described above; the issue was fixed inline and all verification passed afterward.

## Known Stubs

None. Empty normalized evidence for metadata-only requests is intentional until later plans add explicit content normalization.

## Threat Flags

None. The new contract surfaces are within the plan's declared threat model and covered by strict identity/hash/control-character/visual-bound checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Text/table and PDF/image normalizers can now target one stable, strict `NormalizedEvidence` contract. No parser, filesystem, provider, or review orchestration behavior has been introduced.

## Verification

- `npm test` - passed, 4 files and 20 tests.
- `npm test -- tests/contract/evidence-contract.test.ts` - passed, 6 tests.
- `npm test -- tests/contract/review-tool.test.ts` - passed, 9 tests.
- `npm run build` - passed.
- Required `normalizedEvidenceSchema` and `normalizedEvidence` grep checks - passed.
- Scope scan for file reads/writes, providers, Docker, allowlists, and process spawning - passed.

## Self-Check: PASSED

- Created summary and implementation files exist on disk.
- Task commits `7da830a`, `13318f4`, and compatibility fix `d0472a5` exist in git history.
- Verification commands passed after the final source/test changes.

---
*Phase: 02-evidence-ingestion-and-multimodal-context*
*Completed: 2026-08-22*
