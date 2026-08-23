# Phase 6: Docker Deployment and End-to-End Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 06-CONTEXT.md.

**Date:** 2026-08-23
**Phase:** 06-docker-deployment-and-end-to-end-validation
**Areas discussed:** Docker runtime and mounts, configuration and credentials, local development and end-to-end validation

---

## Docker runtime and mounts

| Option | Description | Selected |
|--------|-------------|----------|
| stdio MCP | Container runs the existing MCP server directly | ✓ |
| HTTP/SSE | Add a network transport wrapper | |
| Single evidence directory | Mount only one evidence directory | |
| Whole project directory | Mount the complete project directory read-only | ✓ |
| Read-only root filesystem | Use tmpfs only for required temporary paths | ✓ |
| Single-stage image | Keep the v1 image/build path minimal | ✓ |

**User's choice:** stdio; whole project folder read-only; read-only root filesystem; single-stage image.
**Notes:** The container workspace should be the configured allowlisted root, documented as `/workspace`.

---

## Configuration and credentials

| Option | Description | Selected |
|--------|-------------|----------|
| Project-specific environment variables | Each Compose project injects its own values | ✓ |
| Read-only config mount only | Avoid environment variables entirely | |
| Fixed `/workspace` allowlist | Keep the container root path stable | ✓ |
| Custom allowlist path | Let deployments choose the container path | |
| Startup failure on missing key | Fail early with an actionable log | ✓ |
| Start then return configuration error | Keep the process available without a provider | |
| Deterministic-only fallback | Hide provider configuration failure behind local analysis | |
| Env plus read-only config compatibility | Support both sources with fail-closed conflict handling | ✓ |

**User's choice:** Same-named environment variables across multiple Docker projects are isolated by container; use independent Compose `.env`/secret sources. Fix the allowlist to `/workspace`, fail startup with a corresponding log when the key is missing, and support environment variables plus read-only config compatibility.
**Notes:** Conflicting sources must fail closed rather than silently select a winner.

---

## Local development and end-to-end validation

| Option | Description | Selected |
|--------|-------------|----------|
| Real DeepSeek by default | Full example proves the deployed provider path | ✓ |
| Mock by default | No-cost example only | |
| Both mock default and real optional | Routine checks are offline; real API is explicit | |
| Repository fixtures | Fixed, non-sensitive evidence bundle | ✓ |
| Generated temporary sample | Runtime-generated example evidence | |
| User-provided project | Requires external evidence and is not reproducible | |
| Compose plus smoke/E2E script | Verify Docker and stdio MCP invocation | ✓ |
| Manual Docker commands | Fewer scripts, more manual steps | |
| npm-only path | Does not prove Docker delivery | |
| Offline mock CI gate | No network/cost in routine validation | ✓ |
| Credentialed CI by default | Full external integration on every run | |
| Build-only validation | Does not prove end-to-end behavior | |

**User's choice:** Use repository fixtures, Compose plus a smoke/E2E script, real DeepSeek for the documented complete review, and offline mock E2E for default CI/routine checks.
**Notes:** Real API setup must explicitly warn about key, network, and cost requirements; assertions should be structural rather than prose snapshots.

---

## the agent's Discretion

- Exact Docker base image, Compose names, tmpfs target, and smoke harness implementation.
- Exact provider config file location when it remains read-only and conflict-safe.

## Deferred Ideas

- HTTP/SSE transport and remote hosted deployment.
- Shared multi-project secret orchestration.
- Persistent evidence storage or indexing.

---

*Phase: 06-docker-deployment-and-end-to-end-validation*
*Discussion log generated: 2026-08-23*
