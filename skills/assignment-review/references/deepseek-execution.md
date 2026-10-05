# DeepSeek 阶段审阅

四个 review 入口默认一位 DeepSeek 加一位 Codex；本路径发送获准的同一阶段提示词，不调用四角色 MCP 工具。准备阶段可以只有要求和 rubric：无稿仍是无稿，不伪造 solution 或 teacher_instructions。没有视觉输入，本路径只能审阅捕获的文本摘录。

## 安装与配置

从安装的 assignment-review 链接定位 `scripts/deepseek-review.mjs`，用 Node 运行，只接受 stdin JSON。它复用链接所指 EvidenceLens 仓库已有 `dist/providers/config.js`、`dist/providers/deepseek.js` 及已安装依赖。需要仓库完成一次 `npm run build`；无需作业 cwd 是仓库，也无需新依赖。复制 Skill 而不提供该运行库时 preflight 报 runtime_unavailable，不能宣称支持。缺少构建时报告具体 prerequisite，不在作业项目安装依赖或生成另一套 provider。

配置沿用已有 `.evidencelens.local.json`（相对实际仓库根）；存在该文件时整组配置从文件读取，不与宿主环境的另一套 DeepSeek 凭据混合。无本地文件才使用 DeepSeek 环境配置。空凭据／不合法配置沿用原校验，既有 MCP 配置规则不变。运行前读取配置供请求内部使用，不打印／写入提示词、回执或报告。不得把 apiKey、endpoint、model、adapter 放入 CLI 输入，也不修改原认证。人的有效双模型选择授权同一审阅范围的必要获准摘录发送到已配置 DeepSeek；新资料的排除和传输限制仍生效。已有明确配置／传输授权不重复确认。

## 调用

1. `prompt-records.mjs begin` 使用 `executionKind:"host_skill"`，保留实际身份。Codex 的另一次 begin 仍用 codex_exec。
2. 两位各自 `capture`：DeepSeek 输入 `{taskId,runId,snapshot,capsule,admitted,evidenceRoots?}`，复用捕获、摘录拆分和模型 v3 输出协议。两份在首次模型调用前完成，保持相同原材料／任务，无同伴结论。
3. `deepseek-review.mjs preflight` 输入 `{}`；只验证运行库和配置，不发 HTTP，报告 `inference:not_run`。这不能证明远端 key/model 可用。
4. `deepseek-review.mjs run` 输入 `{taskId,runId,evidenceRoots?}`。生命周期 captured → dispatched 原子认领防重放；只发送一次 /chat/completions，重试固定为零，无模型替换／fallback／工具。每位审阅默认期限 600 秒，覆盖请求及正文读取；宿主继续等待同一运行。阶段任务完整保存，没有沿用 MCP 的四条简短发现限制。
5. HTTP 200、单个 choice、finish_reason=stop、有效 JSON v3、实际身份／coverage／来源绑定全部通过，才保存私有 result 和 provider 回执并标 succeeded。JSON 模式不能约束分类枚举：短且通过安全文本校验的非标准 kind 可在本地保守改为 unknown，正文／行动保持原样，在 limitations 明确标注待宿主归类。这不修复身份、coverage 或引用，不把无证据判断升级为事实；源绑定照常验证。length、工具调用、空正文、错引用、取消及未验证内容均不发布审阅结果。reasoning_content 丢弃。绑定保证引用来自捕获内容，不证明语义推理正确。
6. 输出的 lifecycle executionKind 为 host_skill，独立 provider 回执标 deepseek；不要称为 MCP 或 Codex 执行。保留完整报告及最小回执。新 provider 回执 v2 的 `validationFailure` 只包含封闭的 reason/field，区分类型、字段、枚举、字符／总字节上限和来源绑定；旧 v1 原样只读，缺少的原因不能追溯补造。无效配置、HTTP 状态、网络／结果／超时分支不回显 provider 原文或凭据。`diagnose` 输入 `{taskId,runId}`，只读指定运行的状态／安全 provider 回执，不读来源、不重发。部分结果不作为结论。

provider/result 文件沿用 Git 外状态根、0700 目录／0600 文件、排除路径及事务检查。取消后已发请求可能消耗用量，不能承诺服务端撤回。进程突然消失且未保存终态时保留 dispatched 为未完成；不自行重发或伪造成功。删除 dry-run/--apply 沿用记录助手；运行中 dispatched 不允许删除。

`$el-prompt` 仍导出同任务最新实际捕获的一位，通常是第二份 Codex 输入。两位先捕获再执行，完成时间不改 latest；不拼造双模型合并提示词。

JSON 模式的请求形状按 [DeepSeek 官方说明](https://api-docs.deepseek.com/guides/json_mode/)核对；它保证 JSON 格式，不保证本项目的结构或证据有效，本地验证继续必要。新接线的离线检查不等于真实双模型作业验收，历史 A4 三位 Codex 记录不改写。
