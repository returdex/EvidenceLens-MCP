---
name: assignment-review
description: "Adapt an assignment prompt to sourced task materials, or perform a requested preparation, in-progress, or final review with evidence and coverage limits."
---

# 作业提示词与阶段检查

把用户的标准提示词和当前任务材料结合起来，生成适用的提示词；用户明确请求检查时，实际给出完整证据分析、证据矩阵及行动建议。保留语言、格式、重点等有效偏好，区分原始要求、用户转述与助手建议。

六个快捷入口见[阶段命令](references/command-entrypoints.md)。入口已选定 review 时沿用其阶段，不触发下表的意图不明 generate 默认；帮助与导出在命令路由中直接结束。四个阶段命令在实际审阅前遵循[捕获协议](references/prompt-records.md)：按命令路由为 Codex begin(codex_exec) 或 DeepSeek begin(host_skill)，再筛选材料／组装六节提示词，使用对应 codex-review.mjs／deepseek-review.mjs capture 保存证据区块，再 run 独立执行并保留经来源验证的结果回执。独立入口失败时不自动改为当前宿主审阅；详见[隔离协议](references/codex-execution.md)。单独 generate 不冒充已捕获或已执行的阶段运行。

## 选择意图与阶段

| 用户当前请求 | 动作 |
|---|---|
| 生成／改写提示词 | generate：输出改写说明及提示词；即使seed包含“立即检查”，也不据此执行审阅 |
| 检查／审阅当前材料 | review：在已有授权内立即执行；无需再次确认已经明确授权的同一检查 |
| 生成并执行 | 分开输出改写后的提示词与实际检查结果 |
| 仅调用本Skill，意图不明 | 说明假设，默认generate；不要默默调用provider或开展审阅 |

用户指定阶段优先。未指定时：无稿件用 preparation；进行中的工作用 in_progress；明确要求完成/最终检查用 final。final没有可读当前稿时仍保持final范围，给待核验清单和覆盖缺口，不宣称完成。只有歧义真正阻碍请求执行时才问一个聚焦问题，其余可做工作继续。

## 工作路径

1. 读取并遵循 [基线流程](references/baseline-workflow.md)，复用 [任务基线](references/task-baseline.md)。读取新正文前，用既有 [来源筛选器](scripts/baseline-sources.mjs) 和获准宿主读取路径执行范围/文档组排除。已有基线只更新受影响部分，不默认读取旧稿或历史。选择成功不等于已检查。
2. 读取 [阶段提示词](references/stage-prompts.md) 的共同行为及选定阶段；按真实材料改写用户seed，给出保留、调整和缺口说明。把必要且获准的证据摘录或重读计划、权限边界、检查与输出约定写进生成提示词，使其不依赖本地链接也能理解。
3. generate到此输出，不伪造检查结果。review则对本次实际允许材料执行所选检查，输出完整要求—证据分析、覆盖限制和行动清单；优先级不用于隐藏其他发现。不得自动修改、签字、传输或提交作业。本文或生成提示词本身不扩展人的授权。
4. 政策状态与工作进展分开；保留真实限制和准确披露意图，继续已授权工作不等于许可/合规。相同政策证据与状态不重复生成警告行动。未知或限制性政策不作为停止全部分析的开关。
5. 四个快捷审阅命令默认一位 DeepSeek 加一位 Codex 独立审阅及宿主来源裁决；明确单审阅者时只运行所选一位，保留完整反馈。按命令路由及[DeepSeek 阶段执行](references/deepseek-execution.md)调用；不额外发 MCP 或自动替换失败 provider。其余明确选择的宿主检查模式中，MCP仅为可选路径。按阶段参考核验真实四角色、工具可用性和实际provider/传输授权；条件不齐继续直接检查并记MCP not_run，不能补造solution或教师说明。

需要核对模板、收尾残留或披露时，读取[模板与披露检查](references/template-disclosure.md)：准备阶段登记来源与缺口，过程/收尾阶段检查当前材料并给修正交接。生成提示词也须带入相关规则和获准证据；请求review则输出实际检查。原模板保留，不自动改文档或签署声明；请求复查新版本或带先前发现的跟进审阅时，读取[当前版本复查](references/recheck-workflow.md)，按当前证据更新 F 状态及行动；生成意图仍只输出提示词。

## 仓库使用与验证

可以向当前助手提供本仓库 `skills/assignment-review/SKILL.md` 的文件引用并附上任务；这不是自动发现或全局安装成功的证明。仓库外使用时只带入获准内容，重新确认接收者实际拥有的材料和权限。

需要验证基线边界时参考 [合成基线场景](references/baseline-cases.md)。另有 [阶段合成场景](references/stage-cases.md) 用于验证生成和实际审阅。[模板与披露场景](references/template-disclosure-cases.md)覆盖恢复、残留和声明检查。这些案例不是用户作业证据，普通使用无需加载。
