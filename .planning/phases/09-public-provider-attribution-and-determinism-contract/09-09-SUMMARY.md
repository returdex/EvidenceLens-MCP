---
phase: 09-public-provider-attribution-and-determinism-contract
plan: 09
subsystem: provider-boundary
tags: [providers, zod, proxy, validation, contract-tests, security]

requires:
  - phase: 09-08
    provides: Descriptor-only preflight that rejects top-level provider-result accessors without reading them
provides:
  - Post-parse provider-envelope revalidation before parsed result data is used
  - Offline nested-array Proxy mutation regressions for whole-result strictness
  - Auditable four-state execution scope baseline
affects: [provider-attribution, deterministic-contract, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Revalidate untrusted outer envelopes after nested structural parsing
    - Persist an immutable execution baseline for committed/staged/unstaged/untracked scope auditing

key-files:
  created:
    - .planning/phases/09-public-provider-attribution-and-determinism-contract/09-09-RANGE-BASELINE.json
  modified:
    - src/tools/review.ts
    - tests/contract/review-provider.test.ts
    - tests/contract/public-contract-docs.test.ts
    - docs/mcp-contract.md
    - .planning/phases/09-public-provider-attribution-and-determinism-contract/09-09-SUMMARY.md
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Re-run the exact outer provider-envelope preflight after safeParse and before any parsed data use."
  - "Treat parse-time nested Proxy mutation as the same sanitized provider-result failure as an initially malformed envelope."

patterns-established:
  - "A pre-parse shape check is not a whole-result guarantee when nested parsing can execute untrusted JavaScript traps."

requirements-completed: [MCP-02, SAFE-03]

duration: 8 min
completed: 2026-09-05
---

# Phase 09 Plan 09: Post-Parse Provider Envelope Summary

**Provider results are now revalidated after nested Zod parsing, so Proxy-backed finding arrays cannot mutate an otherwise-valid outer envelope into an attributed public success.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-05T09:11:00Z
- **Completed:** 2026-09-05T09:19:00Z
- **Tasks:** 3/3
- **Files modified:** 8

## Accomplishments

- Added a 12-case credential-free regression matrix covering `modelFindings` and `deterministicFindings`, ordinary/null-prototype envelopes, and hidden-key/Symbol/custom-prototype mutations during parsing.
- Revalidated the exact-six provider envelope after `safeParse` and before `parsedProviderResult.data` is accessed, preserving the existing provider-owned `PROVIDER_FAILURE` boundary.
- Synced the public contract with pre- and post-structural-parsing enforcement, and recorded an immutable four-state execution baseline.

## Task Commits

1. **Task 1: RED — lock nested parse-time outer-envelope mutation and documentation gap** - `41a3b52` (test)
2. **Task 2: GREEN — revalidate the outer envelope before parsed data use** - `5fc50fd` (fix)
3. **Task 3: Verify offline closure, dynamic scope, and prior-artifact immutability** - this metadata/tracking commit

## Files Created/Modified

- `src/tools/review.ts` - Rejects a provider result if its outer envelope no longer passes preflight after Zod parsing.
- `tests/contract/review-provider.test.ts` - Executes nested Proxy-to-outer mutation and valid-control regressions through the real handler.
- `tests/contract/public-contract-docs.test.ts` - Requires heading-scoped pre- and post-parse revalidation wording.
- `docs/mcp-contract.md` - Documents that parsed result data is not used until the outer envelope is rechecked.
- `09-09-RANGE-BASELINE.json` - Captures the execution-start commit and tracked/untracked state hashes.

## Decisions Made

- Kept the original pre-parse check so top-level accessors remain unread; the second check closes only the nested structural-parsing window.
- Kept WR-01 out of scope because direct hostile request objects are a confirmed non-blocking, non-MCP Phase 09 warning.

## TDD Gate Compliance

- **RED:** `41a3b52` introduced the nested Proxy matrix and stricter documentation semantic guard. The focused suite failed exactly because the old code returned provider-attributed success and the docs lacked post-parse wording.
- **GREEN:** `5fc50fd` added the post-parse preflight and accurate public contract wording. The focused suite passed 62/62 and the strict build passed.
- **REFACTOR:** No separate refactor was needed; the production change is a single existing-boundary conditional.

## Verification

- `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` — PASS (62/62; credential-free/no-network)
- `npm run build` — PASS
- `npm test` — PASS (26 files, 191/191 tests; credential-free/no-network)
- `git diff --check` — PASS
- Live DeepSeek/provider test — NOT RUN

## Dynamic Range and Immutability Audit

- **Baseline:** `09-09-RANGE-BASELINE.json`, `baseHead` `e068d7292e4d35dd7f38388b55b9969397e50d80`.
- **Initial inventory:** staged `[]`; unstaged `.planning/STATE.md` with index SHA-256 `54b0279c14a0b4a9100fce2cdaf92810073191fa94c08b8cef91fda87b8f02ee` and worktree SHA-256 `ce80a464ac1cde6d54a9d996d824ba827d3668be5fb7cd3947d3ae04af0a8a64`; untracked `[]`.
- **Final four states:** committed baseline/test/source/docs paths; staged `[]`; unchanged baseline `STATE.md` only in unstaged; untracked `[]`.
- The pre-existing `STATE.md` hash/state remained unchanged and was excluded. All remaining paths were in the plan allowlist.
- 09-01 through 09-08 PLAN/SUMMARY artifacts were absent from committed, staged, unstaged, and untracked changed-path sets.
- The baseline was added exactly once in RED commit `41a3b52` and was not modified afterwards.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Executor availability] Ran the plan inline after the configured executor could not start**
- **Found during:** Plan dispatch
- **Issue:** The configured `gsd-executor` returned a model-capacity error before it made any repository changes.
- **Fix:** Executed the plan sequentially in the main task while following its read-first, TDD, commit, verification, and scope-audit requirements.
- **Files modified:** No additional files beyond the plan allowlist.
- **Verification:** RED/GREEN commits, focused suite, build, full suite, diff check, and dynamic scope audit all pass.
- **Committed in:** `41a3b52`, `5fc50fd`

**Total deviations:** 1 auto-fixed (executor availability)
**Impact on plan:** No scope expansion; the plan's required controls and audit evidence were preserved.

## Issues Encountered

The PDF-related tests emitted their existing non-failing PDF.js font/indexing warnings. They did not affect any result.

## User Setup Required

None - no credentials, provider network calls, or external configuration were used.

## Next Phase Readiness

Plan 09-09 is complete and ready for independent Phase 09 re-verification. Requirement completion remains deferred to the orchestrator's phase-level verification.

## Self-Check: PASSED

- RED and GREEN commits exist and contain only planned implementation/test/docs/baseline paths.
- All required implementation/docs/test files exist and the plan's focused, build, full-suite, whitespace, four-state scope, and prior-artifact checks passed.
