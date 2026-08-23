---
phase: 06-docker-deployment-and-end-to-end-validation
plan: 02
subsystem: infra
tags: [docker, compose, stdio, e2e, vitest, deepseek]

# Dependency graph
requires:
  - phase: 06-docker-deployment-and-end-to-end-validation
    plan: 01
    provides: Single-stage non-root image, Compose profiles, read-only /workspace contract, and sanitized provider preflight
provides:
  - Offline real-container MCP smoke client with structural protocol and filesystem checks
  - Credential-free injected-provider multimodal E2E over fixed text/table/image/PDF fixtures
  - Docker deployment, offline validation, and explicit credentialed DeepSeek runbook
affects: [docker-deployment, e2e-validation, mcp-contract, future-release-verification]

# Tech tracking
tech-stack:
  added: [Node stdio JSON-lines smoke client, Vitest injected-provider E2E]
  patterns: [phase-labeled fail-fast shell diagnostics, bounded macOS-safe filesystem adapter, structural-only provider assertions]

key-files:
  created: [scripts/docker-smoke.sh, scripts/docker-review-real.mjs, tests/e2e/docker-review.test.ts, docs/docker-deployment.md]
  modified: [package.json, tests/smoke/project-config.test.ts, src/tools/review.ts, README.md, docs/mcp-contract.md]

key-decisions:
  - "Keep routine validation offline: the container smoke profile disables provider registration and the semantic E2E injects a compatible ReviewProvider."
  - "Use the exact four fixed fixture mappings and logical filesystem://course/... references for both smoke and credentialed clients."
  - "Preserve complete normalized image/PDF citation locations when adapting visual payloads into provider requests, so schema validation cannot lose dimensions or page metadata."

patterns-established:
  - "External stdio clients send only initialize, tools/list, and tools/call, then validate protocol, schema, provenance, and sanitized failure behavior."
  - "Offline filesystem E2E uses injected node:fs/promises stat/open/fstat/read/close operations with O_RDONLY/O_NOFOLLOW and a bounded fixture set."
  - "Real-provider execution remains a separate explicit command with key, network, and cost warnings; deterministic-only output is not accepted as credentialed success."

requirements-completed: [DEPL-01, DEPL-02]

# Metrics
duration: 11min
completed: 2026-08-23
---

# Phase 6 Plan 2: Docker End-to-End Validation Summary

**Offline Docker stdio smoke, injected-provider four-fixture E2E, and explicit DeepSeek deployment runbook with structural provenance checks**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-23T05:13:30Z
- **Completed:** 2026-08-23T05:24:25Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added executable `scripts/docker-smoke.sh` and `scripts/docker-review-real.mjs` clients that use the existing direct stdio MCP sequence and fail with phase-labeled sanitized diagnostics.
- Added a no-network `test:e2e` using an injected `ReviewProvider`, real repository fixtures, strict read-only filesystem operations, schema validation, four roles, hashes, logical references, and image/PDF citation checks.
- Added package/project configuration contracts and documentation for offline Docker validation, read-only mounts, provider preflight, config-file compatibility, and the explicitly credentialed real DeepSeek path.
- Fixed provider request adaptation so normalized image/PDF citation locations retain their complete public metadata before provider findings are validated.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement fail-fast Docker stdio smoke and injected-provider multimodal E2E** - `f5b97f6` (feat)
2. **Task 2: Publish the fresh setup, Docker contract, and real DeepSeek review runbook** - `fd36bb1` (docs)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `scripts/docker-smoke.sh` - Builds/renders the offline profile, invokes the container over stdio, checks read-only writes and missing-key preflight.
- `scripts/docker-review-real.mjs` - Separate structural stdio client for the credentialed Compose `review` profile; supports the offline smoke invocation without credentials.
- `tests/e2e/docker-review.test.ts` - Offline injected-provider MCP E2E over the four fixed fixtures with a bounded macOS-safe adapter.
- `src/tools/review.ts` - Preserves complete normalized image/PDF locations in provider visual payload descriptors.
- `package.json`, `tests/smoke/project-config.test.ts` - Exact `docker:smoke`, `docker:review:real`, and `test:e2e` command contracts.
- `README.md`, `docs/docker-deployment.md`, `docs/mcp-contract.md` - Fresh setup, Docker boundary, secret behavior, and contract cross-links.

## Decisions Made

- Routine verification never calls DeepSeek: `npm test`, `npm run test:e2e`, and the smoke profile are credential-free/no-network.
- The real command is documented but was not executed in this run; it requires a project-local key, network access, and may incur API cost.
- The text PDF fixture is validated as a typed PDF citation; visual PDF hash assertions are conditional on a retained visual payload because `text-page.pdf` is an extractable text page, while the image fixture always exercises visual citation binding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved full visual citation locations across the provider seam**
- **Found during:** Task 1 (injected-provider multimodal E2E)
- **Issue:** The existing provider adapter reduced image/PDF visual locations to `{ kind }` plus a page number, dropping normalized image dimensions/MIME or PDF page metadata. Schema validation then rejected otherwise valid provider findings as `INTERNAL_ERROR`.
- **Fix:** Reused the matching normalized image/PDF reference when constructing provider visual payloads, with a bounded fallback for defensive compatibility.
- **Files modified:** `src/tools/review.ts`
- **Verification:** `npm run test:e2e`, targeted smoke/project configuration tests, and full `npm test` passed.
- **Committed in:** `f5b97f6`

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required for the planned provider citation contract and did not expand scope.

## Issues Encountered

- Docker CLI is not installed in the current environment. `npm run docker:smoke` returned status 127 with `[docker-smoke:preflight] Docker CLI is not installed; offline container smoke cannot run.` Docker build, Compose rendering, container stdio, mount-write, and image inspection remain to be run in a Docker-enabled environment.
- Existing PDF.js font/indexing warnings appeared during tests but were non-failing and unrelated to this plan's changes.
- The real credentialed client was intentionally not run, so no DeepSeek API request or external request was made.

## User Setup Required

The documented `review` profile requires a project-local `DEEPSEEK_API_KEY`, configured `DEEPSEEK_*` values as needed, network access, and acceptance of possible API cost. The `review-file` profile requires `EVIDENCELENS_CONFIG_FILE` pointing to a local read-only config file. No credentials were accessed.

## Known Stubs

None. Empty defaults found in request helper parameters and internal buffers are control-flow defaults, not UI or deployment placeholders.

## Next Phase Readiness

The offline code and documentation are ready. Run `npm run docker:smoke` in an environment with Docker CLI/Compose to complete the real-container verification; do not run the credentialed client unless the user intentionally supplies a key and accepts network/cost implications.

---
*Phase: 06-docker-deployment-and-end-to-end-validation*
*Completed: 2026-08-23*

## Self-Check: PASSED

- Summary file exists at the planned phase path.
- Task commits `f5b97f6` and `fd36bb1` exist in Git history.
- `git diff --check` passes.
