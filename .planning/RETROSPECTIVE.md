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

## Milestone: v1.1 — Assignment Prompt Adaptation and Staged Review

**Completed and published:** 2026-10-04; product v0.2.4 Release verified after explicit user authorization to lift the history hold.
**Phases:** 6 | **Plans:** 13 | **Tasks:** 28

### What Was Built

- One sourced assignment-review Skill spanning preparation, progress, final review and current-version recheck.
- Template preservation, contextual residue and accurate disclosure correction handoffs.
- Official validator recovery, source-bound offline acceptance and honest retrospective validation records.

### What Worked

- Existing callback gate and immutable synthetic sources made read/exclusion checks reproducible.
- Actual output tables separated observed language judgments from deterministic collection assertions.
- Explicit current F/A transitions kept resolved issues out of later repair lists.
- Source hashes allowed unchanged build/runtime proof reuse without paid-provider replay.

### What Was Inefficient

- Intermittent filesystem delays required bounded diagnostic/recovery attempts; root cause remains unknown.
- Missing original validation records required four retrospective maps.
- SDK task counts and state/body fields needed manual reconciliation; complete-milestone's summary-pattern count was 3 while actual PLAN tasks total 28.
- The legacy positive proof rehearsal assumed active requirements always exist, which conflicts with normal archival; its preservation snapshot was updated and all 81 affected tests passed.

### Patterns Established

- Record completeness and semantic automation are separate; retain PARTIAL rather than manufacture a classifier.
- Preserve original audits/reports and publish a distinct current completion authority.
- Archive before removing active requirements; phase evidence paths remain stable for proof tooling.
- Separate local milestone tags from product versions and from actual remote publication.

### Key Lessons

1. Test fixtures should accept both present and archived planning state while preserving production stale-state guards.
2. Counts should join real plans, completed summaries and requirement/verification sources.
3. A changed hash or a partial excerpt cannot alone resolve a prior finding.
4. Milestone-completion commands should not silently lift an existing hold on hundreds of unpublished commits.

### Cost Observations

- Model mix and session counts are unknown; no fabricated percentages.
- No paid-provider request was made for validation/closure; local archival checks add no provider proof.
- Timed-out and failed attempts remain in original evidence; successful checks are scoped to their commands/source/host.

---

## Milestone: v1.2 — 快捷指令与 Codex 独立审阅

**Completed:** 2026-10-05 | **Product:** [0.3.17 published](https://github.com/returdex/EvidenceLens-MCP/releases/tag/v0.3.17).
**Phases:** 4 | **Plans:** 21 | **Tasks:** 44

### What Was Built

- Six installed fixed-stage commands with actual cross-project discovery/help acceptance.
- Immutable task/conversation/run prompts, exact export and explicit latest/failure/retention semantics.
- Bounded macOS independent Codex execution using Codex-owned ChatGPT login, sealed evidence context and validated terminal results.
- Complete findings, source-bound host requirement/finding matrices and current-evidence action transitions; deferred is not resolved.
- Per-run actual status/time and CLI token provenance, unavailable effective model and no inferred billing.
- Ordinary one-DeepSeek/one-Codex blind review plus host source comparison, explicit single-provider override and separately preserved full reports.

### What Worked

Immutable captured inputs, exact export and source-bound terminal result joins made actual runs auditable. Private sidecars extend metadata without rewriting original prompts/results. Full feedback and explicit source-backed host judgments keep optional findings visible and separate deferral from resolution.

### What Was Inefficient

Pinned CLI startup/tool/output compatibility required several narrowly authorized repairs; failed receipts stayed preserved. Host and actual inference gates were easy to conflate. Current PROJECT prose drifted behind implementation. SDK milestone completion reported zero tasks/accomplishments despite actual 44 PLAN tasks; closure reconciles the count and accomplishments explicitly.

### Patterns Established

One installed graph; capture before each blind review; separate provider records; bounded no-resend execution; complete same-run reporting; local canonical closed-schema annotation; no grades inferred from success. Original phase/audit paths remain stable during archival.

### Key Lessons

1. Native tool refusals must be distinguished from executed tool handlers without relaxing source isolation.
2. Source references and valid JSON certify provenance/shape, not language judgment quality.
3. Update current product/status prose while preserving dated historical receipts.
4. Use exact PLAN task counts, not SDK summary-pattern estimates.

### Cost Observations

The approved synthetic pair used two real Codex calls; exact per-run usage is in Phase 21 live evidence. Separate prior A4 runs are distinct. Total sessions/model mix/billing are unavailable and not estimated. Closure makes no model request.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 | 11 | Added immutable proof authority, independent verification, and canonical re-audit closure |
| v1.1 | 6 | Single Skill, current-evidence lifecycle and truthful retrospective coverage |
| v1.2 | 4 | Installed commands, immutable execution/export and complete source-bound handoff |

### Cumulative Quality

| Milestone | Tests | Requirement Coverage | Open Artifact Audit |
|-----------|-------|----------------------|---------------------|
| v1.0 | 795-test offline suite plus focused E2E, Docker, and Linux checks | 20/20 | 0 open items |
| v1.1 | 795-test offline suite; 12 boundary tests; 57 collector steps; manual language review | 22/22; manual automation partial | 0 open items |
| v1.2 | 276 Node / 124 Vitest final execution; 50 fresh audit integration checks; actual synthetic live pair | 21/21; semantic limits retained | 0 open items, RR/FM separate |

### Top Lessons

1. Keep live evidence source-bound and immutable.
2. Re-run canonical planning audits after gap closure so tooling reads current authority.
