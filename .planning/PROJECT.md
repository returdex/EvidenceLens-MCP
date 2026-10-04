# EvidenceLens MCP

## What This Is

EvidenceLens MCP combines a controlled, read-only multimodal second-review service with one repository-managed assignment-review Skill. The Skill adapts prompts to sourced requirements, supports preparation/progress/final reviews, checks template structure and truthful disclosure, and updates findings against the designated current artifact.

The existing service offers deterministic offline review and a replaceable DeepSeek provider path. Historical Linux/Docker/paid proof remains bound to its original certified source. The new Skill does not automatically call Codex, edit documents, sign declarations or submit work.

## Core Value

Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.

## Requirements

### Validated

- ✓ MCP discovery, invocation, stable JSON results, documented inputs, limits, evidence types, and error semantics — v1.0 (`MCP-01` to `MCP-03`).
- ✓ Text, PDF, image, screenshot, and table normalization with hashes and precise source context — v1.0 (`EVID-01` to `EVID-05`).
- ✓ Four-role comparison for omissions, contradictions, conflicts, visual citations, uncertainty, and follow-up checks — v1.0 (`REVW-01` to `REVW-04`).
- ✓ Allowlisted read-only access, Linux no-follow traversal, provenance, and sanitized failures — v1.0 (`SAFE-01` to `SAFE-04`).
- ✓ Replaceable DeepSeek provider integration and reproducible Docker/local deployment — v1.0 (`PROV-01`, `PROV-02`, `DEPL-01`, `DEPL-02`).

- ✓ Sourced incremental task baselines and current-artifact identification — Phase 12 (`CTX-01` to `CTX-03`), with directly usable references and synthetic evaluation.
- ✓ Continued authorized analysis with separate policy assessment and pre-read document-group exclusions — Phase 12 (`POL-01`, `POL-02`), within a trusted host-reader boundary.

- ✓ Repository Skill generates three portable stage prompts and executes bounded reviews with evidence matrices — Phase 13 (`SKL-01` to `SKL-03`), verified with synthetic inline trials.

- ✓ Source-backed template comparison/restoration handoff, contextual residue and truthful centralized disclosure checks — Phase 14 (`TPL-01` to `TPL-03`, `DIS-01`, `DIS-02`), verified with eight inline synthetic scenarios.

- ✓ Current-version finding lifecycle, action retirement and bounded final reports with connected synthetic workflow acceptance — Phase 15 (`REV-01` to `REV-03`), six inline groups and 18 actual collector steps.

- ✓ Reproducible official Skill validation and current offline runtime acceptance — Phase 16 (`VAL-01`, `VAL-02`); fresh build, 795 offline tests and separate 12-test baseline pass.

- ✓ Task-mapped retrospective records for Phases 12–15 and expanded audit closure — Phase 17 (`VAL-03` to `VAL-06`); 4/4 criteria and 17 original task mappings verified. Manual semantic automation remains PARTIAL.

### Active

No next milestone defined. All v1.1 requirements are archived and validated within their documented scope. Use `$gsd-new-milestone` for fresh requirements; retain deferred candidates below.

### Deferred

- Multi-provider comparison and disagreement surfacing (`REVW-05`).
- Incremental evidence indexing and cache reuse (`REVW-06`).
- General server-side policy configuration beyond this milestone's Skill workflow (`REVW-07`, partially addressed by v1.1).
- Optional authenticated multi-user access and audit log storage (`SAFE-05`).
- Automatic Codex invocation and cross-model usage/comparison statistics.

### Out of Scope

- Full autonomous assignment completion — EvidenceLens remains a reviewer and evidence layer.
- Broad filesystem indexing or unrestricted workspace access — explicit readable roots remain part of the security model.
- Automatic mutation of evidence or solution files — review stays read-only by default.
- A polished end-user UI — MCP clients remain the interaction surface.
- Foundation-model training or fine-tuning — providers remain replaceable integrations.

## Current State

Milestone **v1.1 complete, archived and published 2026-10-04**: six phases, 13 plans, 28 tasks, 22/22 requirements. Product version **0.2.4**, [published on GitHub](https://github.com/returdex/EvidenceLens-MCP/releases/tag/v0.2.4) after the user explicitly lifted the remote-history hold. [Completion record](milestones/v1.1-COMPLETION.md) is current authority for archive/release status; [requirements](milestones/v1.1-REQUIREMENTS.md) contain accepted outcomes.

Source-bound evidence includes Phase 16 official validator/control, successful build and 43-file/795-test offline pass, plus Phase 17 12 boundary tests and 57 actual collector steps. Semantic language judgments and audit interpretation remain manual; TD-12/13/14/15 coverage debt is accepted for closure, alongside inherited v1.0 debt. Historical host I/O root cause is unknown, preserved dependencies remain recoverable. Archival compatibility verification is recorded in the completion record. No real-coursework, installed discovery, universal host isolation or remote submission claim.

## Next Milestone Goals

Not yet committed. Previously discussed candidates include automatic Codex review invocation separated from work conversations, comparison/statistics, and the deferred features above. Define scope and fresh requirements before implementation; next phase number is 18. Product minor version changes when that new milestone is opened, not during this archival step.

## Context

At acceptance commit 8c2d391, tracked src/scripts/tests/Skill helper totalled 18,314 TS/MJS lines. v1.1 changed 102 files across 59 commits through acceptance (mostly planning/evidence); final close adds documentation and a narrow archival-compatible test snapshot. No runtime dependency, role/schema or provider behavior change is introduced by closeout.

## Constraints

- **Security**: Default operation is read-only and restricted to configured allowlisted directories.
- **Traceability**: Findings preserve source metadata needed to reproduce or inspect each claim.
- **Interoperability**: The service speaks MCP and returns stable JSON.
- **Multimodality**: The evidence pipeline preserves visual context in addition to extracted text.
- **Deployability**: Docker is a supported reproducible deployment path.

## Key Decisions and Outcomes

| Decision | Outcome |
|---|---|
| Keep independently traceable findings grounded in controlled evidence | Core value retained; MCP service remains reviewer/evidence layer |
| Separate continued authorized assistance from policy permission/compliance | Validated in sourced baseline and stage cases |
| Preserve template authority, legitimate comments and truthful centralized disclosure | Validated with source-backed handoffs; no automatic signing/editing |
| Default to actual current artifact and retire supported resolved findings | Validated with connected recheck cases; unknowns remain explicit |
| One Skill and existing gate; no new editor/provider platform | Delivered; automatic Codex integration remains future scope |
| Pin isolated developer validator prerequisite and preserve exact-lock dependencies | Official tooling and offline acceptance recovered; I/O root cause unknown |
| Separate record completion from automated semantic coverage | 22/22 requirements accepted with honest partial Nyquist fields |
| Preserve historical paths, paid proof and report bytes | Archives and source-bound evidence retained |
| Distinguish milestone v1.1 from product 0.2.4 and remote publication | User lifted history hold; main and both tags published, product v0.2.4 Release verified |

<details>
<summary>Previous project context and decisions</summary>

[Complete pre-close PROJECT snapshot](milestones/v1.1-PROJECT.md), [state/decision history](milestones/v1.1-STATE.md), and [v1.0 milestone](milestones/v1.0-ROADMAP.md) remain available. Historical snapshots keep their original date and evidence scope.

</details>

---
*Last updated: 2026-10-04 after v1.1 completion and product v0.2.4 publication*
