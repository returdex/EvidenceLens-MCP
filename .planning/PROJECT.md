# EvidenceLens MCP

## What This Is

EvidenceLens MCP is a shipped multimodal second-review service for Codex and other MCP clients. It gives an external model controlled, read-only access to local evidence—text, PDFs, images, screenshots, and tables—then returns structured, traceable findings about omissions, conflicts, and evidence quality.

The service supports deterministic offline review and a replaceable DeepSeek provider path. Docker deployment, strict provenance, sanitized failures, and a no-follow Linux filesystem boundary are part of the verified v1.0 product contract.

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

### Active

- [ ] Verification tooling and offline runtime recovery — Phase 16 (`VAL-01`, `VAL-02`).
- [ ] Retrospective validation and audit closure — Phase 17 (`VAL-03` to `VAL-06`).
- Original 16 functional requirements remain validated; six approved audit-closure obligations are pending.

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

## Context

- v1.0 shipped on 2026-09-24 after 11 phases, 39 plans, and 79 tasks.
- The implementation and validation surface contains 18,042 lines of TypeScript/JavaScript across `src/`, `scripts/`, and `tests/`.
- Current evidence includes a 795-test offline regression run, focused Linux traversal checks, Docker stdio/mount smoke checks, and an authenticated one-request DeepSeek proof bound to the certified Phase 10 source.
- Accepted debt is recorded in `milestones/v1.0-MILESTONE-AUDIT.md`: most phases lack Nyquist `VALIDATION.md`, two Phase 9 warnings remain, and the current-source provider path was verified offline rather than with a new paid request.
- The v1.0 product baseline was `0.1.3`. Milestone v1.1 opens the `0.2.0` development line under DEVELOPMENT.md; this is not a published release or a claim that v1.1 features already exist.

## Current State

Phases 12-15 verified: one repository Skill now covers sourced baselines, three stages, template/restoration handoff, contextual residue, truthful disclosure, current-version finding transitions and bounded final reports. Phase 15 passed six inline semantic groups/all variants, 18 actual collection steps, twelve boundary tests and prior 9/17-step collector regressions; standard inline review clean. All 16 phase requirements have evidence; milestone audit completed on 2026-10-04 with tech_debt: four missing Nyquist validation documents, unavailable official Skill validator and prior stalled broad build/runtime checks. No functional blocker was found. The user confirmed two closure phases (16 then 17) on 2026-10-04; both await detailed planning and execution. Development version 0.2.4; no new release, archive or remote sync. Global discovery/installation, automatic Codex/provider integration, real document editing/rendering and broader build/runtime checks from milestone initialization remain unverified.

## Current Milestone: v1.1 Assignment Prompt Adaptation and Staged Review

**Goal:** Turn a reusable user prompt and evolving assignment evidence into preparation, progress-review, and final-review workflows that advance work without losing source accuracy or overusing old versions.

**Target features:**
- One repository-managed Skill plus minimal reference templates and synthetic evaluation cases.
- A current-artifact baseline with source provenance, incremental clarification handling, and explicit access exclusions.
- Separate course-policy assessment from task progress: a course prohibition or unresolved policy does not by itself stop all user-authorized assistance, and continuing does not imply permission or compliance.
- Original-template preservation, restoration handoff, contextual draft-residue checks, and truthful disclosure in the required place without redundant labels throughout the work.
- Current-version findings, evidence-backed regression checks, and bounded final-review conclusions.

**Scope:** Phases 12–17; 16 completed functional requirements plus 6 approved verification-closure requirements. Keep MCP read-only. Use Skill-level planning when required review evidence is absent; do not fabricate a solution or teacher instruction to satisfy the existing four-role contract. Use existing host document tools for separately authorized corrections rather than adding an editing engine.

**Research:** Reuse the collected user workflow patterns; private course chats and coursework stay outside the public repository. No new ecosystem research or dependencies are required to define this milestone.

## Constraints

- **Security**: Default operation is read-only and restricted to configured allowlisted directories.
- **Traceability**: Findings preserve source metadata needed to reproduce or inspect each claim.
- **Interoperability**: The service speaks MCP and returns stable JSON.
- **Multimodality**: The evidence pipeline preserves visual context in addition to extracted text.
- **Deployability**: Docker is a supported reproducible deployment path.

## Key Decisions

Milestone v1.1 decisions confirmed through the planning conversation on 2026-10-03:
- AI-assisted progress is the default; task execution status and policy compliance status must remain distinct.
- Centralized disclosure must reflect known usage; no invented manual-only process or unsupported compliance claims.
- The original template remains authoritative for restoration, while policy statements are preserved even if a working copy omits their display.
- Current-version review is the default. Differences from an older version alone are not defects.
- Prior phase directories remain in place because proof tooling references their paths; historical artifacts are not cleared during initialization.


| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat EvidenceLens as an independent second reviewer | Keeps primary-agent reasoning and external evidence checking separate | ✓ Validated in v1.0 |
| Make read-only, allowlisted access the default | Reduces accidental disclosure and mutation risk | ✓ Validated in v1.0 |
| Use a model-provider adapter | Supports DeepSeek while preserving replacement options | ✓ Validated in v1.0 |
| Make provenance part of the finding contract | Enables auditability, merging, comparison, and final checks | ✓ Validated in v1.0 |
| Use MCP as the integration boundary | Gives compatible clients one stable service contract | ✓ Validated in v1.0 |
| Separate paid provider proof from routine regression | Preserves exact evidence and prevents accidental cost or replay | ✓ Validated in v1.0 |
| Bind live claims to exact source and immutable image identities | Keeps external evidence scoped to the code actually executed | ✓ Validated in v1.0 |

## Evolution

After each phase, move verified requirements to Validated, update invalidated assumptions and record decisions. At milestone completion, review the core value, scope, constraints and actual shipped capabilities. Preserve historical evidence and separate development intent from verified results.

---
*Last updated: 2026-10-04 after confirmed gap-closure phase creation*
