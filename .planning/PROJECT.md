# EvidenceLens MCP

## What This Is

A controlled read-only evidence-review service with one shared assignment-review Skill and six installed stage/utility entry Skills. Ordinary review uses one DeepSeek and one Codex independent reviewer with source-backed host comparison; explicit single-provider review remains supported. Preparation, progress, final and recheck preserve the designated current artifact, full feedback, source limitations and truthful disclosure. Help/export/inspection do not launch review.

## Core Value

Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.

## Current State

Milestone **v1.2 complete 2026-10-05**, product **0.3.17**, release preparation in progress. Phases 18–21: 4 phases, 21 plans, 44 tasks, 21/21 requirements. [Completion authority](milestones/v1.2-COMPLETION.md), [audit](v1.2-MILESTONE-AUDIT.md), [archived requirements](milestones/v1.2-REQUIREMENTS.md). Earlier milestones and phase reports retain their original source/host/proof scopes.

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

### Active

None selected. Start the next milestone with fresh requirements; no automatic v1.3 scope or version bump.

### Deferred

Three partial Nyquist/manual-semantic entries (Phases 18–20); DeepSeek generic show Markdown provider-model display (full receipt retains fields); [RR-01–08](REVIEW-REVISIONS.md) and [FM-01–06](notes/2026-10-05-review-quality-future.md). These remain non-blocking and are not closed by source/JSON checks. General disagreement-quality evaluation, repeated blind cases, criterion grade contracts, A1.3 semantic evaluation and missing Claude evidence remain future work. Incremental indexing, general server policy configuration and optional multi-user access remain unselected.

### Out of Scope

Autonomous assignment writing/editing/signing/submission, unrestricted indexing, a new credential/OAuth service, automatic inference retries/model substitutions, account-wide quota/cost analytics and a polished UI. Historical Docker/paid-provider receipts are not renewed at closure.

## Context and Constraints

Current tracked TS/MJS source/tests/helpers: 21,454 lines across 132 files at a6ab604. Existing TypeScript MCP and DeepSeek runtime plus stdlib Node Skill helpers; no new runtime dependency during closing. Private immutable prompt/result/metrics/annotation records stay outside Git with explicit task/conversation/run identity and conservative manual retention. Evidence is selected before read, then locally bound by excerpt identity/hash/UTF-8 range. Codex manages authentication; strict timeout/cancel/tool/context and result-validation boundaries remain. Model selection, schema validity and agreeing reviewers do not establish semantic accuracy.

## Key Decisions and Outcomes

| Decision | Outcome |
|---|---|
| One shared Skill with six fixed entry commands | Good: installed graph and actual cross-project receipts |
| Capture before dispatch and export exact latest attempt | Good: immutable bytes and no silent old-success fallback |
| Codex-owned ChatGPT login and sealed independent context | Good within pinned host scope; no new auth service |
| Default full reports, retaining every info/Low finding | Good: complete same-run records and optional requested summary |
| Separate host assessment from raw model findings | Good: source-bound closing, deferral and action retirement; semantics still manual |
| Ordinary DeepSeek/Codex pair with explicit one-provider override | Good: independent captures/results; accuracy gain not measured |
| Truthful event usage and requested/reported model split | Good: missing is unavailable, no billing estimates |
| Preserve original proof and phase paths | Good: exact snapshots/audit copies; no paid replay |
| Semantic automation and deeper quality evaluation | Revisit: retained Nyquist/RR/FM debt |

## Next Milestone Goals

Not selected. Review the retained debt and future memo with the user during gsd-new-milestone; do not promote them automatically. Continue phase numbering after 21.

<details>
<summary>Previous project context and decisions</summary>

[Exact pre-close v1.2 PROJECT snapshot](milestones/v1.2-PROJECT.md), [state snapshot](milestones/v1.2-STATE.md), [v1.1 PROJECT](milestones/v1.1-PROJECT.md) and [milestone ledger](MILESTONES.md). Snapshot links retain their original .planning/ base; original bytes also remain at a6ab604.

</details>

---
*Last updated: 2026-10-05 after v1.2 milestone completion.*
