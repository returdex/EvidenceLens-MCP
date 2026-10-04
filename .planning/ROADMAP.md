# Roadmap: EvidenceLens MCP

## Milestones

- ✅ **v1.0 MVP** — Phases 1-11 (shipped 2026-09-24)
- 🚧 **v1.1 Assignment Prompt Adaptation and Staged Review** — Phases 12-17 (Phases 12-17 verified; residual manual coverage awaits disposition; development version 0.2.4)

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

- [x] **Phase 12: Task Baseline and Current Artifact Scope** — Sourced, incremental context and continued assistance with explicit access boundaries. (completed 2026-10-03)
- [x] **Phase 13: Reusable Skill and Stage Prompts** — One Skill for preparation, progress review and final review. (completed 2026-10-03)
- [x] **Phase 14: Template and Disclosure Review** — Original-template checks, restoration handoff, draft residue and accurate centralized disclosure. (completed 2026-10-03)
- [x] **Phase 15: Current-Version Recheck and Workflow Acceptance** — Retire resolved findings and verify the complete workflow using synthetic cases. (completed 2026-10-03)

- [x] **Phase 16: Verification Tooling and Offline Runtime Recovery** — Close official-validator and stalled offline build/test evidence debt. (completed 2026-10-04)
- [x] **Phase 17: Retrospective Validation and Audit Closure** — Fill Phase 12-15 validation records and re-audit the expanded milestone. (completed 2026-10-04)

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
**Plan count**: 2/2 complete; verified 2026-10-03.

Plans:
**Wave 1**
- [x] 12-01-PLAN.md — Baseline worksheet/workflow and bounded pre-read source gate.

**Wave 2** *(Wave 1 dependency satisfied)*
- [x] 12-02-PLAN.md — Synthetic workflow evaluation, targeted repairs and Phase 13 handoff.

### Phase 13: Reusable Skill and Stage Prompts

**Goal**: Users can generate and run bounded stage-specific reviews from one reusable Skill.
**Depends on**: Phase 12
**Requirements**: SKL-01, SKL-02, SKL-03
**Success Criteria**:
1. The same Skill produces distinct preparation, in-progress and final-review prompts from the baseline.
2. Preparation succeeds without a solution; MCP invocation only occurs with genuine required evidence and never uses fabricated roles.
3. Generated prompts state inputs, permitted actions, checks, evidence locations and expected outputs; prompt generation alone does not authorize execution or broader access.
4. A requested review yields a requirements-to-evidence matrix, explicit coverage limits and prioritized minimal actions within the existing authorization.
**Plan count**: 2/2 complete; verified 2026-10-03.

Plans:
**Wave 1**
- [x] 13-01-PLAN.md — Skill entrypoint and portable stage prompts.

**Wave 2** *(Wave 1 dependency satisfied)*
- [x] 13-02-PLAN.md — Synthetic prompt/review trials, targeted repairs and handoff.

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
**Plan count**: 2/2 complete; verified 2026-10-03.

Plans:
**Wave 1**
- [x] 14-01-PLAN.md — Template/restoration, contextual residue and disclosure checks wired into the existing Skill.

**Wave 2** *(Wave 1 dependency satisfied)*
- [x] 14-02-PLAN.md — Eight synthetic acceptance scenarios, observed repairs and Phase 15 handoff.

### Phase 15: Current-Version Recheck and Workflow Acceptance

**Goal**: Users can finish a review with current, bounded findings rather than repeated reminders about old drafts.
**Depends on**: Phase 14
**Requirements**: REV-01, REV-02, REV-03
**Success Criteria**:
1. Rechecking the current artifact classifies prior findings as still present, resolved, unverifiable or no longer applicable and removes resolved items from the current action list.
2. Regression reminders cite current evidence and an affected requirement; ordinary changes alone do not trigger warnings.
3. Final conclusions distinguish mandatory defects, rubric gaps, optional improvements and unknowns, and do not equate local readiness with remote submission.
4. Documented synthetic end-to-end cases cover preparation, incremental updates, template-restoration handoff and recheck without private coursework or paid provider calls.
**Plan count**: 2/2 complete; verified 2026-10-03.

Plans:
**Wave 1**
- [x] 15-01-PLAN.md — Current-version finding transitions, action retirement and bounded final-report routing.

**Wave 2** *(Wave 1 dependency satisfied)*
- [x] 15-02-PLAN.md — Connected synthetic workflow, recheck variants, observed repairs and milestone-audit handoff.

### Phase 16: Verification Tooling and Offline Runtime Recovery

**Goal**: Obtain reproducible official Skill-validation and current offline build/test results after diagnosing the existing environment limitations.
**Depends on**: Phase 15
**Requirements**: VAL-01, VAL-02
**Gap Closure**: TD-V and TD-B from [v1.1 audit](v1.1-MILESTONE-AUDIT.md); recommended verification debt, approved for closure on 2026-10-04.
**Success Criteria**:
1. The actual official Skill validator runs successfully against assignment-review with recorded interpreter, dependency provenance, command and output; the narrow fallback is not relabeled an official pass.
2. The earlier build/test stall is diagnosed using bounded observations; current `npm run build` and provider-disabled offline tests finish with recorded outcomes and source identity. Skips, failures and host constraints are explicit; unresolved required checks prevent closure.
3. Any repair addresses an observed cause, preserves dependency/runtime behavior unless a specific fix is justified, and retains exact-source historical paid-proof boundaries. No paid call or remote CI is used to fill local proof.
**Task groups**: 3 — validator environment and official run; bounded stall diagnosis and targeted repair; build/offline regression evidence and handoff.
**Plan count**: 2/2 complete; verified 2026-10-04. Official validator/control, fresh build and 795 offline tests plus separate 12-test baseline passed.

Plans:
**Wave 1**
- [x] 16-01-PLAN.md — Isolated official Skill validator environment and actual validation evidence.

**Wave 2** *(complete)*
- [x] 16-02-PLAN.md — Bounded runtime diagnosis/recovery, current build/offline tests and validation handoff.

**Cross-cutting constraints:** D-01 scoped debt closure; D-02 minimal observed-cause repairs; D-03 honest automated/manual/failure coverage; D-04 bounded processes and no paid/remote activity; D-05 evidence-backed validation; D-06 version/sync/auto-advance boundaries.

### Phase 17: Retrospective Validation and Audit Closure

**Goal**: Provide honest, task-mapped validation records for Phases 12-15 and reconcile the milestone audit using actual Phase 16/17 evidence.
**Depends on**: Phase 16
**Requirements**: VAL-03, VAL-04, VAL-05, VAL-06
**Gap Closure**: TD-12, TD-13, TD-14, TD-15 from [v1.1 audit](v1.1-MILESTONE-AUDIT.md); recommended verification debt, approved for closure on 2026-10-04.
**Success Criteria**:
1. Each original phase has its own `NN-VALIDATION.md` mapping original tasks/requirements to actual behavioral checks, commands, evidence and sign-off, preserving historical reports.
2. Existing meaningful tests are reused; only demonstrated coverage gaps justify additions. Language judgments remain explicitly manual/inline where not automatically established; headings or expected prose alone are not semantic tests.
3. Nyquist fields reflect actual coverage. Manual-only or unavailable checks remain visible and cannot become `nyquist_compliant: true` merely because files now exist. Residual debt is retained for explicit disposition.
4. The expanded milestone is re-audited against original 16 functional requirements plus 6 approved validation requirements; TD-V/TD-B closure is checked against Phase 16, all six debt IDs are reconciled, and any remaining gaps stay open. Validation for Phases 16/17 is planned alongside their execution to avoid recreating missing-document debt.
**Task groups**: 3 — reconstruct four task/evidence maps; run meaningful checks and complete validation records; re-audit and synchronize final status.
**Plan count**: 3/3 complete; verified 2026-10-04, four record requirements and 4/4 success criteria.

Plans:
**Wave 1**
- [x] 17-01-PLAN.md — Phase 12/13 task-mapped retrospective validation and source-bound checks.

**Wave 2** *(depends on Wave 1 evidence)*
- [x] 17-02-PLAN.md — Phase 14/15 template/disclosure and current-version validation records.

**Wave 3** *(depends on Waves 1–2 acceptance)*
- [x] 17-03-PLAN.md — Expanded 22-requirement/six-debt re-audit, Phase 17 validation and truthful state handoff.

**Cross-cutting constraints:** D-01 scoped six-debt closure; D-02 reuse meaningful tests; D-03 explicit automated/manual/unknown coverage; D-04 bounded offline checks and immutable historical evidence; D-05 actual validation and post-verification reconciliation; D-06 version 0.2.4, remote hold and no publication/auto-advance.

## Progress

| Milestone | Phases | Plans | Requirements | Status | Shipped |
|-----------|--------|-------|--------------|--------|---------|
| v1.0 MVP | 11/11 | 39/39 | 20/20 | Complete | 2026-09-24 |
| v1.1 Assignment Prompt Adaptation and Staged Review | 6/6 | 13/13 | 22/22 | Locally verified; residual debt disposition pending | — |

## Deferred Work

- Automatic Codex invocation, multi-provider comparison and usage statistics (`REVW-05`).
- Incremental evidence indexing and cache reuse (`REVW-06`).
- General server-side policy configuration (`REVW-07`); v1.1 addresses the Skill workflow only.
- Optional authenticated multi-user access and audit logs (`SAFE-05`).
- Accepted v1.0 debt: missing Nyquist validation files outside Phase 9 and Phase 9 warnings WR-01/WR-02.

## Initialization Decisions

- The reviewed four-phase scope is retained with the user's 2026-10-03 correction: continued AI assistance is the default, and policy assessment is a separate dimension.
- Research uses existing workflow evidence; no additional ecosystem research is needed for this milestone definition.
- Prior phase directories remain at their original paths because proof scripts and tests reference them. The destructive GSD `phases.clear` operation is intentionally not used. Original feature scope covers Phases 12-15; approved verification closure extends active accounting through Phase 17.
- `0.2.0` is the development version for this milestone, not a published release or a completion claim.

---
*Last updated: 2026-10-04 after Phase 17 verification and audit reconciliation*

Current audit: [v1.1-MILESTONE-REAUDIT.md](v1.1-MILESTONE-REAUDIT.md) — 22 requirement rows, six debt dispositions, six integration links and six flows. Phase 17 verifier passed 4/4; manual semantic coverage stays PARTIAL/tech_debt. [Original 16-requirement snapshot](v1.1-MILESTONE-AUDIT.md) preserved. Phase 16 closes TD-V/TD-B; Phase 17 resolves four missing-record components. No archive/publication/remote sync.
