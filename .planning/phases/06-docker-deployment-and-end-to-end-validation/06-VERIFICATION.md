---
phase: 06-docker-deployment-and-end-to-end-validation
verified: 2026-08-23T05:30:32Z
status: human_needed
score: 2/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run the offline Docker boundary in an environment with Docker CLI and Compose/daemon"
    expected: "The image builds, Compose renders, stdio initialize/tools/list/tools/call succeeds for all four fixtures, /workspace rejects writes, and missing-key startup exits nonzero with sanitized PROVIDER_CONFIGURATION."
    why_human: "Docker CLI is not installed in this verification environment, so the real image, Compose, mount, and container process boundary cannot be exercised."
  - test: "Intentionally run the credentialed DeepSeek review with a project-local key"
    expected: "DEEPSEEK_API_KEY=... npm run docker:review:real returns provider-namespaced structural findings with valid local provenance and no raw content/path leakage."
    why_human: "This is an external, credentialed, potentially billable API call; the user explicitly required structural review only and no real API/network request."
---

# Phase 6: Docker Deployment and End-to-End Validation Verification Report

**Phase Goal:** A fresh environment can run the server with read-only mounts and complete a documented multimodal review.

**Verified:** 2026-08-23T05:30:32Z

**Status:** human_needed

**Re-verification:** No — initial verification

## Goal Achievement

The repository contains substantive Docker, Compose, smoke, injected-provider E2E, and runbook implementations. The local semantic path and all non-Docker automated checks passed. The Docker boundary itself remains unverified because the environment has no Docker CLI; `npm run docker:smoke` was executed and returned 127 with the explicit preflight message, rather than being treated as a pass. The real DeepSeek command was inspected only and was not executed.

### Observable Truths

Duplicate plan truths are merged below where they restate the roadmap criteria.

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Docker provides a single-stage non-root direct-stdio server with the exact `course=/workspace` allowlist, read-only project mount/root, `/tmp` tmpfs, capability restrictions, and fail-closed provider preflight. | ? UNCERTAIN | Static evidence: `Dockerfile` has one `FROM`, `npm ci`, `npm run build`, `USER node`, and the entrypoint; `compose.yaml` declares the exact allowlist, read-only `/workspace`, read-only root, `/tmp`, `cap_drop: ALL`, and `no-new-privileges`; local no-key entrypoint check exited 1 with sanitized `PROVIDER_CONFIGURATION`. Docker build, Compose rendering, image inspection, and container preflight could not run because `docker` is absent. |
| 2 | Fresh setup documentation demonstrates the offline path and one complete multimodal review, plus an explicit credentialed DeepSeek path with safety/cost warnings. | ✓ VERIFIED | `docs/docker-deployment.md` documents checkout prerequisites, exact commands, four role/fixture mappings, stdio, mounts, secret/conflict behavior, and `DEEPSEEK_API_KEY=... npm run docker:review:real`; `README.md` links the canonical runbook; `docs/mcp-contract.md` only cross-links deployment details. |
| 3 | Automated checks cover the documented end-to-end path and report failures clearly, including the no-network container smoke. | ? UNCERTAIN | `scripts/docker-smoke.sh` has phase-labelled non-zero diagnostics, protocol/schema/reference/hash/path/content checks, `/workspace` write rejection, and missing-key checks; syntax checks passed. Its actual Docker build/run path could not be exercised. |
| 4 | The routine E2E path injects a compatible provider and completes a four-role text/table/image/PDF review with public schema, citation, hash, provenance, and no-leak assertions. | ✓ VERIFIED | `npm run test:e2e` passed 1/1. The test uses `registerReviewTool`, `InMemoryTransport`, an injected provider, bounded `node:fs/promises` adapter operations with `O_RDONLY`/`O_NOFOLLOW`, the four fixed fixtures, schema parsing, visual image/PDF citation checks, lowercase hashes, logical references, and raw-content/absolute-path assertions. |

**Score:** 2/4 truths verified; 2/4 remain UNCERTAIN pending Docker-enabled verification.

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `Dockerfile` | Single-stage minimal non-root image for the compiled stdio server | ? UNCERTAIN at runtime | Exists and is substantive: one `FROM`, `WORKDIR /app`, `npm ci`, build, dependency pruning, entrypoint, `USER node`. Runtime image inspection is unavailable without Docker. |
| `compose.yaml` | Offline/credentialed/review-file profiles with locked mounts and runtime restrictions | ? UNCERTAIN at runtime | Exists and is substantive; static declarations match the required profiles and mounts. `docker compose config` could not be run. |
| `docker-entrypoint.sh` | Sanitized fail-closed provider preflight then `node dist/server.js` | ✓ VERIFIED locally/static | Wired by `Dockerfile`; local built-dist no-key invocation exited nonzero and emitted only the actionable marker. |
| `scripts/docker-smoke.sh` | Fail-fast Docker build, protocol smoke, mount and preflight checks | ? UNCERTAIN at runtime | Exists, executable, syntactically valid, and wired by `package.json`; actual Docker phases are blocked by missing CLI. |
| `scripts/docker-review-real.mjs` | Separate credentialed four-fixture stdio client | ? UNCERTAIN at runtime | Exists, executable, syntactically valid, statically sends exactly initialize/tools/list/tools/call and rejects deterministic-only credentialed output; intentionally not executed. |
| `tests/e2e/docker-review.test.ts` | Credential-free injected-provider four-fixture E2E | ✓ VERIFIED | Exists, substantive, wired by `test:e2e`, and passes against the real repository fixtures. |
| `tests/smoke/docker-config.test.ts` | Deterministic Docker/Compose security declarations | ✓ VERIFIED | Exists, substantive, wired into the default test suite, and its 4 tests pass. |
| `package.json` | Exact `docker:smoke`, `docker:review:real`, and `test:e2e` commands | ✓ VERIFIED | Scripts are present and exact; project configuration tests pass. |
| `docs/docker-deployment.md` | Fresh setup and offline/real-provider deployment runbook | ✓ VERIFIED | Contains all required command, boundary, fixture, structural-assertion, secret, and cost guidance. |

The SDK artifact scan independently reported all 3 Plan 01 artifacts and all 5 Plan 02 artifacts present/substantive. Manual Level 3 checks confirmed their imports/references and package/documentation wiring; runtime-dependent artifacts remain UNCERTAIN only at the Docker boundary.

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `compose.yaml` | `Dockerfile` | service build context/image | ✓ VERIFIED (static) | Both profiles reference the Dockerfile and image; SDK key-link check passed. |
| `compose.yaml` | `src/server.ts` | allowlist plus compiled direct-stdio command | ✓ VERIFIED (static) | Exact allowlist is declared and entrypoint executes `node dist/server.js`; runtime invocation pending Docker. |
| `compose.yaml` | `tests/fixtures/evidence` | read-only whole-project `/workspace` bind | ✓ VERIFIED (static) | All profiles bind `.` to `/workspace` read-only; runtime mount behavior pending Docker. |
| `scripts/docker-smoke.sh` | `compose.yaml` | offline profile and stdio invocation | ✓ VERIFIED (static) | Script invokes `docker compose --profile smoke`, then the stdio client; Docker execution pending. |
| `tests/e2e/docker-review.test.ts` | review implementation | `registerReviewTool`/injected provider | ✓ VERIFIED | The test wires the tool directly with the bounded adapter and passes. |
| `docs/docker-deployment.md` | `scripts/docker-smoke.sh` | `npm run docker:smoke` | ✓ VERIFIED | Exact command appears in docs and package script. |
| `docs/docker-deployment.md` | `scripts/docker-review-real.mjs` | `npm run docker:review:real` | ✓ VERIFIED (structural only) | Exact command/client relationship is documented; external execution intentionally skipped. |
| `README.md` | `docs/docker-deployment.md` | canonical runbook link | ✓ VERIFIED | Link resolves to the phase runbook. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `tests/e2e/docker-review.test.ts` | normalized evidence/findings | four fixed fixture files through injected `node:fs/promises` adapter and `registerReviewTool` | Yes; test passed | ✓ FLOWING |
| `scripts/docker-review-real.mjs` | MCP result payload | Compose `review` service and configured DeepSeek provider | Not exercised; requires external key/network | ? UNCERTAIN / human needed |
| `scripts/docker-smoke.sh` | container protocol/result and mount behavior | Compose `smoke` service, `/workspace`, stdin/stdout | Not exercised; Docker CLI absent | ? UNCERTAIN / environment-limited |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full credential-free regression suite | `env -u DEEPSEEK_API_KEY npm test` | 23 files, 119 tests passed | ✓ PASS |
| TypeScript production build | `env -u DEEPSEEK_API_KEY npm run build` | `tsc -p tsconfig.json` exited 0 | ✓ PASS |
| Injected four-fixture E2E | `env -u DEEPSEEK_API_KEY npm run test:e2e` | 1 test passed; no network assertion triggered | ✓ PASS |
| Docker declaration tests | `npm test -- --run tests/smoke/docker-config.test.ts tests/smoke/project-config.test.ts` | 7 tests passed | ✓ PASS |
| Local provider preflight sanitization | `env -u DEEPSEEK_API_KEY EVIDENCELENS_DISABLE_PROVIDER=0 ./docker-entrypoint.sh` | Exit 1; only sanitized `PROVIDER_CONFIGURATION` line | ✓ PASS |
| Real-container offline smoke | `env -u DEEPSEEK_API_KEY npm run docker:smoke` | Exit 127: `Docker CLI is not installed; offline container smoke cannot run.` | ? SKIP — environment limitation |
| Credentialed DeepSeek review | `DEEPSEEK_API_KEY=... npm run docker:review:real` | Not run by design; no API/network request sent | ? SKIP — explicit user constraint |

PDF.js emitted non-failing font/indexing warnings during the test suite; no test failed because of them.

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `DEPL-01` | 06-01, 06-02 | Documented Docker image/configuration with read-only evidence mounts | ? NEEDS HUMAN | Static Dockerfile/Compose/entrypoint contract and local preflight pass; actual Docker build, Compose resolution, image user/command inspection, and container mount execution are unavailable. |
| `DEPL-02` | 06-02 | Local development path and minimal E2E review example documented | ✓ SATISFIED | README/runbook commands and four-fixture role mapping are present; injected-provider `npm run test:e2e` passes structurally and credential-free. |

No Phase 6 requirement is orphaned from the plans. No later roadmap phase covers the Docker runtime gap, so it is not deferred.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | No actionable TODO/FIXME/placeholder/empty-handler/secret-baking/stub pattern found in Phase 6 artifacts. | — | No blocker identified. |

Static scans also found no privileged mode, host networking, Docker socket mount, writable `/workspace`, HTTP/SSE server addition, or deterministic fallback in the credentialed client. The `DEEPSEEK_*` strings present are configuration names/documentation, not embedded secret values.

## Human Verification Required

### 1. Docker-enabled offline boundary

**Test:** In a Docker-enabled environment, run `env -u DEEPSEEK_API_KEY npm run docker:smoke` and inspect its phase-labelled output.

**Expected:** Compose config/build succeeds; the container completes initialize, tools/list, and tools/call over stdio for all four fixed fixtures; `/workspace` rejects a marker write; and missing-key startup exits nonzero with sanitized `PROVIDER_CONFIGURATION`.

**Why human:** This verifier environment has no Docker CLI, so the image/daemon/mount/kernel boundary cannot be tested programmatically here.

### 2. Explicit real DeepSeek path

**Test:** With an intentionally supplied project-local key, network access, and accepted API cost, run `DEEPSEEK_API_KEY=... npm run docker:review:real`.

**Expected:** A provider-namespaced structural finding is returned, all four logical fixture references and lowercase hashes validate, and no raw content, host/container path, request metadata, or provider envelope leaks into the public response.

**Why human:** It is an external credentialed service call with possible cost; it was intentionally not executed.

## Gaps Summary

No code-level blocker was proven. The unresolved items are runtime verification warnings: Docker CLI/daemon absence prevents proving the real container image, Compose rendering, read-only mount, and offline stdio smoke; the credentialed DeepSeek behavior is intentionally not exercised. The phase should not be declared fully passed until the Docker-enabled smoke check is run. The documented real command should remain a separate, human-approved operation.

---

_Verified: 2026-08-23T05:30:32Z_
_Verifier: the agent (gsd-verifier)_
