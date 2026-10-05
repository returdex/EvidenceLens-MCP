# Roadmap: EvidenceLens MCP

## Milestones

- ✅ [v1.0 MVP](milestones/v1.0-ROADMAP.md) — Phases 1–11, historical completed milestone.
- ✅ [v1.1 Assignment Prompt Adaptation and Staged Review](milestones/v1.1-ROADMAP.md) — Phases 12–17, product v0.2.4 published.
- ◆ **v1.2 快捷指令与 Codex 独立审阅** — Phases 18–21; development product 0.3.3, not released.

## Approval State

The user explicitly approved all 21 requirements and this four-phase roadmap on 2026-10-04. Phase 18 completed all four plans and CMD-01–05 on 2026-10-05; six installed commands and corrected help were accepted in a dedicated FIT5032 synthetic chat. Phase 19 completed PRM-01–05 and its five plans on 2026-10-05, including actual installed-host synthetic capture/export acceptance. Phase 20 completed six plans and CDX-01–06 on 2026-10-05 with actual OS/CLI/login controls and synthetic protocol outcomes; live inference remains Phase 21. Original phase directories and audit/proof snapshots remain in place.

## Phases

- [x] **Phase 18: Discoverable Stage Commands** — 命令入口与安装。 (completed 2026-10-05)
- [x] **Phase 19: Captured Task Prompts and Export** — 提示词记录与导出。 (completed 2026-10-05)
- [x] **Phase 20: Bounded Independent Codex Execution** — Codex 独立执行。 (completed 2026-10-05)
- [ ] **Phase 21: Review Handoff and Usage Acceptance** — 结果回传与用量验收。

## Phase Details

### Phase 18: Discoverable Stage Commands

**Goal**: 用户在实际作业项目中发现并明确调用固定阶段功能。
**Depends on**: Phase 17 (completed baseline)
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, CMD-05
**Success Criteria**:
1. 六个入口在目标宿主安装后可发现，并有另一个项目中的发现/调用证据。
2. 四个阶段调用选择准确，用户当前稿和重点被保留；帮助与导出不会触发审阅。
3. 缺材料场景继续有依据的工作并明确未知项，既有基线/模板/披露/复查规则保持一致。

**Plans**: 4/4 complete; verified in 18-VERIFICATION.md.

**Wave 1**

- [x] 18-01-PLAN.md — Six entry Skills and shared command routing.
**Wave 2** *(complete)*

- [x] 18-02-PLAN.md — Safe local installation and accurate command help.
**Wave 3** *(complete)*

- [x] 18-03-PLAN.md — Synthetic behavior and actual cross-project host acceptance.
**Wave 4** *(complete)*

- [x] 18-04-PLAN.md — Completed feature patch and affected offline regression verification.

**Cross-cutting constraints:**

- Users retain current-artifact and evidence boundaries; help/export never dispatch review.

### Phase 19: Captured Task Prompts and Export

**Goal**: 用户能导出同一任务/对话最近一次运行实际捕获的提示词。
**Depends on**: Phase 18
**Requirements**: PRM-01, PRM-02, PRM-03, PRM-04, PRM-05
**Success Criteria**:
1. 派发前产生关联 run ID 的不可变提示词；导出原文与派发载荷一致，后续文件改变不改写原快照。
2. 重复导出不调用模型；无记录、损坏、最新运行失败和并发任务有明确且不串用的行为。
3. 原文与导出说明分离，跨对话材料缺口明确；本地存储、保留和删除说明可用且无敏感内容进入 Git。

**Plans**: 5/5 complete; 3/3 goal criteria verified in 19-VERIFICATION.md.

**Wave 1** *(complete)*

- [x] 19-01-PLAN.md — Strict prompt contract and private immutable run store.
**Wave 2** *(complete)*

- [x] 19-02-PLAN.md — Installed dispatch/export CLI and scoped retention/deletion.
**Wave 3** *(complete)*

- [x] 19-03-PLAN.md — Four-stage capture wiring and actual el-prompt export entry.
**Wave 4** *(complete)*

- [x] 19-04-PLAN.md — Fault/concurrency tests and installed current-host synthetic acceptance.
**Wave 5** *(complete)*

- [x] 19-05-PLAN.md — Accepted feature patch and fresh targeted regression closure.

**Cross-cutting constraints:**

- Only approved task-facing content is captured; exports never regenerate or fall back to an older run.

### Phase 20: Bounded Independent Codex Execution

**Goal**: 用户可复用 Codex 登录，在实际受限的独立上下文完成可判定状态的审阅。
**Depends on**: Phase 19
**Requirements**: CDX-01, CDX-02, CDX-03, CDX-04, CDX-05, CDX-06
**Success Criteria**:
1. 安装/版本/登录预检可区分缺失和可用；复用 Codex 自管认证，不复制凭据或隐式切换计费路径。
2. 执行使用捕获的任务提示词；排除材料、作业写入、继承工具绕过和递归调用的防护有目标宿主证据。
3. 失败、取消、超时和结果不确定都有终态及进程清理，无自动再次发送。
4. 成功需运行终态、输出结构和本地来源绑定共同支持；伪造来源或部分结果不能冒充通过。

**Plans**: 6/6 complete; 4/4 goal criteria and CDX-01–06 verified in [20-VERIFICATION.md](phases/20-bounded-independent-codex-execution/20-VERIFICATION.md). Plan 02 R1 compatibility gate passed ([evidence](phases/20-bounded-independent-codex-execution/20-ISOLATION-EVIDENCE.md)); planning checked in [20-PLAN-CHECK.md](phases/20-bounded-independent-codex-execution/20-PLAN-CHECK.md). 12 tasks, six sequential waves.

**Wave 1**

- [x] 20-01-PLAN.md — Evidence capsule, structured contract and truthful Codex preflight.

**Wave 2** *(depends on Wave 1)*

- [x] 20-02-PLAN.md — Actual binary compatibility and macOS whole-process isolation.

**Wave 3** *(depends on Wave 2)*

- [x] 20-03-PLAN.md — Compatible lifecycle, once-only dispatch and bounded cancellation.

**Wave 4** *(depends on Wave 3)*

- [x] 20-04-PLAN.md — Local result binding and four-stage installed command wiring.

**Wave 5** *(depends on Wave 4)*

- [x] 20-05-PLAN.md — Adversarial protocol and actual target-host acceptance.

**Wave 6** *(depends on Wave 5)*

- [x] 20-06-PLAN.md — Accepted feature patch and fresh scoped regression closure.

**Cross-cutting constraints:**

- Only certified isolated execution consumes the captured prompt; no automatic retry or source-scope expansion.
- Existing login remains Codex-owned; production never copies credentials or chooses an API-key route.
- Native sandbox probe did not enforce expected boundaries on this host. Approved R1 outer Seatbelt/tool/auth/retry controls passed before command enablement.
- Synthetic protocol/real host checks remain separate from Phase 21 authorized real inference and usage acceptance.


### Phase 21: Review Handoff and Usage Acceptance

**Goal**: 用户完成独立审阅→完整分析回传→提示词导出→新版本复查的闭环，并查看真实调用记录。
**Depends on**: Phase 20
**Requirements**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05
**Success Criteria**:
1. 作业对话得到与运行关联的证据矩阵、覆盖限制和最小行动，原始过程事件不淹没主对话。
2. 复查用当前证据关闭/保留问题，已解决行动退出清单，无依据的版本差异不报回归。
3. 调用记录含状态和耗时；可得模型及 token 值有来源/范围，缺值不填零、不推算账单。
4. 完整流程有合成负例、目标宿主发现和获授权真实 Codex 运行证据；缺任何一层就明确保留验收缺口。

**Plans**: 0/6 complete; six sequential plans / 13 tasks checked in [21-PLAN-CHECK.md](phases/21-review-handoff-and-usage-acceptance/21-PLAN-CHECK.md).

**Planning revision (2026-10-05):** Read [21-PLANNING-INPUT](phases/21-review-handoff-and-usage-acceptance/21-PLANNING-INPUT.md). H-01–04 refine RUN-01/02/05: preserve access to every validated finding in concise handoff, separate execution success from band/submission claims, distinguish deferred action from resolved findings, and test those boundaries with source-bound synthetic results. Larger semantic-review changes remain in the [non-blocking future memo](notes/2026-10-05-review-quality-future.md); completed phases have [revision reminders](REVIEW-REVISIONS.md) without reopening their status. Phase 21 is planned and ready to execute, with no new phase dependency.

**Wave 1**

- [x] 21-01-PLAN.md — Terminal usage and private metrics retention.

**Wave 2** *(depends on Wave 1)*

- [x] 21-02-PLAN.md — Coherent run inspection and complete-finding handoff.

**Wave 3** *(depends on Wave 2)*

- [x] 21-03-PLAN.md — Host assessment binding and current-action recheck.

**Wave 4** *(depends on Wave 3)*

- [ ] 21-04-PLAN.md — Installed helper and four-stage command wiring.

**Wave 5** *(depends on Wave 4)*

- [ ] 21-05-PLAN.md — Synthetic, installed-host and authorized real acceptance.

**Wave 6** *(depends on Wave 5)*

- [ ] 21-06-PLAN.md — Accepted feature patch and scoped verification.

**Cross-cutting constraints:**

- Preserve immutable prompt/model/result contracts; bind optional local sidecars and show missing metadata truthfully.
- Complete finding IDs remain accessible; no automatic grade/submission claims or resolved state from deferral.
- No automatic real resend, auth mutation, new chat or private case transmission; actual acceptance is distinct from synthetic proof.
- RR/FM reminders remain non-blocking. No implementation or product patch is claimed by planning.

## Progress

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| 18. Discoverable Stage Commands | 4/4 | Complete | 2026-10-05 |
| 19. Captured Task Prompts and Export | 5/5 | Complete    | 2026-10-05 |
| 20. Bounded Independent Codex Execution | 6/6 | Complete | 2026-10-05 |
| 21. Review Handoff and Usage Acceptance | 3/6 | In Progress|  |

## Coverage and Research

21/21 requirements mapped exactly once; no dropped functional requirement. [Requirements](REQUIREMENTS.md) and [research summary](research/SUMMARY.md) contain scope and source evidence. Phase 20 targeted research and checked plans now define invocation/auth/sandbox design and the required compatibility gate; Phase 19 resolves storage/identity semantics. New live validation is bounded and requires its applicable authorization; historical paid proof is not replayed.

## Deferred Work

Multi-provider comparison, aggregate statistics, incremental indexing, general policy configuration and optional multi-user support remain deferred. Accepted v1.0/v1.1 validation debt remains historical and visible in [v1.1 completion](milestones/v1.1-COMPLETION.md).


**Complete-feedback revision (2026-10-05):** The user explicitly rejects default shortening. Phase 21 handoff now defaults to complete analysis, evidence and actions; only user-requested summaries accompany an accessible full report. Product baseline 0.3.12 after the shared Skill/capture correction; next accepted phase patch 0.3.13. A user-authorized three-reviewer A4 experiment is exploratory and does not close the pending phase or expand normal single-review dispatch.


**Default-selection update (2026-10-05):** User selects three independent Codex reviewers and host source-backed comparison for ordinary four-stage review commands; explicit single-reviewer selection remains available. Default complete analysis remains. Current baseline 0.3.13, next accepted Phase 21 patch 0.3.14. Existing DeepSeek MCP provider has not been integrated into this composition; no new model request or phase closure accompanies this policy update.


2026-10-05 cross-provider default amendment: user replaces the three-Codex default with exactly one DeepSeek and one Codex independent reviewer plus source-backed host comparison. Full feedback and explicit single-provider choice remain. Stage DeepSeek API uses genuine captured excerpts, including requirements-only preparation, with existing provider config/bounded reading and shared v3 local binding; does not relax the four-role MCP contract or inherit its four-short-finding limit. Both captures precede inference, no peer findings, no automatic substitute/retry. Host-skill lifecycle includes safe DeepSeek receipt and validated saved result. Product baseline 0.3.14; next accepted Phase 21 patch 0.3.15. Offline integration and read-only configuration checks are distinct from new live inference; historical A4 used only Codex. Phase 21 stays 0/6, RUN-01–05 pending.
