---
name: el-prepare
description: "Review assignment requirements and prepare an evidence-based work plan, including when no draft exists."
---

# el-prepare

调用动作：intent=review，stage=preparation；现在执行准备分析和规划。

读取[共享命令与执行约定](../assignment-review/references/command-entrypoints.md)，选择 `el-prepare` 行并遵循适用路径。共享文件相对本 Skill 目录定位，不能依赖作业 cwd。文件缺失时报告具体缺失组件，请重新安装入口及 assignment-review；不临时编造替代规则。

示例：`$el-prepare 任务 T18，只用附上的要求规划步骤`。
