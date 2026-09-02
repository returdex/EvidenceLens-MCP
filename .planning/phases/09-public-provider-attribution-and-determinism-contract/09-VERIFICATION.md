---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-02T18:28:15Z
status: gaps_found
score: 8/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 1/5
  gaps_closed:
    - "Attribution iff and provider namespace integrity now reject missing, extraneous, wrong, and mixed attribution states."
    - "Null, undefined, plain malformed, and oversized provider results now fail closed as PROVIDER_FAILURE."
    - "TypeError, RangeError, Error, and non-Error values thrown directly by ReviewProvider.review now map to PROVIDER_FAILURE."
    - "Image and screenshot citations now require an exact retained visual payload hash."
    - "Documentation now limits deterministic order/content to the offline deterministic analyzer, and the frozen fixture contains 15 independently pinned findings."
  gaps_remaining:
    - "Citation/hash provenance remains incomplete for non-visual PDF citations carrying visualPayloadSha256."
    - "Provider-return object property access failures escape the provider-owned error boundary and are misclassified."
    - "Injected analyzer native exceptions are misclassified as client request or parser-limit failures."
  regressions: []
gaps:
  - truth: "Existing citation/hash provenance remains locally bound and schema-valid for every provider-backed citation."
    status: failed
    reason: "A non-visual PDF citation carrying an arbitrary visualPayloadSha256 is accepted by reviewResponseSchema even when the PDF has no retained visual payload."
    artifacts:
      - path: "src/contracts/review.ts"
        issue: "reviewCitationSchema requires a hash for visual PDFs but does not prohibit one for non-visual PDFs; the response-level optional-chain check does not reject a missing payload collection."
      - path: "tests/contract/review-provider.test.ts"
        issue: "Image/screenshot hash cases are covered, but non-visual PDF plus arbitrary/real hash cases are absent."
    missing:
      - "Reject visualPayloadSha256 whenever a PDF citation is non-visual."
      - "Require visual PDF citations to match the retained payload for the cited page, and add full-response/provider regressions for both directions."
  - truth: "All untrusted provider-boundary failures are returned as the stable sanitized PROVIDER_FAILURE error."
    status: failed
    reason: "providerReviewResultSchema.safeParse and later provider-result reads are outside the provider-owned catch; throwing getters/proxies produce INVALID_REQUEST for TypeError and LIMIT_EXCEEDED for RangeError."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "Only the await options.provider.review call is wrapped; result parsing, identity reads, namespacing, and projection are not in that boundary."
      - path: "tests/contract/review-provider.test.ts"
        issue: "Tests cover direct throws and ordinary malformed values but not throwing getters or proxies returned by a provider."
    missing:
      - "Wrap provider result parsing, identity validation, namespacing, and provider-only projection in the provider-owned boundary."
      - "Convert unexpected exceptions from returned-object access to ProviderError(PROVIDER_INVALID_RESPONSE) without leaking details."
      - "Add TypeError and RangeError throwing-getter/proxy regressions asserting exact PROVIDER_FAILURE output."
  - truth: "Analyzer implementation failures are classified as stable INTERNAL_ERROR responses rather than client request or evidence-limit errors."
    status: failed
    reason: "analyzer.analyze executes inside the global native-exception classifier; TypeError becomes INVALID_REQUEST and RangeError becomes LIMIT_EXCEEDED."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "The analyzer call has no source-specific error boundary, while handleReviewRequest classifies any downstream TypeError/RangeError as input/parser failures."
      - path: "tests/contract/review-provider.test.ts"
        issue: "The invalid analyzer return-value control does not cover analyzer throws."
    missing:
      - "Convert analyzer implementation throws to INTERNAL_ERROR at the analyzer boundary, or replace global native-type guessing with source-specific typed errors."
      - "Add TypeError, RangeError, Error, and non-Error analyzer-throw regressions with exact INTERNAL_ERROR and sentinel-redaction assertions."
deferred:
  - truth: "A real Docker/full-boundary test exercises image, container stdio, mounts, filesystem reads, provider conversion, merge, and final public schema validation."
    addressed_in: "Phase 10"
    evidence: "Phase 10 goal and success criterion 2 explicitly own runtime consistency and the complete opt-in MCP/filesystem/provider/public-response path."
---

# Phase 9：Public Provider Attribution and Determinism Contract 验证报告

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Verified:** 2026-09-02T18:28:15Z
**Status:** gaps_found
**Re-verification:** Yes — after 09-02 gap closure

## Goal Achievement

### Observable Truths

评分将 ROADMAP 的 3 条 success criteria 与两个 PLAN 的 truths 合并去重；计划中的更具体边界保留为独立 truth。SUMMARY 只用于定位文件，未作为通过证据。

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 公开响应稳定标识 deterministic analyzer 与 provider/model，且不暴露 keys、envelopes、fingerprints 或其他内部字段。 | ✓ VERIFIED | `metadata.provider` 是 strict `{name, model}`；有效 provider 响应保留 `deterministic-rules/1.0.0`；sentinel redaction 测试和源码 allowlist 均通过。 |
| 2 | citation、hash、requestId、generatedAt provenance 在显式兼容演进后仍完整且本地绑定。 | ✗ FAILED | requestId/timestamp/普通 hash 仍在，但独立 schema 复现证明 `visual:false` PDF citation 可携带任意 64 位 `visualPayloadSha256` 并被接受。 |
| 3 | 文档与测试只对 deterministic/offline 输出承诺 byte-for-byte 稳定，并准确允许 provider 内容与顺序变化。 | ✓ VERIFIED | `docs/mcp-contract.md:64-68,127` 与 README 均正确限定；fenced-code-aware matcher 覆盖 whole/provider ordering 反例。 |
| 4 | 两个相同 offline/deterministic 请求产生 byte-for-byte 相同且包含有意义 findings 的 MCP text。 | ✓ VERIFIED | focused test 两次输出等于 21,592-byte frozen text；fixture 有 15 findings，覆盖 contradiction、omission、requirement_conflict。 |
| 5 | Provider-backed 响应只保证 strict schema、安全 attribution、namespacing 与本地 citation/hash provenance。 | ✗ FAILED | variability、attribution 与 namespacing 成立，但非视觉 PDF 任意 hash 使“本地 citation/hash provenance”保证不成立。 |
| 6 | Provider attribution 当且仅当 provider-prefixed findings 存在，且所有 namespace 匹配 `metadata.provider.name`。 | ✓ VERIFIED | `src/contracts/review.ts:371-385` 建立双向约束；matching/missing/extraneous/wrong/mixed matrix 均通过。 |
| 7 | 配置 provider 后，null、undefined、普通结构缺失与超限结果 fail closed。 | ✓ VERIFIED | 运行时 strict schema 在普通结果读取前执行；6 类 nullish/malformed 测试与 101-entry 边界返回精确 `PROVIDER_FAILURE`。 |
| 8 | Provider boundary 的原生 TypeError/RangeError/Error/非 Error 故障不被误报为 INVALID_REQUEST/LIMIT_EXCEEDED。 | ✗ FAILED | 直接由 `review()` 抛出时已关闭；但返回对象 getter/proxy 在 schema 读取时抛出的 TypeError/RangeError 分别实测为 `INVALID_REQUEST`/`LIMIT_EXCEEDED`。 |
| 9 | 每个 image/screenshot provider citation 都携带并精确匹配 retained visual payload hash。 | ✓ VERIFIED | citation shape 与 response-level binding 均存在；missing/wrong/matching 的 image 和 screenshot handler 测试通过。 |
| 10 | Provider result 的两个 finding arrays 分别最多 100 条，101 条在 projection 前拒绝。 | ✓ VERIFIED | `providerReviewResultSchema` 对两个数组各自 `.max(100)`；schema 与 handler 边界测试均通过。 |
| 11 | Frozen deterministic baseline 非空且由独立 ordered projection 锁定，文档不承诺 provider order/content determinism。 | ✓ VERIFIED | fixture 15 findings；测试内独立常量锁定每项 id/type/title/summary；文档负向 matcher 和 focused suite 通过。 |

**Score:** 8/11 truths verified

### Previous Five Gaps

| 前次 Gap | 原始复现场景 | 当前判定 | 新边界结论 |
| --- | --- | --- | --- |
| Attribution iff / namespace | 缺失、额外、错误或混合 attribution 被接受 | ✓ CLOSED | schema 与 contract matrix 均已生效。 |
| Nullish provider fail-open | null/undefined 变成 deterministic success | ✓ CLOSED | 普通 nullish/malformed 值均返回 `PROVIDER_FAILURE`。 |
| Native provider throws | `review()` 直接抛 TypeError/RangeError 被误分类 | ✓ CLOSED（原始场景） | 返回对象 getter/proxy 的相邻路径仍失败，形成新的 blocker。 |
| Image/screenshot visual hash | 缺失或错误 hash 可公开 | ✓ CLOSED（原始场景） | 非视觉 PDF 携带任意 hash 仍破坏更广泛 provenance truth。 |
| Provider ordering docs | 文档对所有 findings 承诺 deterministic order | ✓ CLOSED | 现已明确 provider content/order 可变。 |

前次 5 个具体复现场景均已关闭；但其中 error-boundary 与 provenance 两个更高层目标仍被相邻未覆盖路径击穿，因此 Phase goal 仍不能判定完成。

### Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | Docker/full-boundary stdio、mount、filesystem/provider/public-response E2E | Phase 10 | ROADMAP Phase 10 goal 与 success criterion 2 明确覆盖；不计入 Phase 09 blocker。 |

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/contracts/review.ts` | Strict attribution、namespace 与 citation/hash contract | ✗ SUBSTANTIVE/WIRED, BEHAVIOR FAILED | 463 lines；attribution、image/screenshot 约束有效，但 non-visual PDF hash 双向约束缺失。 |
| `src/providers/types.ts` | Untrusted provider result runtime schema 与 limits | ✓ VERIFIED | 90 lines；strict fields、provider/model grammar、两个 100-entry bounds 均有效并被 tool 使用。 |
| `src/tools/review.ts` | Validated attribution projection 与稳定错误分类 | ✗ SUBSTANTIVE/WIRED, BEHAVIOR FAILED | 269 lines；真实 provider flow 已接线，但 schema/getter 与 analyzer native errors 落入全局类型猜测。 |
| `tests/contract/review-provider.test.ts` | Phase 09 credential-free behavior matrix | ⚠ SUBSTANTIVE/WIRED, INCOMPLETE | 492 lines / 16 tests；原 5 gaps 覆盖显著增强，但缺 PDF non-visual、throwing getter/proxy、analyzer throws；grammar table 有假阳性。 |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | Frozen meaningful raw MCP text | ✓ VERIFIED | 21,592 text bytes、15 findings、三种 finding type、无 provider metadata，并与独立 projection 一致。 |
| `tests/contract/public-contract-docs.test.ts` | Semantic determinism/exclusion documentation gate | ⚠ SUBSTANTIVE/WIRED, INCOMPLETE | 128 lines / 10 tests；determinism gate 有效，但未锁定 INVALID_REQUEST 示例与稳定消息表。 |
| `docs/mcp-contract.md` | Normative attribution、determinism 与 stable errors | ⚠ WIRED, INACCURATE EXAMPLE | determinism/provider 语义正确；line 140 的 INVALID_REQUEST message 与 line 143 及实际输出矛盾。 |
| `README.md` | User-facing scoped semantics and exclusions | ✓ VERIFIED | byte equality 限定 offline deterministic-only，provider variability 与完整 exclusion list 均存在。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/providers/types.ts` | `src/tools/review.ts` | `providerReviewResultSchema.safeParse` | ⚠ PARTIAL | 普通 unknown 数据被严格解析；但 parse 本身抛异常时不在 provider-owned catch 内。 |
| `src/tools/review.ts` | `src/providers/errors.ts` | ProviderError wrapping | ⚠ PARTIAL | `review()` 直接 throws 已包裹；returned-object reads 未包裹。 |
| `src/tools/review.ts` | `src/contracts/review.ts` | deterministic/provider-only/final `reviewResponseSchema.parse` | ✓ WIRED | lines 145、183、197 三个验证点均存在；gsd-sdk 的 escaped-pattern false negative 经手工核验纠正。 |
| `src/contracts/review.ts` | attribution + finding IDs | iff / namespace `superRefine` | ✓ WIRED | lines 371-385，直接 schema mutation matrix 通过。 |
| `src/contracts/review.ts` | normalized visual hashes | citation response refinement | ⚠ PARTIAL | image/screenshot 与 visual PDF 已接线；non-visual PDF hash 未禁止。 |
| `tests/contract/review-provider.test.ts` | frozen fixture | raw equality + independent ordered projection | ✓ WIRED | 实际 output 与 fixture 各自对照手写常量，且 raw bytes 完全相等。 |
| Public docs | docs contract test | Real `readFile` semantic scans | ⚠ PARTIAL | determinism/exclusion 已覆盖；stable error example 未覆盖。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | deterministic findings | `analyzer.analyze(analysis)` | Yes | ⚠ FLOWING，但 native exception 被错误归因。 |
| `src/tools/review.ts` | provider result/findings | `ReviewProvider.review` → runtime schema → namespace | Yes | ⚠ FLOWING，但 hostile property reads 可逃逸 provider boundary。 |
| `src/tools/review.ts` | `metadata.provider` | validated result provider/model when provider findings exist | Yes | ✓ FLOWING；strict allowlisted two-field projection。 |
| `src/contracts/review.ts` | citation visual hash | normalized evidence payload lookup | Partial | ✗ HOLLOW for non-visual PDF hash because absent payload arrays do not force rejection. |
| frozen fixture | deterministic MCP bytes/findings | real FIT5032 request through handler | Yes | ✓ FLOWING；15 findings，非空。 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Focused Phase 09/provider/docs suite | `npm test -- --run ...` (5 files) | 35/35 passed | ✓ PASS |
| TypeScript build | `npm run build` | exit 0 | ✓ PASS |
| Full credential-free/no-network suite | `npm test` | 26 files / 153 tests passed; live provider excluded | ✓ PASS |
| Non-visual PDF arbitrary hash | Direct `tsx` schema construction | `{accepted:true}` with no retained PDF payload | ✗ FAIL |
| Provider result getter TypeError | Direct handler invocation | `INVALID_REQUEST / Invalid request` | ✗ FAIL |
| Provider result getter RangeError | Direct handler invocation | `LIMIT_EXCEEDED / Evidence exceeds the configured limit` | ✗ FAIL |
| Analyzer TypeError | Direct handler invocation | `INVALID_REQUEST / Invalid request` | ✗ FAIL |
| Analyzer RangeError | Direct handler invocation | `LIMIT_EXCEEDED / Evidence exceeds the configured limit` | ✗ FAIL |
| Attribution grammar implementation | Direct child-schema table | invalid cases all rejected | ✓ PASS |
| Attribution grammar test isolation | Add valid child to deterministic response | valid child still fails full response due attribution-iff | ⚠ FALSE-POSITIVE TEST PATH |
| INVALID_REQUEST actual output | Empty-objective handler call | `{ok:false,code:"INVALID_REQUEST",message:"Invalid request"}` | ✗ DOC EXAMPLE MISMATCH |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MCP-02 | 09-01, 09-02 | Deterministic schema-valid success and machine-readable rejected-request errors | ✗ BLOCKED | Offline determinism and routine errors pass, but provider/analyzer internal TypeError/RangeError are publicly mislabeled as client/limit failures; docs also publishes a contradictory INVALID_REQUEST example. |
| SAFE-03 | 09-01, 09-02 | Findings retain source location/hash, provider/model version, and request/timestamp provenance | ✗ BLOCKED | Valid responses retain attribution and ordinary provenance, but non-visual PDF citations can publish arbitrary unbound visual hashes. |

No orphaned Phase 09 requirements were found: ROADMAP and REQUIREMENTS map exactly MCP-02 and SAFE-03, and both plans claim both IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/contracts/review.ts` | 302-307, 417-418 | One-way/optional PDF visual-hash refinement | 🛑 Blocker | Arbitrary hash can be attached to a non-visual PDF citation. |
| `src/tools/review.ts` | 163-176 | Provider catch ends before untrusted result parsing/reads | 🛑 Blocker | Getter/proxy exceptions are blamed on the caller or parser limits. |
| `src/tools/review.ts` | 144, 242-248 | Whole-pipeline native exception guessing | 🛑 Blocker | Analyzer implementation faults are mislabeled as request/limit errors. |
| `tests/contract/review-provider.test.ts` | 163-176 | Grammar candidates cloned from deterministic-only response | ⚠ Warning | Every case can fail attribution-iff before its intended grammar rule; implementation currently rejects the invalid children, but regression isolation is weak. |
| `docs/mcp-contract.md` | 139-143 | Contradictory stable error example | ⚠ Warning | Example says `Review request failed validation`; actual stable output/table says `Invalid request`. |

The only placeholder match is the explicitly documented opt-in live-test fixture image; it is not an implementation stub. No TODO/FIXME/empty-handler/orphaned-artifact blocker was found.

### Human Verification Required

None. All goal-impacting failures and both warnings were independently reproduced without credentials, network, Docker, or mutable external services.

### Gaps Summary

Phase 09 不能完成。09-02 确实关闭了前次 5 个具体复现场景，并建立了有效的 attribution、non-empty determinism、provider-result bounds 和 image/screenshot provenance contract；但新审查揭示的三个 blocker 均真实存在：PDF 非视觉 citation 可携带未绑定 hash，provider 返回对象的读取异常逃逸 provider boundary，analyzer 原生异常被归因给客户端输入/限额。前两项分别破坏 SAFE-03 与 provider-backed 的局部 provenance/error contract，第三项使 MCP-02 的机器可读错误语义不准确。

最新 REVIEW 的 3 blocker、2 warning 全部确认。Docker/full-boundary 按 ROADMAP 明确 deferred 到 Phase 10，不影响本次 blocker 数量，也不作为 Phase 09 失败理由。

---

_Verified: 2026-09-02T18:28:15Z_
_Verifier: the agent (gsd-verifier)_
