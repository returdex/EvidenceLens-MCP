---
name: el-prompt
description: "Export the last captured task prompt; currently reports unavailable because prompt capture is not implemented."
---

# el-prompt

调用动作：export；当前 Phase 18 没有捕获记录功能，明确报告 unavailable，不重建提示词或执行审阅。

读取[共享命令与执行约定](../assignment-review/references/command-entrypoints.md)，选择 `el-prompt` 行并遵循适用路径。共享文件相对本 Skill 目录定位，不能依赖作业 cwd。文件缺失时报告具体缺失组件，请重新安装入口及 assignment-review；不临时编造替代规则。

示例：`$el-prompt`。
