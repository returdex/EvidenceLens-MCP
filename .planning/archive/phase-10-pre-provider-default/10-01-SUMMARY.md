---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 01
subsystem: provider-startup
tags: [mcp, deepseek, docker, fail-closed, security]
requires:
  - phase: 09-public-provider-attribution-and-determinism-contract
    provides: Strict provider boundary and sanitized provider errors
provides:
  - Fail-closed automatic provider startup
  - Explicit literal offline provider switch
  - Docker startup failure matrix with redaction checks
affects: [10-02-credentialed-e2e, deployment, provider-configuration]
tech-stack:
  added: []
  patterns: [explicit offline opt-out, sanitized startup classification, host-only Compose interpolation]
key-files:
  created: [scripts/docker-provider-startup-matrix.sh]
  modified: [src/server.ts, tests/contract/review-tool.test.ts, tests/providers/config.test.ts, tests/smoke/docker-config.test.ts, scripts/docker-smoke.sh, README.md, docs/mcp-contract.md, docs/docker-deployment.md]
key-decisions:
  - "Only literal EVIDENCELENS_DISABLE_PROVIDER=1 disables automatic provider loading; explicit provider and typed providerConfig injection retain precedence."
  - "Docker Compose smoke commands use a host-only interpolation placeholder and explicitly blank the container key for missing-key checks."
patterns-established:
  - "Provider-enabled startup must validate configuration before registering review_evidence."
  - "Startup diagnostics expose only the stable PROVIDER_CONFIGURATION classification."
requirements-completed: [SAFE-04, PROV-01]
duration: 6h 7m
completed: 2026-09-06
---

# Phase 10 Plan 01: Fail-Closed Provider Startup Summary

**Provider-enabled MCP startup now rejects invalid ambient configuration with sanitized `PROVIDER_CONFIGURATION`, while explicit offline and injected-provider paths remain deliberate and testable.**

## Performance

- **Duration:** 6h 7m including Docker availability checkpoints
- **Started:** 2026-09-06T06:23:42Z
- **Completed:** 2026-09-06T12:30:41Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Removed the swallowed provider-configuration error that silently registered a deterministic-only server.
- Locked literal offline mode and explicit provider/config injection precedence with no-network regression coverage.
- Proved missing, invalid, conflicting, and unreadable Docker configuration fails with redacted diagnostics, then passed the normal offline MCP smoke.

## Task Commits

1. **Task 1: RED — express enabled-runtime configuration failure and offline-override contracts** - `675ff51` (test)
2. **Task 2: GREEN — make provider-enabled startup fail closed without weakening test injection** - `c48d788` (fix)
3. **Task 3: Prove the Docker startup matrix and document the exact local/Docker contract** - `40d7a82` (test)

## Files Created/Modified

- `src/server.ts` - Propagates automatic provider configuration failures and preserves explicit injection precedence.
- `tests/contract/review-tool.test.ts` - Covers missing configuration, literal offline mode, and injected seams.
- `tests/providers/config.test.ts` - Covers malformed, conflicting, and unreadable configuration redaction.
- `tests/smoke/docker-config.test.ts` - Locks explicit offline Compose and startup-script declarations.
- `scripts/docker-provider-startup-matrix.sh` - Exercises four provider-enabled failure cases without secrets.
- `scripts/docker-smoke.sh` - Uses explicit host interpolation and a blank container key for fail-closed preflight.
- `README.md`, `docs/mcp-contract.md`, `docs/docker-deployment.md` - Document the no-fallback contract.

## Decisions Made

- Only the literal value `1` disables provider loading; other values remain provider-enabled and fail closed.
- Explicit injected providers win, followed by explicit typed configuration, before ambient configuration or offline handling.
- The non-secret Compose placeholder exists only to render inactive profiles and is overridden inside provider-failure containers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a Docker Desktop unreadable-mount fallback**
- **Found during:** Task 3
- **Issue:** Docker Desktop rejects a mode-`000` host file at mount creation before the application can classify the read failure.
- **Fix:** Retained the exact mode-`000` primary probe, then used a directory at the exact application config mount path when Docker Desktop reports host mount permission denial, producing the same application-level unreadable classification.
- **Files modified:** `scripts/docker-provider-startup-matrix.sh`
- **Verification:** All four matrix cases emitted only sanitized failure markers and the full offline Docker smoke passed.
- **Committed in:** `40d7a82`

---

**Total deviations:** 1 auto-fixed (1 blocking environment issue).
**Impact on plan:** Preserves the required Linux probe while making the runtime gate executable on Docker Desktop; no public contract or provider behavior changed.

## Issues Encountered

- Docker was initially unavailable and required two human-action checkpoints; execution resumed after `docker run --rm hello-world` succeeded.

## User Setup Required

None - Docker was required only for execution-time verification and is now operational.

## Next Phase Readiness

- Plan 10-02 can run credentialed structural MCP E2E without risk of accepting deterministic-only fallback as provider success.
- No blockers remain.

## Known Stubs

None. The `compose-placeholder` token is an intentional non-secret interpolation value and never reaches provider-enabled container configuration.

## Self-Check: PASSED

- All listed key files exist.
- Task commits `675ff51`, `c48d788`, and `40d7a82` exist.
- Focused tests, TypeScript build, documentation tests, full 195-test suite, Docker startup matrix, offline Docker smoke, and whitespace checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-06*
