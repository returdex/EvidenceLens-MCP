---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 54
subsystem: live-proof
tags: [hmac, atomic-evidence, lifecycle, proof-chain]
requires:
  - phase: 10-53
    provides: immutable consumed-generation forensic record
provides:
  - five exact authenticated terminal snapshot variants
  - durable pre-reservation failure evidence and fail-closed missing callback handling
  - strict ready-or-terminal-non-pass build-auto validator
affects: [10-55, 10-56, 10-57, 10-58, 10-59, 10-60]
tech-stack:
  added: []
  patterns: [per-generation HMAC terminal snapshots, owner-only atomic sealing, fixed branch registry]
key-files:
  created: []
  modified:
    - scripts/automatic-live-review.mjs
    - scripts/docker-review-real.mjs
    - scripts/live-proof-state.mjs
    - scripts/audit-proof-chain.mjs
    - tests/scripts/automatic-live-review.test.ts
    - tests/scripts/automatic-live-review-cli.test.ts
    - tests/scripts/docker-review-real.test.ts
    - tests/scripts/live-proof-state.test.ts
    - tests/scripts/audit-proof-chain.test.ts
key-decisions:
  - "A terminal snapshot is accepted only when its exact branch counters and per-generation HMAC validate."
  - "The old 10-49/50/51 tuple is reachable only through a separately named read-only forensic function."
patterns-established:
  - "Terminal evidence precedes owner return and missing evidence is itself a terminal failure."
  - "Build-auto returns an explicit ready or terminal_non_pass discriminator; field presence never implies readiness."
requirements-completed: [SAFE-04, PROV-01]
duration: 6min
completed: 2026-09-13
---

# Phase 10 Plan 54: Durable Terminal Evidence Summary

**Per-generation authenticated terminal snapshots now preserve every live branch, while build preflight accepts only strict ready or strict terminal non-pass evidence.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-13T16:36:00Z
- **Completed:** 2026-09-13T16:42:11Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Defined five mutually exclusive terminal variants with fixed tools/reservation/observed-send counts and HMAC authentication.
- Moved automatic execution to fixed 10-57/10-58/10-59 locators and durably sealed pre-reservation failures before credential, Docker, or provider activity.
- Added a strict build-auto discriminator that rejects mixed schemas, reordered fixed paths, caller downgrade, and impossible counts.
- Removed the fabricated zero-count fallback: an omitted terminal callback now fails closed.

## Task Commits

1. **Task 1: Define exact terminal variants and durable capture contract** - `84d83e8`
2. **Task 2: Define strict build-auto ready and terminal non-pass schemas** - `9927032`
3. **Rule 3 fix: Authenticate the fixed automatic review tuple** - `192789b`
4. **Deep-review fix: Route post-build audit through the fixed registry** - `6394335`
5. **Deep-review test fix: Isolate invalid preflight fixture** - `5f3e1f1`
6. **Debug fix: Wire terminal owner into the fixed live entrypoint** - `d663c8c`
7. **Deep-review fix: Seal invalid-input preflight authority** - `d729e43`

## Files Created/Modified

- `scripts/live-proof-state.mjs` - exact variant creation/authentication and durable preflight transitions.
- `scripts/docker-review-real.mjs` - exactly-once frozen terminal callback before key cleanup.
- `scripts/automatic-live-review.mjs` - fixed new-chain owner, atomic snapshot persistence, and forensic-only legacy reader.
- `scripts/audit-proof-chain.mjs` - exact reviews-auto/build-auto registries and discriminator.
- `tests/scripts/*.test.ts` - provider-disabled producer, CLI, lifecycle, state, and audit contracts.

## Decisions Made

- Kept terminal MAC validation in the producing process while persisting only the MAC, never its key material.
- Represented unavailable preflight fields as exact nulls within a branch whose counters are structurally fixed at 0/0/0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the missing fixed reviews-auto registry**
- **Found during:** Overall verification
- **Issue:** The new production build dispatcher used 10-57 paths with the old 10-49-only `reviews` registry and would always fail before certification.
- **Fix:** Added a fixed zero-caller-choice `reviews-auto` tuple and routed the dispatcher through it.
- **Files modified:** `scripts/audit-proof-chain.mjs`, `scripts/automatic-live-review.mjs`, `tests/scripts/audit-proof-chain.test.ts`
- **Verification:** 178 focused provider-disabled tests and TypeScript build passed.
- **Committed in:** `192789b`

**2. [Rule 1 - Bug] Replaced the unreachable legacy post-build audit**
- **Found during:** Plan 10-57 deep source review (`BL-57-01`)
- **Issue:** `runFixedAutomaticBuild` authenticated 10-57 inputs but dispatched its completed 10-58 artifact through the legacy 10-49/10-50 `build` tuple, so every successful build would fail post-build certification.
- **Fix:** Routed the completed artifact through fixed `build-auto`, added fixed `source-review-auto`, corrected Plan 10-57 verification command text, and added a PATH-stubbed one-build regression that fails if legacy `build` is reached.
- **Files modified:** `scripts/automatic-live-review.mjs`, `scripts/audit-proof-chain.mjs`, `tests/scripts/automatic-live-review-cli.test.ts`, `tests/scripts/audit-proof-chain.test.ts`, `10-57-PLAN.md`
- **Verification:** Focused 64/64 and full provider-disabled 599/599 tests passed; TypeScript build and diff check passed.
- **Committed in:** `6394335`

**3. [Rule 1 - Test Isolation] Removed canonical artifact absence as a test precondition**
- **Found during:** Plan 10-57 deep source review (`BL-57-02`)
- **Issue:** The build preflight failure regression depended on 10-57 artifacts being absent, so current certification artifacts could change the branch and risk touching canonical build evidence.
- **Fix:** Injected an explicit invalid tuple into the isolated pipeline seam, asserted every downstream counter stays zero, and preserved the separate PATH-stubbed one-build post-audit reachability test.
- **Files modified:** `tests/scripts/automatic-live-review-cli.test.ts`
- **Verification:** Focused 64/64 and full provider-disabled 599/599 tests passed with current 10-57 artifacts present; no canonical 10-58/10-59 evidence changed.
- **Committed in:** `5f3e1f1`

**4. [Rule 2 - Missing Critical] Wired the certified terminal owner into production**
- **Found during:** Plan 10-59 preflight (`BL-59-01`) and debug session `terminal-owner-unwired`
- **Issue:** Producer and auditor primitives existed independently, but `runFixedAutomaticLive` never sealed canonical TRANSITION/EXECUTION/PROOF/LOCAL_VALIDATION or invoked the owner-only execution/proof audits.
- **Fix:** Added the same-process terminal evidence owner, complete success payload/transcript fields, observed failure lifecycle retention, exact preflight receipt predicate, atomic artifact sealing/reopen/hash, both local capability audits, and a provider-disabled fixed-entry integration regression.
- **Files modified:** `scripts/automatic-live-review.mjs`, `scripts/docker-review-real.mjs`, `scripts/audit-proof-chain.mjs`, `tests/scripts/automatic-live-review.test.ts`
- **Verification:** Focused producer/auditor suite 169/169 and full provider-disabled suite 600/600 passed; TypeScript build and diff check passed. Canonical live evidence remained untouched.
- **Committed in:** `d663c8c`

**5. [Rule 1 - Bug] Removed invalid new-chain inputs from preflight terminal sealing**
- **Found during:** Plan 10-57 deep source review (`BL-57-03`)
- **Issue:** After SOURCE/BUILD/REVIEW/SECURITY authentication failed, the terminal owner reread those same invalid inputs, preventing TRANSITION/EXECUTION/PROOF/LOCAL_VALIDATION from being sealed.
- **Fix:** The `preflight_started` branch now derives identity only from committed 10-53 FORENSIC, records exact unavailable new-chain bindings, uses a strict preflight-only proof audit, and remains structurally unable to authorize passed/live sync.
- **Files modified:** `scripts/automatic-live-review.mjs`, `scripts/audit-proof-chain.mjs`, `tests/scripts/automatic-live-review.test.ts`
- **Verification:** Missing and malformed cases for each of SOURCE, BUILD, REVIEW and SECURITY seal the complete 5-member gaps authority before return with credential/harness/provider counters zero. Focused 177/177 and full provider-disabled 608/608 passed; build and diff check passed.
- **Committed in:** `d729e43`

---

**Total deviations:** 5 auto-fixed (1 blocking issue, 1 missing critical integration, 2 production bugs, 1 test-isolation bug)
**Impact on plan:** The fix is required for the planned new chain to be executable and does not broaden authority.

## External-Side-Effect Accounting

- Docker builds/runs: 0
- Credential reads: 0
- Provider/network sends: 0
- Retries/fallback/diagnostic second calls: 0
- GitHub Actions/push/dispatch: 0

## Known Stubs

None. Null terminal fields are intentional exact unavailable representations in non-pass variants, not UI or execution stubs.

## Threat Flags

No unplanned threat surface. The new file-I/O and authentication surfaces are the explicit T-10-54-01 through T-10-54-04 mitigations.

## Issues Encountered

Legacy tests asserted the old registry cardinality and direct harness call spelling; they were updated to assert the new fixed dispatch and missing-snapshot behavior.

## User Setup Required

None.

## Next Phase Readiness

Plan 10-55 can consume the exact five-variant and build-auto contracts without redefining them. The current changes do not authorize a live request or synchronization.

## Self-Check: PASSED

- All nine modified implementation/test files exist.
- Task and repair commits `84d83e8`, `9927032`, `192789b`, `6394335`, and `5f3e1f1` exist.
- `npm run build` passed.
- Initial focused provider-disabled suite passed: 178/178.
- Post-review focused suite passed: 64/64; full provider-disabled suite passed: 599/599.
- Deep-review blocker `BL-57-01` is fixed by `6394335`.
- Deep-review blocker `BL-57-02` is fixed by `5f3e1f1`; tests leave canonical build/live evidence untouched.
- Debugged blocker `BL-59-01` is fixed by `d663c8c`; focused 169/169 and full provider-disabled 600/600 tests passed.
- Deep-review blocker `BL-57-03` is fixed by `d729e43`; focused 177/177 and full provider-disabled 608/608 tests passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
