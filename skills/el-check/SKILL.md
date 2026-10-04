---
name: el-check
description: "Check the specified current assignment draft against sourced requirements and the user’s focus."
---

# el-check

调用动作：intent=review，stage=in_progress；现在检查指定当前稿，保留用户范围与重点。

读取[共享命令与执行约定](../assignment-review/references/command-entrypoints.md)，选择 `el-check` 行并遵循适用路径。共享文件相对本 Skill 目录定位，不能依赖作业 cwd。文件缺失时报告具体缺失组件，请重新安装入口及 assignment-review；不临时编造替代规则。

示例：`$el-check 当前稿 current-v1，重点检查理由`。
