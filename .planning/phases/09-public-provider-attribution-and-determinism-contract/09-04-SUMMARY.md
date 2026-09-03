---
phase: 09-public-provider-attribution-and-determinism-contract
plan: 04
subsystem: api
tags: [provider-boundary, error-sanitization, provenance, executable-docs, tdd]

requires:
  - phase: 09-03
    provides: Strict provider projection, PDF visual provenance, and source-owned provider/analyzer execution boundaries
provides:
  - Bounded fail-closed rejection of exact current fingerprint and prompt-version echoes in provider finding strings
  - Sanitized analyzer metadata and trusted cleanup ownership with pending-error precedence
  - Branch-specific PDF wrong-page provenance coverage and schema-executable success documentation
affects: [phase-10-provider-startup-e2e, MCP-02, SAFE-03]

tech-stack:
  added: []
  patterns: [bounded recursive public-string inspection, saved trusted cleanup with pending-error precedence, executable response documentation]

key-files:
  created: []
  modified:
    - src/tools/review.ts
    - tests/contract/review-provider.test.ts
    - tests/contract/public-contract-docs.test.ts
    - docs/mcp-contract.md

key-decisions:
  - "Reject only non-empty exact current input fingerprint and prompt-version substrings through a bounded provider-finding walker; do not claim detection of transformed or unknown secrets."
  - "Bind trusted cleanup before analyzer invocation and preserve any earlier provider, validation, or typed failure when cleanup also throws."
  - "Exercise PDF wrong-page provenance with a valid page-two reference and keep the documented success response deterministic-only."

patterns-established:
  - "Provider projection: strict parse and namespace first, then inspect every public string leaf before provider-only response validation."
  - "Analyzer ownership: analyze/name/version are snapshotted once; trusted cleanup runs once after success or failure without masking pending errors."

requirements-completed: [MCP-02, SAFE-03]

duration: 8 min
completed: 2026-09-03
---

# Phase 09 Plan 04: Public Provider Attribution and Determinism Contract Summary

**Bounded provider-token exfiltration prevention, complete analyzer/cleanup error ownership, and executable PDF/documentation contract regressions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-03T12:43:50Z
- **Completed:** 2026-09-03T12:51:26Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Provider-controlled findings now fail closed before projection when any public string leaf contains the exact current input fingerprint or prompt-version value; failures are the exact sanitized `PROVIDER_FAILURE` payload and disclose nothing to console output.
- Analyzer `analyze`, `name`, and `version` throws plus trusted cleanup faults now become exact `INTERNAL_ERROR`, while saved cleanup cannot be replaced and cannot mask pending provider/request/limit failures.
- The PDF wrong-page regression now proves the retained page/hash refinement directly, and the documented deterministic success response parses through the runtime public schema.

## Task Commits

Each TDD task was committed as a RED/GREEN pair:

1. **Task 1 RED: Provider token echo regressions** - `d215979` (test)
2. **Task 1 GREEN: Bounded forbidden-token projection guard** - `39cf258` (feat)
3. **Task 2 RED: Analyzer metadata and cleanup ownership regressions** - `5c7216d` (test)
4. **Task 2 GREEN: Analyzer snapshots and trusted cleanup precedence** - `5478274` (feat)
5. **Task 3 RED: Branch-specific PDF and executable success docs contracts** - `949695b` (test)
6. **Task 3 GREEN: Schema-valid documented success response** - `eac3583` (docs)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `src/tools/review.ts` - Adds the bounded recursive provider string guard and explicit analyzer/cleanup pending-error handling.
- `tests/contract/review-provider.test.ts` - Covers every public prose echo, console redaction, analyzer getters, cleanup mutation/faults, error precedence, parser limits, and the exact PDF provenance branch.
- `tests/contract/public-contract-docs.test.ts` - Parses the named success-response JSON block through `reviewResponseSchema` while retaining the executable error contract.
- `docs/mcp-contract.md` - States the enforceable redaction boundary and publishes a runtime-valid deterministic response.

## Decisions Made

- The provider guard checks exact current private values as substrings after strict parsing and namespacing, with a 10,000-node cap and cycle-safe traversal of arrays/plain objects. This is fail-closed while keeping the guarantee precise.
- Analyzer metadata is read exactly once in the analyzer-owned catch. Cleanup uses a pre-bound trusted closure and only replaces a successful result with `INTERNAL_ERROR`; any earlier failure remains authoritative.
- PDF branch coverage uses direct response-schema construction so page two is a valid normalized reference but intentionally has no retained visual payload.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Existing PDF.js indexing/font warnings appeared during focused and full suites; they remain non-failing, pre-existing, and outside this plan's scope.

## User Setup Required

None - all verification is credential-free and no-network.

## Known Stubs

- `docs/mcp-contract.md:72` mentions the existing placeholder image used only by the explicit opt-in live provider test. This is intentional fixture documentation and does not affect routine verification or Phase 09 behavior.

## Verification

- Focused provider/docs contract suite: 2 files, 37 tests passed.
- Strict TypeScript build: passed.
- Full default credential-free/no-network suite: 26 files, 164 tests passed; `tests/providers/deepseek-live.test.ts` remained excluded.
- `git diff --check`: passed.
- 09-01, 09-02, and 09-03 plan SHA-256 checks: passed byte-for-byte.
- Working-tree and committed scope checks: only the four planned implementation/test/documentation files changed under `src`, `tests`, and `docs`.
- All high-severity threat mitigations have focused regressions; no new network, auth, filesystem, schema, Docker, or live-provider surface was introduced.

## TDD Gate Compliance

- Task 1: `d215979` RED exposed successful serialization of the current fingerprint from `title`; `39cf258` GREEN passed 21 focused tests and strict build.
- Task 2: `5c7216d` RED exposed four analyzer metadata/cleanup ownership defects; `5478274` GREEN passed 25 focused tests, strict build, and 163 full-suite tests.
- Task 3: `949695b` RED demonstrated the four documented success-schema drifts while the corrected PDF branch test passed; `eac3583` GREEN passed 37 focused tests, strict build, and 164 full-suite tests.

## Next Phase Readiness

- Both Phase 09 verifier blockers and all three review warnings are closed in code, tests, and executable documentation.
- Plan 09-04 is complete, but Phase 09 remains awaiting orchestrator-owned final verification; it is not marked phase-complete here.
- Phase 10 credentialed startup/E2E and Phase 11 filesystem traversal work remain intentionally untouched.

---
*Phase: 09-public-provider-attribution-and-determinism-contract*
*Completed: 2026-09-03*

## Self-Check: PASSED

- All four planned implementation, test, and documentation files plus this summary exist.
- Task commits `d215979`, `39cf258`, `5c7216d`, `5478274`, `949695b`, and `eac3583` exist in Git history in three RED/GREEN pairs.
- Focused tests, strict build, full no-network suite, whitespace, prior-plan hash, scope, stub, and threat-surface checks all pass.
