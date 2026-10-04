# Codex 独立审阅协议（Phase 20）

独立执行已接入四个阶段入口，已通过 Phase 20 的本地控制与目标宿主验收。已通过真实 CLI 的本地合成协议检查；真实 ChatGPT 推理尚未完成成功验收；已有失败尝试不能算成功，预检或合成结果也不能称为真实审阅。

## 证据与原文

父宿主沿用[来源筛选器](../scripts/baseline-sources.mjs)，在读取前处理排除组/别名及当前稿。助手只接收已获准文本，不新增文件读取权限。`codex-contract.mjs` 在 capture 前校验原文本 SHA-256、UTF-8 字节区间及摘录哈希，然后生成唯一、确定序列化的 `<evidencelens-evidence-v1>` JSON 区块。`<>&` 在 JSON 字符串中转义，避免来源文本制造结束标记。

区块保存 schemaVersion=1、runId/taskId/conversationId/stage/currentSourceId，以及 sources：sourceId/sourceHash/excerpts。每个 excerpt 含 excerptId/startByte/endByte/text/excerptSha256/locator；区间左闭右开，按原 UTF-8 字节计数。sourceHash 指获准原文本，不是摘录哈希。排除/未读/requires_reread 不携带摘录，artifact_only 不携带 history。旧提示词没有该区块时可照常导出，不能自动改写后作为独立调用输入。

快照仍为既有 schema v1，提示词上限 256 KiB，快照 1 MiB。区块最多 100 来源、每来源 100 摘录。最终模型 JSON 最多 240 KiB、100 findings；本地验证封装最多 256 KiB。输出 JSONL 单行 512 KiB、总量 2 MiB；预检 10 秒、审阅 120 秒、TERM 收尾 2 秒。

## 结果形状

`MODEL_RESULT_SCHEMA` 为封闭字段 JSON Schema，每层 additionalProperties=false。模型字段：schemaVersion/runId/taskId/stage/currentSourceId/coverage/findings/limitations。coverage 含 sourceId/status/excerptIds，状态 covered/partial/unavailable/excluded。finding 含 findingId/kind/severity/claim/evidence/action，evidence 含 sourceId/excerptId/startByte/endByte/quote。action 可为 null。

模型不提供 promptSha256：本地验证后从已捕获字节加入，避免自引用哈希。结构校验不是来源校验或语义真实性证明；终态、进程退出、引用/区间/原文绑定须全部验证，才可记录独立 succeeded。执行完成不等于作业合格。

错误代码包括 codex_missing/codex_incompatible/login_required/auth_mode_unsupported/isolation_unverified/recursive_call/protocol_invalid/output_limit/timed_out/result_invalid/source_mismatch/uncertain/unsafe_path/unsupported。输出只含代码、封闭诊断字段与必要回执，拒绝内容、原始事件、环境变量和凭据不得进入日志。

## 只读预检

`preflightCodex` 仅调用实际可执行文件的 `--version`、`exec --help`、`login status`，总预检期限 10 秒，输出限 64 KiB，超时收回自有进程组。核对规范绝对路径、所有者/父目录权限、可执行文件 SHA-256；当前已验证范围是 macOS arm64 / Codex 0.141.0。基础函数返回 `executionReady=false`，因为它只检查可执行文件与登录；安装后的 `codex-review.mjs preflight` 还验证隔离策略和清理，全部通过才返回 `executionReady=true`。预检不会派发审阅。

ChatGPT 返回 auth=chatgpt；未登录是 login_required，API-key 登录是 auth_mode_unsupported，未知状态是 uncertain。需要登录时由用户直接使用 Codex 管理；本项目不调用 login/logout，不读取 auth.json/keychain，不转存凭据。缺失可执行文件先安装/恢复 Codex；不兼容版本等待验证，不自动升级或降级。

审阅子进程的 HOME 和 CODEX_HOME 都指向本次受保护控制目录中的独立目录；另有固定 PATH、LANG、明确的私有 TMPDIR 和递归标记 EVIDENCELENS_CHILD=1。API 密钥、代理、provider 地址、父线程标识和 shell 初始化变量不继承。已有递归标记在任何启动前拒绝。测试通过库参数注入合成可执行文件；生产命令不得开放测试替身或任意 argv。

可执行文件自身禁止 group/world 写；受信所有者的父目录禁止 world 写（root 所有 sticky 临时目录例外），允许当前宿主 Homebrew 使用的组写 Caskroom 目录。安装管理者/本机管理员属受信边界；执行前仍需重新校验已认证二进制摘要。

## 已验证的隔离启动器（R1）

`codex-isolation.mjs` 在 macOS arm64 / Codex 0.141.0 上固定已验证的二进制和策略摘要。模型固定为 gpt-5.4；真实模型可用性和推理验收仍由 Phase 21 完成。启动前用合成文件检查 OS 允许读取与拒绝越界读取/写入，之后才生成不可伪造的进程内启动凭证。

审阅进程通过 stdin 接收提示词；仅能读取运行库、私有控制/临时目录和 Codex 自有认证文件。从现有非凭据 `installation_id` 建立本次私有副本，仅该副本允许所需的文件数据/模式操作；原文件只校验元数据与内容未变，不授予写权限。审阅 CODEX_HOME 只含指向原 Codex `auth.json` 的只读链接及 installation_id 副本；不读取/复制认证正文，不允许修改原认证、替换链接或写入控制目录。全局 agents、config、models cache、skills 和 memory 不加入该目录。登录状态使用独立的无网络策略，仅额外允许 Codex 读取配置文件及直接的 agent TOML 配置；这些读取权限不进入审阅进程。

四个内置工具仍存在。文件工具受到外层 OS 拒绝；任何 JSONL 工具/计划事件或 stderr tools-router 诊断均拒绝该审阅。进程中止前可能已有内部后续请求，必须标记不确定，不能声称远端撤回成功。全局/项目指令、skills 和 memory 的合成注入标记已验证不进入请求。当前启动器、独立运行记录及本地结果验证已通过合成验收；真实远端推理仍待 Phase 21 验证。

## 安装后的调用

从 assignment-review 的安装目录定位 `scripts/codex-review.mjs`，支持 preflight/capture/run/diagnose，均仅接受 stdin JSON。preflight 输入 `{}`，只做版本、登录及隔离检查，不推理。先用 prompt-records.mjs begin 的 `executionKind:"codex_exec"` 保存回执，再由父助手筛选材料和组装六节正文。

- capture 输入 `{taskId,runId,snapshot,capsule,admitted}`；snapshot 的 promptText 为六节正文、promptSha256 对应该正文，身份/sequence 来自 begin。capsule 见上文；admitted 为已获准 `{sourceId,text}` 数组。助手校验并追加唯一证据区块，保存最终原文及哈希。
- run 输入 `{taskId,runId,evidenceRoots?}`；只运行同一已捕获尝试，返回状态、执行回执和经过本地校验的 result。无可覆盖的可执行文件、模型、endpoint、配置或测试参数。CODEX_THREAD_ID 决定宿主身份，不读取历史聊天。
- diagnose 输入 `{taskId,runId}`（可附 evidenceRoots）；只读当前对话内明确指定的运行回执，返回 metadata、execution 和 diagnosticAvailability。不读提示词、结果或作业原件，不预检、不启动子进程，不改变 latest。旧 execution v1 返回 `not_recorded`；未认领返回 `not_started`；已认领未完成返回 `pending`；v2 终态返回 `recorded`。这是指定旧 run 的诊断，不代表最新审阅。
- export 继续使用 prompt-records.mjs export；不会预检或启动 Codex。帮助仅阅读命令表，也不启动进程。

SIGINT/SIGTERM 转成当前自有运行的取消信号：TERM 后最多 2 秒发送 KILL，再有界确认进程组消失并清理临时目录。无法确认清理为 uncertain。失败/取消后不自动重试；用户明确再次请求时 begin 新 run，保留失败记录。已发送的远端请求可能消耗用量，取消不承诺撤回。

来源校验要求 coverage 覆盖每个登记材料；排除/未读不能升级为 covered，引用只能落在已捕获摘录的 UTF-8 区间且原文完全一致。结果哈希和 promptSha256 由本地生成。没有任何发现也不能消除本地保存的覆盖限制；匹配引用不证明语义推理准确。


## 失败诊断（0.3.4）

新执行回执使用 execution schema v2，内含 diagnostics schema v1；旧 v1 回执继续严格读取、不迁移、不补造诊断。提示词快照、生命周期、模型结果和隔离策略协议不变。

- `stage/trigger`：区分材料区块验证、预检、隔离启动、派发、进程、结果绑定、清理、发布；例如 `process/cli_turn_failed`、`process/missing_terminal`、`result_validation/result_rejected`。
- `eventType/itemType`：仅保存拒绝分支的已知事件/条目类型，未知值为 `other`。不保留事件正文、thread_id、工具参数或 reasoning。
- `reportedErrorCategory`：从 CLI 错误识别有限类别 authentication/rate_limit/model_unavailable/invalid_schema/network/permission/unknown。这是错误文本的分类提示，不是已证实的根因；不能据此修改认证、模型或隔离策略。
- `osErrorCode`：仅允许固定 errno；找不到可执行文件与权限拒绝分开记录。`exitCode/exitSignal/closeObserved` 保留真正观察到的关闭信息；未观察到的值为 null，不能用 null 推断退出 0。
- `terminationRequested` 表示本地监督器发出过终止请求，避免把其 SIGTERM/SIGKILL 误称为进程自发崩溃。`threadObserved/turnObserved` 描述到达的进程阶段。`terminalObserved/cleanupComplete` 仍由外层回执单独记录。

首个拒绝分支保留，后续取消或清理失败不会将它抹掉；最终 status 与 cleanupComplete 表示最终状态。结果绑定失败仍保留已经观察到的完成事件和退出码，resultSha256 保持 null。发布失败仅返回 `publication/publication_failed` 诊断，不冒充成功保存；事务保持 busy/uncertain。

向用户报告失败时，给出简短的具体分支和安全类别、已知退出状态及下一步。例如缺少终态不等于超时，CLI 报错分类不等于已确认网络/登录故障。不得展示原始 stderr、错误消息、路径、凭据或未验证结果。旧回执只有 uncertain 时，明确“当时未记录原因，无法还原”，不能靠耗时猜测。诊断查询与 `$el-prompt` 导出均不会重发；需要新的审阅仍须用户另行明确请求，begin 新 run，保留旧记录。


## 启动权限修复（0.3.5）

已用固定 CLI 复现：真实 CODEX_HOME 存在 agents 目录时，即使 ignore-user-config 与 disable multi_agent 生效，启动仍尝试扫描该目录；被 OS 拒绝后在 thread.started 之前退出。全局 models_cache.json 也会产生额外的被拒绝读取诊断。此前空目录合成夹具遗漏了这两种已有用户状态。

独立 CODEX_HOME 避免这些环境发现，同时保持原登录文件和原 installation_id 不变。目录设为 0500，位于只读 control 中，认证只有链接；没有复制、打印或修改凭据。临时 installation_id 副本保留原值并随运行删除。登录预检仍使用原目录的独立无网络策略。运行时工具拒绝、外层 OS 隔离、结构/来源验证、失败不重发和真实推理授权边界保持有效。新隔离合约摘要包括独立目录构造器；旧故障和旧回执保留。

实际宿主断网测试已经越过该启动错误，出现 thread.started/turn.started；这只证明启动路径恢复，不能作为真实模型返回结果的证据。真实验收状态见项目修复记录。


## HOME 补充隔离（0.3.6）

0.3.5 的单次获准真实合成测试仍因 permission / unexpected_stderr 失败，未得到有效审阅结果；没有自动重试。断网诊断进一步定位到原 HOME/.agents/skills 的隐式扫描，原 CODEX_HOME 隔离未覆盖这一入口。审阅进程现将 HOME 与 CODEX_HOME 一同指向本次私有目录，登录预检仍使用原环境。新夹具明确创建全局 .agents/skills，并保留旧 HOME 会失败的负控制；不扩大 stderr 忽略范围。隔离合约摘要也覆盖实际生产启动器函数，防止只锁定目录构造器却遗漏环境变量接线。

本地正负用例及实际宿主断网启动已验证；0.3.6 尚无新的获准真实推理成功回执，不能宣称完整审阅已恢复。原认证仍只通过只读别名由 Codex 自行使用，没有复制或改写。
