# Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E - Context

**Gathered:** 2026-09-13
**Status:** Ready for gap-closure planning
**Source:** Direct developer decision during `$gsd-plan-phase 10 --gaps`

<domain>
## Phase Boundary

Close the remaining PROV-01 gap by diagnosing the retained sanitized protocol failure, correcting it without weakening fail-closed or evidence guarantees, and obtaining a successful credentialed Docker MCP proof through the complete production boundary.

</domain>

<decisions>
## Implementation Decisions

### API test authorization
- Future Phase 10 API/provider tests may execute automatically without a per-run human authorization checkpoint.
- Plans must not require an authorization nonce, exact echoed approval line, or `autonomous: false` solely because a test may call the paid provider.
- Automatic execution remains bounded: each live verification task must declare an exact maximum provider-request count, disable retries and fallback, and stop after its declared attempts.
- A failed live attempt must be retained truthfully and must never be converted into success, skipped status, or an offline substitute.

### Local ordering and GitHub Actions
- Ordinary local edits, generated local evidence, and local verification do not consume a limited execution sequence and do not require an intermediate Git commit before local authoritative validation.
- Local SOURCE, BUILD, EXECUTION, and PROOF artifacts may be validated before commit when authority is established by exact content hashes, atomic write/rename, immutable input identities, and same-process verification.
- Git commits remain required for durable project history, but commit timing must not create artificial local task dependencies or draft-versus-authoritative modes solely to satisfy GSD task boundaries.
- Finite execution-count controls apply primarily to GitHub Actions runs. Any plan that triggers GitHub Actions must declare an exact maximum run count, prove the trigger count, and prohibit automatic retrigger loops.
- Ordinary local tests, builds, and Docker builds/runs have no execution-count quota and may be repeated whenever required for implementation, diagnosis, recertification, or replacement of stale artifacts; they are never counted as GitHub Actions runs.
- GitHub Actions is the only build/execution system governed by a finite run quota. Plans that can trigger GitHub Actions must declare and enforce an exact run budget, and must never automatically retrigger a workflow after failure.
- Provider/API requests remain independently bounded for cost and safety. Removing local build limits does not permit retries, fallback calls, diagnostic second requests, or additional paid requests beyond the active plan's provider-request ceiling.
- A live-proof plan may still prohibit rebuilding inside the live invocation when required to preserve the exact certified image identity. That isolation rule is an evidence-integrity boundary, not a local build quota; a stale image may be rebuilt locally before live execution without separate authorization.

### Cost and secret safety
- Use credential-free and retained non-secret evidence for diagnosis before spending an API request.
- Never print, commit, hash into public artifacts, or otherwise disclose provider credentials or raw provider diagnostics.
- Prefer the smallest request budget that can prove the missing end-to-end behavior; additional paid attempts require a new plan or an explicitly declared bounded loop in the plan.

### the agent's Discretion
- Choose the credential-free reproduction and instrumentation approach.
- Choose the exact finite request budget, provided it is justified by the failure hypothesis and encoded as an enforceable test invariant.
- Split diagnosis, fix, and live proof into separate plans/waves when that improves auditability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verification truth
- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md` — Current 10/11 result and sole remaining PROV-01 gap.
- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-23-SUMMARY.md` — Audited outcome of the prior single authorized immutable-image run.
- `.planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md` — Retained live-proof state consumed by PROV-01.
- `.planning/REQUIREMENTS.md` — Requirement status and traceability.

### Safety and proof machinery
- `scripts/docker-review-real.mjs` — Credentialed Docker MCP harness and sanitized protocol boundary.
- `scripts/audit-live-evidence.mjs` — Independent retained-evidence audit.
- `scripts/atomic-authorized-review.mjs` — Existing replay-safe execution machinery; per-run human authorization is no longer required for future Phase 10 API tests.
- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-REVIEW.md` — Deep source review baseline.
- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-SECURITY.md` — Security-review baseline.

</canonical_refs>

<specifics>
## Specific Ideas

- Diagnose `[docker-review:protocol] failed` from existing sanitized and non-secret evidence first.
- Preserve exact request-count evidence so automated execution remains cost-auditable.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Context gathered: 2026-09-13*
