---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-03T10:43:17Z
status: gaps_found
score: 10/13 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/11
  gaps_closed:
    - "Non-visual PDF citations now reject visualPayloadSha256, and visual PDF citations require an exact retained page/hash payload."
    - "Provider-return object parse/getter/Proxy failures now remain inside the provider-owned boundary and return exact PROVIDER_FAILURE."
    - "Exceptions thrown directly by analyzer.analyze now return exact INTERNAL_ERROR while request and limit controls retain their codes."
    - "Provider attribution grammar tests now isolate name/model grammar from a valid provider-backed response."
    - "The documented INVALID_REQUEST example now exactly matches runtime output."
  gaps_remaining:
    - "Forbidden provider-internal values can be serialized through allowed provider finding text fields."
    - "Analyzer metadata access and cleanup failures remain outside the analyzer-owned boundary and are misclassified."
  regressions: []
gaps:
  - truth: "Public provider-backed responses never serialize forbidden provider-internal metadata through any public path."
    status: failed
    reason: "A schema-valid provider can copy the current inputFingerprint or promptVersion into allowed finding prose; handleReviewRequest returns ok:true and serializes both values."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "Provider findings are projected without checking provider-controlled public strings for known forbidden request tokens."
      - path: "tests/contract/review-provider.test.ts"
        issue: "The non-serialization test uses strict-schema extra fields, produces PROVIDER_FAILURE, and never tests a valid success-shaped finding-text echo."
      - path: "docs/mcp-contract.md"
        issue: "The absolute never-public/never-serialized promise is stronger than the implemented public finding path."
    missing:
      - "Reject known forbidden request/provider tokens in every provider-controlled public string before projection, including inputFingerprint and promptVersion."
      - "Add success-shaped echo regressions across all public finding text fields, asserting exact sanitized PROVIDER_FAILURE and no sentinel serialization."
      - "Make the documented guarantee match an enforceable non-secret implementation."
  - truth: "All analyzer implementation exceptions are owned by the analyzer boundary and return the exact sanitized INTERNAL_ERROR response."
    status: failed
    reason: "Only analyzer.analyze is caught. TypeError/RangeError from analyzer.name/version getters or analyzer-mutated analysis.clear become INVALID_REQUEST/LIMIT_EXCEEDED."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "Analyzer metadata is read after the analyzer catch, and finally invokes the mutable analysis.clear property."
      - path: "tests/contract/review-provider.test.ts"
        issue: "Tests cover direct analyze throws but omit metadata getter failures and cleanup mutation/failure."
    missing:
      - "Snapshot analyzer name/version inside the analyzer-owned catch and use those snapshots in metadata."
      - "Save a trusted cleanup function before exposing analysis to the analyzer; classify cleanup faults as INTERNAL_ERROR without overriding a more specific pending error."
      - "Add TypeError, RangeError, Error, and non-Error metadata/cleanup tests with exact INTERNAL_ERROR and redaction assertions."
deferred:
  - truth: "A credentialed full MCP/filesystem/provider/public-response E2E runs through the real provider."
    addressed_in: "Phase 10"
    evidence: "ROADMAP Phase 10 success criterion 2 owns the complete opt-in stdio/filesystem/provider/public-schema path; routine Phase 09 tests are intentionally no-network."
---

# Phase 09：Public Provider Attribution and Determinism Contract 验证报告

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Verified:** 2026-09-03T10:43:17Z
**Status:** gaps_found
**Re-verification:** Yes — after execution of gap plan 09-03

## Goal Achievement

### Observable Truths

ROADMAP 的 3 条 success criteria、旧验证的 11 条 observable truths 与 09-03 新增 truth 合并去重。SUMMARY 仅用于定位，所有判定来自当前代码、测试和独立探针。

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 公开响应稳定标识 deterministic analyzer 与 provider/model，且任何公开路径均不暴露 keys、envelopes、fingerprints、prompt/version 或其他禁止的 provider 内部值。 | ✗ FAILED | `metadata.provider` 是 strict `{name,model}`，但实际 `inputFingerprint` 和 `promptVersion` 可由 provider 放入 finding 文本并随 `ok:true` MCP text 公开。 |
| 2 | citation、hash、requestId、generatedAt provenance 在显式兼容演进后仍完整且本地绑定。 | ✓ VERIFIED | response schema 将 citation 的 evidenceId/role/hash/reference/location 与 normalized evidence 逐项绑定，视觉 hash 也绑定 retained payload。 |
| 3 | 文档与测试只对 deterministic/offline 输出承诺 byte-for-byte 稳定，并准确允许 provider 内容与顺序变化。 | ✓ VERIFIED | README 与 `docs/mcp-contract.md:64-70,127` 正确限定；语义测试通过。 |
| 4 | 两个相同 offline/deterministic 请求产生 byte-for-byte 相同且包含有意义 findings 的 MCP text。 | ✓ VERIFIED | 两次 raw text 与 21,592-byte frozen fixture 精确相等；fixture 含 15 个独立 pinned findings。 |
| 5 | Provider-backed 响应只保证 strict schema、安全 attribution、namespacing 与本地 citation/hash provenance。 | ✗ FAILED | schema、namespace、provenance 成立，但允许的 finding 文本能回显明确禁止公开的 request fingerprint/prompt version。 |
| 6 | Provider attribution 当且仅当 provider-prefixed findings 存在，且所有 namespace 匹配 `metadata.provider.name`。 | ✓ VERIFIED | `src/contracts/review.ts:374-388` 双向约束和完整 mutation matrix 均有效。 |
| 7 | 配置 provider 后，null、undefined、结构缺失和超限结果 fail closed。 | ✓ VERIFIED | strict runtime schema 在投影前执行；测试返回精确 `PROVIDER_FAILURE`。 |
| 8 | Provider 调用及返回对象 parse/read/validate/namespace/projection 异常统一成为精确 sanitized `PROVIDER_FAILURE`。 | ✓ VERIFIED | `src/tools/review.ts:169-198` 覆盖 provider-owned 路径；getter/Proxy 与 direct-throw 回归通过。 |
| 9 | Image/screenshot 与 PDF provider citation 的视觉 hash 精确绑定 retained payload。 | ✓ VERIFIED | image/screenshot 与 PDF 双向规则存在；独立合法 page-2/no-payload 探针命中目标 PDF 约束。 |
| 10 | Provider result 两个 finding arrays 分别最多 100 条，超限在 projection 前拒绝。 | ✓ VERIFIED | runtime schema 对两数组各自 `.max(100)`，handler/schema tests 通过。 |
| 11 | Frozen deterministic baseline 非空且由独立 ordered projection 锁定，文档不承诺 provider order/content determinism。 | ✓ VERIFIED | fixture、手写 oracle 与 fenced-code-aware 文档 matcher 均通过。 |
| 12 | Analyzer implementation exceptions 成为精确 sanitized `INTERNAL_ERROR`，真实 request/limit 失败保留原代码。 | ✗ FAILED | direct `analyze()` throws 已正确；name getter TypeError → `INVALID_REQUEST`，RangeError → `LIMIT_EXCEEDED`，cleanup TypeError → `INVALID_REQUEST`。 |
| 13 | 发布的 `INVALID_REQUEST` 示例精确等于 stable runtime payload，并由 executable docs test 锁定。 | ✓ VERIFIED | 文档 JSON、handler 实际结果、literal 均为 `{ok:false,code:"INVALID_REQUEST",message:"Invalid request"}`。 |

**Score:** 10/13 truths verified

## Prior Verification Gaps and 09-03 Closure

| 旧 gap | 09-03 结果 | 当前证据 |
| --- | --- | --- |
| 非视觉 PDF 任意 hash；视觉 PDF 未严格 page/hash 绑定 | ✓ CLOSED | child schema 禁止 non-visual PDF hash；response refinement 要求 cited page 对应 retained payload 且 hash 相等。 |
| Provider 返回对象 getter/Proxy 异常逃逸 | ✓ CLOSED | parse、identity、namespace、provider-only projection 均在 provider-owned catch；hostile-object tests 精确返回 `PROVIDER_FAILURE`。 |
| `analyzer.analyze()` TypeError/RangeError 误分类 | ✓ CLOSED（原始场景） | direct throws 均成为 `INTERNAL_ERROR`；metadata/cleanup 相邻路径仍失败，形成新 blocker。 |
| Attribution grammar 假阳性 | ✓ CLOSED | name mutation 同步 namespace，model mutation 仅改 model，child/full valid controls 均存在。 |
| INVALID_REQUEST 文档漂移 | ✓ CLOSED | 示例、runtime 与 exact literal 三方一致。 |

09-03 的旧直接复现场景全部关闭；新问题是同一公开安全边界和 analyzer ownership 的未覆盖相邻路径。

## New 09-REVIEW Findings Assessment

| Finding | 独立结论 | 是否阻止 Phase goal / requirement completion |
| --- | --- | --- |
| CR-01 Provider finding 文本回显禁止内部值 | 🛑 BLOCKER，已复现 | 是。违反 non-secret phase goal 与 09-01 never-serialize truth，击穿公开 provider-backed 安全边界。 |
| CR-02 Analyzer metadata/cleanup 异常误分类 | 🛑 BLOCKER，已复现 | 是。违反 09-03 analyzer ownership truth，并使 MCP-02 的稳定错误语义不准确。 |
| WR-01 non-serialization test 实为 failure-only | ⚠ WARNING，确认 | 不单独阻止，但是假阳性覆盖并直接掩盖 CR-01。 |
| WR-02 PDF wrong-page 被 location 校验短路 | ⚠ WARNING，确认 | 不阻止当前 goal；独立目标分支探针证明实现有效，但测试必须隔离正确分支。 |
| WR-03 success response 文档示例不符合 schema | ⚠ WARNING，确认 | 不单独改变 MCP-02/SAFE-03 运行时行为，但 executable contract documentation 不完整，应修复并加入 schema test。 |

## Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | Credentialed full MCP/filesystem/provider/public-response E2E | Phase 10 | ROADMAP Phase 10 SC2 明确拥有完整 opt-in 路径；routine suite 应保持 no-network。 |

两个新 blocker 未在 Phase 10/11 的 goal 或 success criteria 中被明确承接，不能 defer。

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/contracts/review.ts` | Strict attribution、namespace、citation/hash contract | ✓ VERIFIED | 473 lines；provider child strict，iff/namespace 与本地 provenance 均 substantive、wired。 |
| `src/providers/types.ts` | Untrusted provider result schema and bounds | ✓ VERIFIED | Strict result shape、grammar 与两个 100-entry bounds 被 handler 使用。 |
| `src/tools/review.ts` | Safe attribution projection and source-owned errors | ✗ BEHAVIOR FAILED | Provider data flow真实接线，但 finding prose 无 forbidden-token boundary，analyzer metadata/cleanup 不在 source-owned catch。 |
| `tests/contract/review-provider.test.ts` | Credential-free Phase 09 regression matrix | ⚠ INCOMPLETE | 20 tests 执行，但缺 success-path echo、analyzer metadata/cleanup 和真正 wrong-page branch 覆盖。 |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | Frozen meaningful offline bytes | ✓ VERIFIED | Raw fixture 与两次输出相等；15 findings 有独立 oracle。 |
| `tests/contract/public-contract-docs.test.ts` | Executable docs examples and semantic gate | ⚠ PARTIAL | Error example executable；success JSON 未提取或 schema-parse。 |
| `docs/mcp-contract.md` | Accurate public contract | ⚠ INACCURATE EXAMPLE | Determinism/error prose正确；success JSON 有假 hash、citation/evidenceIds 与 provider namespace 漂移。 |
| `README.md` | User-facing semantics/exclusions/no-network policy | ✓ VERIFIED | Scoped semantics与 no-network default 均存在并受测试读取。 |

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/providers/types.ts` | `src/tools/review.ts` | `providerReviewResultSchema.safeParse` | ✓ WIRED | 每个 configured-provider return 在身份读取/投影前解析；SDK escaped-pattern false negative 经源码纠正。 |
| `src/tools/review.ts` | `src/providers/errors.ts` | Provider-owned translation | ✓ WIRED | Direct throws 与 returned-object access errors 公开为 exact `PROVIDER_FAILURE`。 |
| `src/tools/review.ts` | `src/contracts/review.ts` | three `reviewResponseSchema.parse` calls | ✓ WIRED | Lines 150、190、205 分别验证 deterministic、provider-only 与 merged response。 |
| `src/tools/review.ts` | `src/errors.ts` | Analyzer error ownership | ⚠ PARTIAL | `analyze()` catch 已接线；metadata getter 与 mutable cleanup 落入 outer native-type guessing。 |
| `src/contracts/review.ts` | normalized visual payloads | citation page/hash refinement | ✓ WIRED | PDF/image/screenshot 均由 full response 的 normalized data 验证。 |
| Public docs | docs contract test | `readFile` + executable assertions | ⚠ PARTIAL | Error JSON 可执行；success JSON 未验证。 |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `metadata.provider` | name/model | parsed provider result + invoked request identity | Yes | ✓ FLOWING；仅两个 allowlisted fields。 |
| Provider findings | public prose | `ReviewProvider.review().modelFindings` → schema → namespace → merge | Yes | ✗ UNSAFE FLOW；known internal tokens 可进入 JSON。 |
| Deterministic metadata/findings | analyzer identity + findings | `ReviewAnalyzer` | Yes | ⚠ FLOWING；normal path 正常，hostile metadata/cleanup 错误归属失败。 |
| Citation provenance | references/hashes/visual payload | locally normalized evidence | Yes | ✓ FLOWING；provider citation 必须匹配本地数据。 |
| Frozen offline response | raw MCP text | fixture request through handler | Yes | ✓ FLOWING；稳定、非空、无 provider/network。 |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Focused provider/docs suite | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` | 2 files / 31 tests passed | ✓ PASS |
| Strict TypeScript build | `npm run build` | exit 0 | ✓ PASS |
| Full routine suite | `npm test` | 26 files / 158 tests passed；live test excluded | ✓ PASS |
| Forbidden-token provider echo | Independent built-handler probe | `ok:true`；fingerprint in summary、prompt version in observation | ✗ FAIL |
| Analyzer name getter TypeError | Independent probe | exact public code is `INVALID_REQUEST` | ✗ FAIL |
| Analyzer name getter RangeError | Independent probe | exact public code is `LIMIT_EXCEEDED` | ✗ FAIL |
| Analyzer-mutated cleanup TypeError | Independent probe | exact public code is `INVALID_REQUEST` | ✗ FAIL |
| PDF legal-page/no-retained-payload | Independent schema probe | Rejected specifically by retained-page binding | ✓ PASS |
| Documented success response | Extract JSON + `reviewResponseSchema.safeParse` | Four schema issue classes; parse fails | ✗ FAIL (WARNING) |

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MCP-02 | 09-01, 09-02, 09-03 | Deterministic/schema-valid successes and machine-readable rejected-request errors. | ✗ BLOCKED | Offline determinism/schema pass，但 analyzer-owned metadata/cleanup faults 被公开误分为 caller/limit errors，违反本阶段稳定错误合同。 |
| SAFE-03 | 09-01, 09-02, 09-03 | Findings retain source location/hash, provider/model version, and request/timestamp provenance. | ✓ SATISFIED | Source/hash/location/visual payload、provider/model、requestId/generatedAt 均存在并受 schema/handler tests 绑定。 |

ROADMAP/REQUIREMENTS 对 Phase 09 仅映射 MCP-02、SAFE-03，三个计划均声明两者；无 orphaned requirement。REQUIREMENTS.md 的勾选状态不是通过证据。

## No-Live-Provider / Network Independence

`package.json` 的默认 `npm test` 设置 `EVIDENCELENS_DISABLE_PROVIDER=1` 并排除 `tests/providers/deepseek-live.test.ts`。focused/full suite 均在该命令下通过；Phase 09 provider 行为由 injected fake providers 验证，没有凭据、真实 provider 或网络依赖。真正 credentialed/full-boundary E2E 依 ROADMAP 留给 Phase 10。

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | 177-205 | Provider-controlled allowed strings直接公开 | 🛑 Blocker | strict object allowlist 无法阻止内部值经 finding prose 回显。 |
| `src/tools/review.ts` | 145-160, 206-207 | Analyzer boundary只包 `analyze()` | 🛑 Blocker | Metadata/cleanup TypeError/RangeError 被误判。 |
| `tests/contract/review-provider.test.ts` | 516-559 | `successText` 实际来自 invalid strict result | ⚠ Warning | 非泄漏断言可在无成功投影时通过。 |
| `tests/contract/review-provider.test.ts` | 285-286, 315 | wrong-page 使用不存在 location | ⚠ Warning | 更早 location validation 掩盖目标 branch。 |
| `docs/mcp-contract.md` | 74-124 | Success JSON 不符合 runtime schema | ⚠ Warning | 示例不可执行，测试未锁定。 |

除文档明确说明的 opt-in live fixture placeholder 外，未发现 TODO/FIXME、空 handler、orphaned core artifact 或其他 stub。`git diff --check` 通过。

## Human Verification Required

None. 所有 goal-impacting failures、PDF 分支、文档漂移与 no-network 属性均可程序化验证。

## Gaps Summary

Phase 09 尚未达成。09-03 已关闭旧验证的 PDF provenance、provider returned-object boundary、direct analyzer throw、grammar 假阳性和 INVALID_REQUEST 文档漂移；但公开安全边界仍允许 provider 将内部 fingerprint/prompt version 放进合法 finding 文本并成功序列化，analyzer metadata/cleanup 的 TypeError/RangeError 仍被错误归因。前者违反 non-secret phase goal，后者阻断 MCP-02 的稳定错误语义。

新 REVIEW 的 2 个 BLOCKER 与 3 个 WARNING 均成立。PDF warning 不代表当前实现失效；另外两个 warning 暴露测试与文档合同可靠性缺口。Phase 10/11 未明确承接两个 blocker，因此必须先关闭。

---

_Verified: 2026-09-03T10:43:17Z_
_Verifier: the agent (gsd-verifier)_
