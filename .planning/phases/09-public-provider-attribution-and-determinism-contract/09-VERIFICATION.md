---
phase: 09-public-provider-attribution-and-determinism-contract
verified: 2026-09-02T16:11:57Z
status: gaps_found
score: 1/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Public responses identify deterministic and provider-backed analyzers with stable provider/model metadata without exposing provider internals."
    status: failed
    reason: "The schema does not enforce attribution presence or namespace consistency: it accepts attribution with no provider findings, provider findings with no attribution, and a provider namespace that differs from metadata.provider.name."
    artifacts:
      - path: "src/contracts/review.ts"
        issue: "reviewResponseSchema validates only the shape of metadata.provider and never relates it to provider-prefixed finding IDs."
      - path: "tests/contract/review-provider.test.ts"
        issue: "The additive attribution test explicitly expects metadata.provider on a deterministic-only response to parse successfully and has no inverse/namespace checks."
    missing:
      - "Enforce provider attribution if-and-only-if provider findings exist."
      - "Require every provider finding namespace to match metadata.provider.name."
      - "Add positive, missing-attribution, extraneous-attribution, and wrong-namespace contract tests."
  - truth: "A configured provider cannot silently fail open as an unattributed deterministic-only success."
    status: failed
    reason: "When ReviewProvider.review returns null/undefined, truthiness guards skip identity and finding validation and return ok:true without provider attribution."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "Lines 147-156 treat an empty provider result as if no provider result existed."
      - path: "tests/contract/review-provider.test.ts"
        issue: "No test covers null/undefined or structurally incomplete provider results."
    missing:
      - "Runtime-validate every configured provider result as unknown and reject null, undefined, or incomplete values as PROVIDER_INVALID_RESPONSE."
      - "Add fail-closed tests for empty and malformed provider results."
  - truth: "Provider failures are returned as the stable sanitized PROVIDER_FAILURE machine-readable error."
    status: failed
    reason: "A provider throwing native TypeError is caught by the whole-pipeline handler and returned as INVALID_REQUEST; RangeError is similarly misclassified as LIMIT_EXCEEDED."
    artifacts:
      - path: "src/tools/review.ts"
        issue: "Lines 216-227 infer error origin from TypeError/RangeError across normalization, analysis, provider, and response validation instead of wrapping at the provider boundary."
      - path: "tests/contract/review-provider.test.ts"
        issue: "Provider failure tests cover ProviderError only, not native SDK/transport exceptions."
    missing:
      - "Catch non-ProviderError exceptions at the provider call boundary and map them to a ProviderError before the outer MCP error mapper."
      - "Add native TypeError and RangeError provider regression tests."
  - truth: "Existing citation/hash provenance remains schema-valid and locally bound for provider-backed findings."
    status: failed
    reason: "An image/screenshot provider citation with visual:true but no visualPayloadSha256 is accepted and publicly returned even though normalized evidence contains a retained visual payload hash."
    artifacts:
      - path: "src/contracts/review.ts"
        issue: "Lines 297-307 require a payload hash for visual PDF citations but not image citations; lines 393-397 validate an image hash only if one was supplied."
      - path: "tests/contract/review-provider.test.ts"
        issue: "No image/screenshot provider citation tests cover missing, mismatched, and matching visual payload hashes."
    missing:
      - "Require image/screenshot citation visualPayloadSha256 and bind it exactly to normalizedEvidence.visualPayload.sha256."
      - "Add missing-hash, wrong-hash, and valid-hash provider citation tests."
  - truth: "Documentation and tests accurately limit provider-backed guarantees while allowing provider variability."
    status: partial
    reason: "docs/mcp-contract.md still says all findings are deterministically ordered, but provider findings preserve provider-returned order and can change order across calls. The semantic docs test only locates the four-guarantee clause and does not reject contradictory extra guarantees."
    artifacts:
      - path: "docs/mcp-contract.md"
        issue: "Line 127 makes an unqualified deterministic-ordering claim for all findings."
      - path: "tests/contract/public-contract-docs.test.ts"
        issue: "Lines 37-53 require one correct clause but do not scan for provider-backed ordering or other additional determinism guarantees."
      - path: "src/tools/review.ts"
        issue: "Lines 107-114 namespace provider findings in returned order without sorting."
    missing:
      - "Either qualify deterministic ordering as applying only to deterministic analyzer findings, or sort provider findings by a documented stable key."
      - "Extend documentation tests to reject contradictory provider-backed determinism/ordering guarantees."
deferred:
  - truth: "The test named Docker fixture review E2E does not execute a container, image, container stdio, mounts, or Compose configuration."
    addressed_in: "Phase 10"
    evidence: "Phase 10 success criterion 2 explicitly requires an opt-in full stdio tools/call test across filesystem reads, provider conversion, finding merge, and final public schema validation; its goal also covers local and Docker runtime consistency."
---

# Phase 9: Public Provider Attribution and Determinism Contract Verification Report

**Phase Goal:** Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Verified:** 2026-09-02T16:11:57Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

ROADMAP success criteria were treated as the non-negotiable contract. PLAN truths that added independently testable detail were retained; clear restatements were deduplicated under the ROADMAP wording.

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Public responses identify deterministic and provider-backed analyzers with stable provider/model metadata without exposing keys, envelopes, or fingerprints. | ✗ FAILED | Valid provider calls project only `{name, model}` and sentinel tests pass, but direct schema checks accepted all three contradictory states: attribution without provider findings, provider findings without attribution, and wrong provider namespace. A configured provider returning `undefined` also produced unattributed `ok:true`. |
| 2 | Existing citation, hash, request identifier, and timestamp provenance remains schema-valid and backwards-compatible through explicit contract evolution. | ✗ FAILED | Request ID, fixed timestamp, deterministic shape, ordinary citation hashes/references/locations, and strict optional child are retained. However, a real image request with a provider citation omitting `visualPayloadSha256` returned `ok:true` and passed `reviewResponseSchema` while normalized evidence had a retained visual hash. |
| 3 | Documentation and tests scope byte-for-byte determinism to deterministic/offline output and describe provider-backed variability accurately. | ✗ FAILED | The core byte-equality clauses are correctly scoped, but `docs/mcp-contract.md:127` still promises all findings are deterministically ordered. A varying fake provider demonstrated order `[alpha,beta]` then `[beta,alpha]`; the docs test remained green because it does not reject extra ordering guarantees. |
| 4 | Two identical offline/deterministic requests produce byte-for-byte identical MCP JSON text, including meaningful deterministic findings. | ✓ VERIFIED | The frozen empty-finding fixture matched twice. An independent FIT5032 spot-check produced 15 findings across contradiction/omission/requirement_conflict and raw MCP text equality was `true` across two calls. |
| 5 | Provider-backed findings may vary, while responses guarantee only strict schema validation, safe attribution, namespacing, and locally validated citation/hash provenance. | ✗ FAILED | Varying prose and namespacing work, but strict attribution consistency and image visual-hash provenance are not enforced; therefore the stated four guarantees do not all hold. |

**Score:** 1/5 truths verified

### Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | The Phase 09 `Docker fixture review E2E` test is in-process and does not exercise Docker. | Phase 10 | Phase 10 explicitly owns the credentialed full MCP/filesystem/provider/public-response path and runtime consistency. The misleading current test name remains a warning, but container coverage is not a Phase 09 goal. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/contracts/review.ts` | Strict additive provider attribution without weakening provenance | ✗ SUBSTANTIVE/WIRED, BEHAVIOR FAILED | 442 lines; imported by the tool and tests. Strict child grammar exists, but attribution/finding consistency and required image payload-hash binding are absent. |
| `src/tools/review.ts` | Validate provider identity and safely project provider/model | ✗ SUBSTANTIVE/WIRED, BEHAVIOR FAILED | 247 lines; real provider-result-to-response flow exists. Nullish results fail open and native provider exceptions are misclassified. |
| `tests/contract/review-provider.test.ts` | Compatibility, variability, provenance, and redaction regression coverage | ⚠ SUBSTANTIVE/WIRED, INCOMPLETE | 304 lines and 10 tests pass, but it positively accepts extraneous attribution and omits the empty-result, native-exception, namespace, and image-hash failure paths. |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | Exact pre-Phase-09 raw MCP text | ⚠ VERIFIED, NARROW | Loaded by the focused test and compared as raw text, but contains zero findings; meaningful non-empty byte determinism required an independent spot-check. |
| `tests/contract/public-contract-docs.test.ts` | Semantic gate for scoped determinism and exclusions | ⚠ SUBSTANTIVE/WIRED, INCOMPLETE | Reads both documents and passes 7 assertions, but does not reject contradictory deterministic-ordering promises. |
| `docs/mcp-contract.md` | Normative additive schema and determinism semantics | ✗ WIRED, INACCURATE | Provider variability/exclusions are documented, but line 127 overpromises deterministic ordering for all findings. |
| `README.md` | User-facing attribution/determinism summary | ✓ VERIFIED | Correctly scopes byte equality to deterministic-only offline output and lists the public allowlist/exclusions. |
| `tests/e2e/docker-review.test.ts` | Existing integration assertion aligned with additive attribution | ⚠ WIRED, MISNAMED/SCOPE-LIMITED | Exercises MCP in memory with a host adapter and injected provider; it does not start Docker. Full-boundary coverage is deferred to Phase 10. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/providers/types.ts` | `src/tools/review.ts` | Result/provider request identity validation | ⚠ PARTIAL | Provider, model, prompt version, and fingerprint are compared at lines 117-130, but only when the result is truthy. |
| `src/tools/review.ts` | `src/contracts/review.ts` | `reviewResponseSchema.parse(response)` | ✓ WIRED | Manually confirmed at `src/tools/review.ts:175`; `gsd-sdk` reported a false negative caused by its escaped pattern lookup. |
| `src/tools/review.ts` | `tests/contract/review-provider.test.ts` | `handleReviewRequest` with stable/varying injected providers | ✓ WIRED | Focused tests invoke the real handler, exercise variable provider prose, and parse complete responses. |
| `docs/mcp-contract.md` / `README.md` | `tests/contract/public-contract-docs.test.ts` | `readFile` semantic checks | ⚠ PARTIAL | Both files are read, but the negative scan does not cover provider-backed deterministic ordering claims. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/tools/review.ts` | `providerResult` / `providerFindings` | `ReviewProvider.review(expectedProviderRequest)` | Yes for valid providers | ⚠ FLOWING WITH FAIL-OPEN NULL PATH |
| `src/tools/review.ts` | `metadata.provider` | Validated result provider/model conditional projection | Yes when model findings exist | ⚠ FLOWING, but schema does not enforce its relation to finding namespaces |
| `src/tools/review.ts` | `findings` | Deterministic analyzer plus namespaced provider findings | Yes | ⚠ FLOWING, provider order is passed through unchanged |
| `src/contracts/review.ts` | citation provenance | `normalizedEvidence` lookup by evidence ID | Yes | ✗ HOLLOW for missing image `visualPayloadSha256`; comparison runs only when the field exists |
| `tests/contract/public-contract-docs.test.ts` | normalized clauses | Real `README.md` and `docs/mcp-contract.md` reads | Yes | ⚠ FLOWING, but negative semantics coverage is incomplete |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Focused Phase 09 contract tests | `npm test -- --run tests/contract/public-contract-docs.test.ts tests/contract/review-provider.test.ts` | 2 files, 17 tests passed | ✓ PASS |
| TypeScript build | `npm run build` | Exit 0 | ✓ PASS |
| Full credential-free/no-network suite | `npm test` | 26 files, 144 tests passed | ✓ PASS |
| Non-empty offline byte determinism | Direct `tsx` invocation using FIT5032 fixture, twice | Raw bytes equal; 15 findings of three types | ✓ PASS |
| Attribution iff/namespace schema invariant | Direct schema mutation checks | All three invalid states were accepted | ✗ FAIL |
| Configured provider returns `undefined` | Direct handler invocation | Returned schema-valid `ok:true` deterministic-only response | ✗ FAIL |
| Provider throws native `TypeError` | Direct handler invocation | Returned `INVALID_REQUEST`, not `PROVIDER_FAILURE` | ✗ FAIL |
| Image citation omits payload hash | Direct image-provider handler invocation | Returned `ok:true`; schema accepted citation while normalized visual hash existed | ✗ FAIL |
| Provider finding ordering | Provider alternated two findings across calls | Order changed from alpha/beta to beta/alpha | ✗ FAIL against unqualified docs claim |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MCP-02 | `09-01-PLAN.md` | Deterministic, schema-valid successful JSON and machine-readable rejected-request errors | ✗ BLOCKED | Offline deterministic output and routine errors work, but an invalid empty provider result is reported as success and native provider failures receive the wrong machine-readable classification. The public schema also accepts attribution/finding contradictions. |
| SAFE-03 | `09-01-PLAN.md` | Findings retain source location, hashes, provider/model version, and timestamp/request ID | ✗ BLOCKED | Valid text-provider responses retain these fields, but provider findings can schema-validate without attribution, and image citations can be published without binding to the retained visual payload hash. |

No Phase 09 requirements are orphaned: ROADMAP and REQUIREMENTS map exactly MCP-02 and SAFE-03, and both appear in the plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/contracts/review.ts` | 362-400 | Optional attribution is shape-only; no cross-field invariant | 🛑 Blocker | Public schema admits contradictory analyzer/provider attribution. |
| `src/tools/review.ts` | 147-156 | Truthiness used as provider-result validity | 🛑 Blocker | Nullish provider failures silently become successful offline reviews. |
| `src/tools/review.ts` | 216-227 | Whole-pipeline exception-type guessing | 🛑 Blocker | Provider implementation failures are blamed on client input/limits. |
| `src/contracts/review.ts` | 297-307, 393-397 | Optional image hash is validated only when present | 🛑 Blocker | Provider image citations are not bound to retained visual bytes. |
| `docs/mcp-contract.md` | 127 | Unqualified deterministic-ordering guarantee | ⚠ Warning / goal-impacting gap | Contradicts provider order pass-through and the stated variable-provider contract. |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | 1 | Frozen baseline has `findings: []` | ⚠ Warning | Phase test cannot detect deterministic finding content/order regressions, although an independent non-empty spot-check currently passes. |
| `tests/e2e/docker-review.test.ts` | 134-160 | Docker-named test uses `InMemoryTransport` in current process | ⚠ Warning / deferred | Does not prove deployed image/container wiring; Phase 10 owns the full-boundary E2E. |

No TODO/FIXME/placeholder implementation stubs or orphaned Phase 09 artifacts were found. The documentation's “placeholder fixture image” refers to an intentional opt-in live-test fixture and is not an implementation stub.

### Human Verification Required

None. The goal-impacting failures were reproduced programmatically without network access or mutable external services.

### Gaps Summary

Phase 09 is not complete despite all focused tests, the build, and all 144 routine tests passing. The implementation has a real additive provider projection and preserves offline byte determinism, but the public schema does not enforce the documented attribution invariant, configured providers can fail open on empty results, native provider exceptions are misclassified, and image citation hashes are not mandatory. The documentation also retains an inaccurate global deterministic-ordering promise. These failures block both MCP-02 and SAFE-03 as claimed by this phase.

The seven findings in `09-REVIEW.md` were independently rechecked: CR-01 through CR-04 are confirmed blockers; WR-01 is confirmed and affects the phase goal; WR-02 is confirmed as a coverage weakness but the underlying non-empty deterministic behavior passed an independent spot-check; WR-03 is confirmed and deferred to the explicitly scoped Phase 10 full-boundary work.

---

_Verified: 2026-09-02T16:11:57Z_
_Verifier: the agent (gsd-verifier)_
