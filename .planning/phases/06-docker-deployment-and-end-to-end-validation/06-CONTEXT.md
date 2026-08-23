# Phase 6: Docker Deployment and End-to-End Validation - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Package EvidenceLens MCP for a fresh Docker-based environment and prove a documented multimodal review flow. The phase delivers a reproducible Docker image/configuration, read-only project evidence mounting, a local development path, and automated smoke/end-to-end checks for the existing stdio MCP contract. It does not add an HTTP/SSE server, UI, persistent evidence storage, or new review capabilities.

</domain>

<decisions>
## Implementation Decisions

### Docker runtime and mounts
- Use stdio MCP transport directly from the container; do not add an HTTP/SSE wrapper.
- Map the entire host project directory into a container workspace path such as `/workspace` with a read-only mount, so the review can access project files through the existing allowlist boundary.
- Configure `EVIDENCELENS_ALLOWED_ROOTS=/workspace` in the Docker example.
- Use a read-only container root filesystem, with only explicitly required temporary paths provided through tmpfs.
- Deliver a single-stage minimal image for this v1 deployment phase.

### Configuration and credentials
- Use Docker environment variables as the provider configuration mechanism. Multiple Docker projects may use the same variable names because each container has an isolated environment namespace.
- Each project must use its own Compose `.env` or secret source; do not rely on a shared host shell configuration.
- Docker may also support a read-only mounted provider configuration file for compatibility with the existing local configuration path.
- If environment variables and a mounted configuration file conflict, fail closed with a clear configuration error; never silently choose one source.
- Missing `DEEPSEEK_API_KEY` is a startup configuration failure for the Docker deployment and must emit a clear, actionable log message.

### Local development and end-to-end validation
- Document a `docker compose` path plus an explicit smoke/E2E script covering image build, read-only mount behavior, stdio MCP invocation, and result validation.
- Reuse the repository's fixed, non-sensitive text, table, image, and PDF fixtures as the canonical example evidence.
- The documented complete multimodal review example uses the real DeepSeek API by default and clearly states the required key, network access, and possible API cost.
- Default CI and routine validation use a no-network Docker smoke path with a mock/injected provider E2E; the real DeepSeek path is an explicit manual/credentialed command.
- Validate the documented output structurally: existing MCP request/response schemas, findings, evidence references, hashes, and provider/provenance metadata rules; do not assert exact model prose.

### the agent's Discretion
- Exact container base image, Dockerfile layering details, Compose service naming, tmpfs target, and health/smoke script implementation.
- Exact fixed container workspace path if it remains consistent with the documented `/workspace` allowlist contract.
- Exact mock provider harness and CLI wrapper, provided the default checks remain offline and the real API example remains explicit.

</decisions>

<specifics>
## Specific Ideas

- The Docker example should make it obvious that the whole project is mounted read-only, rather than requiring users to copy evidence into a separate directory.
- Same-named environment variables across multiple Docker projects are acceptable because containers isolate their environments; the documentation should explain that project-specific `.env`/secret files prevent accidental interpolation mistakes.
- Missing-key logs should identify the missing configuration and remediation without printing secrets or full request details.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and project constraints
- `.planning/PROJECT.md` — project purpose, read-only deployment constraint, provider direction, and evolution rules.
- `.planning/REQUIREMENTS.md` — DEPL-01 and DEPL-02 acceptance requirements and traceability.
- `.planning/ROADMAP.md` — Phase 6 boundary and success criteria.

### Existing MCP and provider contract
- `docs/mcp-contract.md` — MCP request/response behavior, evidence roots, provider configuration, and error semantics.
- `src/server.ts` — stdio server entry point and provider registration.
- `src/filesystem/policy.ts` — allowlisted-root parsing and containment behavior.
- `src/providers/config.ts` — typed provider configuration, defaults, bounds, and fail-closed validation.
- `src/providers/deepseek.ts` — DeepSeek transport and multimodal provider behavior.
- `src/tools/review.ts` — review orchestration and provider injection boundary.
- `src/contracts/review.ts` — public request/response schemas and provenance validation.

### Existing fixtures and verification
- `tests/fixtures/evidence/text/assignment.txt` — fixed text evidence.
- `tests/fixtures/evidence/tables/rubric.csv` — fixed table evidence.
- `tests/fixtures/evidence/images/rubric-screenshot.png` — fixed visual evidence.
- `tests/fixtures/evidence/pdfs/text-page.pdf` — fixed PDF evidence.
- `tests/contract/review-provider.test.ts` — provider substitution and unchanged MCP contract patterns.
- `tests/smoke/project-config.test.ts` — project scripts and configuration assertions.
- `package.json` — existing build/test commands and live-provider test isolation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server.ts` already exposes a stdio MCP entry point and typed server options.
- `src/filesystem/policy.ts` already parses configured roots and enforces read-only allowlisted access.
- Existing fixture files cover text, table, image, and PDF inputs needed for the multimodal example.
- Existing provider injection in `src/tools/review.ts` and contract tests provide a mock seam for no-network E2E checks.

### Established Patterns
- Docker must preserve the existing read-only, pathless provider boundary; the container must not introduce writes or unrestricted filesystem access.
- Default tests isolate real provider calls with `EVIDENCELENS_DISABLE_PROVIDER=1`; the Docker smoke path should use the same no-network principle.
- Public MCP schemas and stable sanitized errors are already tested and must remain unchanged.

### Integration Points
- Add Docker and Compose artifacts around `src/server.ts` without changing the MCP tool contract.
- Connect container environment/mount configuration to `EVIDENCELENS_ALLOWED_ROOTS` and existing provider configuration loading.
- Add smoke/E2E verification at the Docker boundary, while reusing existing contract and fixture tests for semantic assertions.

</code_context>

<deferred>
## Deferred Ideas

- HTTP/SSE or remote network transport — outside the stdio Docker deployment scope.
- Multi-project orchestration, shared secret management, and hosted deployment automation — future deployment work.
- Persistent evidence indexing, caching, or storage — outside this v1 validation phase.

</deferred>

---

*Phase: 06-docker-deployment-and-end-to-end-validation*
*Context gathered: 2026-08-23*
