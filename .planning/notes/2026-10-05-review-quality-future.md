---
date: "2026-10-05 03:58"
promoted: false
status: memo
blocking: false
---

# 未来审查质量工作备忘

用户安排（2026-10-05）：当前可兼容的工作先修订，未来工作纳入备忘，已完成部分列为非阻塞待修订提醒。依据：[真实案例分析](../../docs/research/fit5032-a13-review-failure.md)。本文件不自动形成当前里程碑需求、阶段依赖或执行任务。

| ID | 未来工作 | 何时取出讨论 | 预期产物/边界 |
|---|---|---|---|
| FM-01 | 逐 criterion 档位审查与发现处置契约：支持、反证、覆盖、限定语；稳定发现 ID 与降级/合并依据 | 下一次审查质量工作包/里程碑范围整理 | 提示词、结果契约及语义验收一起设计；不保证成绩，不把全部 Low 升级。关联 RR-01/02/08。 |
| FM-02 | 先独立读材料，再与既有结论对账；比较锚定造成的漏项与过度自信 | 独立审查流程下一次扩展 | 明确输入分层和调用成本，保存各轮真实提示词；没有授权不增加调用。关联 RR-07/08。 |
| FM-03 | 从 A1.3 私有完整可见历史构造时间截点、原代码发现测试及真实模型评估；增加未参与提示词调优的其他案例 | 专项语义评估规划 | 五类现有场景、逐条人工裁决、合成变体与真实证据分开。当前 6 项完整性检查不等于模型已通过。关联 RR-05。 |
| FM-04 | 在准备阶段规划业务反例和较早的质量检查；评分标准版本复核 | 下一次准备阶段流程设计 | 设计/中期/提交前检查点；提前 5–7 天只是建议，不是官方要求或定时任务。关联 RR-01/02/06。 |
| FM-05 | 补 Claude 原始输入/报告、五档 rubric 历史可用时间及必要视频片段，完善复盘 | 用户提供材料或后续调查有合法可读来源时 | 未取得继续标 unknown，不重试私有登录、不等待这些材料阻塞开发，不据自述确定责任比例。 |
| FM-06 | 将浏览器/origin/存储身份和报告声明交叉核验作为后续真实案例 | 相关证据采集或模板功能下次修订 | 防止 IAB/Chrome 状态混淆；保留政策版本冲突与真实使用披露，分别归因。关联 RR-03。 |

## 取用方式

下一里程碑规划或相关模块变更时检查本备忘。被正式安排的事项再建立要求/计划，并在本表记录承接位置；本文件仍有未承接项时保持 `promoted: false`。已完成范围的提醒集中在 [REVIEW-REVISIONS](../REVIEW-REVISIONS.md)，当前纳入范围见 [Phase 21 输入](../phases/21-review-handoff-and-usage-acceptance/21-PLANNING-INPUT.md)。


2026-10-05 user-directed update: FM-02 has a completed initial bounded A4 three-reviewer experiment using identical frozen source material, separate captured prompts and no peer conclusions. All three succeeded; core requirements agreed, with one complementary constraint-check reminder and shared visual-rubric limits. Composite mapping/qualifier issues were corrected while preserving originals. No decision accuracy gain was measured. Complete reporting is corrected now in the shared Skill/capture guidance. A reusable multi-agent decision contract, repeated-case evaluations, verified effective-model/usage metrics and independent semantic ground truth remain future non-blocking work; one case does not close FM-02 or establish general superiority.
