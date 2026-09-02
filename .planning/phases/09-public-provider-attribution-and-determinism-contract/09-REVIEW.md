---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-02T16:04:36Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - README.md
  - docs/mcp-contract.md
  - src/contracts/review.ts
  - src/tools/review.ts
  - tests/contract/public-contract-docs.test.ts
  - tests/contract/review-provider.test.ts
  - tests/e2e/docker-review.test.ts
  - tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json
findings:
  critical: 4
  warning: 3
  info: 0
  total: 7
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-02T16:04:36Z  
**Depth:** standard  
**Files Reviewed:** 8  
**Status:** issues_found

## Summary

本次审查覆盖 Phase 09 指定的 8 个文件，并沿 provider 类型、provenance 校验和错误映射调用链核对了公开契约。构建与 18 个相关测试均通过，但实证仍发现 4 个必须在发布前修复的契约/正确性缺陷：provider attribution 的 iff 语义没有被 schema 强制执行；空 provider 结果会静默降级为成功；provider 原生异常会被误报为客户端错误；图像 citation 可在缺少视觉 payload hash 时通过并公开返回。另有 3 个测试与文档可靠性问题，使当前绿色测试无法证明所声称的确定性、部署路径和“only four guarantees”。

## Critical Issues

### CR-01: [BLOCKER] Schema 接受与 provider findings 不一致的 attribution

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/contracts/review.ts:348-400`  
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:99-107`; `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:70`

**Issue:** 文档规定 `metadata.provider` “if and only if provider findings are returned”，但 `reviewResponseSchema` 只校验 provider 子对象的格式，完全没有把它与 namespaced finding 绑定。测试甚至把 provider metadata 添加到一个没有任何 provider finding 的 deterministic-only 响应，并断言 schema 接受。反向状态同样可通过：存在 `provider:<name>:...` finding 而没有 `metadata.provider`。因此公开 schema 无法验证它声称的 attribution presence 语义，也无法证明 provider 名称与 finding namespace 一致。

**Fix:** 在 `reviewResponseSchema.superRefine` 中同时验证 presence 和 namespace：无 `metadata.provider` 时拒绝所有 provider-prefixed IDs；有 metadata 时要求至少一个 `provider:${name}:` finding，并拒绝属于其他 provider slug 的 provider finding。相应测试应把当前“手工添加 metadata 后成功”的断言改为失败，并增加正向、缺失 metadata、错误 namespace 三组案例。

```ts
const providerIds = response.findings
  .map((finding) => finding.id)
  .filter((id) => id.startsWith("provider:"));
const attribution = response.metadata.provider;

if (attribution === undefined && providerIds.length > 0) {
  ctx.addIssue({ code: "custom", path: ["metadata", "provider"], message: "provider attribution is required" });
}
if (attribution !== undefined) {
  const prefix = `provider:${attribution.name}:`;
  if (providerIds.length === 0 || providerIds.some((id) => !id.startsWith(prefix))) {
    ctx.addIssue({ code: "custom", path: ["metadata", "provider"], message: "provider attribution must match provider findings" });
  }
}
```

### CR-02: [BLOCKER] `undefined`/`null` provider 结果绕过身份校验并返回成功

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:147-157`

**Issue:** 身份校验和 finding 校验都以 `providerResult` 的 truthiness 为门槛。配置的 provider 若因实现缺陷返回 `undefined` 或 `null`，代码不会将其视为非法 provider response，而会静默返回 deterministic-only `ok:true`，且不带 attribution。这是 fail-open 行为：调用方无法区分“未启用 provider”与“provider 被调用但返回了非法空值”，provider 身份绑定也根本没有执行。

**Fix:** 将 provider 返回值视为 `unknown`，只要 provider 已配置就必须对结果执行运行时 schema 校验；空值或缺字段一律抛出 `ProviderError("PROVIDER_INVALID_RESPONSE")`。不要用 truthiness 表示验证成功。

```ts
const providerResult: unknown = options.provider
  ? await options.provider.review(expectedProviderRequest!)
  : undefined;

if (options.provider) {
  const parsedResult = providerReviewResultSchema.safeParse(providerResult);
  if (!parsedResult.success) throw new ProviderError("PROVIDER_INVALID_RESPONSE");
  validateProviderResultIdentity(options.provider, expectedProviderRequest!, parsedResult.data);
}
```

### CR-03: [BLOCKER] Provider 的原生异常被错误归类为客户端输入或证据限额错误

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:216-227`

**Issue:** `handleReviewRequest` 对整个 normalization、analysis、provider 和 response-validation 调用链统一捕获 `TypeError`/`RangeError`，并分别映射为 `INVALID_REQUEST`/`LIMIT_EXCEEDED`。实测 provider 的 `review()` 抛出 `TypeError("provider bug")` 时，MCP 返回 `{"code":"INVALID_REQUEST"}`，而文档要求所有内部 provider failure 都映射为稳定的 `PROVIDER_FAILURE`。provider SDK、transport 或 malformed provider result 触发的 `RangeError` 也会错误归因。该行为会误导重试/告警逻辑，并把服务端/provider 故障归咎于客户端。

**Fix:** 在 provider 调用边界单独捕获异常：保留已有 `ProviderError`，把其他 provider 异常包装为 `ProviderError("PROVIDER_REQUEST_FAILED")`。仅在明确的 normalization/parser 边界映射 `TypeError`/`RangeError`，不要按异常类名对整条调用链猜测来源。

```ts
let providerResult: ProviderReviewResult | undefined;
if (options.provider && expectedProviderRequest) {
  try {
    providerResult = await options.provider.review(expectedProviderRequest);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("PROVIDER_REQUEST_FAILED");
  }
}
```

### CR-04: [BLOCKER] 图像 provider citation 缺少 payload hash 仍通过本地 provenance 校验

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/contracts/review.ts:297-307`  
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/contracts/review.ts:386-397`; `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:129`

**Issue:** `reviewCitationSchema` 只要求视觉 PDF citation 提供 `visualPayloadSha256`，却没有对 `location.kind === "image"` 作同样要求；response-level 校验也只在 hash 已存在时检查匹配。实测 injected provider 返回引用真实 image evidence、`visual:true`、但省略 `visualPayloadSha256` 的 finding，最终响应仍为 `ok:true`。这直接违反文档“Image/screenshot citations ... carry the normalized visual payload hash”和“locally validated citation/hash provenance”的公开保证，导致 citation 无法绑定到实际保留的视觉字节。

**Fix:** 对 image location 强制要求 hash，并在 response-level 校验中要求它精确等于同一 evidence 的 `visualPayload.sha256`；同时拒绝 `visual:false` 的 PDF citation 携带视觉 hash。增加 injected-provider 的缺失 hash、错误 hash和正确 hash测试。

```ts
if (kind === "image" && citation.visualPayloadSha256 === undefined) {
  ctx.addIssue({ code: "custom", path: ["visualPayloadSha256"], message: "image citations require a retained visual payload hash" });
}

if (evidence.source.type === "image" || evidence.source.type === "screenshot") {
  if (citation.visualPayloadSha256 !== evidence.visualPayload?.sha256) {
    ctx.addIssue({ code: "custom", path: [...path, "visualPayloadSha256"], message: "image citation must match retained payload" });
  }
}
```

## Warnings

### WR-01: [WARNING] 文档仍无条件承诺 findings 确定性排序，测试也无法发现这项额外保证

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:127`  
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:107-114`; `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/public-contract-docs.test.ts:37-52`

**Issue:** 文档前文已把 byte equality 限定到 deterministic-only，但第 127 行仍声称“Findings and all IDs are unique and deterministically ordered”。provider findings 按 provider 返回顺序直接 `map` 后 append，没有排序；兼容 provider 可以在两次调用中返回同一 findings 集合的不同顺序。与此同时，名为“only the four guarantees”的文档测试只查找一条包含四个短语的正向 clause，不会拒绝其他位置出现额外保证，因此这处矛盾仍会绿灯。

**Fix:** 若不打算保证 provider 顺序，将第 127 行明确限定为 deterministic analyzer findings；若要保证，则在 namespace 后按稳定 key 排序。文档测试还应扫描并拒绝 provider-backed deterministic ordering/byte equality 等额外承诺，而不只是确认目标句存在。

### WR-02: [WARNING] 确定性回归 fixture 没有任何 finding，无法验证 finding 内容与排序

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:72-85`  
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json:1`

**Issue:** byte-for-byte 测试使用的 frozen response 中 `findings` 是空数组。它可以捕获 metadata 或 normalized evidence 的字节变化，却无法捕获 deterministic finding ID、precedence、排序或序列化顺序变得不确定。当前测试因此不足以支持针对“deterministic-only results”的广泛声明。

**Fix:** 增加至少一个会稳定生成多个不同类型 findings 的 frozen fixture（例如 conflict、contradiction、omission），并断言完整 MCP text 与冻结值一致；保留现有 empty-findings fixture作为无 finding 兼容案例。

### WR-03: [WARNING] “Docker E2E” 实际只测试当前进程中的内存服务器

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/e2e/docker-review.test.ts:134-160`

**Issue:** 测试直接实例化 `McpServer`、注入 host filesystem adapter，并通过 `InMemoryTransport` 调用；它没有构建或启动 Docker image，也没有经过容器 stdio、镜像内编译产物、环境变量、只读 mount 或 compose 配置。因而该测试可以在发布镜像缺少 Phase 09 代码、容器 wiring 错误或 mount/config 回归时继续通过，名称和 README 所处章节会造成错误的部署覆盖预期。

**Fix:** 将该测试改名并明确为 in-process integration test，同时新增真实容器 E2E：构建目标镜像、以只读 `/workspace` mount 启动、通过容器 stdio 完成 initialize/tools/list/tools/call，并断言 provider attribution 与无绝对路径泄漏；或让 `npm run test:e2e` 调用现有 Docker smoke harness 后执行完整 review。

---

_Reviewed: 2026-09-02T16:04:36Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
