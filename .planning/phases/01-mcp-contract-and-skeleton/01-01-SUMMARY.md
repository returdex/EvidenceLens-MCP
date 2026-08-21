---
phase: 01-mcp-contract-and-skeleton
plan: 01
subsystem: mcp
tags: [mcp, typescript, node, stdio, vitest]

requires: []
provides:
  - TypeScript MCP stdio server skeleton
  - Deterministic review_evidence tool response
  - Phase 1 review request and response contract types
  - Local npm install/build/test command path
affects: [phase-01, phase-02, phase-04, phase-05]

tech-stack:
  added: [@modelcontextprotocol/server, zod, typescript, tsx, vitest, @types/node]
  patterns:
    - ESM NodeNext TypeScript source compiled to dist
    - MCP tools registered through createServer before stdio serving
    - Fixed generatedAt value for deterministic skeleton responses

key-files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - tests/smoke/project-config.test.ts
    - tests/contracts/review-contract.test.ts
    - src/server.ts
    - src/contracts/review.ts
    - src/tools/review.ts
  modified: []

key-decisions:
  - "Use @modelcontextprotocol/server v2 split package with serveStdio and McpServer."
  - "Keep Phase 1 input schema permissive while exposing contract types for Plan 02 validation."
  - "Use a fixed generatedAt timestamp so skeleton tool output is deterministic."

patterns-established:
  - "Server factory pattern: createServer constructs McpServer and registers tools before transport startup."
  - "Tool responses serialize ReviewResponse as a single JSON text content item."

requirements-completed: [MCP-01, MCP-02, MCP-03]

duration: 6 min
completed: 2026-08-21
---

# Phase 01 Plan 01: MCP Server Skeleton and Transport Contract Summary

**Runnable TypeScript MCP stdio skeleton with one deterministic review_evidence tool and Phase 1 review contracts**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-21T15:38:06Z
- **Completed:** 2026-08-21T15:44:18Z
- **Tasks:** 3 completed
- **Files modified:** 8

## Accomplishments

- Created an ESM TypeScript Node project with `dev`, `build`, `start`, and `test` scripts.
- Added Phase 1 metadata-only review contract types for request, evidence, findings, response, and MCP tool results.
- Added a stdio MCP server that registers exactly one read-only `review_evidence` tool.
- Implemented deterministic skeleton responses with `status: "accepted"`, empty findings, fixed server metadata, and no provider, filesystem, parser, Docker, allowlist, or DeepSeek behavior.

## Task Commits

1. **Task 1: Create TypeScript MCP project baseline** - `8fedfa4` (chore)
2. **Task 2 RED: Add failing review contract test** - `f33a028` (test)
3. **Task 2 GREEN: Define Phase 1 review contract interfaces** - `ff25796` (feat)
4. **Task 3: Register the discoverable review tool over stdio** - `8193c98` (feat)

## Files Created/Modified

- `package.json` - npm scripts and runtime/dev dependency declarations.
- `package-lock.json` - locked dependency graph for reproducible installs.
- `tsconfig.json` - strict NodeNext TypeScript build configuration.
- `tests/smoke/project-config.test.ts` - smoke coverage for package and TypeScript settings.
- `tests/contracts/review-contract.test.ts` - TDD contract-shape coverage for Phase 1 review types.
- `src/server.ts` - MCP server factory and stdio entrypoint.
- `src/contracts/review.ts` - Phase 1 request, evidence, finding, response, and tool result types.
- `src/tools/review.ts` - `review_evidence` registration and deterministic skeleton handler.

## Verification

- `npm install` - passed, 0 vulnerabilities.
- `npm run build` - passed.
- `npm test` - passed, 2 test files and 5 tests.
- Direct stdio smoke check - passed: initialize, `tools/list` returned only `review_evidence`, and `tools/call` returned deterministic accepted JSON.

## Decisions Made

- Used the official split SDK package `@modelcontextprotocol/server` at `^2.0.0`; npm confirmed `2.0.0` is the latest package version.
- Kept runtime validation permissive for Plan 01 while defining stricter contract names and fields for Plan 02 to enforce.
- Used `1970-01-01T00:00:00.000Z` as the skeleton `generatedAt` value to avoid wall-clock nondeterminism.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tightened the RED contract test to evidence input only**
- **Found during:** Task 2 GREEN
- **Issue:** The failing test rejected any `content:` field in the contract file, which incorrectly conflicted with the required MCP `ReviewToolResult.content` shape.
- **Fix:** Limited the metadata-only assertion to the `ReviewEvidenceInput` interface block.
- **Files modified:** `tests/contracts/review-contract.test.ts`
- **Verification:** `npm test -- tests/contracts/review-contract.test.ts` passed.
- **Committed in:** `ff25796`

**2. [Rule 3 - Blocking] Added Node type declarations for strict NodeNext builds**
- **Found during:** Task 3 build
- **Issue:** `src/server.ts` needs Node runtime types for `node:url` and `process` under strict TypeScript.
- **Fix:** Added `@types/node` as a dev dependency.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run build` passed.
- **Committed in:** `8193c98`

---

**Total deviations:** 2 auto-fixed (Rule 1: 1, Rule 3: 1)
**Impact on plan:** No scope expansion beyond build correctness and TDD accuracy; later-phase exclusions remain preserved.

## Issues Encountered

- Initial manual stdio probe used `Content-Length` framing, but the installed v2 stdio transport uses newline-delimited JSON-RPC. Retried with newline-delimited messages and verified discovery plus tool invocation successfully.

## Known Stubs

None - the skeleton behavior is intentionally deterministic and complete for Plan 01; strict validation and findings schema are assigned to Plan 02.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 01-02 to replace permissive input with strict Zod validation, add machine-readable errors, document schemas, and add contract-level MCP tests.

## Self-Check: PASSED

- Created files exist on disk.
- Task commits exist in git history.
- Verification commands passed.

---
*Phase: 01-mcp-contract-and-skeleton*
*Completed: 2026-08-21*
