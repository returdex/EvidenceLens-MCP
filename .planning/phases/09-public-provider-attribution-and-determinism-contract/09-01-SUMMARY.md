---
phase: 09-public-provider-attribution-and-determinism-contract
plan: 01
subsystem: api
tags: [mcp, zod, provider-attribution, determinism, provenance, vitest]

# Dependency graph
requires:
  - phase: 04-review-orchestration-and-findings
    provides: Deterministic analyzer identity, strict findings schema, and citation-to-normalized-evidence validation
  - phase: 05-provider-adapter-and-deepseek-integration
    provides: ProviderReviewResult identity fields and replaceable credential-free provider seam
provides:
  - Strict optional public provider name/model attribution for responses containing provider findings
  - Frozen deterministic-only MCP text compatibility baseline and provider variability/redaction regression coverage
  - Normative public contract separating offline byte determinism from provider-backed guarantees
affects: [phase-10-provider-startup-and-e2e, mcp-contract, provider-integrations]

# Tech tracking
tech-stack:
  added: []
  patterns: [allowlisted public attribution projection, request-bound provider identity validation, frozen raw MCP text fixture, semantic documentation tests]

key-files:
  created: [tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json, tests/contract/public-contract-docs.test.ts]
  modified: [src/contracts/review.ts, src/tools/review.ts, tests/contract/review-provider.test.ts, tests/e2e/docker-review.test.ts, docs/mcp-contract.md, README.md]

key-decisions:
  - "Expose only metadata.provider.name and metadata.provider.model, and only when validated provider findings are public."
  - "Bind returned provider, model, prompt version, and input fingerprint to the provider request before any public projection."
  - "Reserve byte-for-byte equality for identical deterministic-only offline results; provider-backed prose may vary under four explicit validation guarantees."

patterns-established:
  - "Provider attribution projection: validate internal identity against the invocation, then construct a new strict two-field public object."
  - "Determinism compatibility: compare raw MCP text against a frozen JSON-string fixture without reparsing for equality."
  - "Documentation semantics: tests inspect clauses so broad determinism promises and incomplete exclusion lists fail regression checks."

requirements-completed: [MCP-02, SAFE-03]

# Metrics
duration: 8 min
completed: 2026-09-02
---

# Phase 9 Plan 1: Public Provider Attribution and Determinism Contract Summary

**Strict two-field provider attribution with request-bound identity validation, frozen offline MCP bytes, and an explicit provider-variability contract**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-02T15:45:28Z
- **Completed:** 2026-09-02T15:53:36Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Extended the strict response schema additively with optional `metadata.provider: { name, model }`, while retaining the exact five-key deterministic-only metadata shape.
- Validated provider name, model, prompt version, and input fingerprint against the actual invocation; mismatches collapse to the existing sanitized `PROVIDER_FAILURE` response.
- Froze the pre-change offline MCP text, proved provider prose may vary without weakening local citation/hash provenance, and added sentinel-based non-disclosure coverage.
- Replaced broad whole-tool determinism language with a semantic, test-enforced contract covering offline equality, provider variability, four guarantees, and the complete internal-data exclusion boundary.

## Task Commits

Each task was committed atomically, with RED and GREEN commits retained for the two TDD tasks:

1. **Task 1 RED: Define failing public attribution contract tests** - `7e23576` (test)
2. **Task 1 GREEN: Define the safe optional provider attribution schema** - `6d037b9` (feat)
3. **Task 2 RED: Freeze offline bytes and define provider projection boundary tests** - `6645399` (test)
4. **Task 2 GREEN: Validate and project provider attribution** - `aceb88b` (feat)
5. **Task 3: Publish and enforce attribution/determinism semantics** - `8304d08` (docs)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `src/contracts/review.ts` - Adds bounded strict provider name/model attribution while preserving response-level provenance refinements.
- `src/tools/review.ts` - Binds provider result identity to the invocation and conditionally emits the two-field public projection.
- `tests/contract/review-provider.test.ts` - Covers offline byte equality, strict attribution, identity mismatch sanitization, provider variability, provenance, and redaction.
- `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` - Stores the exact pre-Phase-09 deterministic-only MCP text string.
- `tests/e2e/docker-review.test.ts` - Aligns the existing offline injected-provider E2E with the additive public attribution contract.
- `tests/contract/public-contract-docs.test.ts` - Enforces scoped equality language, provider guarantees, compatibility, and the complete exclusion list.
- `docs/mcp-contract.md` - Defines the normative additive schema and determinism/provider variability semantics.
- `README.md` - Summarizes public attribution, exclusions, and credential-free/no-network default testing.

## Decisions Made

- Kept `analyzerName` and `analyzerVersion` exclusively tied to `deterministic-rules/1.0.0`; provider identity is an optional child rather than a replacement.
- Validated prompt version and input fingerprint even though neither is public, because they prove the returned identity belongs to the request that was sent.
- Omitted attribution when a provider returns zero model findings, preserving deterministic-only response bytes and avoiding attribution without a public provider-authored result.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated the existing injected-provider E2E assertion for the additive contract**
- **Found during:** Task 2 (Project validated attribution and prove determinism boundaries)
- **Issue:** The full credential-free suite still asserted that provider metadata was absent even when the injected provider returned public findings, directly contradicting the new contract.
- **Fix:** Replaced the stale absence assertion with the exact allowlisted `{ name: "offline-mock", model: "deepseek-v4-pro" }` attribution assertion; retained checks that no top-level model, prompt version, fingerprint, path, or raw content leaks.
- **Files modified:** `tests/e2e/docker-review.test.ts`
- **Verification:** `npm test` passed 144 tests across 26 files without invoking the named live provider test.
- **Committed in:** `aceb88b`

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The change was required to keep the pre-existing no-network E2E consistent with the planned additive response contract; no Phase 10 or Phase 11 scope was introduced.

## Issues Encountered

- The first one-off fixture capture command used top-level await in a CommonJS eval transform; wrapping it in an async function produced the same deterministic text without changing repository code.
- Existing PDF.js indexing/font warnings remained non-failing and unrelated to this plan.

## User Setup Required

None - no external service configuration or credentials are required.

## Known Stubs

None. Empty default option objects are normal request-helper defaults, and the existing documentation reference to a placeholder live-test image describes a deliberate opt-in fixture rather than incomplete Phase 09 behavior.

## Next Phase Readiness

- MCP-02 and SAFE-03 now have executable contract coverage and synchronized public documentation.
- Phase 10 can build on the stable public attribution boundary for fail-closed startup and opt-in credentialed full-boundary E2E work.
- No Phase 10 startup/live-E2E implementation or Phase 11 filesystem traversal changes were included.

---
*Phase: 09-public-provider-attribution-and-determinism-contract*
*Completed: 2026-09-02*

## Self-Check: PASSED

- All eight created or modified implementation, test, fixture, and documentation files exist.
- Task commits `7e23576`, `6d037b9`, `6645399`, `aceb88b`, and `8304d08` exist in Git history.
- Focused tests, TypeScript build, the 144-test credential-free/no-network suite, semantic documentation tests, and `git diff --check` pass.
