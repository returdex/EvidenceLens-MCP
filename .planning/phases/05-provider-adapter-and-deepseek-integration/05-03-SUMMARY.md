---
phase: 05-provider-adapter-and-deepseek-integration
plan: 03
subsystem: api
tags: [mcp, providers, deepseek, provenance, contract-tests, live-tests]

# Dependency graph
requires:
  - phase: 05-provider-adapter-and-deepseek-integration
    provides: typed provider DTOs, provenance validation, DeepSeek adapter, bounded retry policy, and sanitized provider errors
provides:
  - DeepSeek-only runtime registration with injectable ReviewProvider seam
  - schema-preserving provider finding merge and sanitized MCP provider failures
  - credential-free default tests plus explicit DeepSeek live structural test and operational documentation
affects: [future provider comparison, MCP review consumers, phase 06]

# Tech tracking
tech-stack:
  added: []
  patterns: [outer request cleanup around deterministic/provider execution, deterministic provider-id namespacing, named live-test opt-in]

key-files:
  created: [tests/contract/review-provider.test.ts, tests/providers/deepseek-live.test.ts]
  modified: [src/tools/review.ts, src/server.ts, src/errors.ts, README.md, docs/mcp-contract.md, package.json, tests/smoke/project-config.test.ts]

key-decisions:
  - "Run deterministic analysis and the injected provider from the same bounded analysis input, then clear transient state once in the outer finally boundary."
  - "Namespace provider findings as provider:<validated-provider>:<finding-id> and reject invalid or colliding public IDs before merging."
  - "Keep the ordinary npm test command credential-free/no-network by excluding only the explicitly named DeepSeek live test."

patterns-established:
  - "Provider metadata and separate result sets remain internal; public findings use only the existing ReviewFinding fields."
  - "Runtime configuration loads only typed built-in DeepSeek settings; compatible providers are available only through explicit injection."

requirements-completed: [PROV-01, PROV-02]

# Metrics
duration: 7min
completed: 2026-08-23
---

# Phase 5 Plan 3: MCP Provider Wiring and DeepSeek Integration Summary

**DeepSeek is wired behind a replaceable provider seam with namespaced validated findings, stable sanitized MCP errors, and an opt-in real-API test path.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-23T13:53:00Z
- **Completed:** 2026-08-23T14:00:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Registered only the built-in DeepSeek provider from typed startup configuration while preserving explicit injected-provider support for tests and embedders.
- Converted the normalized analysis boundary into provider-safe DTOs, retained deterministic/provider result attribution internally, validated provider findings, and rejected namespaced ID collisions without changing MCP schemas.
- Added provider contract/error regression coverage, isolated the real API test behind `npm run test:deepseek-live`, and documented configuration bounds, retry/error behavior, provenance authority, and output variability.

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate DeepSeek and injectable provider substitution into review orchestration** - `339399e` (feat)
2. **Task 2: Add real-API structural coverage and publish provider configuration/contract documentation** - `2fbd3c5` (feat)

## Files Created/Modified

- `src/tools/review.ts` - Builds bounded provider DTOs, invokes the provider independently, validates/namespaces findings, and preserves cleanup.
- `src/server.ts` - Loads typed local/environment configuration and constructs only the DeepSeek runtime provider.
- `src/errors.ts` - Maps internal provider errors to stable sanitized MCP `PROVIDER_FAILURE` results.
- `tests/contract/review-provider.test.ts` - Covers fake-provider substitution, public schema preservation, sanitized errors, and ID rejection.
- `tests/providers/deepseek-live.test.ts` - Uses fixed repository fixtures for opt-in structural live coverage with missing-key preflight skip.
- `README.md`, `docs/mcp-contract.md` - Document setup, bounds, live-test prerequisites/cost, stable errors, and unchanged public contract.
- `package.json`, `tests/smoke/project-config.test.ts` - Exclude the live test from default `npm test` and expose the exact named live script.

## Decisions Made

- Deterministic findings are computed before provider invocation but are not used as a fallback or adjudication of provider findings.
- Provider metadata is retained only in the internal orchestration state; serialized MCP responses remain strict existing contract objects.
- The live API test was not invoked because no intentional credentialed live run was requested; the default suite proves no-network behavior with `DEEPSEEK_API_KEY` removed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated project smoke expectations for the new test scripts**
- **Found during:** Task 2 verification
- **Issue:** The existing project configuration smoke test required the old exact `test: vitest run` value and failed after the plan-required live-file exclusion was added.
- **Fix:** Updated the smoke assertion to require the credential-free default command and exact `test:deepseek-live` opt-in command.
- **Files modified:** `tests/smoke/project-config.test.ts`
- **Verification:** Full credential-free suite passed.
- **Committed in:** `2fbd3c5`

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Required to keep the repository's configuration regression test aligned with the specified package scripts; no scope creep.

## Issues Encountered

- The shell environment contained a DeepSeek key during an initial focused run, which caused default server protocol tests to attempt provider transport. The mandated credential-free rerun (`env -u DEEPSEEK_API_KEY`) passed; the named live command remains the only intended real-API test entry point.
- Existing PDF.js font/indexing warnings remain non-failing and unrelated.

## User Setup Required

Runtime DeepSeek reviews and the live structural test require a real `DEEPSEEK_API_KEY`, network access, and possible API cost. Configure the ignored `.evidencelens.local.json` using `.evidencelens.local.example.json`, or provide typed `DEEPSEEK_*` environment settings. Run the real test only with `npm run test:deepseek-live`.

## Known Stubs

None found in files created or modified by this plan.

## Threat Flags

None. The added provider boundary uses bounded DTOs, typed allowlisted configuration, no arbitrary loading, local provenance validation, transient cleanup, bounded retries, and sanitized public errors.

## Verification

- `env -u DEEPSEEK_API_KEY npm test` — passed: 21 files, 113 tests; live file excluded.
- `env -u DEEPSEEK_API_KEY npm test -- --run tests/providers/deepseek.test.ts tests/contract/review-provider.test.ts` — passed: 2 files, 6 tests.
- `npm run build` — passed.
- `npm audit --audit-level=high` — passed: 0 vulnerabilities.
- `git diff --check` — passed.
- `npm run test:deepseek-live` — intentionally not run because credentials were not intentionally made available for a billable network call.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/05-provider-adapter-and-deepseek-integration/05-03-SUMMARY.md`.
- Task commits `339399e` and `2fbd3c5` exist in Git history.
- All created implementation/test files exist and no generated untracked files remain.
- `.planning/STATE.md` was intentionally not modified by this plan; its pre-existing working-tree change remains for the orchestrator.

---
*Phase: 05-provider-adapter-and-deepseek-integration*
*Completed: 2026-08-23*
