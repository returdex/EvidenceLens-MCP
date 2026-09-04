---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-04T16:57:07Z
status: gaps_found
score: 22/23 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 21/23
  gaps_closed:
    - "Handler provider, providerConfig, and analyzer dependencies are snapshotted once after cleanup registration, receive source-correct sanitized errors, and cannot fail open."
  gaps_remaining:
    - "Every unknown or private provider-result field causes whole-result rejection, including shape changes performed by allowed-key accessors during Zod reads."
  regressions: []
gaps:
  - truth: "Every unknown or private provider-result field causes whole-result rejection, including non-enumerable, symbol-keyed, inherited/custom-prototype, Proxy-backed, and validation-time mutation variants."
    status: failed
    reason: "The reflective preflight accepts enumerable accessor descriptors. A schema-valid allowed-key getter can add a non-enumerable key, symbol key, or non-enumerable custom-prototype field after preflight while Zod reads the property; the handler then returns a successful provider-attributed response instead of sanitized PROVIDER_FAILURE."
    artifacts:
      - path: "src/providers/types.ts"
        issue: "isProviderReviewResultEnvelope checks descriptor existence/enumerability but does not require an own data descriptor, leaving a preflight-to-Zod TOCTOU gap."
      - path: "src/tools/review.ts"
        issue: "The result is preflighted once before providerReviewResultSchema.safeParse, with no immutable snapshot or post-read revalidation."
      - path: "tests/contract/review-provider.test.ts"
        issue: "The post-preflight accessor matrix covers only throwing getters, not schema-valid getters that mutate the original envelope shape."
      - path: "docs/mcp-contract.md"
        issue: "The normative whole-result rejection promise is stronger than current runtime behavior."
    missing:
      - "Require all six allowed envelope properties to be enumerable own data descriptors before Zod parsing, or read into an isolated snapshot and revalidate the original envelope after all reads."
      - "Add ordinary and null-prototype regressions for schema-valid allowed-key getters that add non-enumerable, symbol, and non-enumerable custom-prototype private data; require exact sanitized PROVIDER_FAILURE."
deferred:
  - truth: "Credentialed complete MCP/filesystem/provider/public-response end-to-end verification."
    addressed_in: "Phase 10"
    evidence: "Phase 10 success criterion 2 explicitly owns the opt-in complete stdio, filesystem, provider DTO, merge, and public-schema path."
---

# Phase 09: Public Provider Attribution and Determinism Contract Verification Report

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Verified:** 2026-09-04T16:57:07Z
**Status:** gaps_found
**Re-verification:** Yes — after Plan 09-07

This verification used the live implementation, tests, documentation, and independent hostile-object probes. SUMMARY claims were treated only as navigation. No credentials, network, or live DeepSeek test were used.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Public responses expose only stable deterministic analyzer identity and conditional provider name/model attribution. | VERIFIED | `src/tools/review.ts:27-30,240-258,281-288`; `src/contracts/review.ts:344-388`; provider-focused tests pass. |
| 2 | Citation, hash, requestId, and generatedAt provenance remains schema-bound and backwards-compatible. | VERIFIED | `src/contracts/review.ts:351-432`; image/screenshot/PDF matrices and full suite pass. |
| 3 | Documentation scopes byte equality to deterministic/offline output and permits provider variability. | VERIFIED | `docs/mcp-contract.md:64-70,255`; semantic docs tests pass. |
| 4 | Identical offline requests produce byte-identical, non-empty deterministic MCP text. | VERIFIED | Frozen raw fixture plus independent 15-finding oracle pass in `tests/contract/review-provider.test.ts`. |
| 5 | Provider token checks exclude locally bound provenance collisions. | VERIFIED | Provider-only provenance is validated before the authored-string allowlist at `src/tools/review.ts:284-294`; collision controls pass. |
| 6 | Provider attribution exists iff provider-prefixed findings exist and namespaces match. | VERIFIED | Cross-field schema rules at `src/contracts/review.ts:374-388`; direct and handler cases pass. |
| 7 | Nullish, malformed, incomplete, and oversized ordinary provider results fail closed. | VERIFIED | Strict result schema and independent 100-item limits at `src/providers/types.ts:47-56`; focused tests pass. |
| 8 | Provider call failures, throwing reflective traps, and throwing post-preflight accessors are sanitized as PROVIDER_FAILURE. | VERIFIED | Provider-owned catch at `src/tools/review.ts:265-303`; 12 reflective and 8 accessor-throw cases pass. |
| 9 | Image, screenshot, and PDF visual citations are bound to retained local payload hashes. | VERIFIED | `src/contracts/review.ts:286-311,390-429`; direct and handler matrices pass. |
| 10 | Each provider finding array is limited to 100 entries. | VERIFIED | `src/providers/types.ts:13,53-54`; 100/101 controls pass. |
| 11 | Deterministic fixture is non-empty and independently locks order/content. | VERIFIED | Raw MCP fixture and hard-coded ordered projection both pass. |
| 12 | Analyzer execution, identity, and snapshot faults are sanitized INTERNAL_ERROR. | VERIFIED | Trusted identity and analyzer boundary at `src/tools/review.ts:27-30,229-258`; hostile matrices pass. |
| 13 | Documented INVALID_REQUEST and deterministic success examples equal runtime output. | VERIFIED | `tests/contract/public-contract-docs.test.ts:209-240` executes and deep-compares both examples. |
| 14 | Current promptVersion/inputFingerprint echoes in provider-authored strings are rejected. | VERIFIED | Authored-string guard at `src/tools/review.ts:147-167,289-294`; full field matrix passes. |
| 15 | Analyzer cannot replace trusted cleanup; pending subsystem errors outrank cleanup faults. | VERIFIED | Bound cleanup closures and pending-error handling at `src/tools/review.ts:213-226,312-327`; precedence tests pass. |
| 16 | Cleanup continues over stable claim, token, top-array, payload, cell, and buffer references after a local fault. | VERIFIED | Per-action cleanup at `src/review/analysis.ts:127-174`; exhaustive eight-category retained-reference matrix passes. |
| 17 | Four-role documented success response is produced by the built-in runtime exactly. | VERIFIED | Docs test extracts the request, invokes `handleReviewRequest`, and deep-equals the documented response. |
| 18 | Provider receives a fresh, strictly validated, recursively frozen inference object with exactly model/temperature/maxTokens. | VERIFIED | Projection at `src/tools/review.ts:96-131`; production-shaped capture test passes. |
| 19 | Caller-owned provider configuration remains unfrozen and unmodified. | VERIFIED | Request projection retains no config reference; success/failure ownership tests pass. |
| 20 | Original and isolated claims, token arrays, payloads, cells, and buffers are scrubbed best-effort. | VERIFIED | Stable targets and independent cleanup attempts at `src/review/analysis.ts:127-174`; direct and handler retention tests pass. |
| 21 | Analyzer findings use a trusted immutable snapshot across provider await. | VERIFIED | Parsed findings are cloned/frozen at `src/tools/review.ts:240-258`; async mutation tests pass. |
| 22 | Handler dependencies are source-correct, snapshotted once after both cleanup registrations, and cannot fail open. | VERIFIED | Only one source read each at `src/tools/review.ts:223-225`; event-order and changing-provider tests pass. Independent probe observed one provider read, one provider call, `ok:true`; a throwing providerConfig getter returned exact INTERNAL_ERROR after both registered views were scrubbed. |
| 23 | Every unknown/private provider-result field causes whole-result rejection. | FAILED | Independent ordinary/null-prototype probes added a non-enumerable own key, symbol key, or non-enumerable custom-prototype field from a schema-valid `provider` getter during Zod reads; all six cases returned `ok:true` with provider attribution. |

**Score:** 22/23 truths verified

### Plan 09-07 Rechecks

| Addition | Verdict | Evidence |
| --- | --- | --- |
| Reflective `ownKeys` trap matrix | VERIFIED | Four thrown-value classes are exercised; each returns exact PROVIDER_FAILURE after one provider call. |
| Reflective `getPrototypeOf` trap matrix | VERIFIED | Four thrown-value classes are independently exercised and contained. |
| Reflective `getOwnPropertyDescriptor` trap matrix | VERIFIED | Exact-six-key targets reach the descriptor trap and are contained. |
| Post-preflight Zod accessor throws | VERIFIED | Ordinary and null-prototype exact-six-key objects cover TypeError, RangeError, Error, and non-Error throws. |
| Post-preflight schema-valid accessor mutation | FAILED | No regression exists; independent probes prove non-enumerable/symbol/custom-prototype additions can be accepted. |
| Exhaustive per-category cleanup continuation | VERIFIED | Claim fields, original/current tokens, both top arrays, payload text, table cells, and detached buffer faults are separately tested. |
| Cleanup documentation semantic completeness | VERIFIED | One normative paragraph includes all categories, best-effort continuation, sanitized fallback INTERNAL_ERROR, and earlier-error precedence; semantic fixtures prevent keyword scattering. |

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/contracts/review.ts` | Strict public attribution and provenance contract | VERIFIED | Substantive and wired into deterministic, provider-only, and final response parsing. |
| `src/providers/types.ts` | Strict inference/result schemas and exact result-envelope preflight | PARTIAL | Exists and is wired, but accessor descriptors are accepted and can mutate shape after preflight. |
| `src/tools/review.ts` | Safe orchestration, dependency snapshots, provider boundary, cleanup lifecycle | PARTIAL | Prior dependency blocker is closed; provider acceptance still relies on a single pre-read envelope check. Direct request parsing also has an in-process robustness warning. |
| `src/review/analysis.ts` | Stable-reference best-effort cleanup | VERIFIED | Substantive, wired, and independently exercised across all target categories. |
| `tests/contract/review-provider.test.ts` | Hostile boundary and public-contract regressions | PARTIAL | Extensive trap/accessor-throw coverage exists, but no schema-valid accessor mutation coverage. |
| `tests/review/analysis.test.ts` | Direct cleanup and continuation regressions | VERIFIED | All eight required local-fault categories use retained references and no global prototype patching. |
| `tests/contract/public-contract-docs.test.ts` | Executable determinism, rejection, and cleanup semantics | VERIFIED | Runtime examples and complete cleanup/rejection language are enforced. |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | Frozen non-empty offline bytes | VERIFIED | Exact runtime equality and independent ordered oracle pass. |
| `docs/mcp-contract.md` | Accurate determinism, attribution, rejection, and cleanup contract | PARTIAL | Determinism and cleanup prose are accurate; line 70 overstates whole-result rejection for validation-time accessor mutation. |
| `README.md` | Concise scoped public contract | VERIFIED | Determinism/provider variability and non-public data boundaries remain scoped. |

The SDK reported 6/6 Plan 09-07 artifacts present/substantive and 5/5 declared key-link patterns found. Those structural results do not override the behavioral TOCTOU failure.

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Handler options | Normalization/lifecycle | Narrow filesystem projection, then one-time provider/config/analyzer snapshots | WIRED | Source and event-order tests agree; no whole-options spread or repeated post-analysis dependency access remains. |
| Production ProviderConfig | Provider request inference | Fresh strict three-field projection and request-owned freeze | WIRED | Config-only fields/references do not reach the provider request. |
| Analyzer return | Final deterministic findings | Parse, deep copy, recursive freeze | WIRED | Collision, provider processing, and merge use the trusted snapshot. |
| Analysis inputs | Cleanup | Bound original/isolated closures and stable target references | WIRED | Both registered closures execute; each action continues after local faults. |
| Provider result | Envelope preflight then Zod | Reflect keys/prototype/descriptors/Proxy before `safeParse` | PARTIAL | Ordering is correct, but accessor side effects can invalidate the checked shape during Zod reads. |
| Provider findings | Public response | Identity, namespace, token, citation/hash, and final schema validation | WIRED | Only validated provider name/model attribution and findings are projected. |
| Docs | Runtime/semantic tests | Exact examples and normative-clause checks | PARTIAL | Tests enforce the stated whole-result rule but do not execute validation-time shape mutation, so false prose remains green. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | `inference` | Three selected ProviderConfig values parsed into a fresh object | Yes | FLOWING |
| `src/tools/review.ts` | `trustedDeterministicFindings` | Analyzer output parsed, cloned, and frozen | Yes | FLOWING |
| `src/tools/review.ts` | `providerResult` / `providerFindings` | Injected/production provider result through preflight and Zod | Yes, but a mutable accessor envelope can change shape after preflight | PARTIAL |
| `src/review/analysis.ts` | cleanup targets | Original and isolated claims/payload references | Yes | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command/probe | Result | Status |
| --- | --- | --- | --- |
| Focused Phase 09 suite | `npm test -- --run tests/review/analysis.test.ts tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` | 3 files, 63/63 passed | PASS |
| Strict TypeScript build | `npm run build` | exit 0 | PASS |
| Full routine suite | `npm test` | 26 files, 188/188 passed; live DeepSeek excluded by script | PASS |
| One-time dependency snapshots/fail-open | Independent `tsx` probe | Stateful provider: 1 read, 1 call, success; throwing providerConfig: exact INTERNAL_ERROR, both registered views scrubbed | PASS |
| Validation-time non-enumerable/symbol additions | Independent `tsx` probe, ordinary and null prototypes | Four provider-attributed `ok:true` responses after a seventh hidden own key was added | FAIL |
| Validation-time custom-prototype addition | Independent `tsx` probe using a non-enumerable inherited private field | Two provider-attributed `ok:true` responses with disallowed prototype after Zod read | FAIL |
| Hostile direct request getters/Proxy traps | Independent `tsx` probe | `get` and `ownKeys` traps rejected the Promise with raw `REQUEST-PROXY-SECRET` | WARNING |
| Whitespace/worktree before report | `git diff --check`; `git status --short` | Clean | PASS |

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MCP-02 | 09-01 through 09-07 | Deterministic schema-valid success and machine-readable errors for rejected requests/results | BLOCKED | Offline determinism and ordinary error paths pass, but a provider result that becomes non-conforming during validation is accepted as success instead of exact PROVIDER_FAILURE. |
| SAFE-03 | 09-01 through 09-07 | Source/location/hash/provider/model/request/timestamp provenance | SATISFIED | Public schema binds all required provenance and only exposes provider name/model. Hidden mutation data was not serialized in the probes, and citation/hash attribution remained valid. |

ROADMAP maps only MCP-02 and SAFE-03 to Phase 09, and every Phase 09 plan declares both. No orphaned Phase 09 requirement was found.

## Current 09-REVIEW Finding Validation

| Finding | Verdict | Scope assessment |
| --- | --- | --- |
| CR-01: schema-valid accessor mutates envelope shape during Zod reads | BLOCKER CONFIRMED | Violates Plan 09-06/09-07's explicit whole-result rejection must-have and MCP-02's fail-closed machine-readable provider-result behavior. Non-enumerable own, symbol own, and non-enumerable custom-prototype variants reproduced for ordinary and null-prototype starting envelopes. |
| WR-01: hostile in-process request getters/Proxy traps escape handler error boundary | WARNING CONFIRMED, NON-BLOCKING FOR PHASE 09 | `reviewRequestSchema.safeParse` and `errorFromValidation` run before the handler catch and raw traps reproduce. Such objects cannot cross JSON-RPC/JSON decoding, and Phase 09 plans focus the hostile-object contract on provider returns and option dependencies, so this does not invalidate the Phase 09 MCP server goal or MCP-02 remote behavior. It remains a real exported-API robustness defect for direct embedders. |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/providers/types.ts` | 32-35 | Accessor descriptors accepted as envelope fields | BLOCKER | An allowed-key getter can mutate the envelope after the only shape check. |
| `src/tools/review.ts` | 273-278 | One pre-read shape check followed by mutable Zod property reads | BLOCKER | Whole-result rejection can be bypassed while returning provider-attributed success. |
| `tests/contract/review-provider.test.ts` | 1521-1581 | Accessor matrix tests throws only | WARNING | Passing, side-effecting getters are not regression-locked. |
| `src/tools/review.ts` | 359-362 | Request `safeParse`/validation derivation outside stable catch | WARNING | Direct in-process hostile request objects can leak a raw rejected exception; JSON-RPC callers cannot construct this shape. |
| `docs/mcp-contract.md` | 70 | Absolute whole-result rejection promise | BLOCKER | Normative documentation contradicts current accessor-mutation behavior. |

No source TODO/FIXME placeholder, empty production implementation, orphaned core artifact, or live/network test invocation was found.

## Human Verification Required

None. The remaining blocker and warning are fully reproducible with deterministic offline probes.

## Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | Credentialed complete MCP/filesystem/provider/public-response E2E | Phase 10 | Phase 10 success criterion 2 explicitly owns the opt-in full path. |

## Gaps Summary

Plan 09-07 closes the prior handler-dependency/fail-open blocker and its ordinary hidden-field, Proxy, throwing-reflection, throwing-accessor, cleanup-matrix, and documentation gaps. It does not close the whole provider-result rejection truth: accepting accessor descriptors leaves a deterministic validation-time mutation window. Because this produces successful provider-attributed output for a result that violates the declared envelope contract, MCP-02 remains blocked and Phase 09 must not proceed as complete. SAFE-03 remains satisfied. The separate direct-request Proxy issue is a confirmed robustness warning outside the remote MCP/Phase 09 threat model.

---

_Verified: 2026-09-04T16:57:07Z_
_Verifier: the agent (gsd-verifier)_
