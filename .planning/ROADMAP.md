# Roadmap: EvidenceLens MCP

## Milestones

- ✅ [v1.0 MVP](milestones/v1.0-ROADMAP.md) — Phases 1–11, historical completed milestone.
- ✅ [v1.1 Assignment Prompt Adaptation and Staged Review](milestones/v1.1-ROADMAP.md) — Phases 12–17, product v0.2.4 published.
- ◆ **v1.2 快捷指令与 Codex 独立审阅** — Phases 18–21; development product 0.3.1, not released.

## Approval State

The user explicitly approved all 21 requirements and this four-phase roadmap on 2026-10-04. Phase 18 completed all four plans and CMD-01–05 on 2026-10-05; six installed commands and corrected help were accepted in a dedicated FIT5032 synthetic chat. Original phase directories and audit/proof snapshots remain in place.

## Phases

- [x] **Phase 18: Discoverable Stage Commands** — 命令入口与安装。 (completed 2026-10-05)
- [ ] **Phase 19: Captured Task Prompts and Export** — 提示词记录与导出。
- [ ] **Phase 20: Bounded Independent Codex Execution** — Codex 独立执行。
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

**Plans**: TBD — created by `$gsd-plan-phase 19`.

### Phase 20: Bounded Independent Codex Execution

**Goal**: 用户可复用 Codex 登录，在实际受限的独立上下文完成可判定状态的审阅。
**Depends on**: Phase 19
**Requirements**: CDX-01, CDX-02, CDX-03, CDX-04, CDX-05, CDX-06
**Success Criteria**:
1. 安装/版本/登录预检可区分缺失和可用；复用 Codex 自管认证，不复制凭据或隐式切换计费路径。
2. 执行使用捕获的任务提示词；排除材料、作业写入、继承工具绕过和递归调用的防护有目标宿主证据。
3. 失败、取消、超时和结果不确定都有终态及进程清理，无自动再次发送。
4. 成功需运行终态、输出结构和本地来源绑定共同支持；伪造来源或部分结果不能冒充通过。

**Plans**: TBD — created by `$gsd-plan-phase 20`.

### Phase 21: Review Handoff and Usage Acceptance

**Goal**: 用户完成独立审阅→简洁回传→提示词导出→新版本复查的闭环，并查看真实调用记录。
**Depends on**: Phase 20
**Requirements**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05
**Success Criteria**:
1. 作业对话得到与运行关联的证据矩阵、覆盖限制和最小行动，原始过程事件不淹没主对话。
2. 复查用当前证据关闭/保留问题，已解决行动退出清单，无依据的版本差异不报回归。
3. 调用记录含状态和耗时；可得模型及 token 值有来源/范围，缺值不填零、不推算账单。
4. 完整流程有合成负例、目标宿主发现和获授权真实 Codex 运行证据；缺任何一层就明确保留验收缺口。

**Plans**: TBD — created by `$gsd-plan-phase 21`.

## Progress

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| 18. Discoverable Stage Commands | 4/4 | Complete | 2026-10-05 |
| 19. Captured Task Prompts and Export | 0/TBD | Not started | — |
| 20. Bounded Independent Codex Execution | 0/TBD | Not started | — |
| 21. Review Handoff and Usage Acceptance | 0/TBD | Not started | — |

## Coverage and Research

21/21 requirements mapped exactly once; no dropped functional requirement. [Requirements](REQUIREMENTS.md) and [research summary](research/SUMMARY.md) contain scope and source evidence. Phase 20 requires deeper invocation/auth/sandbox design before implementation; Phase 19 resolves storage/identity semantics. New live validation is bounded and requires its applicable authorization; historical paid proof is not replayed.

## Deferred Work

Multi-provider comparison, aggregate statistics, incremental indexing, general policy configuration and optional multi-user support remain deferred. Accepted v1.0/v1.1 validation debt remains historical and visible in [v1.1 completion](milestones/v1.1-COMPLETION.md).
