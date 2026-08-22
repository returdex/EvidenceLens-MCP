---
phase: 04-review-orchestration-and-findings
plan: 02
subsystem: review-analysis
tags: [typescript, vitest, deterministic-rules, provenance, security]

requires:
  - phase: 04-review-orchestration-and-findings
    provides: Provider-neutral review finding/citation contracts and provenance validation from 04-01
  - phase: 03-read-only-filesystem-boundary
    provides: Authorized single-read filesystem normalization and logical provenance references
provides:
  - Bounded request-scoped analysis payload bundle paired with normalized evidence
  - Separate requirement and ordinary solution-claim extraction for text, tables, and text PDFs
  - Provider-independent deterministic omission, contradiction, and requirement-conflict analyzer
  - Provenance-validated text, table, image, and retained PDF-page citation resolution
affects: [04-03 MCP orchestration, Phase 5 provider adapter]

tech-stack:
  added: []
  patterns:
    - Authorized normalization produces a transient in-memory bundle; analyzer receives no paths, adapters, or filesystem capability
    - Unicode-normalized token overlap with fixed rule precedence, sorted IDs, and fixed analyzer identity
    - Citations are resolved only from normalized evidence references and retained visual payload bindings

key-files:
  created:
    - src/review/analysis.ts
    - src/review/engine.ts
    - tests/review/analysis.test.ts
    - tests/review/engine.test.ts
  modified:
    - src/evidence/index.ts

key-decisions:
  - "Keep normalizeEvidenceItems backward-compatible while exposing normalizeEvidenceBundle for the paired transient analysis handoff."
  - "Use deterministic-rules/1.0.0 with fixed precedence: requirement conflicts, solution contradictions, then omissions; provider/model identity remains deferred to Phase 5."
  - "Clear transient bytes, text, and table cells in orchestrateReview finally handling after analysis."

patterns-established:
  - "Solution claims are extracted independently from obligation markers, including ordinary statements, assignments, scalar values, and table cells."
  - "Visual citations require intrinsic image/screenshot provenance or a retained PDF page payload; unavailable visual payloads become uncertainty/follow-up cases."

requirements-completed: [REVW-02, REVW-03, REVW-04]

metrics:
  duration: 12 min
  completed: 2026-08-23
---

# Phase 4 Plan 2: Deterministic Review Analysis Summary

**Bounded single-read evidence handoff and deterministic provider-independent finding engine for omissions, contradictions, and requirement conflicts**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-23T03:35:00+10:00
- **Completed:** 2026-08-23T03:47:00+10:00
- **Tasks:** 2 completed
- **Files modified:** 5 implementation/test files

## Accomplishments

- Added `normalizeEvidenceBundle` and typed `TransientEvidenceAnalysis` payloads bounded by aggregate bytes, claims, cells, and claim length; existing normalized response output remains metadata/provenance-only apart from pre-existing visual payload contracts.
- Added requirement extraction and separate ordinary solution extraction for text lines, quoted table cells, scalar/assignment forms, and text-PDF pages, with transient buffers cleared after orchestration.
- Implemented `ReviewAnalyzer`, `createDeterministicReviewAnalyzer`, and `orchestrateReview` with stable finding IDs/order, actionable observations, uncertainty, follow-ups, and provenance-derived citations.
- Preserved a provider-neutral seam: no model, provider, network, subprocess, filesystem reopen, write, or Docker behavior was introduced.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build a bounded transient analysis input and provenance resolver** - `5444766` (test, RED), `91b0c5e` (feat, GREEN)
2. **Task 2: Implement deterministic role-aware comparison and analyzer boundary** - `0fdda53` (feat, GREEN; includes engine tests)

## Files Created/Modified

- `src/review/analysis.ts` - Transient payload contracts, bounded claim extraction, PDF/image visual binding, citation resolver, and cleanup boundary.
- `src/review/engine.ts` - Provider-neutral deterministic rule analyzer and stable actionable finding generation.
- `src/evidence/index.ts` - Paired authorized normalization bundle, quoted table-cell handoff, and in-memory PDF text extraction.
- `tests/review/analysis.test.ts` - Typed location, visual-page binding, and transient handoff coverage.
- `tests/review/engine.test.ts` - Omission, suppression, contradiction, conflict, determinism, IDs, uncertainty, and follow-up coverage.

## Decisions Made

- `deterministic-rules`/`1.0.0` is the fixed analyzer identity; provider/model fields remain absent until Phase 5.
- Rule precedence is requirement conflicts first, solution contradictions second, omissions third; findings are sorted by stable hash-derived IDs.
- The legacy metadata-only `normalizeEvidenceItems` API delegates to the new bundle API so earlier phases retain their behavior while 04-03 can consume the transient pairing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved typed page provenance for text-PDF claims**
- **Found during:** Task 2 build/verification
- **Issue:** Initial generic line mapping could produce text locations for PDF text claims, which would fail normalized citation validation.
- **Fix:** Mapped transient PDF text lines to normalized page references and added in-memory PDF text extraction from the authorized bytes.
- **Files modified:** `src/review/analysis.ts`, `src/evidence/index.ts`
- **Verification:** TypeScript build and full test suite passed.
- **Committed in:** `0fdda53`

**2. [Rule 1 - Bug] Preserved quoted CSV cell values in transient claims**
- **Found during:** Task 2 implementation
- **Issue:** A naive comma split would disagree with the existing table normalizer for quoted cells.
- **Fix:** Mirrored the bounded quoted-delimited parser semantics when creating transient table-cell claims.
- **Files modified:** `src/evidence/index.ts`
- **Verification:** Build and focused/full tests passed.
- **Committed in:** `0fdda53`

**Total deviations:** 2 auto-fixed (Rule 1: 2)
**Impact on plan:** Both fixes were directly required for citation correctness and consistent table semantics; no architectural scope or external capability was added.

## Issues Encountered

Existing PDF.js fixture warnings about indexing/font fallback remain non-fatal and pre-date this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

04-03 can call `normalizeEvidenceBundle`, `buildReviewAnalysisInput`, and `orchestrateReview` from the existing handler after role validation. The analyzer accepts only normalized evidence plus transient payloads and is ready for a Phase 5 provider adapter to replace the rule implementation without changing the review contract.

## Verification

- `npm test` - passed, 16 files and 77 tests.
- `npm run build` - passed.
- `npm audit --audit-level=high` - passed, 0 vulnerabilities.
- `git diff --check` - passed.
- Safety scan over `src/review src/evidence` found no provider/network/process/write/mutation implementation.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/04-review-orchestration-and-findings/04-02-SUMMARY.md`.
- Implementation and test files listed above exist.
- Task commits `5444766`, `91b0c5e`, and `0fdda53` exist in git history.
- Working tree was clean after implementation commits before summary metadata.

---
*Phase: 04-review-orchestration-and-findings*
*Completed: 2026-08-23*
