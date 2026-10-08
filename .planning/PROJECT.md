# EvidenceLens MCP

## What This Is

A controlled read-only evidence-review service with one shared assignment-review Skill and seven installed stage/settings/utility entry Skills. Default review uses one Codex and full output with zero automatic retries; explicit Codex+DeepSeek selection produces source-backed host comparison with complete originals and transparent failure/disagreement states. Preparation, progress, final and recheck preserve the designated current artifact, full feedback, source limitations and truthful disclosure. Help/export/inspection do not launch review.

## Core Value

Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.

## Current State

Milestone **v1.3 locally complete 2026-10-09**, 20/20 requirements, Phases22–27. [v1.3 completion](milestones/v1.3-COMPLETION.md), [scoped evaluation](../docs/research/evaluation-results-v1.3.md), [audit](milestones/v1.3-MILESTONE-AUDIT.md). Product remains **[0.3.17 published](https://github.com/returdex/EvidenceLens-MCP/releases/tag/v0.3.17)**. Phases 18–21: 4 phases, 21 plans, 44 tasks, 21/21 requirements. [Completion authority](milestones/v1.2-COMPLETION.md), [audit](v1.2-MILESTONE-AUDIT.md), [archived requirements](milestones/v1.2-REQUIREMENTS.md). Earlier milestones and phase reports retain their original source/host/proof scopes.

Actual authorized synthetic initial/recheck Codex pair succeeded with exact exports and reported CLI token provenance. Separate A4 DeepSeek/Codex evidence is recorded, not repeated here. Inline host semantic judgments and source binding do not certify grade bands, submission, universal model accuracy or other platforms. Supported actual boundary is the pinned macOS arm64 CLI/Skill host; GUI selector observation is unavailable.

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

- ✓ Six installed command entries, shared fixed-stage routing, conservative installation, complete help and actual cross-project synthetic host acceptance — Phase 18 (`CMD-01` to `CMD-05`); product 0.3.1, fresh build/118 affected tests/21 Node tests. Prompt capture was unavailable at the Phase 18 baseline.

- ✓ Immutable task/conversation-scoped pre-review capture, exact `$el-prompt` export, truthful latest/failure states and private retention/deletion — Phase 19 (`PRM-01` to `PRM-05`), product 0.3.2; four actual current-host synthetic stage flows, fresh build/118 affected tests/51 Node tests.

- ✓ Bounded independent Codex adapter, Codex-owned login, actual pinned macOS isolation, once-only dispatch and locally validated source-bound results — Phase 20 (`CDX-01` to `CDX-06`), product 0.3.3; fresh build/118 affected tests/157 Node tests. Phase 20 records its historical local/host scope; Phase 21 adds separately authorized live acceptance.


- ✓ Complete default feedback, source-bound host requirement/finding annotations, current actions and actual run/model/usage records — Phase 21 / v1.2 (RUN-01–05); explicitly authorized successful synthetic live pair and scoped host semantics.

- ✓ Four-stage source/current-aware prompts and exact exports with official criterion/band instructions and separate minimum/planning goals — v1.3 (PPT-01–03, BND-01–02); actual outputs still require host semantic correction.
- ✓ Bounded compatibility, full original reply/conversion retention and reliable single/partial-dual delivery — v1.3 (OUT-01–04).
- ✓ Exhaustive full feedback and source-linked host synthesis decisions retaining minority/info/unknowns — v1.3 (FBK-01–03).
- ✓ Verified selected cases, frozen source-only actual old/new matrix and post-seal tutor/source adjudication — v1.3 (EVA-01–04); immutable old Codex unavailable, historical/visual scope excluded, no general quality-gain claim.
- ✓ `$el-settings` project/user/instruction precedence with conservative defaults and consistent eight installed entries — v1.3 (CFG-01–04).

### Active

None. Next milestone not selected.

### Deferred

Three partial Nyquist/manual-semantic entries (Phases 18–20); DeepSeek generic show Markdown provider-model display (full receipt retains fields); [RR-01–08](REVIEW-REVISIONS.md) and [FM-01–06](notes/2026-10-05-review-quality-future.md). These remain non-blocking and are not closed by source/JSON checks. General disagreement-quality automation, repeated fresh blind cases, tutor-equivalent visual/course evaluation, A1.3 original feedback recovery and missing Claude evidence remain future work. Broad offline proof-harness regression did not complete at local Git clone and one timeout; affected review contracts/build and selected failed-test replay pass. Phase22/23 formal Nyquist documents remain missing; Phase27 manual semantic assurance remains partial. Incremental indexing, general server policy configuration and optional multi-user access remain unselected.

### Out of Scope

Autonomous assignment writing/editing/signing/submission, unrestricted indexing, a new credential/OAuth service, automatic inference retries/model substitutions, account-wide quota/cost analytics and a polished UI. Historical Docker/paid-provider receipts are not renewed at closure.

## Context and Constraints

Current implementation retains the existing TypeScript MCP and DeepSeek runtime plus stdlib Node Skill helpers; no new runtime dependency during closing. Private immutable prompt/result/metrics/annotation records stay outside Git with explicit task/conversation/run identity and conservative manual retention. Evidence is selected before read, then locally bound by excerpt identity/hash/UTF-8 range. Codex manages authentication; strict timeout/cancel/tool/context and result-validation boundaries remain. Model selection, schema validity and agreeing reviewers do not establish semantic accuracy.

## Key Decisions and Outcomes

| Decision | Outcome |
|---|---|
| One shared Skill with six fixed entry commands | Good: installed graph and actual cross-project receipts |
| Capture before dispatch and export exact latest attempt | Good: immutable bytes and no silent old-success fallback |
| Codex-owned ChatGPT login and sealed independent context | Good within pinned host scope; no new auth service |
| Default full reports, retaining every info/Low finding | Good: complete same-run records and optional requested summary |
| Separate host assessment from raw model findings | Good: source-bound closing, deferral and action retirement; semantics still manual |
| SingleCodex/full/no retry default, explicit dual selection | Good: installed defaults and actual complete pair; no measured accuracy gain |
| Truthful event usage and requested/reported model split | Good: missing is unavailable, no billing estimates |
| Preserve original proof and phase paths | Good: exact snapshots/audit copies; no paid replay |
| Semantic automation and deeper quality evaluation | Revisit: retained Nyquist/RR/FM debt |

## Completed Milestone: v1.3 提示词、反馈质量与可配置审阅

**Goal:** Make staged reviews usable, complete and evidence-grounded, with configurable reviewers and feedback-withheld evaluation of advice and grade-band judgments.

**Target features:** Four-stage prompt repair; bounded output compatibility and failure diagnostics; complete merged feedback with retained disagreements and original reports; criterion-level band assessment; reproducible tuning/held-out evaluation; `$el-settings`.

**Confirmed defaults:** One Codex reviewer, full response, no automatic retry. Multi-reviewer selection produces a combined assessment with agreements, unique findings, disagreements, unresolved items and linked full reports. Per-call explicit instruction overrides project settings, which override user defaults. Settings live in configuration rather than edits to Skill prose.

**Grade goals:** Minimum acceptable band and optional planning target are distinct. A P request does not silently become D; D planning is an opt-in margin, not a guarantee of passing. Official rubric wording and mandatory gates remain authoritative.

**Evaluation:** Verified selected tuning FIT5137 A2 and separately frozen FIT5046 A2 original assessed versions, official standards and evaluator-only feedback. Original A1.3 marking screenshot remains unavailable. Four original formal positions retain actual failures; repair regression is separately planned/seen. All63 valid paired findings retained with source-backed host judgments; actual unsupported claims and tutor-covered material exclusions remain visible. Original case outputs/feedback stay private, no grades promised. Historical preparation/in_progress/recheck NOT_COVERED; current helper stage behavior locally tested.

**Planning boundaries:** Continue phase numbering at 22. Ecosystem research is skipped using the existing default; implementation/failure investigation remains required. Product version remains0.3.17; no remote publication at local completion. Historical phase directories and receipts remain at their original paths, as required by the recorded preservation decision. RR/FM items close only with new evidence; no blanket debt closure.

## Evolution

At phase transitions, move verified requirements to Validated, record invalidated or new requirements and update decisions and project context. At milestone completion, review all sections, the Core Value and deferred/out-of-scope items against actual evidence.

<details>
<summary>Previous project context and decisions</summary>

[Exact pre-close v1.2 PROJECT snapshot](milestones/v1.2-PROJECT.md), [state snapshot](milestones/v1.2-STATE.md), [v1.1 PROJECT](milestones/v1.1-PROJECT.md) and [milestone ledger](MILESTONES.md). Snapshot links retain their original .planning/ base; original bytes also remain at a6ab604.

</details>

---
*Last updated: 2026-10-09 after v1.3 local completion and full project evolution review.*
