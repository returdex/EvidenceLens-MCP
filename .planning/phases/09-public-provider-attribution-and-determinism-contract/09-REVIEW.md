---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-02T18:21:36Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - docs/mcp-contract.md
  - src/contracts/review.ts
  - src/providers/types.ts
  - src/tools/review.ts
  - tests/contract/public-contract-docs.test.ts
  - tests/contract/review-provider.test.ts
  - tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json
findings:
  critical: 3
  warning: 2
  info: 0
  total: 5
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-02T18:21:36Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

本次在 Phase 09 gap closure 后重新审查 7 个明确列入范围的文件，并独立复核 provider 结果边界、公开 attribution、citation/hash provenance、错误映射、确定性 fixture 与文档契约。现有 focused suite（5 个测试文件、35 个测试）和 TypeScript build 均通过，但最小复现实验仍证明 3 个发布阻断缺陷：非视觉 PDF citation 可携带任意未绑定 hash；带异常 getter 的不可信 provider 结果会被误报为客户端 `INVALID_REQUEST`；新增 analyzer seam 抛出的原生异常仍被误报为 `INVALID_REQUEST` 或 `LIMIT_EXCEEDED`。另有 2 个契约/测试可靠性警告。

旧报告中 CR-01、CR-02、CR-03、WR-01、WR-02 的原始场景已关闭；CR-04 的 image/screenshot 场景已关闭，但其修复要求包含的非视觉 PDF hash 约束仍未实现，因此只能判定为部分关闭。WR-03 明确归属 Phase 10，不计入本报告 findings，也不阻断 Phase 09。

## 旧报告逐项复核

| 旧项 | 结论 | 复核证据 |
| --- | --- | --- |
| CR-01 | 已关闭 | `reviewResponseSchema` 现强制 attribution iff，并拒绝缺失、额外、错误及混合 namespace；对应 contract matrix 已覆盖。 |
| CR-02 | 已关闭 | 配置 provider 后所有返回值先经严格 `providerReviewResultSchema.safeParse`；null、undefined 与结构不完整值均返回稳定 `PROVIDER_FAILURE`。 |
| CR-03 | 已关闭（原始场景） | `ReviewProvider.review()` 抛出的 TypeError、RangeError、Error 与非 Error 值均在调用边界包装为 `ProviderError`；测试覆盖完整错误对象。CR-02（本报告）记录返回对象读取阶段仍存在的相邻缺口。 |
| CR-04 | 部分关闭 | image/screenshot citation 现在必须携带并匹配 retained payload hash；但旧修复建议同时要求拒绝非视觉 PDF citation 的 hash，该路径仍可通过完整响应 schema，见本报告 CR-01。 |
| WR-01 | 已关闭 | 文档已把稳定顺序/内容限定到 deterministic analyzer，明确 provider finding 内容与顺序可变化；负向文档 matcher 覆盖旧矛盾措辞。 |
| WR-02 | 已关闭 | frozen MCP fixture 现有 15 个 finding，覆盖 contradiction、omission、requirement_conflict；测试同时锁定完整 bytes 与独立手写 ordered projection。 |
| WR-03 | Phase 10 deferred | Docker full-boundary 不属于 Phase 09 blocker；本轮未审查或修改该 E2E 路径。 |

## Critical Issues

### CR-01: [BLOCKER] 非视觉 PDF citation 可公开任意未绑定的 payload hash

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/contracts/review.ts:302-307`
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/contracts/review.ts:417-418`; `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:129`

**Issue:** `reviewCitationSchema` 仅在 PDF citation 的 `visual === true` 时要求 hash，却没有在 `visual === false` 时禁止 `visualPayloadSha256`。response-level 通用检查又使用 `evidence.visualPayloads?.every(...)`；当 PDF 没有 retained visual payloads 时，该表达式得到 `undefined`，不会添加 issue。实测一个 `visual:false`、携带任意 64 位 hash、且 PDF 没有 visual payload 的完整 provider-backed response 被 `reviewResponseSchema.safeParse` 接受。该行为违反文档“PDF page citation is visual only when ... and then carries visualPayloadSha256”以及本地 citation/hash provenance 保证。

**Fix:** 在 citation schema 中建立 PDF 的双向约束，并让 response-level 检查显式处理不存在的 payload 集合。

```ts
if (kind === "pdf" && !citation.visual && citation.visualPayloadSha256 !== undefined) {
  ctx.addIssue({
    code: "custom",
    path: ["visualPayloadSha256"],
    message: "non-visual PDF citations must not carry a visual payload hash"
  });
}
```

同时增加完整 response 与 injected-provider 回归：非视觉 PDF + 任意/真实 hash 必须失败；视觉 PDF 仅在 page/hash 与 retained payload 精确匹配时成功。

### CR-02: [BLOCKER] 不可信 provider 结果的读取异常仍被误报为客户端输入错误

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:169-176`
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:243-249`

**Issue:** 新的 provider try/catch 只包围 `await options.provider.review(...)`。返回值随后作为“不可信 unknown”传给 Zod；若返回对象是 Proxy、访问器属性或其他在读取字段时抛出 TypeError/RangeError 的对象，`safeParse` 本身会抛出，而不是返回 `success:false`。异常落到外层按异常类猜测来源，TypeError 被映射为 `INVALID_REQUEST`，RangeError 被映射为 `LIMIT_EXCEEDED`。实测 provider 返回一个仅在读取 `provider` 字段时抛 TypeError 的 Proxy，MCP 得到 `{ok:false, code:"INVALID_REQUEST", message:"Invalid request"}`，违反所有 provider boundary failure 都应成为稳定 `PROVIDER_FAILURE` 的契约。

**Fix:** 将 provider 返回后的 schema parse、identity validation、namespacing 和 provider-only projection 一并放入 provider-owned error boundary；已有 `ProviderError` 原样重抛，其余异常统一转换为不携带 cause/message 的 `ProviderError("PROVIDER_INVALID_RESPONSE")`。最终 merged-response parse 仍应留在该边界之外，以免掩盖本地错误。

```ts
try {
  const parsed = providerReviewResultSchema.safeParse(untrustedProviderResult);
  if (!parsed.success) throw new ProviderError("PROVIDER_INVALID_RESPONSE");
  validateProviderResultIdentity(options.provider, expectedProviderRequest, parsed.data);
  // namespace and validate provider-only projection here
} catch (error) {
  if (error instanceof ProviderError) throw error;
  throw new ProviderError("PROVIDER_INVALID_RESPONSE");
}
```

增加 Proxy/throwing-getter 回归，分别覆盖 TypeError 与 RangeError，并断言完整 sanitized `PROVIDER_FAILURE` payload。

### CR-03: [BLOCKER] Analyzer 原生异常仍被归因于请求或证据限额

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:142-145`
**Related:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:243-248`

**Issue:** Phase 09 新增了可注入的 `ReviewHandlerOptions.analyzer`，但 `analyzer.analyze()` 仍位于全链路 TypeError/RangeError 映射之内。实测 injected analyzer 抛 TypeError 时返回 `INVALID_REQUEST`，抛 RangeError 时返回 `LIMIT_EXCEEDED`。这两者都是服务端/analyzer 实现故障，不是客户端输入或已识别的 evidence parser limit，错误分类会误导调用方的修复与重试行为。现有测试只覆盖 analyzer 返回 schema-invalid finding，没有覆盖 analyzer 抛异常。

**Fix:** 在 analyzer 边界把所有实现异常转换为 `INTERNAL_ERROR`，或移除外层按原生异常类型进行全链路归因，改由 normalization/parser 在其实际来源处抛明确的 `EvidenceLensError`。

```ts
let deterministicFindings: readonly ReviewFinding[];
try {
  deterministicFindings = analyzer.analyze(analysis);
} catch {
  throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
}
```

增加 injected analyzer 的 TypeError、RangeError、普通 Error 与非 Error 回归，均断言完整 `INTERNAL_ERROR` 响应且不泄漏 sentinel。

## Warnings

### WR-01: [WARNING] Provider attribution grammar 测试因缺少 provider findings 而产生假阳性覆盖

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:163-176`

**Issue:** `invalidProviders` 循环从 deterministic-only response 克隆候选对象并添加 `metadata.provider`。每个候选都会先因“attribution without provider findings”失败，因此这些断言无法证明大小写、model 空格/换行/URL/路径、长度或额外 `promptVersion` 字段真的被各自拒绝。若 provider attribution 子 schema 将来被意外放宽，这组测试仍然全绿。

**Fix:** 从有效的 `attributed` response 克隆每个候选并保留 provider finding；对 name 变体同步 provider finding namespace，使每个 case 只因目标 grammar 违规而失败。也可直接对 `reviewProviderAttributionSchema` 做表驱动测试，再保留一组完整 response integration assertion。

### WR-02: [WARNING] INVALID_REQUEST 示例与同页稳定错误契约及实际输出矛盾

**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:139-143`

**Issue:** error response 示例写成 `{"code":"INVALID_REQUEST","message":"Review request failed validation"}`，但紧随其后的稳定消息列表规定 `INVALID_REQUEST` 的消息是 `Invalid request`，实际 `toToolErrorResult` 也会归一化为 `Invalid request`。同一规范页面给出两种精确 payload，会让基于示例实现的客户端契约测试失败。

**Fix:** 将示例改为实际稳定 payload：

```json
{ "ok": false, "code": "INVALID_REQUEST", "message": "Invalid request" }
```

并在文档 contract test 中锁定 error 示例与稳定消息表，避免再次漂移。

## Deferred Scope Note

WR-03 的真实 Docker/full-boundary stdio、mount、image 与 compose 覆盖按用户要求明确归属 Phase 10。本项不是 Phase 09 finding，不计入 frontmatter counts，也不影响本报告对 Phase 09 的 blocker 判定。

## Verification Performed

- `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/providers/provider-contract.test.ts tests/providers/deepseek.test.ts`：5 files / 35 tests passed。
- `npm run build`：通过。
- 最小复现：throwing analyzer 的 TypeError → `INVALID_REQUEST`；RangeError → `LIMIT_EXCEEDED`。
- 最小复现：provider result Proxy getter TypeError → `INVALID_REQUEST`。
- 最小复现：非视觉 PDF citation 携带任意 hash 的完整 provider-backed response → schema accepted。
- `git diff --check 99ec0f4..HEAD`：通过。

---

_Reviewed: 2026-09-02T18:21:36Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
