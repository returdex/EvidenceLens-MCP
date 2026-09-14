---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 55
subsystem: evidence-authority
tags: [audit, git-identity, capability, wal, fail-closed]
requires:
  - phase: 10-54
    provides: authenticated terminal and build-auto branch contracts
provides:
  - distinct same-process capability and committed Git authority layers
  - exact 5/9 synchronization and 7/11 final-audit registries
  - fixed branch-aware local recovery paths and claims
affects: [10-56, 10-57, 10-58, 10-59, 10-60]
tech-stack:
  added: []
  patterns: [zero-argument fixed-location authority, O_NOFOLLOW plus git-show byte equality]
key-files:
  created: []
  modified: [scripts/audit-proof-chain.mjs, scripts/sync-proof-state.mjs, tests/scripts/audit-proof-chain.test.ts, tests/scripts/sync-proof-state.test.ts]
key-decisions:
  - "A terminal-owner validation receipt is necessary tuple evidence but never standalone authority."
  - "Preflight authority is a separate five-member gaps-only registry; live authority is a nine-member registry."
patterns-established:
  - "Local validation uses an in-memory WeakSet capability that becomes invalid when the owner closes it."
  - "Committed validation derives fixed members internally and compares HEAD git-show bytes to O_NOFOLLOW reopened files."
requirements-completed: [SAFE-04, PROV-01]
duration: 12min
completed: 2026-09-14
---

# Phase 10 Plan 55: Branch-Specific Authority Summary

**Exact preflight/live registries now separate same-process terminal validation from committed Git authority and fail closed before synchronization.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-14T02:42:00Z
- **Completed:** 2026-09-14T02:49:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added unforgeable-process capability checks for execution/proof validation and strict terminal-owner receipt validation.
- Added exact ordered 5/9 synchronization registries and 7/11 independent final-audit registries, all including `LOCAL_VALIDATION`.
- Fixed production recovery to use zero-argument fixed 10-59 inputs and 10-60 claim/journal outputs, with preflight constrained to `gaps_found`.
- Added hostile boundary tests while keeping Docker, credentials, provider/network, paid requests, GitHub Actions, push and dispatch at zero.
- Closed the 10-59 follow-up blocker by making receipt absence valid only for the exact reserved zero-tools branch and rejecting failed `LOCAL_VALIDATION` from proof/sync authority.

## Task Commits

1. **Task 1: Enforce branch-specific execution and proof authority** - `5b7b2f4`
2. **Task 2: Fix exact branch-aware production synchronization registries** - `31195a4`

Follow-up correction: **Exact pre-tools receipt discrimination** - `cdf302d`

## Files Created/Modified

- `scripts/audit-proof-chain.mjs` - Capability-bound local audits, receipt validation, fixed committed tuple registries and independent final audit.
- `scripts/sync-proof-state.mjs` - Exact branch tuple names, fixed recovery locations and gaps-only preflight mapping.
- `tests/scripts/audit-proof-chain.test.ts` - Registry cardinality, capability lifetime and receipt crossover coverage.
- `tests/scripts/sync-proof-state.test.ts` - Fixed output, exact 5/9 tuple and branch claim coverage.

## Decisions Made

- Kept the existing six-member programmatic synchronization API only as test/backward compatibility; production CLI authority is fixed-path and caller members are rejected.
- Future 10-59 TRANSITION/EXECUTION/PROOF/LOCAL_VALIDATION files were not fabricated. Their committed-path behavior is certified through fixtures and will activate only after the terminal owner creates them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected strict pre-tools receipt handling**
- **Found during:** Plan 10-59 terminal validation
- **Issue:** The audit unconditionally authenticated a provider receipt after reservation, although the exact zero-tools branch truthfully retained `request_receipt=null` and `request_receipt_sha256=null`.
- **Fix:** Made receipt alternatives mutually exclusive by branch; tools-call paths still require exact MAC/hash, and failed local validation cannot authorize committed proof or synchronization.
- **Files modified:** `scripts/audit-proof-chain.mjs`, `tests/scripts/audit-proof-chain.test.ts`
- **Verification:** 141 focused tests and 612 full provider-disabled tests passed.
- **Committed in:** `cdf302d`

**Total deviations:** 1 auto-fixed bug.
**Impact on plan:** The correction implements the plan's intended five-variant contract without weakening live success authority.

## Issues Encountered

The pre-wave key-link check could not open future Plan 10-59 artifacts. This was expected and handled with fixtures; no evidence was manufactured. The later immutable failed attempt at commit `585fd01` exposed the receipt discriminator bug and remains unchanged as failed evidence.

## Known Stubs

None. Fixed 10-59 locators intentionally refer to artifacts owned by the later production plan, not placeholder data.

## User Setup Required

None - no external service configuration required.

## Verification

- Focused after follow-up: 141 tests passed.
- Full provider-disabled suite after follow-up: 612 tests passed.
- TypeScript build passed.
- `git diff --check` passed.
- External effect counters: Docker 0, credentials 0, provider/network 0, paid requests 0, GitHub Actions/push/dispatch 0.

## Self-Check: PASSED

- Both task commits exist.
- All four modified implementation/test files exist.
- Future evidence was neither created nor modified.

## Next Phase Readiness

Plan 10-56 can certify these exact source/test bytes. Plans 10-59 and 10-60 can consume the fixed capability and committed registries without caller-selected tuple paths.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-14*
