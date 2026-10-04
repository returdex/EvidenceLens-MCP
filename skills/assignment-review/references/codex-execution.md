# Codex 独立审阅协议（Phase 20 实施中）

当前仅新增证据协议和预检基础；独立执行尚未启用，不能把预检或合成结果称为真实审阅。

## 证据与原文

父宿主沿用[来源筛选器](../scripts/baseline-sources.mjs)，在读取前处理排除组/别名及当前稿。助手只接收已获准文本，不新增文件读取权限。`codex-contract.mjs` 在 capture 前校验原文本 SHA-256、UTF-8 字节区间及摘录哈希，然后生成唯一、确定序列化的 `<evidencelens-evidence-v1>` JSON 区块。`<>&` 在 JSON 字符串中转义，避免来源文本制造结束标记。

区块保存 schemaVersion=1、runId/taskId/conversationId/stage/currentSourceId，以及 sources：sourceId/sourceHash/excerpts。每个 excerpt 含 excerptId/startByte/endByte/text/excerptSha256/locator；区间左闭右开，按原 UTF-8 字节计数。sourceHash 指获准原文本，不是摘录哈希。排除/未读/requires_reread 不携带摘录，artifact_only 不携带 history。旧提示词没有该区块时可照常导出，不能自动改写后作为独立调用输入。

快照仍为既有 schema v1，提示词上限 256 KiB，快照 1 MiB。区块最多 100 来源、每来源 100 摘录。最终模型 JSON 最多 240 KiB、100 findings；本地验证封装最多 256 KiB。输出 JSONL 单行 512 KiB、总量 2 MiB；预检 10 秒、审阅 120 秒、TERM 收尾 2 秒。

## 结果形状

`MODEL_RESULT_SCHEMA` 为封闭字段 JSON Schema，每层 additionalProperties=false。模型字段：schemaVersion/runId/taskId/stage/currentSourceId/coverage/findings/limitations。coverage 含 sourceId/status/excerptIds，状态 covered/partial/unavailable/excluded。finding 含 findingId/kind/severity/claim/evidence/action，evidence 含 sourceId/excerptId/startByte/endByte/quote。action 可为 null。

模型不提供 promptSha256：本地验证后从已捕获字节加入，避免自引用哈希。结构校验不是来源校验或语义真实性证明；终态、进程退出、引用/区间/原文绑定须全部验证，才可记录独立 succeeded。执行完成不等于作业合格。

错误代码包括 codex_missing/codex_incompatible/login_required/auth_mode_unsupported/isolation_unverified/recursive_call/protocol_invalid/output_limit/timed_out/result_invalid/source_mismatch/uncertain/unsafe_path/unsupported。输出只含代码与必要回执，拒绝内容、原始事件、环境变量和凭据不得进入日志。

## 只读预检

`preflightCodex` 仅调用实际可执行文件的 `--version`、`exec --help`、`login status`，总预检期限 10 秒，输出限 64 KiB，超时收回自有进程组。核对规范绝对路径、所有者/父目录权限、可执行文件 SHA-256；当前兼容候选是 macOS arm64 / Codex 0.141.0。返回 `executionReady=false`：隔离认证尚未实现，预检成功也不授权派发。

ChatGPT 返回 auth=chatgpt；未登录是 login_required，API-key 登录是 auth_mode_unsupported，未知状态是 uncertain。需要登录时由用户直接使用 Codex 管理；本项目不调用 login/logout，不读取 auth.json/keychain，不转存凭据。缺失可执行文件先安装/恢复 Codex；不兼容版本等待验证，不自动升级或降级。

子进程只继承 HOME、CODEX_HOME、固定 PATH、LANG、明确的私有 TMPDIR 和递归标记 EVIDENCELENS_CHILD=1。API 密钥、代理、provider 地址、父线程标识和 shell 初始化变量不继承。已有递归标记在任何启动前拒绝。测试通过库参数注入合成可执行文件；生产命令不得开放测试替身或任意 argv。
