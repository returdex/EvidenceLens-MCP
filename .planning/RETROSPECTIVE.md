# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-09-24
**Phases:** 11 | **Plans:** 39 | **Tasks:** 79

### What Was Built

- A strict MCP review API for deterministic and provider-backed multimodal evidence review.
- Provenance-preserving normalization for text, PDF, image, screenshot, and table inputs.
- A bounded allowlisted filesystem reader with read-only Docker deployment and Linux no-follow traversal.
- Four-role review orchestration with citations, uncertainty, provider attribution, and sanitized failures.
- A replaceable DeepSeek adapter with authenticated, source-bound Docker MCP proof.

### What Worked

- Exact source, image, receipt, and request-count identities kept paid provider claims auditable.
- Credential-free tests covered the current source after the immutable paid proof, avoiding an unnecessary replay.
- Fail-closed schemas and sanitized diagnostics caught provider and filesystem boundary defects before public output.
- Independent phase verification and the final three-source audit closed all 20 requirements.

### What Was Inefficient

- The provider proof chain required repeated recertification after contract and diagnostic changes.
- A stale canonical audit path continued to report old blockers after the fresh re-audit existed.
- Phase 5 retained one extra summary artifact, which caused generated completion metadata to report 40 summaries for 39 executable plans.
- Most phases predated the Nyquist validation artifact, leaving retrospective coverage debt.

### Patterns Established

- Treat external evidence as immutable and bind every claim to exact committed bytes.
- Keep paid live proof separate from repeatable offline regression and state the boundary explicitly.
- Preserve historical audits by content hash while keeping one canonical current audit path.
- Store active debug sessions separately from resolved-session knowledge references.

### Key Lessons

1. A structural pass is insufficient when semantic ownership, provenance, or lifecycle ordering can drift.
2. Generated planning metadata needs reconciliation when historical artifacts do not map one-to-one with executable plans.
3. Canonical paths must always point to current authority; dated historical reports should remain clearly named snapshots.
4. Current-source offline evidence and older paid proof can support one conclusion only when their scopes are reported separately.

### Cost Observations

- Model mix and session count were not tracked consistently enough for a reliable percentage or total.
- Provider requests were deliberately finite and authenticated; the final accepted Phase 10 proof used exactly one request.
- Routine closure and Phase 11 verification required no new paid provider request or GitHub Actions run.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 | 11 | Added immutable proof authority, independent verification, and canonical re-audit closure |

### Cumulative Quality

| Milestone | Tests | Requirement Coverage | Open Artifact Audit |
|-----------|-------|----------------------|---------------------|
| v1.0 | 795-test offline suite plus focused E2E, Docker, and Linux checks | 20/20 | 0 open items |

### Top Lessons

1. Keep live evidence source-bound and immutable.
2. Re-run canonical planning audits after gap closure so tooling reads current authority.
