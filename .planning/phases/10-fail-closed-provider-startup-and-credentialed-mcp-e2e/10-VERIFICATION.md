---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
verified: 2026-09-06T12:51:19Z
status: gaps_found
score: 6/11 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Missing, invalid, or conflicting provider settings fail closed with sanitized errors in local and Docker startup paths, while explicit offline disablement remains available."
    status: failed
    reason: "Docker cases fail closed, but the actual local stdio executable defers createServer() behind serveStdio; with no provider configuration and closed stdin it exits 0 with no PROVIDER_CONFIGURATION diagnostic."
    artifacts:
      - path: "src/server.ts"
        issue: "main() passes a lazy createServer callback to serveStdio instead of validating configuration before entering the protocol loop."
      - path: "tests/contract/review-tool.test.ts"
        issue: "Tests call createServer() directly and do not launch the executable boundary."
    missing:
      - "Eagerly construct/validate the server before serving stdio."
      - "At the executable boundary, emit only the sanitized PROVIDER_CONFIGURATION classification and set a non-zero exit code."
      - "Add a child-process regression covering startup before any MCP request."
  - truth: "A credentialed, opt-in structural test exercises stdio tools/call, four evidence roles, allowlisted filesystem reads, provider DTO conversion, finding merge, and final public schema validation."
    status: failed
    reason: "The only authorized credentialed run ended with [docker-review:timeout] failed, so the complete path was not proven; additionally, the harness accepts fake provider attribution and schema-invalid output."
    artifacts:
      - path: "scripts/docker-review-real.mjs"
        issue: "assertStructuralReview() does not parse reviewResponseSchema, require provider name deepseek, require provider:deepseek: IDs, or bind the expected model."
      - path: "tests/scripts/docker-review-real.test.ts"
        issue: "No adversarial tests reject fake provider attribution or incomplete public-schema fields."
      - path: ".planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md"
        issue: "Records the authorized live run as a timeout non-pass and keeps PROV-01 open."
    missing:
      - "Validate the complete decoded payload with the production public response schema or a strictly equivalent shared schema."
      - "Require DeepSeek attribution, the configured model, and at least one provider:deepseek: finding."
      - "Add adversarial schema/attribution tests and obtain a separately authorized successful credentialed Docker MCP run."
  - truth: "The adapter live command skips only when neither usable credential source exists and otherwise exposes invalid configuration as failure."
    status: failed
    reason: "deepseek-live.test.ts catches every loadProviderConfig failure and calls skip(), including malformed, unreadable, conflicting, or out-of-range configuration."
    artifacts:
      - path: "tests/providers/deepseek-live.test.ts"
        issue: "Blanket catch around loadProviderConfig(undefined, process.env) hides all configuration defects as a successful skip."
    missing:
      - "Detect the precise no-credential case before loading and skip only that case."
      - "Allow malformed, unreadable, conflicting, and invalid supplied configuration to fail the opt-in command, with focused regression tests."
---

# Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E Verification Report

**Phase Goal:** Invalid provider configuration fails consistently in every runtime, and an opt-in test proves DeepSeek vision through the complete MCP, filesystem, orchestration, and public-response boundary.
**Verified:** 2026-09-06T12:51:19Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Missing, invalid, or conflicting provider settings fail closed with sanitized errors in local and Docker startup paths, while explicit offline disablement remains available. | ✗ FAILED | Docker matrix passed all four sanitized cases, but `env -u DEEPSEEK_API_KEY -u EVIDENCELENS_DISABLE_PROVIDER node dist/server.js </dev/null` exited 0 with empty stdout/stderr. `main()` lazily invokes `createServer()` inside `serveStdio`. |
| 2 | A credentialed opt-in test proves the full stdio `tools/call`, four-role filesystem, provider conversion/merge, and final public-schema boundary. | ✗ FAILED | Authorized `npm run docker:review:real` evidence is `[docker-review:timeout] failed`. The harness does not import or parse `reviewResponseSchema`; a fake, schema-incomplete payload was accepted in a direct spot-check. |
| 3 | Phase 7 has independent evidence and routine tests remain credential-free/no-network. | ✓ VERIFIED | Phase 7 report exists and honestly records `gaps_found`; `package.json` sets offline mode for `npm test` and excludes `deepseek-live.test.ts`. Focused routine suite passed 55 tests without a live call. |
| 4 | Literal `EVIDENCELENS_DISABLE_PROVIDER=1` is the sole ambient offline override. | ✓ VERIFIED | `src/server.ts:21-24` checks strict equality to `"1"`; tests cover `"1"` success and `"true"` failure. |
| 5 | Explicit provider/providerConfig injection remains usable without ambient configuration. | ✓ VERIFIED | Injection takes precedence in `createServer()`; `review-tool.test.ts` exercises fake provider and typed valid providerConfig with ambient key absent. |
| 6 | Local and Docker startup failure output is sanitized as `PROVIDER_CONFIGURATION`. | ✗ FAILED | Docker matrix proves sanitized output, but the local executable produces no classification and exits successfully when stdin closes. Direct `createServer()` serialization tests do not verify the executable boundary. |
| 7 | Only the explicit opt-in command can perform a credentialed Docker stdio review with all four roles. | ✓ VERIFIED | `docker:review:real` is a separate package script; harness performs initialize/list/call and builds exactly four role-labeled filesystem inputs. Routine scripts do not reference it. |
| 8 | Live structural assertions prove DeepSeek DTO conversion, namespace, public schema, provenance, hashes, citations, and disclosure constraints. | ✗ FAILED | Assertions check selected fields only. They accept `metadata.provider.name="fake"`, `provider:fake:x`, and objects missing required public fields; thus a reported pass would not prove DeepSeek or schema validity. |
| 9 | Adapter live command accepts process environment or ignored local config without printing either source. | ✓ VERIFIED | It calls `loadProviderConfig(undefined, process.env)` and no source/key is logged. However its overly broad skip is separately recorded as a blocker because the docs promise skip only for absence. |
| 10 | Documentation distinguishes adapter-only testing from complete Docker MCP proof and excludes both from `npm test`. | ✓ VERIFIED | README and both contract/deployment docs name both exact commands, prerequisites, cost/network boundary, and the injected-provider limitation. |
| 11 | Phase 7 passes only when the authorized complete MCP structural check passed. | ✓ VERIFIED | `07-VERIFICATION.md` remains `gaps_found`, explicitly treating the timeout as a non-pass; REQUIREMENTS reopens PROV-01. |

**Score:** 6/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/server.ts` | Fail-closed startup policy | ⚠️ PARTIAL | Substantive and wired for direct `createServer()` calls and Docker requests, but executable startup is lazy and can exit 0 without validation. |
| `tests/contract/review-tool.test.ts` | Local startup/injection coverage | ⚠️ PARTIAL | Direct factory and injection tests pass; no child-process executable-startup assertion. |
| `tests/smoke/docker-config.test.ts` | Compose/runtime parity | ✓ VERIFIED | Substantive static checks; actual Docker matrix also passed. |
| `scripts/docker-review-real.mjs` | Credentialed Docker MCP structural harness | ✗ HOLLOW | MCP/data flow is wired, but success validation is not schema-strict or DeepSeek-specific; actual credentialed run timed out. |
| `package.json` | Explicit opt-in live command | ✓ VERIFIED | `docker:review:real` maps only to the dedicated harness and is absent from routine scripts. |
| `tests/providers/deepseek-live.test.ts` | Narrow adapter live structural test | ⚠️ PARTIAL | Provider data flow is real when config loads, but blanket catch converts invalid configuration into skip. |
| `.planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md` | Independent result evidence | ✓ VERIFIED | Substantive, truthful report retaining the timeout gap. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src/server.ts` | provider config / DeepSeek provider | typed load then construction | ✓ WIRED | Factory loads once and constructs provider only from valid typed config. |
| Compose profiles | `src/server.ts` | explicit offline env vs enabled configuration | ✓ WIRED | Smoke profile sets disable=1; runtime matrix proves enabled failures and offline smoke. |
| Local executable | fail-closed config validation | `main()` / stdio entry | ✗ NOT WIRED | Server creation is deferred until protocol activity; closed stdin bypasses failure. |
| `docker-review-real.mjs` | Compose review service | initialize, tools/list, tools/call | ✓ WIRED | Harness spawns review profile and sends all three protocol requests with four filesystem items. |
| Docker MCP response | public response schema | final structural parse | ✗ NOT WIRED | Harness never invokes `reviewResponseSchema`; selective checks accept invalid/fake output. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `src/server.ts` | provider/providerConfig | explicit injection or `loadProviderConfig()` | Yes when factory is called | ⚠️ HOLLOW at executable startup because factory invocation is deferred |
| `scripts/docker-review-real.mjs` | decoded public payload | Docker stdio `tools/call` | Potentially yes | ✗ HOLLOW validation: real response is not schema/DeepSeek-bound and live proof timed out |
| `tests/providers/deepseek-live.test.ts` | provider result | real DeepSeek adapter | Yes only in opt-in run | ⚠️ PARTIAL: invalid configuration is silently skipped |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Focused credential-free contracts | `npm test -- --run ...` (5 Phase 10 suites) | 55 tests passed in 0.50s | ✓ PASS |
| Build | `npm run build` | Exit 0 | ✓ PASS |
| Local executable missing configuration | unset provider env; `node dist/server.js </dev/null` | Exit 0; 0 stdout/stderr bytes | ✗ FAIL |
| Harness rejects fake/schema-invalid provider output | call `assertStructuralReview()` with fake provider and incomplete findings | `fake-malformed:ACCEPTED` | ✗ FAIL |
| Docker provider startup matrix | `scripts/docker-provider-startup-matrix.sh` | Four sanitized failure cases passed | ✓ PASS |
| Offline Docker MCP smoke | `scripts/docker-smoke.sh` | Four fixtures, protocol and read-only mount passed | ✓ PASS |
| Credentialed complete MCP proof | recorded authorized `npm run docker:review:real` | `[docker-review:timeout] failed` | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SAFE-04 | 10-01, 10-02 | Provider and access failures do not expose unintended filesystem details or secrets. | ✓ SATISFIED | Direct serialization tests, failure classifier tests, Docker matrix, and offline smoke preserve redaction. The missing local diagnostic is a startup-consistency blocker but did not disclose secrets. |
| PROV-01 | 10-01, 10-02, 10-03 | DeepSeek Vision/Flash is configurable without changing the MCP contract. | ✗ BLOCKED | REQUIREMENTS and Phase 7 both retain the credentialed Docker timeout gap; harness validation can falsely accept non-DeepSeek/schema-invalid output. |

No Phase 10 requirements are orphaned: both SAFE-04 and PROV-01 appear in PLAN frontmatter and REQUIREMENTS traceability.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/server.ts` | 37 | Lazy server creation at stdio callback | 🛑 Blocker | Local process can terminate successfully without enforcing or reporting configuration failure. |
| `scripts/docker-review-real.mjs` | 122-151 | Handwritten partial schema checks and generic `provider:` acceptance | 🛑 Blocker | Credentialed command can falsely report proof for fake or malformed output. |
| `tests/providers/deepseek-live.test.ts` | 12-18 | Blanket configuration catch converted to skip | 🛑 Blocker | Explicit live validation hides malformed/conflicting/unreadable configuration as successful skip. |

### Human Verification Required

None. The decisive gaps are programmatically reproducible, and the only external credentialed result is already an observed timeout failure rather than an uncertain result.

### Gaps Summary

Phase 10 does not achieve its goal. Docker fail-closed behavior and offline isolation are strong, but the local executable does not enforce the documented startup contract. More importantly, no successful credentialed end-to-end DeepSeek proof exists: the authorized run timed out, while the harness itself can accept fake attribution and schema-invalid output. The adapter-only command also masks invalid configuration as a skip. Phase 11 concerns filesystem traversal and does not specifically address any of these gaps, so none are deferred.

---

_Verified: 2026-09-06T12:51:19Z_
_Verifier: the agent (gsd-verifier)_
