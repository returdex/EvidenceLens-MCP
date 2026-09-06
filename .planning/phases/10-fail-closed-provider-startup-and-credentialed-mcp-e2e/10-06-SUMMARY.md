---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 06
subsystem: docker-proof-harness
tags: [docker-compose, deepseek, zod, mcp, security, vitest]

requires:
  - phase: 10-03
    provides: credentialed Docker proof harness and sanitized failure taxonomy
provides:
  - Production-schema validation of decoded Docker MCP review responses
  - DeepSeek provider, resolved Compose model, and finding-namespace binding
  - Credential-free adversarial proof-harness regression suite
affects: [10-07, credentialed-docker-proof, phase-10-verification]

tech-stack:
  added: []
  patterns: [production-contract reuse, injectable Compose-config seam, stable redacted diagnostics]

key-files:
  created: []
  modified: [scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts]

key-decisions:
  - "Resolve the expected model from docker compose --profile review config --format json and retain only the validated allowlisted model string."
  - "Treat malformed MCP envelopes, schema failures, attribution drift, and provenance inconsistencies as the single redacted protocol category."

patterns-established:
  - "Proof before pass: parse the complete public response with reviewResponseSchema before checking Docker proof invariants."
  - "Resolved configuration binding: compare provider output to Compose's exact review-service model rather than process.env or duplicated defaults."

requirements-completed: [SAFE-04, PROV-01]

duration: 2min
completed: 2026-09-07
---

# Phase 10 Plan 06: Production-Schema Docker Proof Hardening Summary

**The Docker MCP proof now accepts only complete production-schema responses attributed to DeepSeek, its resolved Compose model, and a matching provider finding namespace.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-06T14:28:39Z
- **Completed:** 2026-09-06T14:29:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced selective payload checks with `reviewResponseSchema.parse` while preserving fixed, non-disclosing diagnostics.
- Added a separately injectable Compose-config process seam that resolves and allowlists the exact `services.review.environment.DEEPSEEK_MODEL` value before container startup.
- Bound credentialed success to provider `deepseek`, exact resolved-model equality, and at least one `provider:deepseek:` finding.
- Added adversarial offline coverage for fake attribution, namespace and model drift, malformed envelopes, incomplete schemas, invalid evidence, inconsistent citations, and malformed Compose output.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define adversarial schema and DeepSeek identity rejection** - `48dc704` (test)
2. **Task 2: Parse the production response schema and bind configured DeepSeek identity** - `aad1f81` (fix)

## Files Created/Modified

- `scripts/docker-review-real.mjs` - Parses the production response contract and preflights the resolved Compose review model.
- `tests/scripts/docker-review-real.test.ts` - Exercises production-schema, identity, provenance, Compose-resolution, and diagnostic-redaction adversaries without Docker or network access.

## Decisions Made

- Compose is authoritative for the expected live model because its resolved JSON incorporates shell overrides, project `.env` interpolation, and defaults.
- The full resolved Compose document is confined to the preflight function and never included in an error; only the validated model string crosses that boundary.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial production import used an incorrect `dist/src` path. The repository's TypeScript output is rooted directly at `dist`; the import was corrected and the complete verification suite passed.

## Authentication Gates

None. This plan intentionally performed no credentialed provider call.

## Known Stubs

None.

## User Setup Required

None - all verification was credential-free and neither Docker nor a provider was invoked.

## Next Phase Readiness

- Plan 10-07 can perform the separately authorized credentialed Docker MCP run against a proof harness that rejects partial or spoofed success.
- This plan hardens the harness but is not itself live PROV-01 evidence.

## Self-Check: PASSED

- Both modified files exist.
- Task commits `48dc704` and `aad1f81` exist in Git history.
- 18 focused harness and production-contract tests pass, TypeScript builds, and `git diff --check` is clean.
- No Docker child or external provider request was initiated.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-07*
