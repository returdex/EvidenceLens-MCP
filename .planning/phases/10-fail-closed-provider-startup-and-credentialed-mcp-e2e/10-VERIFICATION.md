---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
verified: 2026-09-06T14:59:25Z
status: gaps_found
score: 8/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/11
  gaps_closed:
    - "The local executable eagerly validates provider configuration and emits a sanitized nonzero PROVIDER_CONFIGURATION failure."
    - "The adapter live command skips only when neither credential source exists and lets supplied invalid configuration fail."
    - "The Docker proof parses reviewResponseSchema and binds success to DeepSeek identity, resolved model, namespace, and provenance."
  gaps_remaining:
    - "The authorized Docker MCP run returned [docker-review:protocol] failed; complete live DeepSeek proof is absent."
    - "The harness prints success before verifying clean child shutdown and ignores exit status/signal."
    - "The evidence audit accepts impossible success summaries such as 0 fixtures, 0 findings."
    - "Count-valued provider configuration accepts fractional values."
  regressions: []
gaps:
  - truth: "Missing, invalid, or conflicting provider settings fail closed with sanitized errors in local and Docker startup paths, while explicit offline disablement remains available."
    status: partial
    reason: "Startup is now eager and sanitized, but integer-valued settings accept fractions such as maxRetries=0.9 and maxTokens=1.5."
    artifacts:
      - path: "src/providers/config.ts"
        issue: "parseFiniteNumber does not require integers for timeoutMs, maxRetries, maxTotalWaitMs, or maxTokens."
    missing:
      - "Reject fractional integral settings from files and environment, with regression tests."
  - truth: "A credentialed, opt-in structural test exercises stdio tools/call, four evidence roles, allowlisted filesystem reads, provider DTO conversion, finding merge, and final public schema validation."
    status: failed
    reason: "The authorized run returned [docker-review:protocol] failed, and the harness can print success before an abnormal Docker child exit is observed."
    artifacts:
      - path: "scripts/docker-review-real.mjs"
        issue: "Success is printed before shutdown; the exit promise discards code and signal."
      - path: ".planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md"
        issue: "The retained outcome is a protocol non-pass and PROV-01 remains open."
    missing:
      - "Require clean child exit before printing success and test nonzero/signal exits."
      - "After fixes, obtain a new separately authorized successful credentialed Docker MCP run."
  - truth: "Phase 7 passes only when the authorized complete MCP structural check passed."
    status: failed
    reason: "The audit accepts fabricated success with 0 fixtures and 0 findings."
    artifacts:
      - path: "scripts/audit-live-evidence.mjs"
        issue: "Success regex accepts arbitrary decimal counts instead of exactly four fixtures and at least one finding."
      - path: "tests/scripts/audit-live-evidence.test.ts"
        issue: "No zero/non-four fixture or zero-finding adversarial cases."
    missing:
      - "Require exactly 4 fixtures and a positive finding count; add adversarial tests."
---

# Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E Verification Report

**Phase Goal:** Invalid provider configuration fails consistently in every runtime, and an opt-in test proves DeepSeek vision through the complete MCP, filesystem, orchestration, and public-response boundary.
**Verified:** 2026-09-06T14:59:25Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 10-04 through 10-07

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Missing, invalid, or conflicting provider settings fail closed with sanitized errors in local and Docker startup paths, while explicit offline disablement remains available. | ✗ FAILED | Executable checks pass, but direct checks show fractional `maxRetries`, `maxTokens`, `timeoutMs`, and `maxTotalWaitMs` are accepted. |
| 2 | A credentialed opt-in test proves the full stdio `tools/call`, four-role filesystem, provider conversion/merge, and final public-schema boundary. | ✗ FAILED | The exactly-once authorized run returned `[docker-review:protocol] failed`; the harness also prints success before validating child exit. |
| 3 | Phase 7 has independent evidence and routine tests remain credential-free/no-network. | ✓ VERIFIED | Phase 7 retains a sanitized live-proof block; `npm test` excludes the live adapter and passed 233 tests. |
| 4 | Literal `EVIDENCELENS_DISABLE_PROVIDER=1` is the sole ambient offline override. | ✓ VERIFIED | `src/server.ts` uses strict equality and focused tests pass. |
| 5 | Explicit provider/providerConfig injection remains usable without ambient configuration. | ✓ VERIFIED | Injection-first factory behavior remains covered by the passing contract suite. |
| 6 | Local and Docker startup failure output is sanitized as `PROVIDER_CONFIGURATION`. | ✓ VERIFIED | `main()` eagerly creates the server; child-process tests launch `dist/server.js`, assert nonzero status, and exact sanitized stderr before MCP input. |
| 7 | Only the explicit opt-in command can perform a credentialed Docker stdio review with all four roles. | ✓ VERIFIED | `docker:review:real` is separate from routine commands; `fixtureRequest()` contains exactly four required role-labeled filesystem inputs. |
| 8 | Live structural assertions prove DeepSeek DTO conversion, namespace, public schema, provenance, hashes, citations, and disclosure constraints. | ✓ VERIFIED | `assertStructuralReview()` parses `reviewResponseSchema`, binds name/model/namespace, and its adversarial tests reject schema/identity/provenance drift. This verifies the assertion code, not a successful live outcome. |
| 9 | Adapter live command accepts process environment or ignored local config without printing either source. | ✓ VERIFIED | Presence probing precedes validation; `loadProviderConfig()` is outside any catch; defective-source tests pass offline. |
| 10 | Documentation distinguishes adapter-only testing from complete Docker MCP proof and excludes both from `npm test`. | ✓ VERIFIED | Routine commands remain disconnected from `docker:review:real`; documentation regression tests pass. |
| 11 | Phase 7 passes only when the authorized complete MCP structural check passed. | ✗ FAILED | Current state honestly remains open, but `auditLiveEvidence()` accepted synthetic `0 fixtures, 0 findings` success and could falsely close PROV-01. |

**Score:** 8/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/server.ts` | Eager sanitized startup | ✓ VERIFIED | Exists, substantive, wired before stdio, and exercised through a real child process. |
| `tests/contract/review-tool.test.ts` | Process-boundary regressions | ✓ VERIFIED | Covers missing, invalid, and conflicting configuration before MCP traffic. |
| `src/providers/config.ts` | Precise source detection and validation | ⚠️ PARTIAL | `hasProviderCredentialSource` is exported/wired (the SDK export warning is a parser false negative), but integral values are not enforced. |
| `tests/providers/deepseek-live.test.ts` | Absence-only skip | ✓ VERIFIED | Presence gate then uncompromised load/validation. |
| `scripts/docker-review-real.mjs` | Complete Docker MCP proof | ⚠️ PARTIAL | Schema/identity/model/namespace/timeout/retry wiring exists; clean process completion is not enforced. |
| `tests/scripts/docker-review-real.test.ts` | Adversarial proof tests | ⚠️ PARTIAL | 23 tests pass, including zero-retry/model/schema checks; no abnormal-exit seam test. The SDK `maxRetries` miss is a parser false negative. |
| `scripts/audit-live-evidence.mjs` | Exact evidence consistency | ✗ STUB-CONTRACT | Substantive and wired, but its success grammar is weaker than the harness contract. |
| `tests/scripts/audit-live-evidence.test.ts` | Contradiction/disclosure rejection | ⚠️ PARTIAL | Existing cases pass but omit impossible success counts. |
| Phase 7 verification and `REQUIREMENTS.md` | Honest synchronized state | ✓ VERIFIED | Both retain failure/open PROV-01 after the protocol non-pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Local executable | provider config | eager `createServer()` | ✓ WIRED | Child-process tests prove failure before MCP traffic. |
| Adapter test | config loader | presence gate then validation | ✓ WIRED | Invalid supplied sources are not skipped. |
| Docker response | public contract | `reviewResponseSchema.parse` | ✓ WIRED | Complete schema parse precedes identity assertions. |
| Docker proof | Compose model/retry/timeout | resolved config preflight | ✓ WIRED | Requires allowed model, retry zero, and provider timeout plus fixed margin. |
| Valid MCP response | successful command completion | Docker child shutdown | ✗ NOT WIRED | Success prints first; code/signal are ignored. |
| Retained evidence | Phase 7/PROV-01 state | evidence audit | ✗ PARTIAL | State consistency exists, but impossible success counts pass. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real Data | Status |
|---|---|---|---|---|
| `src/server.ts` | provider config | injected or validated ambient config | Yes | ✓ FLOWING |
| `tests/providers/deepseek-live.test.ts` | provider result | opt-in adapter | Potentially | ✓ WIRED; excluded routinely |
| `scripts/docker-review-real.mjs` | public payload | Docker MCP `tools/call` | No successful authorized sample | ✗ UNPROVEN |
| `scripts/audit-live-evidence.mjs` | completion state | live-proof block | Accepts impossible success | ✗ HOLLOW |

### Behavioral Spot-Checks

| Behavior | Result | Status |
|---|---|---|
| Six focused Phase 10 test files | 72 tests passed (live adapter excluded by routine script) | ✓ PASS |
| `npm test` | 233 tests / 28 files passed | ✓ PASS |
| `npm run build` | Exit 0 | ✓ PASS |
| Current evidence audit | Honest protocol-failure state accepted | ✓ PASS |
| Synthetic `0 fixtures, 0 findings` success | `auditLiveEvidence()` returned `{ passed: true }` | ✗ FAIL |
| Fractional integral configuration | Four fractional values were accepted | ✗ FAIL |
| Authorized credentialed Docker MCP proof | `[docker-review:protocol] failed`; no retry/fallback | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|---|---|---|---|
| SAFE-04 | 10-01–10-07 | ✓ SATISFIED | Diagnostics and retained evidence are sanitized; routine tests are offline and no secret/raw provider output was retained. |
| PROV-01 | 10-01–10-07 | ✗ BLOCKED | The real Docker MCP run did not pass and future completion can be falsely reported after abnormal exit or impossible counts. |

No Phase 10 requirement is orphaned. Phase 11 covers Linux filesystem traversal, not these provider/live-proof defects; nothing is deferred.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/docker-review-real.mjs` | 236-238 | Pass before shutdown; exit result discarded | Blocker | Abnormal container completion can be recorded as successful proof. |
| `scripts/audit-live-evidence.mjs` | 7 | Arbitrary decimal success counts | Blocker | Impossible proof can mark PROV-01 complete. |
| `src/providers/config.ts` | 51-53, 108-112 | Finite-only parser for integer settings | Warning / failed truth | Invalid fractions survive startup and may diverge at runtime/API use. |

No TODO/FIXME/placeholder or empty implementation blocker was found in the reviewed Phase 10 files.

### Human Verification Required

None. The live outcome is a definite sanitized non-pass; remaining defects are deterministic and directly observable.

### Gaps Summary

Gap closure fixed eager local startup, adapter skip correctness, production schema validation, DeepSeek binding, and the single-attempt timeout boundary. The goal remains unmet because the authorized complete proof failed, two false-positive proof paths remain, and fractional integral settings violate fail-closed configuration. No later phase owns these gaps.

---

_Verified: 2026-09-06T14:59:25Z_
_Verifier: the agent (gsd-verifier)_
