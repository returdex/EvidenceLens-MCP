---
phase: 05-provider-adapter-and-deepseek-integration
plan: 01
subsystem: api
tags: [providers, deepseek, provenance, zod, configuration, security]

# Dependency graph
requires:
  - phase: 04-review-orchestration-and-findings
    provides: normalized evidence, strict review finding/citation schemas, and deterministic analysis boundary
provides:
  - replaceable provider request/result interface with bounded provider-safe DTOs
  - local provider citation and finding provenance validation
  - fail-closed DeepSeek configuration parser and sanitized provider error taxonomy
affects: [05-02-deepseek-adapter, 05-03-mcp-provider-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [provider-owned DTO boundary, strict local provenance enrichment, typed parse-validate-inject configuration]

key-files:
  created: [src/providers/types.ts, src/providers/provenance.ts, src/providers/config.ts, src/providers/errors.ts, tests/providers/provider-contract.test.ts, tests/providers/config.test.ts, .evidencelens.local.example.json]
  modified: [.gitignore]

key-decisions:
  - "Keep provider requests independent from ReviewAnalysisInput and exclude paths, adapters, raw MCP requests, and API keys."
  - "Enrich provider citations only from normalized evidence and parse final findings through the existing strict reviewFindingSchema."
  - "Fail closed when local and DEEPSEEK environment sources both explicitly provide the same setting."
  - "Allow only HTTPS endpoints except HTTP loopback and bound all inference/retry settings before provider construction."

patterns-established:
  - "Provider DTOs carry bounded role-labelled evidence, prompt/version identity, inference settings, and a lowercase input fingerprint."
  - "Provider errors expose stable internal codes and retry metadata while serialization omits upstream details and secrets."

requirements-completed: [PROV-01, PROV-02]

# Metrics
duration: 8min
completed: 2026-08-23
---

# Phase 5 Plan 1: Provider Boundary and DeepSeek Configuration Summary

**Provider-safe review DTOs, strict provenance validation, and redacted fail-closed DeepSeek configuration are ready for adapter wiring.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-23T13:39:00Z
- **Completed:** 2026-08-23T13:47:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Defined a replaceable `ReviewProvider` seam with independent bounded request DTOs and separate model/deterministic result sets.
- Added provider draft validation that verifies evidence IDs, roles, hashes, source references, typed locations, visual payload hashes, citation ordering, and strict finding shape.
- Added bounded, allowlisted, conflict-failing DeepSeek configuration with local secret ignoring, a redacted example, and stable sanitized provider errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the provider-neutral DTO and provenance contracts** - `46900bd` (feat)
2. **Task 2: Add fail-closed configuration and stable provider errors** - `b6d8fd0` (feat)

## Files Created/Modified

- `src/providers/types.ts` - Provider-owned request, evidence, inference, result, and interface types.
- `src/providers/provenance.ts` - Strict provider draft schemas and normalized-evidence citation/finding validation.
- `src/providers/config.ts` - DeepSeek local/environment parser with defaults, allowlists, bounds, conflicts, and endpoint checks.
- `src/providers/errors.ts` - Internal provider error codes, retry metadata, and safe serialization.
- `tests/providers/provider-contract.test.ts` - Provider substitution and forged provenance coverage.
- `tests/providers/config.test.ts` - Configuration defaults, rejection, redaction, and example coverage.
- `.gitignore` - Ignores `.evidencelens.local.json`.
- `.evidencelens.local.example.json` - Placeholder-only configuration example.

## Decisions Made

- Provider implementations receive only bounded provider DTOs, never the internal analysis input or filesystem concerns.
- Provider drafts must supply provenance fields that are checked against normalized evidence before strict finding parsing.
- Local configuration and explicitly supplied `DEEPSEEK_*` environment values conflict rather than taking precedence over one another.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed mixed nullish/coalescing and logical operators in provider error defaults**
- **Found during:** Task 2 verification
- **Issue:** The TypeScript transform rejected an unparenthesized `??` and `||` expression.
- **Fix:** Parenthesized the retryability fallback expression.
- **Files modified:** `src/providers/errors.ts`
- **Verification:** Focused tests and `npm run build` pass.
- **Committed in:** `b6d8fd0`

**2. [Rule 3 - Blocking] Added defaults for inference fields required by the typed config result**
- **Found during:** Task 2 verification
- **Issue:** Config parsing failed when only the required API key was supplied because `temperature` and `maxTokens` had no defaults.
- **Fix:** Added bounded defaults matching the committed example configuration.
- **Files modified:** `src/providers/config.ts`
- **Verification:** Configuration tests pass and the full build succeeds.
- **Committed in:** `b6d8fd0`

**Total deviations:** 2 auto-fixed (Rule 3 blocking issues)
**Impact on plan:** Both fixes were required for the specified typed parser to compile and apply defaults; no scope creep.

## Issues Encountered

None unresolved. Existing PDF test warnings are pre-existing and unrelated to this plan.

## User Setup Required

Runtime DeepSeek reviews require a project-local `.evidencelens.local.json` containing a real API key or an explicitly supplied typed `DEEPSEEK_API_KEY` environment value. The local file is ignored; use `.evidencelens.local.example.json` as the redacted template.

## Verification

- `npm run build` — passed.
- `npm test` — passed: 18 test files, 102 tests.
- `git diff --check` — passed.
- Secret-file and credential-pattern scans — passed; no local secret file or real credential detected.

## Next Phase Readiness

The DeepSeek adapter can consume `ProviderReviewRequest`, return `ProviderReviewResult`, and use `parseProviderConfig` plus `ProviderError` without changing public MCP contracts.

---
*Phase: 05-provider-adapter-and-deepseek-integration*
*Completed: 2026-08-23*

## Self-Check: PASSED

- All eight planned files and this summary exist.
- Task commits `46900bd` and `b6d8fd0` exist in Git history.
- No stubs were found in files created or modified by this plan.
