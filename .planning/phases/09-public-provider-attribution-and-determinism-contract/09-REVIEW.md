---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-03T13:01:25Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/tools/review.ts
  - tests/contract/review-provider.test.ts
  - tests/contract/public-contract-docs.test.ts
  - docs/mcp-contract.md
findings:
  critical: 4
  warning: 2
  info: 0
  total: 6
status: issues_found
---

# Phase 09：代码复审报告

**Reviewed:** 2026-09-03T13:01:25Z  
**Depth:** standard  
**Files Reviewed:** 4  
**Status:** issues_found

## Summary

09-04 已关闭上一份报告中 2 个 blocker 与 3 个 warning 的原始复现路径：合法 finding prose 中的当前 fingerprint/promptVersion 会被拒绝；analyze/name/version/cleanup 的直接 throw 会被归类为 `INTERNAL_ERROR`；原 failure-only envelope 测试已被明确标注并补充成功形状 echo 测试；PDF wrong-page 测试命中了 retained-page refinement；成功示例也能通过 `reviewResponseSchema`。

但是，独立探针发现修复边界仍存在 4 个必须在发布前处理的正确性/安全问题：token walker 会拒绝合法本地 provenance；analyzer 元数据可伪造并通过成功路径公开；analyzer 对共享 analysis 的变更可逃出 analyzer 错误边界并被误报为客户端错误；cleanup 一旦抛错就不会实际清除任何后续敏感内容。另外有 2 个回归质量缺口，使上述问题未被现有 37 个聚焦测试捕获。

验证结果：聚焦测试 37/37 通过，严格 TypeScript build 通过，全套 credential-free/no-network 测试 164/164 通过；这些通过结果不覆盖下列独立复现。

## Critical Issues (BLOCKER)

### CR-01：全树 token walker 会把合法本地 provenance 当成 provider 泄漏

**Classification:** BLOCKER  
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:119-137`（调用点 `:212-216`）  
**Issue:** `assertNoForbiddenProviderStrings` 扫描 namespaced finding 的所有字符串，包括 `evidenceIds[]`、`citations[].evidenceId`、`sourceReference` 与 location 字符串。这些字段随后会被 `reviewResponseSchema` 约束为本地 normalized evidence，并不都是可自由承载 provider 数据的 prose。请求 schema 合法允许 evidence ID 为 `evidencelens-review-v1`；当 provider 返回与本地 evidence 完全一致的 citation 时，walker 仍因 ID 含当前 `promptVersion` 而返回精确 `PROVIDER_FAILURE`。这是一条无需恶意 provider 的稳定误拒绝路径，破坏合法 provider-backed 行为。

独立复现结果：以 `evidencelens-review-v1` 作为 assignment evidence ID，返回 schema-valid、本地绑定的 finding，实际得到 `{ "ok": false, "code": "PROVIDER_FAILURE", "message": "Provider failure" }`。

**Fix:** 先完成本地 provenance 校验，再只检查 provider 可自由创作的字段，例如：

```ts
reviewResponseSchema.parse({
  ...deterministicResponse,
  findings: providerFindings,
  metadata: { ...deterministicResponse.metadata, ...providerMetadata }
});

for (const finding of providerFindings) {
  assertNoForbiddenProviderStrings(
    [finding.id, finding.title, finding.summary, finding.observation,
     finding.interpretation, finding.uncertainty, ...finding.followUpChecks],
    forbiddenProviderValues
  );
}
```

不要扫描已证明等于本地输入的 citation/evidence provenance；同时增加 evidence ID、sourceReference、table sheet 等合法值恰好等于 promptVersion 的成功控制。

### CR-02：analyzer 可通过成功元数据伪造身份或公开 sentinel

**Classification:** BLOCKER  
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:169-190`  
**Issue:** getter throw 已被 catch，但 getter 的返回值只受通用响应 schema 的非空长度限制，没有验证 `ReviewAnalyzer` 的运行时固定身份。导出的 `handleReviewRequest` 接受运行时注入对象；`name: "analyzer-secret-sentinel"`、`version: "9.9.9"` 且 `analyze() => []` 会返回 `ok:true`，并把这两个值原样放进公开 metadata。TypeScript 的 literal interface 不能约束 JavaScript、`as` 强转或 hostile getter，因此 public analyzer attribution 既不稳定也不可信，并存在成功路径 sentinel 泄漏。

**Fix:** 在 analyzer-owned catch 内读取一次后，按运行时 allowlist 验证固定身份；不匹配时抛出新的 sanitized `INTERNAL_ERROR`：

```ts
const analyzerName = analyzer.name;
const analyzerVersion = analyzer.version;
if (analyzerName !== "deterministic-rules" || analyzerVersion !== "1.0.0") {
  throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
}
```

加入合法长度但错误的 name/version、返回 secret sentinel、getter 多次变化的测试，并断言 payload/log 中无 sentinel。

### CR-03：analyzer 对共享 analysis 的变更可逃出错误边界并被误报为 INVALID_REQUEST

**Classification:** BLOCKER  
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:172-196`  
**Issue:** analyzer 获得可变的 `analysis`，但 analyzer-owned catch 在 `analyze/name/version` 返回后即结束；随后 `providerRequest(analysis, ...)` 在该边界之外读取同一对象。analyzer 可替换 `payloads[0]`、`requirements`、`solutionClaims` 或其属性 getter。若替换后的 `evidenceId` getter 抛出 `TypeError`，异常直接到达 `handleReviewRequest` 的原生类型分类器并被公开为 `INVALID_REQUEST`，provider 甚至没有被调用。这把服务端 analyzer 故障错误归因给客户端，也允许 analyzer 在 provider 调用前篡改 provider 输入和 fingerprint。

独立复现结果：analyzer 将 `payloads[0]` 换成仅在读取 `evidenceId` 时抛 `TypeError` 的 Proxy；实际响应为 `INVALID_REQUEST`，且 provider call count 为 0。

**Fix:** 不要在 analyzer 运行后从 analyzer 可变对象构造 provider request。可在调用 analyzer 前从可信 analysis 快照构造 provider request，或向 analyzer 传递深度只读/隔离视图；所有因 analyzer 变更导致的后续访问异常必须在 analyzer-owned 边界内转为新的 `INTERNAL_ERROR`。增加对 payload/requirements/solutionClaims/normalizedEvidence mutation 与 throwing getter 的精确分类测试。

### CR-04：cleanup 抛错时返回 INTERNAL_ERROR，但敏感 transient 内容并未清除

**Classification:** BLOCKER  
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:163-164,247-250`  
**Issue:** 保存 bound cleanup 只防止替换 `analysis.clear`，不能保证清理完成。底层 clear 在遍历前把 `cleared` 设为 true，并在任一 payload getter/fill 抛错时立即中止。`createReviewResponse` 捕获异常后只改错误分类，不再尽力清理。独立探针让首个 payload 的 `bytes` getter 抛错后，handler 虽返回 sanitized `INTERNAL_ERROR`，但捕获的 4 个 payload 的 `text` 全部仍然存在。这违反文档“transient raw text/buffers are cleared after analysis”的安全保证；对 bytes 的同类故障还可能留下未归零缓冲区。

**Fix:** cleanup 必须针对调用 analyzer 前保存的原始 payload 引用做 best-effort 全量擦除；每个字段单独保护，记录首个内部错误但继续处理其余 payload，并只在完成尝试后标记 cleared。示意：

```ts
let cleanupError: unknown;
for (const payload of trustedPayloads) {
  try { payload.bytes?.fill(0); } catch (error) { cleanupError ??= error; }
  try { payload.bytes = undefined; } catch (error) { cleanupError ??= error; }
  try { payload.text = undefined; } catch (error) { cleanupError ??= error; }
  try { payload.tableCells = undefined; } catch (error) { cleanupError ??= error; }
}
if (cleanupError !== undefined) throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
```

测试必须保留原始 payload/byte 引用，在 handler 返回后断言所有可清字段均为 `undefined`、所有原始 byte buffers 均为零，而不只是检查错误码。

## Warnings

### WR-01：echo 测试只覆盖 prose，既未锁定全树承诺，也没有合法碰撞控制

**Classification:** WARNING  
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:719-770`  
**Issue:** 测试名声称覆盖“every public provider prose field”，实际只 mutation 六个 prose/follow-up 字段。计划与实现还覆盖 finding ID、evidenceIds、citations 和 typed location 字符串，但测试没有验证这些路径，也没有任何“本地 provenance 恰好包含 promptVersion 仍应成功”的负向控制。因此测试无法发现 CR-01，并且未来缩窄/扩展 walker 时容易产生 bypass 或误拒绝。

**Fix:** 明确区分 provider-authored 字段与 locally-bound provenance：为每个可自由承载 provider 字符串的字段加入 fingerprint/promptVersion rejection；为 evidenceId、sourceReference、table sheet 等本地绑定字段加入 exact-value success controls；每个 case 先断言未注入 token 的基线为 schema-valid `ok:true`。

### WR-02：成功文档测试仅证明 schema 接受，示例并非内置 runtime 可产生的响应

**Classification:** WARNING  
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:74-120`; `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/public-contract-docs.test.ts:152-158`  
**Issue:** 当前示例通过 `reviewResponseSchema`，但其 deterministic contradiction 只有 assignment citation，ID 也是 `contradiction-example`。内置 analyzer 的 contradiction 必须同时来自 requirement 与 solution claim，并按内容生成 hash-suffixed ID；因此该示例不是当前内置 runtime 能产生的输出。测试只 parse 手写 JSON，无法检测 runtime 字段、analyzer 行为或固定字节漂移，仍属于部分自证式文档。

**Fix:** 用一个小型、稳定、包含四个 required roles 的文档请求调用 `handleReviewRequest`，将实际 deterministic-only payload 与 fenced JSON 做 exact equality（或生成并锁定该示例）；至少应使用内置 analyzer 实际生成的 ID、citations、evidenceIds 和 normalized evidence，而不是仅构造 schema-valid 对象。

## Prior Findings Closure

- 旧 CR-01（fingerprint/promptVersion 通过合法 prose 泄漏）：直接泄漏路径已关闭；CR-01 是新引入的 provenance false positive。
- 旧 CR-02（analyzer metadata/cleanup throws 误分类）：直接 throw matrix 已关闭；CR-03/CR-04 是共享状态与实际擦除的相邻缺口。
- 旧 WR-01（failure-only non-serialization 测试）：已明确断言 invalid envelope，并新增成功形状 prose echo matrix。
- 旧 WR-02（PDF wrong-page 被 location 校验短路）：已关闭；page 2 reference 合法、non-visual control 成功，并精确断言 retained-page issue 且排除 location issue。
- 旧 WR-03（成功示例不符合 schema）：schema 漂移已关闭；WR-02 记录仍未满足 runtime fidelity。

---

_Reviewed: 2026-09-03T13:01:25Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
