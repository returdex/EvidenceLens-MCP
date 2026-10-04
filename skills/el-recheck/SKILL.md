---
name: el-recheck
description: "Recheck a new current assignment version and update prior findings and actions using current evidence."
---

# el-recheck

调用动作：intent=review，新版本复查；按共享约定选择显式或同任务先前阶段，否则说明默认 in_progress。保留当前稿，用当前证据更新 F/A。

读取[共享命令与执行约定](../assignment-review/references/command-entrypoints.md)，选择 `el-recheck` 行并遵循适用路径。共享文件相对本 Skill 目录定位，不能依赖作业 cwd。文件缺失时报告具体缺失组件，请重新安装入口及 assignment-review；不临时编造替代规则。

示例：`$el-recheck 当前稿 current-v2，复核 F18-1`。
