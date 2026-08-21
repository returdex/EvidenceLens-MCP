---
phase: 01-mcp-contract-and-skeleton
plan: 02
subsystem: mcp
tags: [mcp, typescript, zod, vitest, contract-tests]

requires:
  - phase: 01-01
    provides: TypeScript MCP stdio server skeleton and deterministic review_evidence tool
provides:
  - Strict Zod runtime schemas for review requests, responses, and MCP text-content tool results
  - Stable sanitized machine-readable error JSON for rejected review requests
  - MCP protocol-level contract test for initialize, tools/list, and tools/call
  - README and client-facing MCP contract documentation
affects: [phase-01, phase-02, phase-03, phase-04, phase-05]

tech-stack:
  added: []
  patterns:
    - Zod v4 schemas as both runtime validation and inferred TypeScript contract source
    - In-memory MCP transport test proving protocol discovery and invocation
    - Fixed generatedAt value for deterministic Phase 1 responses

key-files:
  created:
    - src/errors.ts
    - tests/contract/review-tool.test.ts
    - README.md
    - docs/mcp-contract.md
    - .gitignore
  modified:
    - src/contracts/review.ts
    - src/tools/review.ts
    - tests/contracts/review-contract.test.ts

key-decisions:
  - "Use strict Zod v4 schemas as the source of truth for Phase 1 review request and response contracts."
  - "Keep response.requestId deterministically mapped from request.reviewId."
  - "Use SDK InMemoryTransport to prove MCP initialize, tools/list discovery, and tools/call invocation without spawning a long-running stdio process."

patterns-established:
  - "Tool handlers parse input through reviewRequestSchema before constructing any success response."
  - "Rejected tool requests return a single MCP text content item with ok:false, stable code, and sanitized message."
  - "Phase 1 documentation explicitly lists non-capabilities so later filesystem, provider, Docker, and parsing work is not implied early."

requirements-completed: [MCP-01, MCP-02, MCP-03]

duration: 7 min
completed: 2026-08-21
---

# Phase 01 Plan 02: Findings Schema, Validation, Errors, Docs, and Contract Tests Summary

**Strict MCP review contract with deterministic schema-valid success JSON, sanitized machine-readable errors, and protocol-level discovery/invocation tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-21T15:48:37Z
- **Completed:** 2026-08-21T15:55:25Z
- **Tasks:** 3 completed
- **Files modified:** 8

## Accomplishments

- Replaced interface-only review contracts with strict Zod v4 request, response, evidence, limits, finding, and tool-result schemas.
- Added `EvidenceLensError` and `toToolErrorResult()` for stable sanitized error payloads with `INVALID_REQUEST`, `LIMIT_EXCEEDED`, `UNSUPPORTED_EVIDENCE_TYPE`, and `INTERNAL_ERROR` codes.
- Wired `review_evidence` through `reviewRequestSchema.safeParse()` before response creation, preserving deterministic `response.requestId = request.reviewId` and fixed `generatedAt`.
- Added a real MCP protocol-level contract test using SDK in-memory transport to perform `initialize`, `tools/list`, and `tools/call`.
- Added README and MCP contract docs covering stdio usage, supported evidence roles/types, limits, success mapping, error semantics, and Phase 1 non-capabilities.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing review schema/error contract tests** - `236e59a` (test)
2. **Task 1 GREEN: Add runtime schemas and stable errors** - `3f5d1b8` (feat)
3. **Task 2 RED: Add failing MCP review contract tests** - `5d196cc` (test)
4. **Task 2 GREEN: Wire validation into the review tool** - `3d4e1cb` (feat)
5. **Task 3: Document the local MCP contract** - `0ffca39` (docs)

## Files Created/Modified

- `src/contracts/review.ts` - Strict Zod v4 schemas and inferred TypeScript contract types.
- `src/errors.ts` - Stable EvidenceLens error codes, error class, and sanitized MCP text-content error helper.
- `src/tools/review.ts` - Strict request parsing, deterministic response creation, and MCP tool registration.
- `tests/contract/review-tool.test.ts` - Schema/error tests plus SDK in-memory MCP protocol initialize, `tools/list`, and `tools/call` tests.
- `tests/contracts/review-contract.test.ts` - Updated Plan 01 smoke coverage to assert runtime schemas instead of obsolete interface text.
- `README.md` - Project purpose, local commands, and contract documentation link.
- `docs/mcp-contract.md` - Client-facing MCP request, response, error, limit, and non-capability contract.
- `.gitignore` - Ignores local install/build outputs.

## Verification

- `npm install` - passed, 0 vulnerabilities.
- `npm test` - passed, 3 files and 12 tests.
- `npm run build` - passed.
- `grep -v '^#' docs/mcp-contract.md | grep -q 'review_evidence'` - passed.
- `grep -v '^#' docs/mcp-contract.md | grep -q 'INVALID_REQUEST'` - passed.
- `grep -v '^#' docs/mcp-contract.md | grep -q 'no local file reads'` - passed.
- `grep -v '^#' tests/contract/review-tool.test.ts | grep -Eq 'initialize|tools/list|tools/call'` - passed.

## Decisions Made

- Used strict runtime schemas rather than retaining parallel hand-written interfaces, so validation and TypeScript types cannot drift.
- Returned validation errors as successful MCP tool results containing `ok:false` JSON, keeping rejection semantics machine-readable and schema-testable at the tool-result level.
- Used `InMemoryTransport.createLinkedPair()` from the installed SDK to exercise actual MCP JSON-RPC messages without leaving a stdio process running.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing handler shape for new response schema**
- **Found during:** Task 1 (Add runtime schemas and stable error results)
- **Issue:** `npm run build` failed after `reviewResponseSchema` added required `ok: true`; the existing Plan 01 handler still returned the old shape.
- **Fix:** Added `ok: true` to the handler response before Task 2 rewired validation fully.
- **Files modified:** `src/tools/review.ts`
- **Verification:** `npm test -- tests/contract/review-tool.test.ts --testNamePattern="schema|error" && npm run build` passed.
- **Committed in:** `3f5d1b8`

**2. [Rule 3 - Blocking] Updated stale Plan 01 source-inspection test**
- **Found during:** Task 3 (Document the local MCP contract)
- **Issue:** Full `npm test` failed because `tests/contracts/review-contract.test.ts` expected interface declarations removed by the planned Zod schema migration.
- **Fix:** Replaced brittle source-string assertions with runtime schema assertions for request, response, tool-result, metadata-only evidence, and supported evidence types.
- **Files modified:** `tests/contracts/review-contract.test.ts`
- **Verification:** `npm test && npm run build` passed.
- **Committed in:** `0ffca39`

---

**Total deviations:** 2 auto-fixed (Rule 3: 2)
**Impact on plan:** Both fixes were required to keep the planned schema migration buildable and fully verified. No later-phase filesystem, provider, parser, Docker, allowlist, or autonomous review behavior was added.

## Issues Encountered

- The Task 2 protocol-level test initially passed even before handler validation was wired because the permissive Plan 01 server already exposed `initialize`, `tools/list`, and `tools/call`; supplemental handler tests caught the missing validation export and preserved the TDD RED gate.

## Known Stubs

None. Phase 1 deterministic empty findings are intentional contract skeleton behavior, not placeholder data for an unfulfilled current requirement.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 1 is complete. Phase 2 can build evidence ingestion on top of a strict, documented, protocol-tested MCP contract while preserving the later-phase exclusions until their planned phases.

## Self-Check: PASSED

- Created files exist on disk.
- Task commits exist in git history.
- Verification commands passed.
- No long-running npm, vitest, tsx, or EvidenceLens stdio process was active at completion.

---
*Phase: 01-mcp-contract-and-skeleton*
*Completed: 2026-08-21*
