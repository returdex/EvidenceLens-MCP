---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-05T06:35:55Z
status: gaps_found
score: 22/23 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 22/23
  gaps_closed:
    - "Top-level allowed-key accessor envelopes are rejected by descriptor metadata before Zod can read them."
  gaps_remaining:
    - "The outer provider result is not revalidated after nested Zod parsing, so nested Proxies can mutate it into a disallowed shape and still yield success."
  regressions: []
gaps:
  - truth: "Every unknown or private provider-result field causes whole-result rejection, including non-enumerable, symbol-keyed, inherited/custom-prototype, Proxy-backed, and validation-time mutation variants."
    status: failed
    reason: "The top-level descriptor preflight succeeds, then providerReviewResultSchema.safeParse reads untrusted nested arrays with no second preflight. A Proxy stored as the data value of modelFindings or deterministicFindings can add a non-enumerable key, symbol, or custom prototype to the outer result during parsing; all six independently reproduced cases return provider-attributed ok:true."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "Lines 273-278 perform one envelope preflight before safeParse but never verify that the outer envelope still satisfies it after nested reads."
      - path: "src/providers/types.ts"
        issue: "The descriptor-only preflight correctly protects top-level fields, but it cannot establish whole-result invariance across later nested parsing by itself."
      - path: "tests/contract/review-provider.test.ts"
        issue: "The accessor-mutation test covers a top-level provider getter only; it has no modelFindings/deterministicFindings Proxy that mutates the outer object during Zod parsing."
      - path: "docs/mcp-contract.md"
        issue: "Line 70 promises entire-result rejection before structural parsing, but the runtime accepts a result that becomes non-conforming during that structural parse."
    missing:
      - "Revalidate the outer provider result with isProviderReviewResultEnvelope after providerReviewResultSchema.safeParse and before parsed data is used, while preserving the provider-owned sanitized failure boundary."
      - "Add credential-free regressions for modelFindings and deterministicFindings Proxies that mutate the outer envelope with hidden, symbol, and custom-prototype state during parsing; require exact PROVIDER_FAILURE and no provider attribution."
deferred:
  - truth: "Credentialed complete MCP/filesystem/provider/public-response end-to-end verification."
    addressed_in: "Phase 10"
    evidence: "Phase 10 success criterion 2 explicitly owns the opt-in stdio, filesystem, provider DTO, merge, and final public-schema path."
---

# Phase 09: Public Provider Attribution and Determinism Contract Verification Report

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Verified:** 2026-09-05T06:35:55Z
**Status:** GAPS FOUND
**Re-verification:** Yes — after Plan 09-08

This is an independent code-and-behavior review. I read Phase 09 plans and summaries 01-08, project/roadmap/requirements/state, the prior verification, the current review, current source/tests/docs, and Git history. SUMMARY claims were not used as implementation evidence. All executed checks were credential-free and no-network.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Public responses expose only stable deterministic analyzer identity and conditional provider name/model attribution. | VERIFIED | `src/tools/review.ts:240-252,280-288,305-310` builds trusted analyzer metadata and projects only `{ name, model }`; focused provider tests pass. |
| 2 | Citation, hash, requestId, and timestamp provenance remain schema-bound and backwards-compatible. | VERIFIED | `src/contracts/review.ts:351-432` enforces response/citation refinements; focused and full suites pass. |
| 3 | Documentation scopes byte equality to deterministic/offline output and allows provider-backed variability. | VERIFIED | `docs/mcp-contract.md:66-70`, `README.md:56-58`, and semantic documentation tests pass. |
| 4 | Identical offline requests produce byte-identical, non-empty deterministic MCP text. | VERIFIED | `tests/contract/review-provider.test.ts:408` plus frozen fixture/oracle pass in the focused suite. |
| 5 | Provider token checks exclude locally bound provenance collisions. | VERIFIED | Provider-only schema validation precedes the authored-string scan at `src/tools/review.ts:284-294`; collision controls pass. |
| 6 | Provider attribution exists iff provider-prefixed findings exist and namespaces match. | VERIFIED | Cross-field contract rules at `src/contracts/review.ts:374-388`; provider test passes. |
| 7 | Nullish, malformed, incomplete, and oversized ordinary provider results fail closed. | VERIFIED | Strict result schema/caps at `src/providers/types.ts:47-56`; focused controls pass. |
| 8 | Provider throws, top-level reflective traps, and top-level accessors map to sanitized `PROVIDER_FAILURE`. | VERIFIED | Provider-owned catch at `src/tools/review.ts:265-303`; trap/accessor matrices pass. Independent check confirmed all six top-level fields reject ordinary/null-prototype accessors with zero getter reads. |
| 9 | Image, screenshot, and PDF visual citations bind to retained local payload hashes. | VERIFIED | `src/contracts/review.ts:405-429`; direct/handler PDF and visual tests pass. |
| 10 | Each provider finding array is capped at 100 entries. | VERIFIED | `MAX_PROVIDER_FINDINGS` and `.max()` at `src/providers/types.ts:13,53-54`; cap tests pass. |
| 11 | The deterministic fixture is non-empty and independently locks order/content. | VERIFIED | Raw MCP fixture and ordered projection test pass. |
| 12 | Analyzer execution, identity, and snapshot faults are sanitized `INTERNAL_ERROR`. | VERIFIED | Trusted identity/analyzer boundary at `src/tools/review.ts:229-258`; hostile analyzer matrices pass. |
| 13 | Documented invalid-request and deterministic-success examples equal runtime output. | VERIFIED | `tests/contract/public-contract-docs.test.ts:244-275` executes and compares both examples. |
| 14 | Current promptVersion/inputFingerprint echoes in provider-authored text are rejected. | VERIFIED | Guard at `src/tools/review.ts:147-167,289-294`; complete public-string matrix passes. |
| 15 | Trusted cleanup cannot be replaced, and pending subsystem errors outrank cleanup faults. | VERIFIED | Bound closures/pending-error handling at `src/tools/review.ts:213-226,312-327`; precedence tests pass. |
| 16 | Cleanup continues over retained claims, tokens, arrays, payloads, cells, and buffers after a local fault. | VERIFIED | Per-action cleanup continuation at `src/review/analysis.ts:127-174`; retained-reference tests pass. |
| 17 | The documented four-role success response is produced by the built-in runtime. | VERIFIED | Documentation test invokes `handleReviewRequest` and exact-compares the emitted response. |
| 18 | Provider inference is a fresh, validated, recursively frozen three-field object. | VERIFIED | Projection/freeze at `src/tools/review.ts:96-131`; production-shaped capture test passes. |
| 19 | Caller-owned provider configuration remains unmodified. | VERIFIED | Fresh inference projection drops other config references; ownership tests pass. |
| 20 | Original and isolated transient analysis references are scrubbed best-effort. | VERIFIED | Stable cleanup targets and tests cover text, cells, and buffers. |
| 21 | Analyzer findings use a trusted immutable snapshot across provider await. | VERIFIED | Parsed deterministic findings are cloned/frozen at `src/tools/review.ts:254-258`; async mutation tests pass. |
| 22 | Handler dependencies are snapshotted once after cleanup registration and cannot fail open. | VERIFIED | One source read each at `src/tools/review.ts:223-225`; lifecycle-order and fault controls pass. |
| 23 | Every unknown/private provider-result field causes whole-result rejection, including validation-time mutation by nested values. | FAILED — BLOCKER | Nested array Proxies mutate the outer envelope during `safeParse`; six cases return attributed `ok:true`. |

**Score:** 22/23 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/contracts/review.ts` | Strict additive public attribution/provenance contract | VERIFIED | Substantive and wired into deterministic, provider-only, and final response parsing. |
| `src/providers/types.ts` | Exact-six data-descriptor result-envelope preflight | PARTIAL | Top-level own enumerable data-descriptor enforcement is correct (`:23-36`), but cannot preserve its conclusion over nested parse-time effects. |
| `src/tools/review.ts` | Safe provider orchestration and provider-owned failure boundary | PARTIAL | Correct ordering and sanitation, but only preflights before `safeParse` (`:273-278`); the outer object is not rechecked after nested reads. |
| `src/review/analysis.ts` | Best-effort stable-reference cleanup | VERIFIED | Substantive, wired, and covered across all retained target categories. |
| `tests/contract/review-provider.test.ts` | Provider boundary regressions | PARTIAL | Strong top-level reflection/accessor coverage, but no nested proxy-to-outer mutation regression. |
| `tests/contract/public-contract-docs.test.ts` | Executable public contract prose/examples | PARTIAL | Checks the accurate-looking top-level descriptor sentence but not runtime behavior after nested structural parsing. |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | Frozen offline MCP bytes | VERIFIED | Used by passing raw-byte compatibility regression. |
| `docs/mcp-contract.md` | Accurate determinism, attribution, rejection, and cleanup contract | PARTIAL | Determinism/attribution prose matches behavior; whole-result rejection sentence overstates it. |
| `README.md` | Concise scoped public contract | VERIFIED | Correctly scopes deterministic bytes and provider variability; does not make the false whole-envelope claim. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Handler | Public response schema | `reviewResponseSchema.parse` for deterministic/provider/final responses | WIRED | Multiple parse points at `src/tools/review.ts:240,284,310`. |
| Provider result | Result preflight then Zod | `isProviderReviewResultEnvelope` before `providerReviewResultSchema.safeParse` | PARTIAL — BLOCKER | Top-level descriptor check is before reads, but no post-parse invariance check. |
| Provider findings | Public response | Identity, namespace, provenance, authored-string guard, final schema | WIRED | `src/tools/review.ts:279-310`. |
| Analysis inputs | Cleanup | Registered original/isolated closures and stable targets | WIRED | `src/tools/review.ts:213-222,312-327`; `src/review/analysis.ts:127-174`. |
| Docs | Contract tests | Heading-scoped descriptor prose and executable examples | PARTIAL | Text link works, but test coverage does not detect the nested behavioral exception to that prose. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | `inference` | Fresh validated projection from allowed config fields | Yes | FLOWING |
| `src/tools/review.ts` | `trustedDeterministicFindings` | Analyzer output, parsed/cloned/frozen | Yes | FLOWING |
| `src/tools/review.ts` | `providerResult` / `providerFindings` | `provider.review` → preflight → Zod parse | Yes, but nested parsing can alter the outer untrusted envelope after preflight | HOLLOW — BLOCKER |
| `src/review/analysis.ts` | Cleanup targets | Captured payload/claim/cell/buffer references | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command/probe | Result | Status |
| --- | --- | --- | --- |
| Focused Phase 09 suite | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` | 61/61 passed | PASS |
| Strict build | `npm run build` | Exit 0 | PASS |
| Full routine suite | `npm test` | 26 files, 190/190 passed; `EVIDENCELENS_DISABLE_PROVIDER=1`, live test excluded | PASS |
| Top-level exact-six data descriptors | Credential-free direct preflight probe | All six accessor fields × ordinary/null rejected with zero reads; ordinary/null six-data controls accepted | PASS |
| Top-level reflection/proxy failures | Existing focused matrix | `ownKeys`, `getPrototypeOf`, and descriptor trap cases return sanitized `PROVIDER_FAILURE` | PASS |
| CR-01 nested `modelFindings`/`deterministicFindings` Proxies | Credential-free injected-provider probe | 2 nested fields × hidden own key/symbol/custom prototype = 6 successful, provider-attributed responses; each Proxy trap ran and outer result became invalid | FAIL — BLOCKER |
| Whitespace and pre-report worktree | `git diff --check`; `git status --short` | Clean before writing this report | PASS |

#### CR-01 reproduction

For each of `modelFindings` and `deterministicFindings`, I returned an otherwise valid, six-own-data-property result. Its selected array field was a Proxy. On the first Zod property read, the Proxy added one of a non-enumerable `apiKey`, a non-enumerable symbol, or a custom prototype with a non-enumerable `apiKey` to the outer result. Each probe returned `ok: true`, `metadata.provider: { name: "local-reviewer", model: "deepseek-v4-pro" }`, and a namespaced provider finding. Afterward, `Reflect.ownKeys(outer)` had seven keys for hidden/symbol cases, or `Object.getPrototypeOf(outer)` was no longer `Object.prototype`/`null` for prototype cases.

This is a confirmed whole-result strictness bypass, not an uncertain visual or live-provider behavior. The existing suite passes because `09-08` tests an accessor installed directly on the outer `provider` key; descriptor inspection correctly prevents that getter from executing, but it does not constrain a nested data value's Proxy during parsing.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MCP-02 | 09-01 through 09-08 | Deterministic schema-valid successes and machine-readable errors for rejected reviews/results | BLOCKED | A provider result that becomes structurally disallowed during validation produces attributed success instead of exact `PROVIDER_FAILURE`. This violates the Phase 09 explicit whole-result rejection contract. |
| SAFE-03 | 09-01 through 09-08 | Preserve source/location/hash/provider/model/request/timestamp provenance | SATISFIED | Public schema/provenance refinements and provider attribution remain correctly bound; the bypassed hidden/prototype state was not serialized. |

All eight Phase 09 plans declare only `MCP-02` and `SAFE-03`; ROADMAP maps the same two requirements to the phase. No orphaned Phase 09 requirement was found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | 273-278 | Single top-level preflight followed by untrusted nested structural reads | BLOCKER | CR-01 changes outer shape after validation starts and reaches attributed success. |
| `tests/contract/review-provider.test.ts` | 1590-1677 | Accessor-mutation regression targets only outer `provider` accessor | WARNING | It gives confidence in the descriptor fix while missing nested parse-time mutation. |
| `tests/contract/public-contract-docs.test.ts` | 124-130 | Prose-only descriptor semantics test | WARNING | Documentation and runtime test can both pass while nested parsing violates the documented whole-result guarantee. |
| `docs/mcp-contract.md` | 70 | Absolute whole-result rejection claim | BLOCKER | Runtime contradicts the contract for nested validation-time mutation. |

No production TODO/FIXME, placeholder implementation, or live/credentialed test invocation was found. PDF.js font/indexing messages during tests were non-failing fixture/runtime warnings, not Phase 09 gaps.

### Scope and Review Findings

- **CR-01 — BLOCKER CONFIRMED.** The current `09-REVIEW.md` nested-Proxy report is reproducible for both nested arrays and all three requested outer mutations. Phase 10 does not explicitly defer or cover this provider-result strictness requirement, so it remains a Phase 09 gap.
- **WR-01 — WARNING CONFIRMED, NON-BLOCKING.** A direct in-process hostile request Proxy can escape request parsing with its raw thrown value. The ordinary JSON/MCP decode path cannot construct such an object, and Plan 09-08 expressly excludes request-object Proxy work. It does not demonstrably violate an explicit Phase 09 attribution/determinism requirement, so it is not counted in this score.
- **WR-02 — WARNING.** Phase 09 test coverage does not install an accessor in each of the other five allowed outer fields. The production descriptor loop is generic, and my direct six-field probe confirmed current behavior, so this is a coverage gap rather than a second Phase 09 blocker.

### Human Verification Required

None. The failed contract is deterministic and fully reproduced without credentials or network access.

### Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | Credentialed complete MCP/filesystem/provider/public-response E2E | Phase 10 | Phase 10 success criterion 2 explicitly owns this opt-in path. |

### Gaps Summary

**GAPS FOUND — Phase 09 is not ready to complete.** Plan 09-08 correctly closes the previously known top-level accessor path: exact six own enumerable data fields are checked without reading accessors. But the stated whole-result contract still fails because `safeParse` performs reads of nested array values after that one check. A nested Proxy can mutate the outer result into a hidden-key, symbol-key, or custom-prototype form and still get public provider attribution.

The closure is narrowly scoped: revalidate the original outer envelope after parsing and before using parsed data, then add the six credential-free nested mutation regressions. Do not treat the passing current suite or descriptor prose as evidence that this success-path bypass is closed.

---

_Verified: 2026-09-05T06:35:55Z_
_Verifier: the agent (gsd-verifier)_
