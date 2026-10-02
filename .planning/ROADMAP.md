# Roadmap: EvidenceLens MCP

## Milestones

- ✅ **v1.0 MVP** — Phases 1-11 (shipped 2026-09-24)
- 🚧 **v1.1 Assignment Prompt Adaptation and Staged Review** — Phases 12-15 (planning; development version 0.2.0)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-11) — SHIPPED 2026-09-24</summary>

- [x] Phase 1: MCP Contract and Skeleton (2/2 plans) — completed 2026-08-21
- [x] Phase 2: Evidence Ingestion and Multimodal Context (4/4 plans) — completed 2026-08-22
- [x] Phase 3: Read-Only Filesystem Boundary (3/3 plans) — completed 2026-08-22
- [x] Phase 4: Review Orchestration and Findings (3/3 plans) — completed 2026-08-22
- [x] Phase 5: Provider Adapter and DeepSeek Integration (3/3 plans) — completed 2026-08-23
- [x] Phase 6: Docker Deployment and End-to-End Validation (2/2 plans) — completed 2026-08-23
- [x] Phase 7: DeepSeek Vision Provenance Closure (1/1 plan) — completed 2026-08-25
- [x] Phase 8: Docker Runtime Verification Closure (1/1 plan) — completed 2026-08-25
- [x] Phase 9: Public Provider Attribution and Determinism Contract (9/9 plans) — completed 2026-09-05
- [x] Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E (9/9 plans) — completed 2026-09-22
- [x] Phase 11: Linux Filesystem Traversal Hardening (2/2 plans) — completed 2026-09-22

</details>

Full phase definitions, dependencies, plans, and cross-cutting constraints are archived in [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md).

## v1.1 Active Phases

- [ ] **Phase 12: Task Baseline and Current Artifact Scope** — Sourced, incremental context and continued assistance with explicit access boundaries.
- [ ] **Phase 13: Reusable Skill and Stage Prompts** — One Skill for preparation, progress review and final review.
- [ ] **Phase 14: Template and Disclosure Review** — Original-template checks, restoration handoff, draft residue and accurate centralized disclosure.
- [ ] **Phase 15: Current-Version Recheck and Workflow Acceptance** — Retire resolved findings and verify the complete workflow using synthetic cases.

### Phase 12: Task Baseline and Current Artifact Scope

**Goal**: Users can maintain a sourced assignment baseline, designate the current artifact and continue AI-assisted work while policy assessment and explicit access restrictions remain clear.
**Depends on**: Phase 11
**Requirements**: CTX-01, CTX-02, CTX-03, POL-01, POL-02
**Success Criteria**:
1. A user with incomplete materials or no solution receives a usable baseline with sourced requirements, preferences, conflicts and gaps.
2. A new clarification updates only affected baseline decisions and explains what changed.
3. The current artifact is identified from the user's scope and actual inspected material; old versions do not silently become grading targets.
4. Restrictive, unknown or conflicting course policy is reported independently while authorized work continues; continuation is never labeled as proof of permission or compliance.
5. Explicitly excluded content stays outside model processing or is skipped with a visible coverage limit while remaining work continues.
**Plan count**: 2; ready to execute.

Plans:
**Wave 1**
- [x] 12-01-PLAN.md — Baseline worksheet/workflow and bounded pre-read source gate.

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 12-02-PLAN.md — Synthetic workflow evaluation, targeted repairs and Phase 13 handoff.

### Phase 13: Reusable Skill and Stage Prompts

**Goal**: Users can generate and run bounded stage-specific reviews from one reusable Skill.
**Depends on**: Phase 12
**Requirements**: SKL-01, SKL-02, SKL-03
**Success Criteria**:
1. The same Skill produces distinct preparation, in-progress and final-review prompts from the baseline.
2. Preparation succeeds without a solution; MCP invocation only occurs with genuine required evidence and never uses fabricated roles.
3. Generated prompts state inputs, permitted actions, checks, evidence locations and expected outputs; prompt generation alone does not authorize execution or broader access.
4. A requested review yields a requirements-to-evidence matrix, explicit coverage limits and prioritized minimal actions within the existing authorization.
**Plans**: TBD.

### Phase 14: Template and Disclosure Review

**Goal**: Users can keep the final work clean and template-consistent while preserving accurate statements of AI use.
**Depends on**: Phase 13
**Requirements**: TPL-01, TPL-02, TPL-03, DIS-01, DIS-02
**Success Criteria**:
1. Original-template identity is preserved and differences are classified as required structure, normal completion, necessary additions or optional formatting changes.
2. Missing structure produces a source-backed restoration checklist/handoff; missing original text and factual declarations remain unresolved rather than being invented, signed or affirmed.
3. Draft-residue review identifies contextual defects while retaining required disclosures, original instructions and experimental AI material.
4. Work records, assignment content and the required disclosure location are separated without unsupported repeated AI labels.
5. Disclosure contradictions and incomplete records are surfaced accurately; no unsupported AI percentage or manual-only provenance is generated.
**Plans**: TBD.

### Phase 15: Current-Version Recheck and Workflow Acceptance

**Goal**: Users can finish a review with current, bounded findings rather than repeated reminders about old drafts.
**Depends on**: Phase 14
**Requirements**: REV-01, REV-02, REV-03
**Success Criteria**:
1. Rechecking the current artifact classifies prior findings as still present, resolved, unverifiable or no longer applicable and removes resolved items from the current action list.
2. Regression reminders cite current evidence and an affected requirement; ordinary changes alone do not trigger warnings.
3. Final conclusions distinguish mandatory defects, rubric gaps, optional improvements and unknowns, and do not equate local readiness with remote submission.
4. Documented synthetic end-to-end cases cover preparation, incremental updates, template-restoration handoff and recheck without private coursework or paid provider calls.
**Plans**: TBD.

## Progress

| Milestone | Phases | Plans | Requirements | Status | Shipped |
|-----------|--------|-------|--------------|--------|---------|
| v1.0 MVP | 11/11 | 39/39 | 20/20 | Complete | 2026-09-24 |
| v1.1 Assignment Prompt Adaptation and Staged Review | 0/4 | 0/2 planned so far | 0/16 | Phase 12 ready to execute | — |

## Deferred Work

- Automatic Codex invocation, multi-provider comparison and usage statistics (`REVW-05`).
- Incremental evidence indexing and cache reuse (`REVW-06`).
- General server-side policy configuration (`REVW-07`); v1.1 addresses the Skill workflow only.
- Optional authenticated multi-user access and audit logs (`SAFE-05`).
- Accepted v1.0 debt: missing Nyquist validation files outside Phase 9 and Phase 9 warnings WR-01/WR-02.

## Initialization Decisions

- The reviewed four-phase scope is retained with the user's 2026-10-03 correction: continued AI assistance is the default, and policy assessment is a separate dimension.
- Research uses existing workflow evidence; no additional ecosystem research is needed for this milestone definition.
- Prior phase directories remain at their original paths because proof scripts and tests reference them. The destructive GSD `phases.clear` operation is intentionally not used. Active milestone accounting covers Phases 12-15 only.
- `0.2.0` is the development version for this milestone, not a published release or a completion claim.

---
*Last updated: 2026-10-03 after Phase 12 planning*
