# EvidenceLens 快捷检查命令

六个命令复用 `assignment-review`。当前阶段检查由正在使用的 Codex 宿主执行；独立 Codex 运行器在 Phase 20。提示词捕获／原文导出在 Phase 19，当前 `$el-prompt` 会如实说明不可用。

安装后供命令读取的权威路由／帮助是[共享命令表](../skills/assignment-review/references/command-entrypoints.md)。本页补充安装与操作说明。

## 安装

需要本地仓库和 Node.js。从本仓库运行，先检查再安装：

```sh
node scripts/install-review-skills.mjs --target-root "$HOME/.agents/skills"
node scripts/install-review-skills.mjs --target-root "$HOME/.agents/skills" --apply
```

也可只安装到明确选择的项目，例如将下列绝对路径换成自己的项目：

```sh
node scripts/install-review-skills.mjs --target-root "/absolute/path/to/project/.agents/skills"
node scripts/install-review-skills.mjs --target-root "/absolute/path/to/project/.agents/skills" --apply
```

不带 `--apply` 的检查不会创建目录或文件。安装为七个同级目录符号链接：六个 `el-*` 和共享的 `assignment-review`。CLI 不修改 Codex 配置、不安装依赖、不读取作业、不启动模型。链接持续引用此仓库的文件，所以仓库后续更新会影响已安装指令。

| 状态 | 含义 |
|---|---|
| planned | 可创建，dry-run 尚未写入 |
| created | 本次创建的链接 |
| unchanged | 同一源目录已安装 |
| conflict | 已有不同文件、目录或链接；保留并非零退出 |
| missing_source | 本地包缺失／不可读；不开始安装 |
| rolled_back | 创建失败后已撤销本次链接 |
| changed_preserved / rollback_unverified | 回滚时身份改变或无法核实；保留现状供检查，不能声称已完整回滚 |

先检查全部七项再创建；无 `--force`。目标根及父路径必须是真实目录，不能用符号链接将安装重定向。若系统目录本身是别名，请明确选择并检查其真实路径。重复安装同一来源不会改动已有链接。并发文件替换不是事务隔离；遇到失败，先检查实际状态再处理。

## 发现与使用

在目标宿主的 Skill 选择器中找 `el-*`，或输入 `$el-help`。官方文档说明 CLI/IDE 可用 `/skills` 选择器；这不意味着存在原生 `/el-check` 等别名。只在更新未显示时刷新／重启宿主。文件链接创建成功与宿主实际发现／调用成功分别验收。

| 命令 | 所需材料 | 实际输出与示例 |
|---|---|---|
| `$el-help` | 不需要作业材料 | 六个动作、材料、输出、示例及已知宿主支持。`$el-help` |
| `$el-prepare` | 已知要求，允许没有稿件 | 要求分析、证据需求、工作顺序、未知项。`$el-prepare 仅使用附上的简报，规划任务 T18` |
| `$el-check` | 指定当前稿与可用要求 | 过程检查矩阵和最小修正。`$el-check 当前稿 current-v1，重点检查选择理由` |
| `$el-final` | 当前交付材料与可用要求 | final 收尾检查、修正交接与待核验项。`$el-final 当前稿 current-v2，仅检查文字内容` |
| `$el-recheck` | 新当前稿；旧发现可选 | 本次检查、F 状态及 A 行动退役／保留。`$el-recheck 当前稿 current-v2，复核 F18-1` |
| `$el-prompt` | 当前尚无捕获实现 | 明确没有已捕获原文，不生成新提示词、不检查作业。`$el-prompt` |

指定当前稿不可读时报告 unknown，不改查旧稿；final 不因缺稿改变阶段。缺教师说明、rubric、原模板会留下具体覆盖缺口，不虚构内容。复查缺少旧账本仍能检查当前稿，历史比较标不可用。原模板与源注释保留；检查给出修改交接，不自动修改、签字或提交。帮助／导出不读取作业、不触发 review。

## 更新、冲突与移除

保留仓库位置，更新后重新运行 dry-run 检查七项。搬动／删除仓库会使链接失效。出现同名 Skill 时，核对宿主显示的实际来源；不同安装根的同名项不会自动合并。本安装器只检查给定目标，不扫描所有个人项目。

移除时先逐项用 `ls -ld` / `readlink` 核对七个确切条目。只对确认指向本仓库的符号链接使用 `unlink`；不要使用递归删除，不删除已有真实目录或来源不同的条目。需要迁移时先确认新来源和旧链接身份，再移除自己的旧链接并重跑安装。安装器不会代替用户覆盖冲突。

## 验证范围

| 层次 | 状态 |
|---|---|
| 官方文档中的 `$`、用户／项目根、目录符号链接 | documented：[Build skills](https://learn.chatgpt.com/docs/build-skills)，2026-10-04 |
| 本包的 Skill 元数据与相对资源图 | 7 个官方正例与负控制已验证；见 [Plan 01](../.planning/phases/18-discoverable-stage-commands/18-01-SUMMARY.md) |
| 临时目录中的安装、冲突、重复安装、回滚、外部 cwd | 9 项安装／结构测试通过（不含真实宿主调用） |
| 本机用户根七个链接 | 已安装且复核 unchanged；见 [安装记录](../.planning/phases/18-discoverable-stage-commands/18-HOST-EVIDENCE.md) |
| 当前桌面与另一个作业项目中实际发现／调用 | pending；界面工具限制已记录，等待专用对话授权或人工观察 |
| 任意原生 `/el-*` 别名、其他平台或宿主 | 未验证 |

不能由上述安装测试推断课程许可、真实文件视觉检查、远程提交或独立 Codex 运行成功。
