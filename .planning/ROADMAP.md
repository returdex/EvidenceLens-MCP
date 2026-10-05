# Roadmap: EvidenceLens MCP

## Milestones

- ✅ [v1.0 MVP](milestones/v1.0-ROADMAP.md) — Phases 1–11, completed 2026-09-24.
- ✅ [v1.1 Assignment Prompt Adaptation and Staged Review](milestones/v1.1-ROADMAP.md) — Phases 12–17, product v0.2.4 published 2026-10-04.
- ✅ [v1.2 快捷指令与 Codex 独立审阅](milestones/v1.2-ROADMAP.md) — Phases 18–21, 21 plans / 44 tasks / 21 requirements complete 2026-10-05; product [0.3.17 published](https://github.com/returdex/EvidenceLens-MCP/releases/tag/v0.3.17).

## v1.3 提示词、反馈质量与可配置审阅

**Status:** Approved by user on 2026-10-06; ready for Phase 22 planning.
**Milestone Goal:** 修复实际审阅流程、提示词和完整反馈，通过可配置入口与反馈隔离对照评估验证建议和档位判断。

先保留旧版与冻结评估协议，再修复输出接收、提示词、反馈和设置，最后开展已授权的横向评估。历史阶段目录与证明留在原路径；本次不重开旧阶段、不自动关闭 RR/FM、不自动发布或启动真实模型调用。

## Phases

- [ ] **Phase 22: 真实流程诊断与评估基线** — 核实可用作业记录、建立反馈隔离和冻结对照协议，定位现有运行失败。
- [ ] **Phase 23: 可恢复输出与可靠结果接收** — 接收可恢复的合法输出并保留部分成果，同时保持信任边界。
- [ ] **Phase 24: 四阶段提示词与档位证据** — 修复四阶段任务/输出契约，提供有依据的档位与目标判断。
- [ ] **Phase 25: 完整反馈与透明综合判断** — 将有效独立报告合并成完整、可追溯的判断与行动。
- [ ] **Phase 26: 设置指令与安装入口一致性** — 交付持久化 el-settings 与保守默认，并贯通实际安装入口。
- [ ] **Phase 27: 冻结横向评估与实际验收** — 在冻结材料上比较新旧与单/多审阅，给出反馈对账和明确质量局限。

## Phase Details

### Phase 22: 真实流程诊断与评估基线
**Goal**: 核实可用作业记录、建立反馈隔离和冻结对照协议，定位现有运行失败。
**Depends on**: Phase 21 (v1.2 archived)
**Requirements**: OUT-01, EVA-01, EVA-02
**Success Criteria** (what must be TRUE):
1. 用户能查看从四阶段入口、设置/提示词生成、捕获、派发、校验到交付的实际流程，以及失败记录的复现、失败层级和已知/未知原因；不预设严格校验是全部根因。
2. 用户能核查调优/测试案例对应的准确提交版本、官方材料、阶段时间截点和反馈来源；A1.3 为已知调优候选，A2 未核实前不称为完整测试记录。
3. 测试审阅者通过干净上下文和允许清单读取冻结材料，无法读取 feedback、成绩、反馈衍生分析、先前诊断或后续修订；隔离检查保留可审计证据。
4. 用户能在修复前复核旧版提示词/代码/设置快照、对照矩阵、人工裁决标准和调用预算草案；评估标准在输出前冻结，真实调用仅按明确授权执行。
**Plans**: 3 plans

**Wave 1**
- [ ] 22-01-PLAN.md — 复现真实流程与失败分类 (OUT-01)
- [ ] 22-02-PLAN.md — 核实作业版本与阶段证据 (EVA-01)

**Wave 2 (blocked on Wave 1 completion)**
- [ ] 22-03-PLAN.md — 冻结审阅输入与离线泄漏负例 (EVA-02)

Cross-cutting constraints:
- 私有作业/反馈/回执不入 Git；历史证据及课程文件保持原样。
- 无自动真实模型派发；合成离线检查不冒充原运行根因或真实语义验收。
- 未核实版本、材料时间或隔离条件阻止相应测试 readiness。



### Phase 23: 可恢复输出与可靠结果接收
**Goal**: 接收可恢复的合法输出并保留部分成果，同时保持信任边界。
**Depends on**: Phase 22
**Requirements**: OUT-02, OUT-03, OUT-04
**Success Criteria** (what must be TRUE):
1. 用户在可恢复展示差异下仍获得可用内容、原回复和转换说明；不补造缺失事实、不静默截断；兼容范围有可运行正/负例检查。
2. 用户能区分已验证发现、部分可用内容和未验证诊断；身份、授权、来源与存储安全负例仍拒绝相关成功状态。
3. 双审阅中一位失败不抹去另一位的有效完整反馈；用户看到真实失败位与恢复动作，没有自动重试、替换模型或伪造双成功。
**Plans**: TBD

### Phase 24: 四阶段提示词与档位证据
**Goal**: 修复四阶段任务/输出契约，提供有依据的档位与目标判断。
**Depends on**: Phase 23
**Requirements**: PPT-01, PPT-02, PPT-03, BND-01, BND-02
**Success Criteria** (what must be TRUE):
1. 用户在四阶段及无稿/当前稿/新版本场景收到阶段适配、范围一致的提示词，实际流程审计发现的重复和冲突被修复。
2. 用户能原样导出实际捕获并发送的提示词，核查基本输出约定及跨 provider 的任务正文和获准材料一致性；历史导出不被重写。
3. 每个适用 criterion 的反馈包含官方档位限定、支持证据、反证、缺口/覆盖、不确定性和行动；无稿准备不冒充已达标。
4. 用户可分别表达最低 P 与可选规划 D，看到必过项、目标缺口和额外余量建议；无档位来源时保持 unknown，不保证成绩。
5. 复查依据当前证据更新发现、保留有效历史依据，不把正常版本差异当回归；阶段内容完整性经人工语义检查，而非只验 JSON。
**Plans**: TBD

### Phase 25: 完整反馈与透明综合判断
**Goal**: 将有效独立报告合并成完整、可追溯的判断与行动。
**Depends on**: Phase 24
**Requirements**: FBK-01, FBK-02, FBK-03
**Success Criteria** (what must be TRUE):
1. 用户默认获得所有有效发现、严重程度、证据、建议和限制；仅明确要求简版时压缩，并能访问同轮完整报告。
2. 多审阅首轮不接收对方结论；用户看到共同发现、单方新增、意见分歧、未决项和宿主综合判断，每项关联 run/finding 及原证据。
3. 用户能核查每个发现的保留、合并、驳回、延期、关闭及重开依据；Low/info 和少数意见不会因摘要或多数一致消失。
4. 单审阅、双成功及一位失败的交付都能核对完整报告和最终行动；格式通过、来源绑定和模型一致不被宣称为语义正确。
**Plans**: TBD

### Phase 26: 设置指令与安装入口一致性
**Goal**: 交付持久化 el-settings 与保守默认，并贯通实际安装入口。
**Depends on**: Phase 25
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04
**Success Criteria** (what must be TRUE):
1. 用户通过 `$el-settings` 自然语言查看、修改及恢复审阅者组合、完整/简版输出、最低/规划档位；仅查看不启动审阅。
2. 用户能查看本次明确指令→项目配置→用户默认的生效值、来源和保存位置；配置不写凭据，无效修改保留原值。
3. 未配置时实际运行采用单 Codex、完整反馈和无自动重试；选择 Codex+DeepSeek 后交付 Phase 25 的透明综合报告及各运行状态。
4. 仓库与安装后的入口/help 行为一致，旧配置和记录可读取；跨项目验证保存并恢复原设置，不修改课程作业内容。
**Plans**: TBD

### Phase 27: 冻结横向评估与实际验收
**Goal**: 在冻结材料上比较新旧与单/多审阅，给出反馈对账和明确质量局限。
**Depends on**: Phases 22–26
**Requirements**: EVA-03, EVA-04
**Success Criteria** (what must be TRUE):
1. 用户能复核同一冻结输入的旧版/新版、单审阅/已选择多审阅对照，包含实际 prompt、配置、版本、请求/可核验模型、输出、用量可用性和运行状态；已有有效运行可按等价条件复用。
2. 测试输出封存后，隔离评估才与 tutor feedback 和原始记录逐项对账遗漏、无依据新增、档位过度背书、建议可执行性和发现丢失。
3. 用户能查看逐项人工裁决、分歧与反馈覆盖限制；评分反馈不是穷尽真值，调优案例结果不冒充未见测试，小样本不宣称普遍准确率。
4. 各阶段没有对应历史材料的测试明确标未覆盖；结构检查、来源校验、实际入口验收与语义评估分别报告。
5. 真实执行只使用明确批准的调用计划和预算；测试结果不得反向调优仍宣称同一案例未见。修复后重测记为已见回归，新的未见测试需另选。
**Plans**: TBD

## Progress

**Execution Order:** 22 → 23 → 24 → 25 → 26 → 27

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| 22. 真实流程诊断与评估基线 | v1.3 | 0/3 | Not started | — |
| 23. 可恢复输出与可靠结果接收 | v1.3 | 0/TBD | Not started | — |
| 24. 四阶段提示词与档位证据 | v1.3 | 0/TBD | Not started | — |
| 25. 完整反馈与透明综合判断 | v1.3 | 0/TBD | Not started | — |
| 26. 设置指令与安装入口一致性 | v1.3 | 0/TBD | Not started | — |
| 27. 冻结横向评估与实际验收 | v1.3 | 0/TBD | Not started | — |

**Coverage:** 20/20 confirmed requirements mapped exactly once; no unmapped requirements.
**Approval:** User confirmed requirements and approved this roadmap on 2026-10-06. No phase execution or provider calls have started.

---
*Last updated: 2026-10-06 (Australia/Melbourne) after user approval of requirements and roadmap.*
