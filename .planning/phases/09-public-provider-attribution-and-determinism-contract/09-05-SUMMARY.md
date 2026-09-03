---
phase: 09-public-provider-attribution-and-determinism-contract
plan: 05
subsystem: api
tags: [provider-boundary, analyzer-isolation, transient-cleanup, executable-docs, tdd]

requires:
  - phase: 09-04
    provides: Provider token rejection, analyzer error ownership, PDF provenance, and schema-executable documentation
provides:
  - Provider-authored token guard that excludes schema-bound local provenance
  - Server-owned analyzer identity and pre-analyzer frozen provider request snapshots
  - Deep-isolated analyzer inputs with fault-tolerant retained-reference cleanup
  - Runtime-exact deterministic success request and response documentation
affects: [phase-09-verification, phase-10-provider-startup-e2e, MCP-02, SAFE-03]

tech-stack:
  added: []
  patterns: [provider-only provenance validation before authored-string scanning, pre-analyzer frozen request snapshots, isolated analysis clones, best-effort stable-reference cleanup]

key-files:
  created: []
  modified:
    - src/tools/review.ts
    - src/review/analysis.ts
    - tests/contract/review-provider.test.ts
    - tests/contract/public-contract-docs.test.ts
    - docs/mcp-contract.md

key-decisions:
  - "Validate provider-only responses against local provenance before scanning only the original provider ID suffix and six provider-authored prose/follow-up fields."
  - "Construct and recursively freeze the provider request before analyzer execution, then give the analyzer a separately rebuilt deep clone."
  - "Publish analyzer metadata exclusively from the server-owned deterministic-rules/1.0.0 constant after one-time runtime identity validation."
  - "Capture payload, table-cell, and byte-buffer references before analyzer mutation and complete every cleanup attempt before surfacing the first cleanup error."

patterns-established:
  - "Provider guard ordering: namespace, validate full provider-only provenance, scan the bounded authored-string allowlist, then merge the validated findings."
  - "Analyzer boundary: trusted request snapshot first, isolated analysis execution second, original and isolated cleanup closures last."
  - "Cleanup precedence: wipe all stable references best-effort; preserve any earlier typed/provider failure over cleanup INTERNAL_ERROR."

requirements-completed: [MCP-02, SAFE-03]

duration: 10 min
completed: 2026-09-03
---

# Phase 09 Plan 05: Provider Attribution and Determinism Gap Closure Summary

**Provider-authored-only token guarding, immutable pre-analyzer provider requests, isolated deterministic analysis, complete transient cleanup, and runtime-exact public documentation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-03T16:46:54Z
- **Completed:** 2026-09-03T16:56:52Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Restricted private-token checks to the complete provider-authored public string matrix while allowing legitimate prompt-version collisions in local evidence IDs, source references, and table sheet provenance.
- Bound provider inputs before analyzer execution, recursively froze the request, enforced the server-owned analyzer identity, and rebuilt an isolated analyzer view so mutations cannot alter fingerprints or final provenance.
- Made cleanup traverse stable original and analyzer-clone references after both success and failure, clearing transient strings/table cells and zeroing captured mutable buffers even when an individual action throws.
- Replaced the schema-only success example with a complete four-role request and the exact response produced by the built-in deterministic runtime.

## Task Commits

Each TDD task was committed as a RED/GREEN pair:

1. **Task 1 RED: Provider-authored field and provenance collision matrix** - `eada006` (test)
2. **Task 1 GREEN: Authored-only provider token guard** - `d0069fa` (fix)
3. **Task 2 RED: Analyzer identity, mutation, and retained cleanup matrix** - `49f5a5d` (test)
4. **Task 2 GREEN: Trusted snapshots, isolation, and complete cleanup** - `c66f19f` (fix)
5. **Task 3 RED: Runtime-exact documentation contract** - `be43978` (test)
6. **Task 3 GREEN: Runtime-authentic request/response documentation** - `2f800ec` (docs)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `src/tools/review.ts` - Validates provider-only provenance before the authored-string guard, freezes provider requests before analyzer execution, and owns fixed analyzer metadata and dual cleanup precedence.
- `src/review/analysis.ts` - Rebuilds deep-cloned analyzer inputs and performs per-field, per-payload stable-reference cleanup before reporting a fresh internal error.
- `tests/contract/review-provider.test.ts` - Covers the full provider-authored matrix, local collisions, analyzer values/getters/mutations, immutable request equality, exact classifications, and retained-reference erasure.
- `tests/contract/public-contract-docs.test.ts` - Extracts the two success-section JSON blocks, executes the documented request without a provider, and requires exact full-response equality.
- `docs/mcp-contract.md` - Publishes the actual deterministic runtime request/response and accurate best-effort cleanup/error-precedence semantics.

## Decisions Made

- Local evidence and citation provenance is first validated by `reviewResponseSchema`; it is not provider-authored and therefore is excluded from private-token scanning.
- Analyzer `name` and `version` are each read exactly once and compared with `deterministic-rules/1.0.0`; successful metadata is always constructed from that server constant.
- Provider request evidence, claims, inference, prompt version, and fingerprint are built and frozen before any injected analyzer code runs.
- Cleanup records its first fault but continues clearing every captured payload field, table-cell string, and mutable byte buffer; an existing pending error retains precedence.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Existing PDF.js indexing/font warnings appeared during focused and full suites; they remained non-failing, pre-existing, and outside this plan's scope.

## User Setup Required

None - all verification was credential-free and no-network; the DeepSeek live provider was not invoked.

## Known Stubs

- `docs/mcp-contract.md:72` retains the existing mention of a placeholder image used only by the explicit opt-in live provider test. It is intentional fixture documentation and does not participate in routine Phase 09 verification.

## Verification

- Focused provider/docs contract suite: 2 files, 43 tests passed.
- Strict TypeScript build: passed.
- Full default credential-free/no-network suite: 26 files, 170 tests passed; `tests/providers/deepseek-live.test.ts` remained excluded.
- `git diff --check`: passed.
- 09-01, 09-02, 09-03, and 09-04 plan SHA-256 checks: passed byte-for-byte.
- Scope gate from `3780f04`: only the five planned implementation, test, and documentation files changed under `src`, `tests`, and `docs`.
- All six high-severity threat mitigations have automated regressions; no network, credential, filesystem, Docker, startup, or public-schema surface was added.

## TDD Gate Compliance

- Task 1: `eada006` RED produced two failures for legitimate local provenance and the missing narrow guard; `d0069fa` GREEN passed 27 focused tests and strict build.
- Task 2: `49f5a5d` RED produced four failures for analyzer identity spoofing, request mutation, INVALID_REQUEST misclassification, and retained cleanup data; `c66f19f` GREEN passed 31 focused tests, strict build, and 170 full-suite tests.
- Task 3: `be43978` RED failed because the success section contained only one hand-authored response block; `2f800ec` GREEN passed exact request-to-runtime equality, 43 focused tests, strict build, and 170 full-suite tests.

## Next Phase Readiness

- Plan 09-05 closes the four current verifier blockers and two review warnings while preserving SAFE-03 provenance and closing MCP-02 at the plan level.
- Phase 09 has 5/5 plans implemented but remains awaiting independent orchestrator verification; phase-level completion is deliberately not asserted here.
- Phase 10 credentialed startup/E2E and Phase 11 Linux filesystem traversal hardening remain untouched.

---
*Phase: 09-public-provider-attribution-and-determinism-contract*
*Completed: 2026-09-03*

## Self-Check: PASSED

- All five planned implementation, test, and documentation files plus this summary exist.
- Task commits `eada006`, `d0069fa`, `49f5a5d`, `c66f19f`, `be43978`, and `2f800ec` exist in Git history in three RED/GREEN pairs.
- Focused tests, strict build, full no-network suite, whitespace, prior-plan hash, scope, stub, and threat-surface checks all pass.
