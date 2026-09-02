---
phase: 09-public-provider-attribution-and-determinism-contract
plan: 02
subsystem: api
tags: [zod, provider-boundary, provenance, determinism, tdd]

requires:
  - phase: 09-01
    provides: Additive public provider attribution and scoped deterministic-only response contract
provides:
  - Cross-field provider attribution iff and namespace enforcement
  - Fail-closed runtime validation and exception classification for untrusted provider results
  - Exact image and screenshot visual payload hash binding
  - Independent non-empty deterministic byte and ordered-content regression oracles
affects: [phase-10-provider-startup-e2e, MCP-02, SAFE-03]

tech-stack:
  added: []
  patterns: [strict unknown-boundary Zod parsing, provider-owned projection validation, independent deterministic regression oracles]

key-files:
  created: []
  modified:
    - src/contracts/review.ts
    - src/providers/types.ts
    - src/tools/review.ts
    - tests/contract/review-provider.test.ts
    - tests/contract/public-contract-docs.test.ts
    - tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json
    - docs/mcp-contract.md

key-decisions:
  - "Validate local deterministic output before provider translation, provider-owned projection inside its own boundary, and the final merged response outside that boundary."
  - "Treat every configured-provider return as unknown and cap modelFindings and deterministicFindings independently at 100 entries."
  - "Lock deterministic behavior with both complete raw MCP bytes and a separately hand-maintained ordered finding projection."

patterns-established:
  - "Provider boundary: unknown return values are strictly parsed before identity checks or projection."
  - "Public provenance: provider attribution and visual hashes are bidirectionally bound by the response schema."

requirements-completed: [MCP-02, SAFE-03]

duration: 7 min
completed: 2026-09-02
---

# Phase 09 Plan 02: Provider Attribution and Determinism Gap Closure Summary

**Strict provider-result validation, bidirectional public attribution/provenance binding, and a non-empty independently pinned deterministic MCP baseline**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-02T18:07:45Z
- **Completed:** 2026-09-02T18:14:53Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Public responses now reject missing, extraneous, wrong, or mixed provider attribution namespaces and require exact retained visual hashes for image/screenshot citations.
- Every configured provider return is parsed as untrusted unknown data with independently bounded finding arrays; malformed values and native throws collapse to the exact sanitized `PROVIDER_FAILURE` response.
- The deterministic baseline now freezes 15 meaningful FIT5032 findings as full MCP bytes plus an independent ordered ID/type/title/summary oracle, while semantic documentation tests reject contradictory provider determinism promises.

## Task Commits

Each task followed a committed RED/GREEN cycle:

1. **Task 1 RED: Attribution and visual provenance contract tests** - `aef9189` (test)
2. **Task 1 GREEN: Attribution, namespace, and visual hash enforcement** - `d5053bb` (feat)
3. **Task 2 RED: Untrusted provider result and exception boundary tests** - `3989ea6` (test)
4. **Task 2 GREEN: Strict provider runtime schema and failure wrapping** - `b020547` (feat)
5. **Task 3 RED: Deterministic oracle and contradictory-doc guards** - `82ef198` (test)
6. **Task 3 GREEN: Meaningful frozen baseline and scoped ordering contract** - `762b873` (feat)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `src/contracts/review.ts` - Enforces attribution iff, matching provider namespaces, and mandatory image/screenshot visual hash relationships.
- `src/providers/types.ts` - Exports the strict provider result runtime schema and 100-finding per-array budget.
- `src/tools/review.ts` - Separates local, provider-owned, and final response validation and wraps provider call failures at their source boundary.
- `tests/contract/review-provider.test.ts` - Covers the complete attribution, visual provenance, malformed return, exception, size-limit, and deterministic oracle matrix.
- `tests/contract/public-contract-docs.test.ts` - Adds a pure fenced-code-aware forbidden determinism claim matcher.
- `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` - Freezes the complete non-empty FIT5032 deterministic MCP response.
- `docs/mcp-contract.md` - Limits deterministic order/content promises to offline deterministic analyzer findings and explicitly permits provider order/content variability.

## Decisions Made

- Local deterministic validation occurs before provider invocation and cannot be reclassified as a provider failure; the final merged schema parse also remains outside provider-only translation.
- Provider result limits are 100 model findings and 100 deterministic findings independently, derived from 20 evidence items at up to five findings each.
- The raw fixture and hard-coded ordered projection remain separate manually reviewed artifacts; no executable update mechanism was added.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Existing PDF.js indexing/font warnings appeared during the full suite; they remained non-failing, pre-existing, and outside this plan's scope.

## User Setup Required

None - all verification is credential-free and no-network.

## Known Stubs

- `docs/mcp-contract.md:72` mentions the existing placeholder image used only by the explicit opt-in live provider test. It is intentional documentation of a credentialed test fixture and does not affect Phase 09 behavior or routine verification.

## Verification

- Targeted contract/provider suite: 5 files, 35 tests passed.
- Strict TypeScript build: passed.
- Full default credential-free/no-network suite: 26 files, 153 tests passed; `tests/providers/deepseek-live.test.ts` remained excluded.
- `git diff --check`: passed.
- Scope exclusion check from `c7b7be6`: passed; no Phase 10 startup/Docker/live-provider or Phase 11 filesystem files changed.

## TDD Gate Compliance

- Task 1: `aef9189` RED → `d5053bb` GREEN.
- Task 2: `3989ea6` RED → `b020547` GREEN.
- Task 3: `82ef198` RED → `762b873` GREEN.
- All RED runs failed for the intended missing contract behavior; all GREEN runs passed focused acceptance checks.

## Next Phase Readiness

- The 09-02 gap-closure implementation is complete and ready for the independent Phase 09 verifier.
- Phase 10 startup/provider auto-registration and credentialed full-boundary E2E remain intentionally untouched.
- Phase 11 filesystem traversal hardening remains intentionally untouched.

---
*Phase: 09-public-provider-attribution-and-determinism-contract*
*Completed: 2026-09-02*

## Self-Check: PASSED

- All seven implementation, test, fixture, and documentation files listed above exist.
- Task commits `aef9189`, `d5053bb`, `3989ea6`, `b020547`, `82ef198`, and `762b873` exist in Git history in RED/GREEN order.
- Targeted tests, strict build, full default suite, whitespace check, and scope exclusion check all pass.
