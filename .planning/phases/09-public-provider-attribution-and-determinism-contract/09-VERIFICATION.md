---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-04T13:25:10Z
status: gaps_found
score: 21/23 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 16/21
  gaps_closed:
    - "Provider inference is a fresh strict object containing exactly model, temperature, and maxTokens."
    - "Recursive request freezing does not freeze caller-owned ProviderConfig or nested caller objects."
    - "Original and analyzer-isolated claims, token arrays, payloads, cells, and buffers are scrubbed best-effort."
    - "Analyzer findings are validated, deep-copied, and frozen before provider await and final merge."
    - "ProviderConfig field/setup failures after analysis creation run inside registered cleanup and return sanitized INTERNAL_ERROR."
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "Handler provider, providerConfig, and analyzer dependencies are snapshotted once without fail-open behavior, and option-access failures receive source-correct sanitized errors and cleanup."
    status: failed
    reason: "The complete options object is spread into normalization before analysis/cleanup registration, invoking throwing getters outside the lifecycle; provider is then read repeatedly, allowing a stateful getter to make a configured provider disappear."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "Line 196 spreads all options before analysis exists; lines 207, 243, 250, and 258 repeatedly read options.provider. Independent probes returned INVALID_REQUEST with zero cleanup for throwing getters and ok:true with three reads, zero provider calls for a changing provider getter."
      - path: "tests/contract/review-provider.test.ts"
        issue: "No throwing/stateful ReviewHandlerOptions getter regressions exercise this boundary."
    missing:
      - "Pass only filesystemPolicy/filesystemReadAdapter to normalization without spreading the complete options object."
      - "Snapshot provider, providerConfig, and analyzer exactly once at a source-correct boundary and use only the snapshots."
      - "Add throwing getter and changing provider getter tests proving exact INTERNAL_ERROR, applicable cleanup, and no provider bypass."
  - truth: "Every unknown or private provider-result field causes whole-result rejection, including non-enumerable, symbol-keyed, inherited/custom-prototype, and Proxy-hidden extras."
    status: failed
    reason: "Zod strict-object parsing rejects enumerable string extras but accepts hidden own/prototype fields; valid provider results carrying non-enumerable or symbol private data pass the schema and handler as successful reviews."
    artifacts:
      - path: "src/providers/types.ts"
        issue: "Lines 22-31 rely only on .strict() and do not validate Reflect.ownKeys or allowed prototypes."
      - path: "src/tools/review.ts"
        issue: "Line 255 parses the untrusted result without an all-own-key/plain-object preflight."
      - path: "tests/contract/review-provider.test.ts"
        issue: "The six extra-field cases near line 1173 use object spread and cover only enumerable string properties."
      - path: "docs/mcp-contract.md"
        issue: "Line 70 promises rejection of the entire result for any unknown/private extra field, which runtime behavior contradicts."
    missing:
      - "Inside the provider-owned catch, reject non-plain/custom-prototype results and compare Reflect.ownKeys against the exact six allowed string keys before schema parsing."
      - "Add direct and handler regressions for non-enumerable, symbol, prototype/inherited, and Proxy-based extras, retaining sanitized PROVIDER_FAILURE for throwing traps."
deferred:
  - truth: "Credentialed complete MCP/filesystem/provider/public-response end-to-end verification."
    addressed_in: "Phase 10"
    evidence: "Phase 10 success criterion 2 explicitly owns the opt-in complete stdio, filesystem, provider DTO, merge, and public-schema path."
---

# Phase 09: Public Provider Attribution and Determinism Contract Verification Report

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Verified:** 2026-09-04T13:25:10Z
**Status:** gaps_found
**Re-verification:** Yes — after 09-06 gap closure and current 09-REVIEW

SUMMARY claims were not accepted as evidence. This report uses the live implementation, tests, documentation, focused offline suites, and independent hostile-object probes. No live DeepSeek test or network was used.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Public responses expose only stable deterministic analyzer identity and conditional provider name/model attribution | VERIFIED | `src/tools/review.ts:27-30,228-233,260-267`; `src/contracts/review.ts:344-388`. |
| 2 | Citation/hash/requestId/generatedAt provenance remains schema-bound and backwards compatible | VERIFIED | `src/contracts/review.ts:351-432` binds attribution, IDs, roles, hashes, references, locations, and visual hashes. |
| 3 | Documentation scopes byte equality to offline/deterministic-only output and permits provider variability | VERIFIED | `docs/mcp-contract.md:66-70,255`; `README.md:56-58`; executable semantic tests pass. |
| 4 | Identical offline requests produce byte-identical, non-empty deterministic MCP text | VERIFIED | Frozen raw fixture plus independent 15-finding oracle pass at `tests/contract/review-provider.test.ts:239-273`. |
| 5 | Provider token checks exclude locally bound provenance collisions | VERIFIED | Provider-only provenance is parsed before authored-string scanning; focused collision tests pass. |
| 6 | Provider attribution exists iff provider-prefixed findings exist and namespaces match | VERIFIED | `reviewResponseSchema` cross-field rules at `src/contracts/review.ts:374-388`. |
| 7 | Nullish, malformed, incomplete, and oversized ordinary provider results fail closed | VERIFIED | Strict runtime schema and 100-item array limits are wired; focused cases pass. |
| 8 | Provider call/getter/throwing-Proxy failures are sanitized as PROVIDER_FAILURE | VERIFIED | Provider-owned catch at `src/tools/review.ts:247-282`; throwing `ownKeys` probe returned exact PROVIDER_FAILURE. |
| 9 | Image, screenshot, and PDF visual citations are bound to retained local payload hashes | VERIFIED | `src/contracts/review.ts:302-309,405-428`; direct and handler matrices pass. |
| 10 | Each provider finding array is limited to 100 entries | VERIFIED | `src/providers/types.ts:12,28-29`; 100/101 controls pass. |
| 11 | Deterministic fixture is non-empty and independently locks order/content | VERIFIED | Raw fixture and hard-coded ordered projection both pass. |
| 12 | Analyzer execution/identity/snapshot faults are sanitized INTERNAL_ERROR | VERIFIED | Trusted identity and analyzer-owned catch at `src/tools/review.ts:27-30,210-236`; hostile matrices pass. |
| 13 | Documented INVALID_REQUEST and deterministic success examples equal runtime output | VERIFIED | `tests/contract/public-contract-docs.test.ts:174-205` passed. |
| 14 | Current promptVersion/inputFingerprint echoes in provider-authored strings are rejected | VERIFIED | Narrow authored-field guard at `src/tools/review.ts:143-163,268-273`; complete string matrix passes. |
| 15 | Analyzer cannot replace trusted cleanup; pending subsystem errors outrank cleanup faults | VERIFIED | Cleanup functions are bound before analyzer execution and processed in `finally` at `src/tools/review.ts:198-206,291-303`. |
| 16 | Cleanup continues over stable payload/cell/buffer references after a local fault | VERIFIED | Per-action attempts at `src/review/analysis.ts:140-173`; retained-reference probe tests pass. |
| 17 | Four-role documented success response is produced by the built-in runtime exactly | VERIFIED | Documentation request is executed and deep-equaled against the documented response. |
| 18 | Provider receives a fresh, strictly validated, recursively frozen inference object with exactly model/temperature/maxTokens | VERIFIED | Fresh projection at `src/tools/review.ts:96-111`; production-shaped capture test observes exactly three keys and a frozen request tree. |
| 19 | Caller-owned provider config is never frozen or mutated | VERIFIED | No config reference enters the request tree; success/failure ownership tests leave config and nested holder unfrozen and writable. |
| 20 | Original and isolated requirements/solutionClaims, claim fields, original/current tokens, top arrays, payloads, cells, and buffers are scrubbed best-effort | VERIFIED | Stable targets and independent cleanup attempts at `src/review/analysis.ts:127-173`; direct original and handler-isolated retention tests pass. |
| 21 | Analyzer findings use a trusted immutable snapshot across provider await | VERIFIED | Parsed findings are structured-cloned/frozen at `src/tools/review.ts:222-240` and exclusively used for collision/merge; microtask+timer mutation test passes. |
| 22 | Handler option dependencies cannot throw outside cleanup or disappear between reads | FAILED | Independent probes: throwing `provider`, `providerConfig`, or `analyzer` getter returned exact INVALID_REQUEST with cleanup count 0; changing provider getter was read 3 times, provider called 0 times, response `ok:true`. |
| 23 | Any unknown/private provider-result field causes whole-result rejection | FAILED | Independent probes: non-enumerable and symbol own fields, hidden prototype fields, and equivalent Proxy-wrapped fields all produced schema success and handler `ok:true`. |

**Score:** 21/23 truths verified

### Prior 09-06 Blockers

| Prior blocker | Verdict | Evidence |
| --- | --- | --- |
| Fresh strict three-field inference | CLOSED | Runtime projection and production-shaped capture prove exact own keys and no config-only values. |
| Caller config not frozen | CLOSED | Original config/nested holder remain unfrozen and writable on success and provider failure. |
| Complete retained transient cleanup | CLOSED | Claim fields/tokens/top arrays and payload/cell/buffer references are targeted independently and verified on normal/fault exits. |
| Immutable analyzer snapshot | CLOSED | Only structured-cloned/frozen parsed findings reach collision and final merge; async mutation does not surface. |
| Provider config-field setup lifecycle | CLOSED | `providerConfig.model` getter fault occurs after both cleanup registrations and returns exact INTERNAL_ERROR. The separate handler-option getter gap remains open. |

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/contracts/review.ts` | Strict public attribution and provenance contract | VERIFIED | Substantive and wired into every final/provider-only response parse. |
| `src/providers/types.ts` | Strict inference and provider-result runtime schemas | PARTIAL | Inference schema is correct; result `.strict()` does not reject hidden/symbol/prototype extras. |
| `src/tools/review.ts` | Safe orchestration, snapshots, provider boundary, cleanup lifecycle | FAILED | Core 09-06 fixes are substantive, but whole-options spread and repeated provider reads create misclassification and fail-open paths. |
| `src/review/analysis.ts` | Stable-reference claim/token/payload cleanup | VERIFIED | Substantive, wired, and per-action best-effort. |
| `tests/contract/review-provider.test.ts` | Hostile boundary and public-contract regressions | PARTIAL | 38 tests pass but omit option getters and hidden/symbol/prototype result extras. |
| `tests/review/analysis.test.ts` | Direct original cleanup and continuation regressions | PARTIAL | Normal comprehensive cleanup passes; fault injection covers only `claim.text`, not every promised target category. |
| `tests/contract/public-contract-docs.test.ts` | Executable docs semantics | PARTIAL | Determinism/result-rejection examples are locked, but no assertion requires claim/token cleanup documentation. |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | Frozen non-empty offline bytes | VERIFIED | Exact runtime equality and independent ordered oracle pass. |
| `docs/mcp-contract.md` | Accurate determinism, strict rejection, and cleanup contract | PARTIAL | Determinism examples are accurate; strict rejection claim is false for hidden fields; cleanup paragraph omits claim/token/top-array scrubbing. |

The SDK artifact check reported 7/7 files present/substantive. Its key-link check reported 4/5 because its escaped pattern did not match; manual inspection verifies `providerInferenceSettingsSchema.parse` at `src/tools/review.ts:98`.

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Production ProviderConfig | ProviderReviewRequest.inference | Fresh strict three-field projection then request-owned freeze | WIRED | No config-only key/reference reaches provider request. |
| Handler options | Normalization and lifecycle | Source-specific one-time dependency snapshots | NOT WIRED | Whole-object spread occurs before lifecycle and provider is read repeatedly. |
| Analyzer return | Final deterministic findings | Parse → deep copy → recursive freeze | WIRED | Trusted snapshot is used for collision and merge. |
| Analysis inputs | Cleanup | Bound original/isolated closures and stable target references | WIRED | Both registered closures execute in `finally` once analysis exists. |
| Provider result | Strict schema | Unknown parse inside provider-owned catch | PARTIAL | Enumerable extras and throwing traps fail closed; hidden/symbol/prototype extras bypass rejection. |
| Provider findings | Public response | Identity, namespace, authored-token, citation/hash validation | WIRED | Only name/model attribution and validated findings are projected. |
| Docs | Runtime examples/semantics tests | Exact response and semantic assertions | PARTIAL | Tests enforce stated text, but hidden-field behavior contradicts the stated whole-result rule and cleanup categories are incomplete. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | `inference` | Three selected ProviderConfig values parsed into a fresh object | Yes | FLOWING |
| `src/tools/review.ts` | `trustedDeterministicFindings` | Analyzer output parsed, cloned, frozen | Yes | FLOWING |
| `src/tools/review.ts` | `providerFindings` / metadata | Provider result parsed, identity/provenance validated | Yes, except hidden envelope extras are accepted then omitted | PARTIAL |
| `src/review/analysis.ts` | cleanup targets | Original/isolated claims and transient payload references | Yes | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command/probe | Result | Status |
| --- | --- | --- | --- |
| Focused Phase 09 suite | `npm test -- --run tests/review/analysis.test.ts tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` | 55/55 passed | PASS |
| Strict compile | `npx tsc -p tsconfig.json --noEmit` | exit 0 | PASS |
| Full routine suite | `npm test` | 26 files, 180/180 passed; live test excluded by script | PASS |
| Throwing handler option getters | Inline `tsx` probe for provider/providerConfig/analyzer getters | INVALID_REQUEST, cleanup 0 for all three | FAIL |
| Stateful provider getter | Inline `tsx` changing getter probe | 3 reads, 0 provider calls, `ok:true` | FAIL |
| Hidden/private result extras | Inline schema+handler probe | Non-enumerable, symbol, hidden prototype, and Proxy-hidden extras accepted | FAIL |
| Throwing provider Proxy trap | Inline handler probe | Exact sanitized PROVIDER_FAILURE | PASS |
| Whitespace | `git diff --check` | exit 0 | PASS |

No server/service was started, no repository state was mutated by probes, no credentials were used, and no network/live provider test ran.

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MCP-02 | 09-01 through 09-06 | Deterministic schema-valid success and machine-readable rejected errors | BLOCKED | Offline determinism/schema paths pass, but throwing option getters are mislabeled and a configured provider can silently disappear; hidden private result fields violate documented strict rejection. |
| SAFE-03 | 09-01 through 09-06 | Source/location/hash/provider/model/request/timestamp provenance | SATISFIED | Public response schema binds citations to normalized evidence and conditionally binds provider namespaces/identity; independent hidden-field probes did not serialize hidden values. |

ROADMAP maps only MCP-02 and SAFE-03 to Phase 09; every plan declares both. No orphaned Phase 09 requirement was found.

## 09-REVIEW Finding Validation

| Finding | Verdict | Independent evidence |
| --- | --- | --- |
| CR-01 throwing/stateful option getters and provider fail-open | BLOCKER CONFIRMED | Exact probes reproduced all three INVALID_REQUEST misclassifications, zero cleanup registration, and changing-provider success without provider invocation. |
| CR-02 hidden provider-result extras | BLOCKER CONFIRMED | Non-enumerable/symbol/prototype/Proxy-hidden extras passed schema and handler; enumerable extras and throwing traps still fail closed. |
| WR-01 incomplete cleanup fault matrix | WARNING CONFIRMED | Direct fault test injects only `claim.text`; handler fault test injects only payload `text`. No per-category token/top-array/cell/buffer fault matrix exists. Source inspection nevertheless shows per-action continuation. |
| WR-02 incomplete cleanup documentation | WARNING CONFIRMED | `docs/mcp-contract.md:259` mentions payload text/table strings/buffers but omits requirements/solutionClaims, claim text/key/value, original/current token arrays, and top-level arrays; docs tests do not enforce these categories. |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | 196 | Whole dependency object spread before lifecycle | BLOCKER | Invokes hostile getters too early and maps server fault to client INVALID_REQUEST. |
| `src/tools/review.ts` | 207, 243, 250, 258 | Repeated reads of stateful provider getter | BLOCKER | Configured provider can be bypassed with successful deterministic-only output. |
| `src/providers/types.ts` | 22-31 | `.strict()` treated as all-own-key/prototype validation | BLOCKER | Hidden/private extras are accepted contrary to public contract. |
| `tests/contract/review-provider.test.ts` | 1173-1216 | Spread-only extra-field matrix | WARNING | Cannot represent non-enumerable, symbol, inherited, or Proxy-hidden extras. |
| `tests/review/analysis.test.ts` | 53-70 | Single-category cleanup fault injection | WARNING | Does not regression-lock first-error continuation for every cleanup target category. |
| `docs/mcp-contract.md` | 259 | Incomplete cleanup category list | WARNING | Published cleanup contract omits newly scrubbed derived claim/token data. |

No source TODO/FIXME/placeholder, empty implementation, or orphaned core artifact was found.

## Human Verification Required

None. The phase failures and passing paths are reproducible with deterministic offline source inspection and local probes.

## Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | Credentialed complete MCP/filesystem/provider/public-response E2E | Phase 10 | Phase 10 success criterion 2 explicitly owns this opt-in full path. |

## Gaps Summary

All five blockers recorded by the prior verification are closed on their intended 09-06 paths. Phase 09 still does not achieve its complete goal because two adjacent trust boundaries remain open: handler dependencies are neither safely nor consistently snapshotted, and the promised whole-result rejection does not cover hidden/prototype provider data. The first can misclassify server faults and silently skip a configured provider; the second makes the normative strict-rejection statement false. Neither issue is explicitly deferred to Phase 10 or 11. The cleanup fault matrix and cleanup documentation also need completion, but are warnings rather than independent proof that the live best-effort cleanup implementation fails.

The Escalation Gate remains active: Phase 09 must not proceed as complete until the two blocker truths are fixed and re-verified.

---

_Verified: 2026-09-04T13:25:10Z_
_Verifier: the agent (gsd-verifier)_
