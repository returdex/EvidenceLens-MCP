---
name: el-prompt
description: "Export the latest captured prompt for the current task and conversation, with separate status and material limits."
---

# el-prompt

调用动作：export；根据当前任务最近一次尝试回执调用已安装记录助手，返回保存的提示词原文。状态与材料说明单独展示；无记录／身份不明／损坏如实报告，最新失败不回退旧成功，不重建提示词或执行审阅。

读取[共享命令与执行约定](../assignment-review/references/command-entrypoints.md)，选择 `el-prompt` 行并遵循适用路径。共享文件相对本 Skill 目录定位，不能依赖作业 cwd。文件缺失时报告具体缺失组件，请重新安装入口及 assignment-review；不临时编造替代规则。

示例：`$el-prompt`。
