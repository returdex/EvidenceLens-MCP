# Requirements: EvidenceLens MCP — v1.3

**Defined:** 2026-10-06 (Australia/Melbourne)
**Status:** Confirmed by user on 2026-10-06; roadmap approved 2026-10-06
**Core Value:** Trustworthy independently checked findings grounded in controlled local evidence.

## v1.3 Requirements

### 阶段提示词

- [x] **PPT-01**: 用户在准备、检查、最终审阅、复查中获得符合该阶段任务、当前稿和读取范围的提示词；重复或冲突条款经实际流程审计后修复。
- [x] **PPT-02**: 用户可导出与实际发送内容一致的提示词，包含适用的基本输出约定；不同 provider 的任务内容和获准来源可核对。
- [x] **PPT-03**: 用户获得逐适用 criterion 的完整分析、证据缺口与可执行建议；无稿准备不冒充完成度，复查只按当前证据更新发现。

### 运行可靠性与兼容接收

- [x] **OUT-01**: 用户可从已有失败记录及最小复现看到失败层级、实际原因或 unknown，区分运行、格式、来源校验与语义问题。
- [x] **OUT-02**: 用户的合法回复不会仅因经验证可恢复的展示差异被整体丢弃；兼容处理保留原文和转换说明，不补造事实或静默截断。
- [x] **OUT-03**: 用户可区分已验证发现、部分可用内容和未验证诊断；身份、授权、来源或存储安全失败不被降级成成功。
- [x] **OUT-04**: 一位审阅者失败时用户仍收到另一位的可用完整报告及明确失败状态；不会静默重试、换模型、补造双模型成功。

### 完整交付与合并

- [ ] **FBK-01**: 用户默认收到全部发现、严重程度、证据、建议和限制；简版仅按明确请求提供，并链接同轮完整报告。
- [ ] **FBK-02**: 多审阅者使用相同获准材料独立首审后，用户收到共同发现、单方新增、分歧、未决项及综合判断；每项可追溯到原报告。
- [ ] **FBK-03**: 用户可核查发现的合并、驳回、延期、关闭和重开依据；少数意见及 Low/info 不因摘要或多数一致而静默消失。

### 档位与目标

- [x] **BND-01**: 用户按官方 rubric 的实际档位逐 criterion 查看支持、反证、覆盖和不确定性；未知档位不被虚构，运行成功不等于档位达标。
- [x] **BND-02**: 用户可分别指定最低目标和可选规划目标；P 不自动升级为 D，必过项、目标缺口与额外余量建议分别展示且不保证成绩。

### 反馈隔离评估

- [ ] **EVA-01**: 用户获得已核实身份的调优与冻结测试案例清单，包括准确提交版本、rubric、阶段可用材料及 tutor feedback 来源；不完整候选不被称为完整记录。
- [x] **EVA-02**: 测试审阅者使用干净上下文及允许清单，只接收对应时间截点材料；feedback、成绩、衍生分析和后续修订仅供隔离评估，输入冻结并可审计。
- [ ] **EVA-03**: 用户可复核相同冻结输入上的旧版/新版、单审阅/所选多审阅对照；记录实际提示词、设置、请求/可核验模型、输出和运行状态；真实调用按明确授权和预算执行。
- [ ] **EVA-04**: 用户获得与 tutor feedback 和原始记录逐项对账的评估：遗漏、无依据新增、档位过度背书、建议可执行性和发现丢失；注明反馈覆盖局限、人工裁决和小样本限制。

### 可配置指令

- [ ] **CFG-01**: 用户通过 `$el-settings` 用自然语言查看、修改和恢复审阅者组合、完整/简版输出及最低/规划档位；查看设置不启动审阅。
- [ ] **CFG-02**: 用户设置持久保存到明确的用户或项目配置，显示本次指令→项目设置→用户默认的有效值和来源；无效设置不覆盖原配置，配置不保存凭据。
- [ ] **CFG-03**: 未配置时用户获得单 Codex、完整回复、无自动重试；明确选择 Codex+DeepSeek 后使用合并交付方式，不隐瞒各运行的成功/失败、分歧及完整报告。
- [ ] **CFG-04**: 用户在仓库与安装后的快捷入口/help 中获得一致的设置和审阅行为；旧配置及历史记录仍可读取，跨项目验证不污染课程文件。

## Future Requirements

- Additional unseen assignments and repeated blind evaluations to estimate broader reliability.
- Other reviewer providers, including Claude; not required for this milestone.
- Full closure of retained Nyquist/RR/FM debt beyond requirements covered here.

## Out of Scope

| Feature | Reason |
|---|---|
| Model fine-tuning | This milestone tunes prompts/workflow and evaluates outputs. |
| Automatic assignment editing, signing or submission | Review and modification handoff remain separate. |
| Tutor feedback in reviewer inputs | Held-out outcome leakage invalidates the evaluation. |
| Guaranteed grades or consensus as ground truth | Requires criterion evidence and bounded evaluator judgment. |
| Universal free-form parsing or automatic retries | Bounded compatibility and existing authorization remain required. |
| New credential service, UI, indexing or billing analytics | Outside confirmed scope. |

## Traceability

Requirements and roadmap approved. Each requirement maps exactly once to Phases 22–27.

| Requirement | Phase | Status |
|---|---|---|
| PPT-01 | Phase 24 | Complete (local prompt implementation; semantic acceptance Phase 27) |
| PPT-02 | Phase 24 | Complete (local prompt implementation; semantic acceptance Phase 27) |
| PPT-03 | Phase 24 | Complete (local prompt implementation; semantic acceptance Phase 27) |
| OUT-01 | Phase 22 | Complete |
| OUT-02 | Phase 23 | Complete (local implementation) |
| OUT-03 | Phase 23 | Complete (local implementation) |
| OUT-04 | Phase 23 | Complete (local implementation) |
| FBK-01 | Phase 25 | Pending |
| FBK-02 | Phase 25 | Pending |
| FBK-03 | Phase 25 | Pending |
| BND-01 | Phase 24 | Complete (local prompt implementation; semantic acceptance Phase 27) |
| BND-02 | Phase 24 | Complete (local prompt implementation; semantic acceptance Phase 27) |
| EVA-01 | Phase 22 | Partial |
| EVA-02 | Phase 22 | Complete (offline inputs; runtime acceptance Phase 27) |
| EVA-03 | Phase 27 | Pending |
| EVA-04 | Phase 27 | Pending |
| CFG-01 | Phase 26 | Pending |
| CFG-02 | Phase 26 | Pending |
| CFG-03 | Phase 26 | Pending |
| CFG-04 | Phase 26 | Pending |

**Coverage:** 20 requirements; 20 mapped exactly once; 0 unmapped. Roadmap approved 2026-10-06.

## Evaluation and preservation notes

A1.3 is a known tuning/regression candidate. FIT5046 A2 is a held-out candidate only; exact assessed artifact and complete process availability must be verified. The current host has read its feedback summary; isolated reviewers must not inherit that context. No provider calls, model training or assignment changes are authorized merely by initialization. Freeze the comparison protocol and evaluator rubric before test outputs; never tune using held-out outcomes and still call the same case unseen. Historical receipts, reports and phase paths remain intact. RR/FM entries need explicit evidence-backed closure.

---
*Last updated: 2026-10-06 after confirmed milestone scope; detailed requirements confirmed; roadmap approved 2026-10-06.*
