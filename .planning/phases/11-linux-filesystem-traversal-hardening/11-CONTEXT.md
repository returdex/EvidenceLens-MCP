# Phase 11: Linux Filesystem Traversal Hardening - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Close SAFE-01 by enforcing the declared no-follow guarantee for every untrusted component of Linux descriptor-anchored filesystem reads, while retaining the trusted `/proc/self/fd` hop. Add deterministic Linux regression evidence and synchronize the milestone planning record before re-audit. The phase does not add filesystem capabilities, write operations, or provider calls.

</domain>

<decisions>
## Implementation Decisions

### Filesystem behavior to preserve
- **D-01:** Preserve the Phase 3 policy that a caller-supplied symlink may resolve to a target inside the selected allowlisted root. Authorization uses the canonical target and returns canonical logical provenance; a link escaping the root remains denied. This carries forward an existing documented decision and test, rather than a new user preference.
- **D-02:** The Linux reader must open or equivalently validate each untrusted component of the authorized canonical relative path without following a symlink. The `/proc/self/fd/<trusted descriptor>` hop is the explicit trusted exception. Deny a component substitution before returning bytes.
- **D-03:** Keep the rootless default, read-only bounded descriptor operations, before/after target identity checks, sanitized stable errors, and macOS default fail-closed behavior. Do not replace the anchored reader with a pathname check/open sequence.

### Proof and planning record
- **D-04:** Prove both an intermediate symlink substitution denial and ordinary authorized Linux fixture reads with deterministic Linux-focused tests. The test must exercise the production reader boundary, not merely inspect source text.
- **D-05:** Update the current requirement, roadmap, state, and verification truth only after the implementation is actually verified. Treat the 2026-09-05 milestone audit as historical evidence and perform a fresh audit when the phase is complete.

### the agent's Discretion
- Choose the exact Linux descriptor-walk implementation and test harness, provided the no-follow and read-only guarantees above hold.
- Choose the smallest documentation edits that make current status and evidence consistent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and audit
- `.planning/ROADMAP.md` § Phase 11 — fixed goal and three success criteria.
- `.planning/REQUIREMENTS.md` — SAFE-01 and its pending Phase 11 traceability.
- `.planning/PROJECT.md` — allowlisted read-only security constraint and project evolution rules.
- `.planning/v1.0-MILESTONE-AUDIT.md` — historical finding that intermediate Linux path components lacked no-follow protection; re-audit against current evidence.

### Existing filesystem contract
- `docs/mcp-contract.md` § Phase 3 filesystem sources — documented Linux no-follow claim, canonical provenance, macOS fail-closed behavior, and stable errors.
- `docs/docker-deployment.md` — Linux container filesystem path and runtime smoke gate.
- `.planning/phases/03-read-only-filesystem-boundary/03-01-SUMMARY.md` — established in-root symlink decision.
- `.planning/phases/03-read-only-filesystem-boundary/03-SECURITY.md` — prior descriptor-walk security claim to recheck.
- `.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md` — current passed Phase 10 boundary; do not repeat paid provider proof.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/filesystem/policy.ts` canonicalizes configured roots and candidate targets, enforces containment, and records target identity.
- `src/filesystem/read.ts` implements the Linux descriptor-anchored walk, bounded read, and before/after descriptor checks.
- `tests/filesystem/read.test.ts` has substitution and authorized-read tests; `tests/filesystem/policy.test.ts` locks in-root versus escaping symlink behavior.

### Established Patterns
- Linux reads start from an already opened root descriptor; the proc descriptor hop is trusted, while subsequent path components are untrusted.
- An injected `FilesystemReadAdapter` supports deterministic boundary tests; production failures map to stable sanitized codes.

### Integration Points
- The intermediate component open in `src/filesystem/read.ts` currently lacks the no-follow flag claimed by the documentation.
- `docs/mcp-contract.md`, Phase 11 verification, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` need one consistent post-verification status.

</code_context>

<specifics>
## Specific Ideas

- Preserve the canonical in-root symlink behavior already specified by Phase 3 while closing the race in the actual Linux open sequence.
- Re-audit from new Phase 11 evidence; do not turn the old milestone audit into a retroactive pass.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 11-linux-filesystem-traversal-hardening*
*Context gathered: 2026-09-22*
