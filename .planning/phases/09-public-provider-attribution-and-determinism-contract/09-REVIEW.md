---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-03T17:05:51Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - docs/mcp-contract.md
  - src/contracts/review.ts
  - src/providers/types.ts
  - src/review/analysis.ts
  - src/tools/review.ts
  - tests/contract/public-contract-docs.test.ts
  - tests/contract/review-provider.test.ts
  - tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json
findings:
  critical: 5
  warning: 3
  info: 0
  total: 8
status: issues_found
---

# Phase 09：代码审查报告

**Reviewed:** 2026-09-03T17:05:51Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

本次按实际实现、测试和调用链复审了 Phase 09 的 8 个指定文件，重点验证 09-05 对前四个 blocker 的修复。上一轮的原始复现（provider-authored token guard 误扫本地 provenance、analyzer 身份伪造、analyzer 直接篡改共享输入、cleanup 遇首个异常后停止）已被针对性处理；runtime-authentic 文档示例也已落地。

但是 09-05 的隔离/冻结/清理改动又引入或暴露了 5 个必须修复的正确性与安全问题：生产 `ProviderConfig` 未投影便进入 provider 请求，导致 API key/endpoint 泄漏到本应只有三项的 inference；同一个深冻结还会冻结调用方拥有的配置对象；cleanup 不清除 analyzer 可保留的 claim 文本；analyzer 返回数组在 provider await 期间仍可被异步改写；provider 请求的预构建位于错误与 cleanup 边界之外，服务端异常会被错误归类为客户端 `INVALID_REQUEST`。

验证结果：聚焦 contract 测试 43/43 通过，完整 credential-free/no-network 测试 170/170 通过，`npm run build` 通过。独立最小探针稳定复现了下列 5 个 blocker；现有绿灯不覆盖这些路径。

## Critical Issues

### CR-01：完整 ProviderConfig 被作为 inference 传给 provider，泄漏 API key 与 endpoint

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:96-106`
**Issue:** `const inference = options.providerConfig` 只在 TypeScript 类型层声明为 `Pick<ProviderConfig, "model" | "temperature" | "maxTokens">`，运行时没有做字段投影。生产 `createServer()` 实际传入的是含 `apiKey`、`baseUrl`、timeout/retry 参数的完整 `ProviderConfig`，因此 `ProviderReviewRequest.inference` 会携带所有这些字段。注入 provider 或保留请求引用的 provider 可直接读取凭据，违反 `ProviderReviewRequest` 接口及文档“provider 只接收 allowlisted model/inference settings”的边界。独立探针捕获到 inference keys 为 `apiKey, baseUrl, model, timeoutMs, maxRetries, maxTotalWaitMs, temperature, maxTokens`，并成功读取 API key sentinel。

**Fix:** 永远构造新的严格三字段对象，并对运行时值执行 allowlist/finite/bounds 校验；不要把配置对象本身挂入请求。

```ts
const config = options.providerConfig ?? DEFAULT_PROVIDER_INFERENCE;
const inference: ProviderInferenceSettings = {
  model: config.model,
  temperature: config.temperature,
  maxTokens: config.maxTokens
};
```

再加入一个使用完整 production-shaped `ProviderConfig` 的测试，断言 provider 捕获的 `Object.keys(request.inference)` 恰好只有三项，且请求序列化中没有 key、URL、timeout 或 retry 字段。

### CR-02：冻结 provider 请求会递归冻结调用方拥有的配置对象

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:97-118`
**Issue:** `providerRequest()` 将 `options.providerConfig` 按引用放入 `request.inference`，随后 `freezeProviderRequest()` 深度递归并调用 `Object.freeze`。这会越过请求对象边界，直接冻结 server/embedder 拥有的配置对象。独立探针在一次正常调用后得到 `Object.isFrozen(config) === true`。调用方之后轮换 model、token limit，尤其是复用同一配置对象做凭据轮换时，会静默失败或抛 `TypeError`；并发请求第一次触发的隐式冻结也形成未声明的共享状态变化。

**Fix:** 在冻结前深拷贝所有外部输入，尤其按 CR-01 的方式新建 inference；`freezeProviderRequest` 只能遍历请求私有对象。加入断言：请求及其子树冻结，但原始 `providerConfig` 保持未冻结且仍可修改。

### CR-03：cleanup 清空 payload，却在 retained claims 中保留敏感原文

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/review/analysis.ts:114-154`
**Issue:** `requirements` 和 `solutionClaims` 在创建 analysis 时复制了原始/表格文本到 `Claim.text`，还生成了 `key`、`tokens` 和可含原值的 `value`。09-05 的 cleanup 只清理 `payload.text`、captured table cells 和 bytes；若 analyzer 保留收到的 analysis 引用，handler 返回后仍可读取全部 claim 文本。独立探针显示 payload text 已是 `undefined`，但 retained analysis 中仍有 `"Threshold must be 4."` 与 `"Threshold = 3."`。表格 obligation/solution 同样会通过 claims 绕过 cell 擦除。这与文档“cleanup clears transient text and table strings”的安全承诺不符。

**Fix:** 在 `createReviewAnalysisInput` 中保存 claim 对象与数组的稳定引用；cleanup 对每个 claim 的 `text`、`key`、`value`、`tokens` 做 best-effort 清除，并清空 requirements/solutionClaims 数组。若无法可靠擦除 immutable string 的既有副本，应收窄文档承诺并明确 injected analyzer/provider 可自行保留其已接收的数据。

```ts
for (const claim of capturedClaims) {
  attempt(() => { claim.text = ""; });
  attempt(() => { claim.key = ""; });
  attempt(() => { claim.value = undefined; });
  attempt(() => { claim.tokens.splice(0); });
}
attempt(() => { requirements.splice(0); });
attempt(() => { solutionClaims.splice(0); });
```

### CR-04：analyzer 返回 findings 可在 provider await 期间竞态篡改

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:190-215,248-263`
**Issue:** `reviewResponseSchema.parse()` 在 line 201 创建了已验证的 deterministic snapshot，但后续 `InternalReviewResult` 和最终 merge 仍使用 analyzer 原始返回数组 `deterministicFindings`。provider 调用引入 `await` 后，analyzer 可通过保留引用并在 microtask/timer 中改写数组或 finding。独立探针让 analyzer 在 microtask 中把首个 title 改为空字符串：deterministic-only snapshot 本来有效，但 provider-backed 调用最终返回 `INTERNAL_ERROR`。若改写仍满足 schema，则最终 deterministic 内容也会在 analyzer 返回后被静默改变，破坏隔离和 provenance 的稳定性。

**Fix:** analyzer 输出第一次成功 parse 后，只使用 `deterministicResponse.findings` 这一解析副本进行 ID 冲突检查、内部保存和最终 merge；可再深冻结该 snapshot，避免任何后续共享引用。

```ts
const trustedDeterministicFindings = deterministicResponse.findings;
// namespace and merge only against trustedDeterministicFindings
findings: [...trustedDeterministicFindings, ...providerFindings]
```

加入 deferred provider 测试：analyzer 返回后异步 mutate 原数组，最终响应仍须等于 mutation 前的 parsed snapshot。

### CR-05：provider 请求预构建异常逃出 cleanup/内部错误边界并误报客户端错误

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:177-189,305-328`
**Issue:** analysis 与 analyzer clone 建好后，`providerRequest()`、fingerprint 和 deep-freeze 在主 `try` 之前执行。任何 server-side `providerConfig` getter、fingerprint 构建或 freeze 的 `TypeError`/`RangeError` 都会绕过 lines 269-275 的两组 cleanup，然后被 `handleReviewRequest` 的通用 native-error 分支误归类为 `INVALID_REQUEST`/`LIMIT_EXCEEDED`。独立探针让 `providerConfig.model` getter 抛 `TypeError`，实际公开结果是 `{ok:false, code:"INVALID_REQUEST"}`，尽管客户端 request 完全合法。这重新引入了 09-05 要关闭的错误归因问题，并使已构建 transient analysis 不经过承诺的 cleanup。

**Fix:** 在 analysis 创建后立即进入一个覆盖 setup、analyzer、provider、projection 的 `try/finally`，在 `finally` 中总是执行两个 saved cleanup。provider request 构建异常应在 server/provider 配置边界转成 sanitized `INTERNAL_ERROR`（或启动期 `PROVIDER_CONFIGURATION`），绝不能交给客户端请求的 TypeError/RangeError 映射。

```ts
let pendingError: unknown;
try {
  expectedProviderRequest = buildAndFreezeProviderRequest(...);
  // analyzer/provider/response work
} catch (error) {
  pendingError = classifyInternalSetupError(error);
} finally {
  cleanupBothPreservingEarlierTypedError();
}
```

## Warnings

### WR-01：provider boundary 测试使用简化配置，未覆盖真实服务器对象形状

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:755-779`
**Issue:** 测试只传 `{model, temperature, maxTokens}`，因此无法发现生产 `createServer()` 传入完整 `ProviderConfig` 后的秘密传播和外部对象冻结。名为“never serializes provider configuration”的测试也只检查最终响应/错误 envelope，没有检查 provider 实际收到的 request。

**Fix:** 增加 production-shaped config 与 capture provider：精确断言 inference key allowlist、sentinel 不进入请求，并断言原配置对象及嵌套值未被冻结。

### WR-02：cleanup 与隔离矩阵没有保留 claims 或异步 analyzer 输出

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:510-690`
**Issue:** mutation matrix 只在 `analyze()` 内同步修改输入；cleanup matrix 只保留 payload/cell/buffer。它既不检查 `requirements`/`solutionClaims` 的清除，也不在 provider await 期间修改 analyzer 返回数组，所以 CR-03 与 CR-04 都能在 31 个 provider contract tests 全绿时存在。

**Fix:** 保留完整 analyzer analysis 并在 handler 完成后检查 claims；另用 deferred provider 或 microtask 修改 analyzer 原始 finding 数组，断言最终 deterministic snapshot 不变。

### WR-03：文档称严格 provider envelope 会“discard”私有字段，实际实现会拒绝整个结果

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:70`
**Issue:** 文档写的是 strict envelope “discard non-public fields”，但 `providerReviewResultSchema.strict()` 遇到额外字段会返回 `PROVIDER_FAILURE`；对应测试 lines 858-889 也明确期待失败。这会让 provider/嵌入方误以为携带额外内部元数据仍会成功、只是不公开，实际却使整次 review 失败。

**Fix:** 将文档改为“rejects envelopes containing non-public/unknown fields”，或若确实希望 discard，则把实现改成显式 allowlist projection 后再 strict-validate projected shape，并为行为锁定成功/失败测试。

---

_Reviewed: 2026-09-03T17:05:51Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
