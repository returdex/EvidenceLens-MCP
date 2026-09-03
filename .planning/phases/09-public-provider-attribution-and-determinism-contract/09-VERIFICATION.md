---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-03T17:14:50Z
status: gaps_found
score: 16/21 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 12/16
  gaps_closed:
    - "Provider token guard只扫描provider-authored字符串；本地promptVersion碰撞已放行。"
    - "Analyzer identity已绑定服务器常量deterministic-rules/1.0.0。"
    - "Provider input在analyzer前快照，analyzer接收隔离clone。"
    - "Payload/table/byte cleanup已按稳定引用best-effort遍历。"
    - "文档deterministic request/response与built-in runtime精确相等。"
  gaps_remaining:
    - "完整ProviderConfig进入providerRequest.inference，可被回显到公共响应。"
    - "Recursive freeze冻结调用方拥有的providerConfig。"
    - "Cleanup保留requirements/solutionClaims数据。"
    - "Analyzer findings可在provider await期间异步突变。"
    - "Provider setup异常绕过cleanup并误分为客户端错误。"
  regressions:
    - "09-05 request freeze因未投影inference而跨越ownership边界。"
    - "09-05验证snapshot后仍merge analyzer原始可变数组。"
gaps:
  - truth: "Provider inference是运行时allowlist，ProviderConfig秘密不能进入provider或公共输出。"
    status: failed
    reason: "独立探针捕获8个生产配置字段；provider把request.inference.apiKey放入合法title后，ok:true公共响应序列化了该秘密。"
    artifacts:
      - path: "src/tools/review.ts"
        issue: "96-106行按引用赋值options.providerConfig；Pick仅是类型约束。"
      - path: "src/server.ts"
        issue: "30-35行把完整ProviderConfig传给handler。"
      - path: "tests/contract/review-provider.test.ts"
        issue: "测试只用简化inference，未检查provider收到的request。"
    missing:
      - "构造并验证仅含model、temperature、maxTokens的新对象。"
      - "增加production-shaped config捕获及secret echo回归。"
  - truth: "冻结provider request不会冻结调用方拥有的配置。"
    status: failed
    reason: "配置对象挂在request.inference并被递归冻结；正常调用后Object.isFrozen(config)为true。"
    artifacts:
      - path: "src/tools/review.ts"
        issue: "109-118行冻结所有可达对象，包括外部providerConfig。"
    missing:
      - "冻结前投影/复制外部值。"
      - "断言request树冻结但原配置仍可修改。"
  - truth: "Cleanup清除analyzer保留的requirements/solutionClaims副本。"
    status: failed
    reason: "handler完成后仍能读取Threshold must be 4.、Threshold = 3.及key/value/tokens。"
    artifacts:
      - path: "src/review/analysis.ts"
        issue: "127-153行cleanupTargets遗漏claims。"
      - path: "tests/contract/review-provider.test.ts"
        issue: "cleanup测试只保留payload/cell/buffer引用。"
    missing:
      - "best-effort清除claim text/key/value/tokens及两个数组，或收窄文档承诺。"
      - "增加text/table retained-claim回归。"
  - truth: "Analyzer findings验证后成为可信snapshot，provider await期间不能改变最终结果。"
    status: failed
    reason: "queueMicrotask把原数组title改为ASYNC-MUTATED-TITLE；最终响应仍ok:true并公开该值。"
    artifacts:
      - path: "src/tools/review.ts"
        issue: "233、248-260行使用原始deterministicFindings而非deterministicResponse.findings。"
      - path: "tests/contract/review-provider.test.ts"
        issue: "仅覆盖同步analysis mutation。"
    missing:
      - "collision、internal state、merge仅使用parsed snapshot。"
      - "增加deferred-provider竞态测试。"
  - truth: "Analysis创建后的provider setup故障位于internal-error和无条件cleanup边界内。"
    status: failed
    reason: "providerConfig.model getter抛TypeError时，合法请求返回INVALID_REQUEST；setup在主try和cleanup前。"
    artifacts:
      - path: "src/tools/review.ts"
        issue: "183-189行预构建request；321-327行把逃逸native error误分为客户端错误。"
      - path: "tests/contract/review-provider.test.ts"
        issue: "无hostile production-config setup与cleanup测试。"
    missing:
      - "analysis创建后立即用try/finally覆盖setup/analyzer/provider/projection/merge。"
      - "server-owned setup fault映射为INTERNAL_ERROR或startup PROVIDER_CONFIGURATION。"
deferred:
  - truth: "Credentialed完整MCP/filesystem/provider/public-response E2E。"
    addressed_in: "Phase 10"
    evidence: "Phase 10 success criterion 2明确拥有opt-in完整路径。"
---

# Phase 09 验证报告

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Verified:** 2026-09-03T17:14:50Z
**Status:** gaps_found
**Re-verification:** Yes — after 09-05 and latest 09-REVIEW

SUMMARY和REQUIREMENTS勾选均未作为证据。ROADMAP三条success criteria、前次16条truth、09-05 runtime-exact约束和最新ownership/cleanup/race/setup边界合并为21条不重复must-haves。

## Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 公开attribution稳定且不暴露内部值 | FAILED | identity已固定；但API key可由provider从inference回显进ok:true finding。 |
| 2 | citation/hash/requestId/generatedAt保持本地绑定 | VERIFIED | reviewResponseSchema 390-430行绑定ID、role、hash、reference、location和visual hash。 |
| 3 | byte equality仅适用于offline；provider内容可变 | VERIFIED | docs/README语义准确。 |
| 4 | 相同offline请求产生byte-identical非空text | VERIFIED | 两次raw text等于21,592-byte fixture；15 findings。 |
| 5 | 本地provenance与promptVersion碰撞不误拒 | VERIFIED | guard只枚举provider-authored fields。 |
| 6 | provider attribution iff provider findings且namespace匹配 | VERIFIED | contract 374-388行双向约束。 |
| 7 | null/undefined/缺字段/超限provider结果fail closed | VERIFIED | strict result schema在投影前解析。 |
| 8 | provider-owned异常成为PROVIDER_FAILURE | VERIFIED | provider boundary 221-256行完整包围返回路径。 |
| 9 | image/screenshot/PDF visual hash绑定retained payload | VERIFIED | 双向schema refinements存在。 |
| 10 | 两个provider finding arrays各限100 | VERIFIED | provider types 13-22行runtime schema已接线。 |
| 11 | frozen baseline非空且独立锁定顺序 | VERIFIED | 15-finding independent oracle。 |
| 12 | analyzer同步执行/身份/隔离错误为INTERNAL_ERROR | VERIFIED | 专属catch及clone成立。 |
| 13 | INVALID_REQUEST文档示例等于runtime | VERIFIED | literal/document/runtime三方相等。 |
| 14 | fingerprint/promptVersion authored echo被拒绝 | VERIFIED | ID suffix及六类prose受guard。 |
| 15 | analyzer不能替换saved cleanup；先前错误优先 | VERIFIED | cleanup预先bind并保留pending error。 |
| 16 | cleanup fault仍遍历payload text/table/bytes | VERIFIED | 每个稳定target/field单独attempt；不含claims。 |
| 17 | 四角色文档success对象与runtime exact equal | VERIFIED | 独立提取运行：exact true、1 finding。 |
| 18 | request freeze不修改调用方config | FAILED | 原config被冻结。 |
| 19 | cleanup清除retained claims | FAILED | claims原文与派生值仍可读。 |
| 20 | analyzer findings在provider await期间不可变 | FAILED | microtask改变最终公开title。 |
| 21 | provider setup位于正确error/cleanup边界 | FAILED | getter异常误为INVALID_REQUEST并绕过cleanup。 |

**Score:** 16/21

## Latest 09-REVIEW：5 Blockers / 3 Warnings

| Finding | Verdict | Independent evidence |
| --- | --- | --- |
| CR-01 完整config进入inference | BLOCKER CONFIRMED | 捕获8字段；API key进入ok:true公共title。 |
| CR-02 recursive freeze冻结配置 | BLOCKER CONFIRMED | 原config isFrozen为true。 |
| CR-03 cleanup保留claims | BLOCKER CONFIRMED | requirements/solutionClaims仍含原文和派生值。 |
| CR-04 findings await竞态 | BLOCKER CONFIRMED | microtask改变最终公开finding。 |
| CR-05 setup边界错误 | BLOCKER CONFIRMED | getter异常误为INVALID_REQUEST；源码显示绕过cleanup。 |
| WR-01 测试配置非生产形状 | WARNING CONFIRMED | 显式config仅三字段，未检查provider request。 |
| WR-02 无claims/异步mutation矩阵 | WARNING CONFIRMED | 仅同步mutation和payload retention。 |
| WR-03 docs称discard，runtime实际reject | WARNING CONFIRMED | docs 70行与providerReviewResultSchema.strict及failure test矛盾。 |

## 09-05原始四Blockers

| 原始问题 | 结论 | Evidence |
| --- | --- | --- |
| guard误扫本地provenance | CLOSED | 仅扫描provider-authored strings。 |
| analyzer identity spoof | CLOSED | runtime比较server constants。 |
| analyzer同步突变shared input | CLOSED | provider request先构造，analyzer接收clone。 |
| cleanup首错中止payload擦除 | CLOSED | 每字段best-effort；claims omission是新gap。 |

## Artifacts / Wiring / Data Flow

| Item | Status | Details |
| --- | --- | --- |
| src/contracts/review.ts | VERIFIED | 473行，strict attribution/provenance contract substantive且已接线。 |
| src/providers/types.ts | VERIFIED | strict result schema已接线；request inference runtime投影缺失。 |
| src/tools/review.ts | FAILED | secret flow、external freeze、mutable merge、setup boundary。 |
| src/review/analysis.ts | PARTIAL | clone/payload cleanup成立；claims未清。 |
| review-provider tests | PARTIAL | 31绿灯但缺最新五条路径。 |
| deterministic fixture | VERIFIED | 21,592 bytes、15 findings、旧五项metadata keys。 |
| docs test | VERIFIED | success request/response为runtime full equality。 |
| docs/mcp-contract.md | PARTIAL | determinism/example准确；allowlist/discard不准确。 |
| README.md | VERIFIED | determinism、attribution、no-network准确。 |
| server full config → tool inference | UNSAFE | 完整config按引用进入request。 |
| provider result → strict schema → projection | WIRED | safeParse、identity、namespace、provenance均存在。 |
| parsed deterministic snapshot → final merge | NOT WIRED | merge读取原始analyzer array。 |
| analysis → setup → unconditional cleanup | NOT WIRED | setup在try前，cleanup不是finally。 |
| claims → cleanup | DISCONNECTED | claims不在cleanupTargets。 |

## Behavioral Spot-Checks

| Check | Result | Status |
| --- | --- | --- |
| npm run build | exit 0 | PASS |
| focused provider/docs | 43/43 | PASS |
| full routine npm test | 170/170 | PASS |
| production config capture/public echo | 8 keys；secret serialized | FAIL |
| caller config ownership | config frozen | FAIL |
| claims cleanup | claims retained | FAIL |
| await race | final title mutated | FAIL |
| setup classification | INVALID_REQUEST | FAIL |
| docs runtime equality | exact true | PASS |

默认测试设置EVIDENCELENS_DISABLE_PROVIDER=1并排除live test；本次未运行live provider、无网络依赖。

## Requirements Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| MCP-02 | BLOCKED | Offline bytes/schema成立，但deterministic findings可竞态改变，server setup fault误归客户端。 |
| SAFE-03 | SATISFIED | source/reference、line/page/cell、content/visual hash、analyzer/provider/model、requestId/generatedAt均存在并由cross-field schema绑定。 |

五个PLAN均声明MCP-02/SAFE-03；ROADMAP无额外Phase 09 requirement，无orphan。规划勾选不是证据。

## Anti-Patterns / Human Verification / Next Steps

Blocker patterns：review.ts 96-118的type-only allowlist与shared freeze；183-189的setup-before-try；233-260的original-array merge；analysis.ts 127-153遗漏claim copies。Warnings：测试矩阵过于简化/同步，docs 68-70的allowlist/discard与runtime不一致。未发现source stub、TODO/FIXME blocker或orphaned core artifact；git diff --check通过。五份PLAN的SDK artifact检查只证明L1/L2存在，不能抵消L3/L4失败。

Human verification：None。所有结论均可由确定性源码路径和无凭据探针验证。

Phase 09目标未达成，必须通过Escalation Gate，不能进入下一阶段。下一步：先建立严格三字段、request-owned inference并把setup移入try/finally；再让merge只使用parsed snapshot并清理claims；最后补production config、ownership、retained claims、deferred-provider race和setup-cleanup回归，把docs的discard改为实际reject（或实现真正投影）。五个gap未被Phase 10/11明确承接，不能defer；仅credentialed full E2E属于Phase 10。

---

_Verified: 2026-09-03T17:14:50Z_
_Verifier: the agent (gsd-verifier)_
