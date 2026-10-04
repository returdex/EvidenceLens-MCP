---
name: el-final
description: "Perform a bounded final review of the specified assignment deliverables and report remaining checks."
---

# el-final

调用动作：intent=review，stage=final；现在做收尾检查，缺稿仍保留 final 并报告 unknown。

读取[共享命令与执行约定](../assignment-review/references/command-entrypoints.md)，选择 `el-final` 行并遵循适用路径。共享文件相对本 Skill 目录定位，不能依赖作业 cwd。文件缺失时报告具体缺失组件，请重新安装入口及 assignment-review；不临时编造替代规则。

示例：`$el-final 当前稿 current-v2，只核查文字`。
