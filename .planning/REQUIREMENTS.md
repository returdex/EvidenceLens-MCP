# Requirements: EvidenceLens MCP v1.2

**Defined:** 2026-10-04
**Milestone:** 快捷指令与 Codex 独立审阅
**Status:** Approved on 2026-10-04; CMD-01–05, PRM-01–05 and CDX-01–06 completed in Phases 18–20 on 2026-10-05. RUN-01–05 remain pending.
**Core value:** Produce trustworthy, independently checked findings grounded in controlled local evidence.

## v1.2 Requirements

The user confirmed the milestone direction and revised command semantics. Sixteen command/prompt/runner requirements are complete; five handoff/usage acceptance requirements remain pending. These requirements define user outcomes; runner selection and record layout are resolved during phase planning.

### 命令入口与安装

- [x] **CMD-01**: 用户可以安装并在目标 Codex 宿主及另一个作业项目中发现六个命令入口：`$el-help`、`$el-prepare`、`$el-check`、`$el-final`、`$el-recheck`、`$el-prompt`。
- [x] **CMD-02**: 用户调用四个阶段指令时，分别执行准备分析、过程检查、最终检查或新版本复查；明确的当前稿、范围和检查重点优先，不再次猜测阶段。
- [x] **CMD-03**: 用户可通过 `$el-help` 查看每条指令的动作、所需材料、输出、调用示例及已验证的宿主支持范围。
- [x] **CMD-04**: 用户材料不足时获得具体缺口与可继续完成的工作；不会用旧稿替代当前稿、编造教师说明或把未执行的检查报告为成功。
- [x] **CMD-05**: 用户通过不同入口仍获得现有基线、模板、披露和复查规则的一致行为；入口共享规则，帮助及提示词导出不触发审阅。

### 最近一次提示词的记录与导出

- [x] **PRM-01**: 用户每次执行阶段指令时，系统在派发前保存该次实际任务提示词的不可变快照，关联任务、对话、run ID、阶段及材料身份/覆盖。
- [x] **PRM-02**: 用户执行 `$el-prompt` 时取得本对话、本任务最近一次阶段运行捕获的提示词原文；文件变化或重复导出不会重新生成内容，也不会再次调用模型。
- [x] **PRM-03**: 用户在无记录、记录损坏、身份不明或运行失败时获得真实状态；导出明确对应最新运行，不能静默退回其他任务或较早的成功记录。
- [x] **PRM-04**: 用户复制导出的提示词时同时获得与原文分开的阶段、当前稿、材料清单和使用限制说明；未提供的文件不冒充在另一对话中可用。
- [x] **PRM-05**: 用户的提示词和记录保存于明确的本地非 Git 位置，可查看保留/删除方法；隔离不同任务与对话，并排除凭据、内部推理和未获准内容。

### Codex 独立执行

- [x] **CDX-01**: 用户可检查本机 Codex 可执行文件、兼容版本与登录状态；缺失或失效时得到可操作提示，检查不虚报已运行。
- [x] **CDX-02**: 用户可复用已有 Codex ChatGPT 登录执行审阅；身份认证由 Codex 管理，项目不复制凭据、不自动登录/登出或切换为付费 API 路径。
- [x] **CDX-03**: 用户通过阶段指令发起独立 Codex 执行上下文，使用已捕获的任务提示词和获准证据，避免向作业对话灌入完整过程事件。
- [x] **CDX-04**: 用户指定的排除与读取范围在独立执行中得到实际约束：禁止未授权材料读取、作业写入和继承工具绕过，并阻止递归调用本检查流程。
- [x] **CDX-05**: 用户可终止运行，并获得有界超时、失败、取消或结果不确定状态；相关子进程被收回，不自动重试、切换模型或重新发起请求。
- [x] **CDX-06**: 用户只有在终态成功且结果结构与来源引用通过本地校验后才得到有效审阅结果；部分输出、伪造来源和无效结构被明确标为失败或待核验。

Phase 20 acceptance is scoped to implemented controls, actual pinned CLI/OS/login status and positive synthetic protocol outcomes. CDX-02 does not claim a completed real ChatGPT inference; that remote acceptance is explicitly retained under Phase 21 RUN-05.

### 结果回传、用量与验收

- [ ] **RUN-01**: 用户在原作业对话中收到该次运行的完整分析、要求—证据对应关系、检查范围、未知项和完整行动，并仅在明确请求简版时提供摘要，并能定位对应运行记录。
- [ ] **RUN-02**: 用户复查新稿后看到按当前证据更新的问题状态；已解决项退出当前行动，普通版本差异不会自动重开旧问题。
- [ ] **RUN-03**: 用户可查看每次运行的阶段、状态、耗时、关联身份以及真实可得的模型/用量字段；模型或用量未报告时显示不可得。
- [ ] **RUN-04**: 用户看到的 token 数据保留事件来源与统计范围，不重复累计缓存/推理子项，也不以账号额度变化推算单次用量或金额。
- [ ] **RUN-05**: 用户可按文档完成安装→阶段检查→提示词导出→修改后复查的完整流程；验收区分合成测试、目标宿主发现和获授权的真实 Codex 运行证据。

**2026-10-05 当前工作修订（用户授权）：** RUN-01 的简洁回传须可定位完整有效发现（含低级别项），保留 findingId、证据及覆盖限制；运行成功不自动等于最高档或已提交。RUN-02 的暂不处理属于行动处置，不等于已解决。RUN-05 增补上述回传/状态的合成负例，仍沿用既有来源绑定和真实运行验收。具体 H-01–04 见 [Phase 21 修订输入](phases/21-review-handoff-and-usage-acceptance/21-PLANNING-INPUT.md)。这是现有要求的验收细化，需求数仍为 21；完整档位契约及模型语义评估另列[非阻塞未来备忘](notes/2026-10-05-review-quality-future.md)，不作为本阶段新增完成门槛。

## Future Requirements

- Review-quality proposals are recorded in the [non-blocking project memo](notes/2026-10-05-review-quality-future.md); not yet promoted to milestone requirements.

- **REVW-05:** Codex/DeepSeek multi-provider result comparison and disagreement surfacing.
- **REVW-06:** Incremental evidence indexing and cache reuse.
- **REVW-07:** General server-side policy configuration beyond the existing Skill workflow.
- **SAFE-05:** Optional multi-user authentication and audit log storage.
- Account-wide quota/activity dashboards and cross-run/model aggregate statistics.

## Out of Scope

| Feature | Reason |
|---|---|
| Arbitrary native `/el-*` aliases | Host support not established; `$` skill discovery is the initial target |
| Automatic stage guessing by `$el-prompt` | User selected export of the preceding stage prompt instead |
| Reconstructing missing prompts or exporting hidden reasoning | Violates exact-export semantics and data boundaries |
| Guaranteed sidebar chat creation or scraping private chat history | Independent execution does not require this UI behavior |
| New OAuth service or implicit API-key billing fallback | Reuse local Codex-owned authentication |
| Autonomous document modification, signing or submission | Existing read-only review scope remains |
| Current credentialed Docker/DeepSeek proof recertification | Separate historical proof scope; no automatic paid replay |

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| CMD-01 | Phase 18 | Complete |
| CMD-02 | Phase 18 | Complete |
| CMD-03 | Phase 18 | Complete |
| CMD-04 | Phase 18 | Complete |
| CMD-05 | Phase 18 | Complete |
| PRM-01 | Phase 19 | Complete |
| PRM-02 | Phase 19 | Complete |
| PRM-03 | Phase 19 | Complete |
| PRM-04 | Phase 19 | Complete |
| PRM-05 | Phase 19 | Complete |
| CDX-01 | Phase 20 | Complete |
| CDX-02 | Phase 20 | Complete |
| CDX-03 | Phase 20 | Complete |
| CDX-04 | Phase 20 | Complete |
| CDX-05 | Phase 20 | Complete |
| CDX-06 | Phase 20 | Complete |
| RUN-01 | Phase 21 | Pending |
| RUN-02 | Phase 21 | Pending |
| RUN-03 | Phase 21 | Pending |
| RUN-04 | Phase 21 | Pending |
| RUN-05 | Phase 21 | Pending |

**Coverage:** 21 requirements; 21 mapped exactly once; 0 unmapped. Mapping approved on 2026-10-04.

*Last updated: 2026-10-05 after Phase 20 verification and user-directed Phase 21 planning refinements.*


**2026-10-05 完整反馈修订（用户直接纠正）：** RUN-01 默认完整分析，不擅自压缩、删除 Low/info 或仅交付内部保存的 JSON；明确请求简版时，摘要附同轮完整报告。长报告可分段或交付 Git 外私有完整文件。该修订优先于前次“简洁回传”措辞，要求总数保持 21。用户同时授权一次三独立审阅者 A4 决策实验；实验不自动增加常规调用数、不关闭 RUN-01–05 或非阻塞语义工作。


**2026-10-05 用户默认项修订：** 四个审阅入口默认三位独立Codex审阅者及宿主来源裁决，明确指定单审阅者时一次；两种模式均完整交付。帮助/导出/仅生成不启动模型。DeepSeek MCP为独立路径，本轮A4和当前默认组合均没有DeepSeek调用。该默认选择沿用已验证三审阅流程，不新增需求编号或关闭现有验收。


2026-10-05 cross-provider default amendment: user replaces the three-Codex default with exactly one DeepSeek and one Codex independent reviewer plus source-backed host comparison. Full feedback and explicit single-provider choice remain. Stage DeepSeek API uses genuine captured excerpts, including requirements-only preparation, with existing provider config/bounded reading and shared v3 local binding; does not relax the four-role MCP contract or inherit its four-short-finding limit. Both captures precede inference, no peer findings, no automatic substitute/retry. Host-skill lifecycle includes safe DeepSeek receipt and validated saved result. Product baseline 0.3.14; next accepted Phase 21 patch 0.3.15. Offline integration and read-only configuration checks are distinct from new live inference; historical A4 used only Codex. Phase 21 stays 0/6, RUN-01–05 pending.
