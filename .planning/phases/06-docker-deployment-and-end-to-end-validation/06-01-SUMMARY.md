---
phase: 06-docker-deployment-and-end-to-end-validation
plan: 01
subsystem: infra
tags: [docker, compose, stdio, security, vitest]

# Dependency graph
requires:
  - phase: 05-provider-adapter-and-deepseek-integration
    provides: Typed DeepSeek provider configuration and the existing stdio MCP server entry point
provides:
  - Single-stage non-root Docker image for the compiled stdio MCP server
  - Offline, credentialed, and read-only mounted-config Compose runtime profiles
  - Credential-free Docker security and provider-preflight configuration tests
affects: [phase-06-plan-02, docker-deployment, end-to-end-validation]

# Tech tracking
tech-stack:
  added: [Node 22 slim image, Docker Compose]
  patterns: [read-only project bind mounts, read-only container root with tmpfs, sanitized provider startup preflight]

key-files:
  created: [Dockerfile, compose.yaml, .dockerignore, docker-entrypoint.sh, tests/smoke/docker-config.test.ts]
  modified: []

key-decisions:
  - "Keep the image single-stage and run dist/server.js directly through a non-root Docker entrypoint."
  - "Use an explicit offline smoke profile with provider disablement and no network, while credentialed profiles fail closed through the existing provider config loader."
  - "Mount the complete host project read-only at /workspace and expose only course=/workspace to the application."

patterns-established:
  - "Docker runtime declarations must preserve the application allowlist instead of relying on container isolation alone."
  - "Provider configuration failures are reduced to one actionable, secret-free PROVIDER_CONFIGURATION line before server startup."

requirements-completed: [DEPL-01]

# Metrics
duration: 5min
completed: 2026-08-23
---

# Phase 6 Plan 1: Docker Deployment Runtime Summary

**Hardened single-stage Docker/Compose deployment for the stdio MCP server with offline provider isolation and read-only evidence access**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-23T05:08:02Z
- **Completed:** 2026-08-23T05:13:09Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added a single-stage `node:22-bookworm-slim` image that installs from the lockfile, compiles TypeScript, prunes development dependencies, and runs as the non-root `node` user through `node dist/server.js`.
- Added `smoke`, `review`, and `review-file` Compose profiles with the exact `course=/workspace` allowlist, read-only whole-project mounts, read-only container roots, `/tmp` tmpfs, dropped capabilities, and no-new-privileges protection.
- Added a Docker-only provider preflight that invokes the existing `loadProviderConfig()` and emits a sanitized actionable failure for missing credentials, malformed settings, or environment/file conflicts; no real DeepSeek request was made.
- Added credential-free Vitest assertions protecting image, entrypoint, Compose isolation, config-file compatibility, and build-context secret exclusion invariants.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the minimal non-root stdio image and Compose runtime profiles** - `9a535f9` (feat)
2. **Task 2: Lock Docker declarations with credential-free configuration tests** - `842fe7d` (test)

Additional blocking fix: `115088e` (fix) marks `docker-entrypoint.sh` executable in the repository so direct and container invocation use the same entrypoint contract.

**Plan metadata:** this summary commit (reported in the final handoff)

## Files Created/Modified

- `Dockerfile` - Single-stage build/runtime image with non-root execution and direct entrypoint.
- `compose.yaml` - Offline, credentialed, and mounted-config stdio services with read-only security controls.
- `.dockerignore` - Excludes Git state, planning state, dependencies, build output, local credentials, and host artifacts while retaining evidence fixtures.
- `docker-entrypoint.sh` - Sanitized provider configuration preflight followed by `node dist/server.js`.
- `tests/smoke/docker-config.test.ts` - No-network textual configuration contract tests.

## Decisions Made

- Kept provider selection in the existing typed configuration boundary; the Docker entrypoint only performs a startup preflight and does not add a fallback provider.
- Made the offline smoke profile networkless and explicitly disabled-provider so routine validation cannot invoke DeepSeek.
- Kept the optional mounted configuration target at `/app/.evidencelens.local.json` and documented its `/app` working-directory command while retaining environment/file conflict rejection in the existing loader.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Narrowed the credentialed Compose section assertion**
- **Found during:** Task 2 (Docker declaration tests)
- **Issue:** The initial test used a document-wide regular expression and incorrectly treated the smoke profile's provider disablement as if it belonged to the credentialed profile.
- **Fix:** Scoped the assertion to the parsed textual `review` section before checking that provider disablement is absent.
- **Files modified:** `tests/smoke/docker-config.test.ts`
- **Verification:** The named Docker configuration test passes 4/4.
- **Committed in:** `842fe7d`

**2. [Rule 3 - Blocking] Made the Docker entrypoint executable**
- **Found during:** Plan-level entrypoint preflight verification
- **Issue:** The newly created script had mode `0644`, so direct invocation was denied even though the image build would chmod it later.
- **Fix:** Set repository mode to `0755` so the checked-in entrypoint is directly executable and consistent with the container contract.
- **Files modified:** `docker-entrypoint.sh`
- **Verification:** Shell syntax and missing-key preflight checks pass.
- **Committed in:** `115088e`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking issue)
**Impact on plan:** Both fixes strengthen the planned executable configuration contract; no scope creep.

## Issues Encountered

- Docker CLI is not installed in the execution environment, so `docker build`, `docker compose config`, and image inspection could not run. Node/Vitest, TypeScript, shell, YAML, and static security checks completed successfully; Docker commands remain to be run in a Docker-enabled environment.
- Existing PDF tests emit non-failing PDF.js font/indexing warnings; these are unrelated to the Docker files and were not changed.

## User Setup Required

The `review` profile requires a project-local `DEEPSEEK_API_KEY` (and optional `DEEPSEEK_*` settings) supplied through that project's `.env` or secret source. The `review-file` profile requires `EVIDENCELENS_CONFIG_FILE` pointing to a local config file. No credentials were accessed or sent during this plan.

## Next Phase Readiness

The Docker runtime contract is ready for Plan 06-02's offline stdio smoke/E2E validation. Run the planned Docker build, Compose rendering, and image inspection in an environment with Docker installed.

## Self-Check: PASSED

- All five planned files exist.
- Task commits `9a535f9`, `842fe7d`, and executable-bit fix `115088e` exist in Git history.
- `STATE.md` and `ROADMAP.md` were intentionally left unchanged by this executor.

---
*Phase: 06-docker-deployment-and-end-to-end-validation*
*Completed: 2026-08-23*
