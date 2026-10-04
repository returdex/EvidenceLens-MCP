---
name: el-help
description: "Show EvidenceLens command usage, required materials and verified host support."
---

# el-help

调用动作：help；只读取共享命令表并说明用法，不读取作业或运行检查。

读取[共享命令与执行约定](../assignment-review/references/command-entrypoints.md)，选择 `el-help` 行并遵循适用路径。共享文件相对本 Skill 目录定位，不能依赖作业 cwd。文件缺失时报告具体缺失组件，请重新安装入口及 assignment-review；不临时编造替代规则。

示例：`$el-help`。
