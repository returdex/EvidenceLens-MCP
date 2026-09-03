---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-03T10:36:01Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/contracts/review.ts
  - src/tools/review.ts
  - tests/contract/review-provider.test.ts
  - tests/contract/public-contract-docs.test.ts
  - docs/mcp-contract.md
findings:
  critical: 2
  warning: 3
  info: 0
  total: 5
status: issues_found
---

# Phase 09：代码审查报告

**Reviewed:** 2026-09-03T10:36:01Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## 摘要

本轮只审查配置指定的五个文件，并以 `1902251..HEAD` 的 09-03 变更为重点。此前 3 个 blocker 与 2 个 warning 的直接复现场景均已关闭：PDF 非视觉/视觉 hash 双向约束生效；provider 返回对象的 getter/Proxy 异常进入 `PROVIDER_FAILURE`；`analyzer.analyze()` 抛出的四类值进入 `INTERNAL_ERROR`；attribution grammar 测试已从真实 provider-backed response 出发；文档中的 `INVALID_REQUEST` 示例已与运行时一致。

但实现仍不能发布：provider 可把明确声明为非公开的 fingerprint/prompt version 嵌入允许的 finding 文本并成功序列化；analyzer 的元数据访问和被 analyzer 篡改的清理函数仍位于 source-specific 边界之外，TypeError/RangeError 会再次被误报为客户端错误。另有三个测试/文档可靠性问题。聚焦测试 31/31 与严格 TypeScript 构建均通过，但这些结果没有覆盖下述缺陷。

## 既有问题独立复核

| 既有项 | 结论 | 独立证据 |
| --- | --- | --- |
| BLOCKER：非视觉 PDF hash / 视觉 PDF page-hash 绑定 | 已关闭 | `reviewCitationSchema` 明确拒绝 non-visual PDF hash；完整响应校验要求 visual PDF 的页码与 retained payload hash 精确匹配。聚焦 handler/schema 回归通过。 |
| BLOCKER：provider 返回对象访问异常逃逸 | 已关闭 | `safeParse`、identity、namespacing、metadata 与 provider-only projection 均在 lines 169-198 的 provider-owned catch 内；getter/Proxy 四类异常均得到精确 `PROVIDER_FAILURE`。 |
| BLOCKER：`analyzer.analyze()` 原生异常误分类 | 已关闭（原始场景） | lines 145-149 将 TypeError、RangeError、Error 与非 Error 值统一转换为 `INTERNAL_ERROR`；独立测试通过。相邻的 metadata/cleanup 路径仍失败，见 CR-02。 |
| WARNING：attribution grammar 假阳性 | 已关闭 | name 变体同步更新 provider finding namespace；model 变体只更新 model；child schema 与完整响应均有有效/无效控制。 |
| WARNING：`INVALID_REQUEST` 文档漂移 | 已关闭 | Error response JSON、运行时结果与精确 literal 三者均为 `{ok:false, code:"INVALID_REQUEST", message:"Invalid request"}`。 |

## Critical Issues

### CR-01：[BLOCKER] Provider 可通过公开 finding 字段回显明确禁止公开的内部值

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:177-194`
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:516-559`; `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:68-70`

**Issue:** provider 结果经 schema 验证后，其 `title`、`summary`、`observation`、`interpretation`、`uncertainty` 和 `followUpChecks` 等 provider-controlled 字符串会直接进入公开响应。严格 object schema 只能拒绝额外字段，不能阻止 provider 把内部值放入允许字段。独立复现令 provider 将 `request.inputFingerprint` 写入 `summary`、将 `request.promptVersion` 写入 `observation`；handler 返回 `ok:true`，两个值均原样出现在 MCP text。该行为直接违背文档中 input fingerprint 与 prompt text/version “never public and never serialized”的保证，并使被攻陷或行为异常的 provider 可绕过字段 allowlist 泄露内部细节。

现有“never serializes”测试没有覆盖此攻击：它只把 sentinel 放在额外字段里，结果被 strict schema 整体拒绝，见 WR-01。

**Fix:** 在 provider-owned boundary 内、公开投影前，对所有 provider-controlled 公共字符串做递归检查；至少拒绝包含当前 `expectedProviderRequest.inputFingerprint` 或 `expectedProviderRequest.promptVersion` 的结果，并由实际 provider 配置向边界提供需要阻止的其他私密 token。若无法对任意 provider prose 给出绝对不泄漏保证，应同步收窄文档契约。增加把 fingerprint/prompt version 嵌入每类允许文本字段的成功形状回归，并断言精确 sanitized `PROVIDER_FAILURE`。

```ts
const forbidden = [
  expectedProviderRequest.inputFingerprint,
  expectedProviderRequest.promptVersion
];
if (providerControlledStrings(providerResult.modelFindings)
  .some((value) => forbidden.some((token) => value.includes(token)))) {
  throw new ProviderError("PROVIDER_INVALID_RESPONSE");
}
```

### CR-02：[BLOCKER] Analyzer 元数据与清理阶段异常仍被误报为客户端输入/限额错误

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:145-160`
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:206-207`; `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:250-256`

**Issue:** 新增 analyzer boundary 只包住 `analyzer.analyze(analysis)`。紧接着读取 `analyzer.name` / `analyzer.version` 时，getter 抛出的 TypeError 或 RangeError 会落入全局 native-type classifier，分别返回 `INVALID_REQUEST` 和 `LIMIT_EXCEEDED`。独立复现结果为：name getter TypeError → `INVALID_REQUEST / Invalid request`，name getter RangeError → `LIMIT_EXCEEDED / Evidence exceeds the configured limit`。

同一问题还存在于 `finally { analysis.clear(); }`：injected analyzer 能修改其收到的可变 `analysis.clear`，返回后由 cleanup 抛出 TypeError/RangeError，并得到相同的错误误分类。两者都是 analyzer/server implementation failure，不是客户端请求或证据限额；错误分类会误导调用方采取无效的请求修复或缩减措施。

**Fix:** 在把 analysis 交给 analyzer 前保存不可变的本地 cleanup 引用；在 analyzer-owned boundary 内同时执行 finding 生成和 analyzer metadata snapshot。不要在 deterministic response 构造时再次读取 analyzer 对象。cleanup 异常也应成为 `INTERNAL_ERROR`，且不能覆盖一个已经产生的更具体错误。

```ts
const clearAnalysis = analysis.clear;
let deterministicFindings: readonly ReviewFinding[];
let analyzerName: string;
let analyzerVersion: string;
try {
  deterministicFindings = analyzer.analyze(analysis);
  analyzerName = analyzer.name;
  analyzerVersion = analyzer.version;
} catch {
  throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
}
// use analyzerName/analyzerVersion; finally invokes the saved clearAnalysis
```

增加 `name`/`version` getter 的 TypeError、RangeError、Error、非 Error 回归，以及 analyzer 篡改 `analysis.clear` 的回归；全部应返回精确 `INTERNAL_ERROR` 且不包含 sentinel。

## Warnings

### WR-01：[WARNING] “不序列化 provider 内部数据”测试实际只验证了无效响应会失败

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:516-559`

**Issue:** 名为 `successText` 的路径在 provider result 上添加 `promptText`、`privateInputFingerprint`、`rawResponse` 等额外字段。`providerReviewResultSchema.strict()` 会拒绝整个对象，所以该值实际上是 `PROVIDER_FAILURE`，而非成功响应。随后仅断言 sentinel 不出现，因此即使成功投影会通过允许字段泄露内部值，测试仍会全绿。该假阳性直接掩盖 CR-01。

**Fix:** 先断言额外字段路径确实返回精确 `PROVIDER_FAILURE`；另建一个结构合法、预期 `ok:true` 的 provider 结果，将敏感 sentinel 放入允许的 finding 文本字段，验证边界拒绝或按明确契约安全处理，并断言最终成功路径只公开预期字段。

### WR-02：[WARNING] “visual PDF wrong page”用例被更早的 location 校验短路

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:285-286`
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:311-323`; `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:345-358`

**Issue:** wrong-page case 对单页 `scanned-page.pdf` 构造 `pageNumber: 2`，helper 在找不到该页引用时伪造 `{kind:"pdf", pageNumber:2}`。完整响应会先在 `src/contracts/review.ts:402-404` 因 location 不属于 normalized references 而失败，根本无需执行 lines 409-415 的 retained page/hash 绑定规则。删除或破坏 wrong-page hash 约束后，这个回归仍可能通过，未满足其声称锁定的目标分支。

**Fix:** 使用包含两个合法 PDF page references、但只为其中一页保留 visual payload 的 fixture/构造；citation 应引用存在的第二页并携带第一页 hash。直接 schema 用例可从有效响应显式保留 page-2 reference 并移除 page-2 payload；handler 用例应提供等价的真实规范化输入。额外断言 location 本身在 `normalizedEvidence.references` 中，排除短路。

### WR-03：[WARNING] 文档中的成功响应示例不符合公开运行时 schema

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:74-124`
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/public-contract-docs.test.ts:142-150`

**Issue:** 独立抽取并运行 `reviewResponseSchema.safeParse` 后，成功示例同时因四处漂移失败：两个 `contentHash` 使用非 64 位 hex 占位符；finding 的 `evidenceIds` 有 `brief-1` 与 `solution-1`，却只提供 `brief-1` citation；metadata 含 provider attribution，但 finding ID 不是 `provider:<name>:` namespace。文档 contract test 只执行 Error response JSON，没有验证 success response，因此无法阻止此类运行时漂移。

**Fix:** 将示例改为最小但完整的 schema-valid 响应：使用真实 64 位 lowercase SHA-256、让 `evidenceIds` 与 citation IDs 完全一致，并删除 provider metadata 或加入匹配 namespace 的 provider finding。扩展 docs contract test，抽取该 success JSON block 并要求 `reviewResponseSchema.parse` 成功。

## 验证记录

- `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts`：2 files / 31 tests passed。
- `npm run build`：通过。
- `git diff --check 1902251..HEAD -- <五个范围文件>`：通过。
- 独立 analyzer metadata probe：TypeError → `INVALID_REQUEST`；RangeError → `LIMIT_EXCEEDED`。
- 独立 analyzer cleanup mutation probe：TypeError → `INVALID_REQUEST`；RangeError → `LIMIT_EXCEEDED`。
- 独立 provider echo probe：`inputFingerprint` 与 `promptVersion` 均出现在 `ok:true` MCP text。
- 独立文档 schema probe：success JSON 被拒绝，错误路径分别为 finding citation hash、finding evidenceIds、normalized evidence hash 与 metadata.provider。

---

_Reviewed: 2026-09-03T10:36:01Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
