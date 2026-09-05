---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-05T09:20:58Z
status: passed
score: 23/23 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 22/23
  gaps_closed:
    - "Every unknown/private provider-result field, including nested parse-time mutation, causes whole-result rejection."
  gaps_remaining: []
  regressions: []
---

# Phase 09: Public Provider Attribution and Determinism Contract Verification Report

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.

**Verified:** 2026-09-05T09:20:58Z
**Status:** PASSED
**Re-verification:** Yes — after the prior 22/23 report and Plan 09-09 closure.

This independent verification inspected all Phase 09 plans and summaries (09-01 through 09-09), prior review/verification artifacts, roadmap/state/requirements, current implementation/tests/docs, and closing commits `41a3b52` and `5fc50fd`. Summary claims were not used as implementation evidence.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Deterministic-only responses retain stable `deterministic-rules` analyzer name/version; provider findings add only validated provider name/model. | VERIFIED | `src/tools/review.ts:240-252,280-290`; strict response refinement and focused tests pass. |
| 2 | Public output never exposes credentials, endpoints, prompts, fingerprints, envelopes, raw upstream data, or retry/transport internals. | VERIFIED | Strict schemas/projection plus redaction matrices; docs exclusion clause is enforced. |
| 3 | Identical offline requests produce byte-identical MCP text while provider finding prose may vary. | VERIFIED | Frozen raw-MCP fixture/oracle and focused provider suite pass; docs scope byte equality to deterministic-only output. |
| 4 | Provider attribution is present iff provider-prefixed findings are returned, and provider namespace/identity binding is enforced. | VERIFIED | Cross-field schema rules and `src/tools/review.ts:169-180`. |
| 5 | Request ID, timestamp, normalized-evidence hashes, typed locations, citations, and visual PDF/image provenance remain schema-bound and compatible. | VERIFIED | Response refinements and full suite pass. |
| 6 | Provider inference is a fresh strict three-field request-owned projection; caller config is not disclosed or frozen. | VERIFIED | Strict schema, request projection, ownership tests pass. |
| 7 | Analyzer identity/input mutation and cleanup failures are sanitized `INTERNAL_ERROR` without replacing an earlier specific error. | VERIFIED | Analyzer-owned boundary and cleanup lifecycle tests pass. |
| 8 | Provider failures, malformed returns, reflective traps, and top-level accessors map to exact sanitized `PROVIDER_FAILURE`. | VERIFIED | Provider boundary at `src/tools/review.ts:265-304`; focused matrices pass. |
| 9 | Provider finding arrays are capped and locally schema/provenance-validated before projection. | VERIFIED | `src/providers/types.ts:47-56`; provider-only schema validation passes. |
| 10 | Trusted deterministic findings are snapshotted across provider await; transient analysis data is scrubbed best-effort. | VERIFIED | Clone/freeze and retained-reference cleanup tests pass. |
| 11 | Current fingerprint/prompt-version echoes in provider-authored strings fail closed without scanning locally bound provenance. | VERIFIED | Authored-string guard follows provider-only provenance validation; collision tests pass. |
| 12 | Documentation examples and contract semantics are executable assertions. | VERIFIED | 15 documentation tests read the documents and validate runtime examples. |
| 13 | Exact-six provider envelopes reject unknown, hidden, Symbol, inherited/custom-prototype, Proxy, and accessor shapes before parsing. | VERIFIED | `isProviderReviewResultEnvelope` checks own keys/prototype/data descriptors/Proxy at `src/providers/types.ts:23-37`. |
| 14 | Top-level accessor rejection preserves zero reads and one provider call. | VERIFIED | Existing accessor/trap matrices remain in the passing focused suite. |
| 15 | Nested parsing cannot turn an initially compliant envelope into provider-attributed success. | VERIFIED | Envelope preflight runs before and after `safeParse`, before `.data`. |
| 16 | A `modelFindings` Proxy mutation to a hidden key, Symbol, or custom prototype returns exact `PROVIDER_FAILURE`. | VERIFIED | 2 prototypes × 3 mutations are exercised. |
| 17 | A `deterministicFindings` Proxy mutation to a hidden key, Symbol, or custom prototype returns exact `PROVIDER_FAILURE`. | VERIFIED | The same 2 × 3 coverage is exercised. |
| 18 | All 12 nested mutation cases disclose neither sentinels nor provider attribution/namespaced findings. | VERIFIED | Exact payload and negative serialization/log assertions pass. |
| 19 | Ordinary six-data-property outer envelopes retain provider-attributed namespaced success. | VERIFIED | Ordinary control asserts valid metadata and finding namespace. |
| 20 | Null-prototype six-data-property outer envelopes retain provider-attributed namespaced success. | VERIFIED | Null-prototype control asserts the same success. |
| 21 | Public documentation states before-and-after structural-parsing envelope validation. | VERIFIED | Heading-scoped documentation guard at `public-contract-docs.test.ts:126-131` passes. |
| 22 | The phase implementation/test scope has no required live provider or Phase 10/11 behavior. | VERIFIED | All test paths here are local/injected; no Phase 10/11 code is needed for this goal. |
| 23 | MCP-02 and SAFE-03 implementation obligations are fulfilled. | VERIFIED | See requirements coverage. |

**Score:** 23/23 truths verified

### Mandatory Provider-Envelope Proof

`src/tools/review.ts:273-280` proves the required ordering inside the provider-owned catch:

1. `isProviderReviewResultEnvelope(untrustedProviderResult)` runs before parsing.
2. `providerReviewResultSchema.safeParse(untrustedProviderResult)` structurally parses it.
3. The same outer-envelope predicate runs again immediately after parsing.
4. Only then does `parsedProviderResult.data` get assigned and used.

`tests/contract/review-provider.test.ts:1679-1781` runs a nested Proxy which mutates the outer object during Zod parsing. Its matrix is `modelFindings`/`deterministicFindings` × ordinary/null prototype × hidden-key/Symbol/custom-prototype mutation: **2 × 2 × 3 = 12 cases**. Every case asserts exactly:

```json
{ "ok": false, "code": "PROVIDER_FAILURE", "message": "Provider failure" }
```

It also asserts no sentinel, `metadata.provider`, or namespaced provider finding is serialized. The ordinary and null-prototype controls retain `{ name: "local-reviewer", model }` attribution and a `provider:local-reviewer:` finding. Existing top-level accessor zero-read and reflection/Proxy trap tests pass unchanged.

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/contracts/review.ts` | Strict additive attribution/provenance contract | VERIFIED | Substantive cross-field response rules, tested. |
| `src/providers/types.ts` | Exact-six outer-envelope preflight and strict provider DTO schema | VERIFIED | Called twice around parsing by handler. |
| `src/tools/review.ts` | Safe deterministic/provider orchestration and public projection | VERIFIED | Preflight → parse → post-parse preflight → identity/namespace/provenance flow is wired. |
| `src/review/analysis.ts` | Isolated analyzer data and transient cleanup | VERIFIED | Wired by handler and routine tests. |
| `tests/contract/review-provider.test.ts` | Offline provider boundary, controls, and mutation regressions | VERIFIED | 47 focused tests; injected provider only. |
| `tests/contract/public-contract-docs.test.ts` | Executable documentation guards | VERIFIED | 15 focused tests; reads docs and invokes local runtime only. |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | Frozen deterministic MCP bytes | VERIFIED | Used by compatibility regression. |
| `docs/mcp-contract.md` / `README.md` | Accurate public semantics | VERIFIED | Documentation tests pass and prose matches behavior. |

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Provider return | Outer envelope guard | Before structural parsing | WIRED | `src/tools/review.ts:273-275`. |
| Provider return | Zod | `providerReviewResultSchema.safeParse` | WIRED | `src/tools/review.ts:276`. |
| Zod result | Outer envelope guard | Post-parse, before `.data` | WIRED | `src/tools/review.ts:277-280`. |
| Valid provider data | Public response | Identity, namespace, provider-only/final schemas | WIRED | `src/tools/review.ts:281-312`. |
| Docs | Contract tests | Heading-scoped semantic checks/executable JSON examples | WIRED | `readFile`-based 15-test suite passes. |
| Nested Proxy fixture | Real handler | Injected provider through `handleReviewRequest` | WIRED | `review-provider.test.ts:1731-1767`. |

## Data-Flow Trace

| Artifact | Data variable | Source | Produces real data | Status |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | `expectedProviderRequest` | Strict fresh inference and normalized analysis | Yes | FLOWING |
| `src/tools/review.ts` | `untrustedProviderResult` | Provider return | Yes; guarded before/after nested parse | FLOWING |
| `src/tools/review.ts` | `providerResult` | `safeParse(...).data` after post-parse success only | Yes | FLOWING |
| `src/tools/review.ts` | Metadata/findings | Identity-bound and provenance-validated provider result | Yes | FLOWING |
| `src/review/analysis.ts` | Cleanup targets | Captured claim/payload/cell/buffer references | Yes | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 09 provider/docs contracts | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` | 62/62 passed | PASS |
| Nested parse-time outer mutation | `npm test -- --run tests/contract/review-provider.test.ts -t 'rejects nested provider-result Proxy mutations after structural parsing'` | 1/1 targeted test passed; includes all 12 loop cases | PASS |
| Strict compilation | `npm run build` | Exit 0 | PASS |
| Default routine suite | `npm test` | 26 files, 191/191 passed | PASS |
| Whitespace | `git diff --check` | Exit 0 | PASS |

No live/provider network test ran. The default test script sets `EVIDENCELENS_DISABLE_PROVIDER=1` and excludes `tests/providers/deepseek-live.test.ts`; the opt-in live command was not invoked.

## Requirements Coverage

| Requirement | Source plans | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MCP-02 | 09-01 through 09-09 | Deterministic schema-valid successes and machine-readable rejected-review errors | SATISFIED | Frozen offline bytes, exact sanitized failures, 62/62 focused and 191/191 full tests. `REQUIREMENTS.md` still says Pending: planning-state lag, not a code gap. |
| SAFE-03 | 09-01 through 09-09 | Source/location/hash/provider/model/request/timestamp provenance | SATISFIED | Strict provenance rules, conditional safe attribution, and valid ordinary/null controls pass. |

No Phase 09 orphaned requirement was found: all plans declare MCP-02 and SAFE-03, matching the roadmap.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `docs/mcp-contract.md` | 72 | Placeholder image mention in an explicitly opt-in live-test note | INFO | No effect on default or Phase 09 verification. |
| `src/review/analysis.ts` | 84 | `return []` for absent payload text | INFO | Utility control flow; not public output or a stub. |

No production TODO/FIXME/placeholder implementation, empty handler, hardcoded public success, or disconnected provider data flow was found.

## Non-Blocking Warnings

WR-01 (direct hostile request Proxy before handler validation) and WR-02 (top-level accessor matrix does not enumerate every allowlisted field) remain **warnings only**. They are outside Phase 09's stated goal, requirements, and Plan 09-09 scope. Neither changes the verified provider-result envelope behavior.

## Gaps Summary

None. The prior nested-Proxy blocker is closed in the actual handler and covered at the real boundary. The phase goal is achieved.

---

_Verified: 2026-09-05T09:20:58Z_
_Verifier: the agent (gsd-verifier)_
