---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
verified: 2026-09-07T02:30:00Z
status: gaps_found
score: 9/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 10/11
  gaps_closed:
    - "FIFO delivery now preserves early and coalesced stdout events exactly once in wire order, with bounded overflow and sanitized terminal cleanup."
  gaps_remaining:
    - "The authorized post-FIFO run still returned [docker-review:protocol] failed, so no successful complete credentialed MCP proof exists."
    - "StdioClient.request resets the full timeout after every nonmatching notification instead of enforcing one absolute request deadline."
    - "The live harness omits notifications/initialized and accepts matching responses without requiring JSON-RPC 2.0 semantics."
  regressions: []
gaps:
  - truth: "A credentialed, opt-in structural test exercises a valid bounded MCP stdio lifecycle through tools/call, four evidence roles, filesystem reads, provider conversion and merge, and final public schema validation."
    status: failed
    reason: "The freshly authorized post-FIFO execution returned [docker-review:protocol] failed. Independently, the client begins tools/list immediately after initialize without sending the required notifications/initialized notification, and each unrelated message resets the complete method timeout."
    artifacts:
      - path: "scripts/docker-review-real.mjs"
        issue: "request() repeatedly passes the full method timeout at lines 159-163; main() skips notifications/initialized at lines 313-318."
      - path: "tests/scripts/docker-review-real.test.ts"
        issue: "The 38 passing tests cover FIFO delivery but have no total-deadline or exact initialize/initialized/tools-list transcript regression."
      - path: ".planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md"
        issue: "The retained authorized outcome is [docker-review:protocol] failed and Phase 7 remains gaps_found."
    missing:
      - "Use one absolute deadline per request and pass only the remaining budget to next()."
      - "Validate the initialize result, send jsonrpc 2.0 notifications/initialized with no id, then issue tools/list."
      - "Add offline notification-stream deadline and exact MCP initialization transcript tests."
      - "After all offline gates and fresh authorization, obtain an audited successful exactly-once zero-retry live proof."
  - truth: "Phase 7 passes only when the authorized complete MCP structural check is a genuine JSON-RPC 2.0 response and the full MCP lifecycle passed."
    status: failed
    reason: "Response matching checks only id plus result/error presence. Offline reproduction shows that both {id,result} with no jsonrpc member and jsonrpc:'1.0' are accepted as successful responses, so the harness and evidence audit can certify a non-MCP transcript."
    artifacts:
      - path: "scripts/docker-review-real.mjs"
        issue: "Lines 168-171 do not require jsonrpc === '2.0' or validate an exclusive result/error response shape; initialize result fields are not validated."
      - path: "scripts/audit-live-evidence.mjs"
        issue: "The audit trusts the harness success marker and cannot distinguish success produced from an invalid JSON-RPC/MCP transcript."
      - path: "tests/scripts/docker-review-real.test.ts"
        issue: "No negative transcript tests cover missing/wrong jsonrpc, malformed response shapes, or malformed initialize results."
    missing:
      - "Require an ordinary JSON-RPC 2.0 response object with the expected id and exactly one of result or error."
      - "Validate required initialize result protocol fields before sending notifications/initialized."
      - "Add adversarial transcript tests for missing/wrong jsonrpc, both/neither result and error, and malformed initialize results."
---

# Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E Verification Report

**Phase Goal:** Invalid provider configuration fails consistently in every runtime, and an opt-in test proves DeepSeek vision through the complete MCP, filesystem, orchestration, and public-response boundary.
**Verified:** 2026-09-07T02:30:00Z
**Status:** gaps_found
**Re-verification:** Yes — after plans 10-12 and 10-13

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Missing, invalid, or conflicting provider settings fail closed with sanitized errors in local and Docker startup paths, while explicit offline disablement remains available. | ✓ VERIFIED | Production startup constructs `createServer()` before stdio serving; focused process/config/Compose tests pass and preserve `PROVIDER_CONFIGURATION`. |
| 2 | A credentialed opt-in test proves the full bounded MCP stdio lifecycle, four-role filesystem path, provider conversion/merge, and final public-schema boundary. | ✗ FAILED | The authorized post-FIFO run returned `[docker-review:protocol] failed`; the harness also resets deadlines and omits `notifications/initialized`. |
| 3 | Phase 7 has independent evidence and routine tests remain credential-free/no-network. | ✓ VERIFIED | Phase 7 retains the sanitized non-pass; default `npm test` excludes `deepseek-live.test.ts` and passed 319 tests. |
| 4 | Literal `EVIDENCELENS_DISABLE_PROVIDER=1` is the sole ambient offline override. | ✓ VERIFIED | `src/server.ts` uses strict equality and startup regressions cover other values. |
| 5 | Explicit provider/providerConfig injection remains usable without ambient configuration. | ✓ VERIFIED | Injection-first construction is intact and covered by contract tests. |
| 6 | Local and Docker startup failure output is sanitized as `PROVIDER_CONFIGURATION`. | ✓ VERIFIED | Process and Docker configuration regressions assert nonzero failure and redaction. |
| 7 | Only the explicit opt-in command can initiate a credentialed Docker stdio review with all four filesystem roles. | ✓ VERIFIED | `docker:review:real` is absent from routine commands; `fixtureRequest()` contains exactly the four required roles. This verifies isolation, not live success. |
| 8 | Payload assertions validate production schema, resolved DeepSeek identity, namespace, provenance, hashes, citations, and disclosure constraints. | ✓ VERIFIED | `assertStructuralReview()` invokes `reviewResponseSchema.parse` and performs identity/provenance/redaction checks. Transport-envelope validity remains a separate failed truth. |
| 9 | Adapter live configuration distinguishes absent credentials from invalid supplied configuration. | ✓ VERIFIED | Presence probing precedes uncompromised `loadProviderConfig`; focused config tests pass. |
| 10 | Documentation, evidence grammar, FIFO delivery, child lifecycle, and scripts preserve the opt-in/no-network/fail-closed boundary. | ✓ VERIFIED | FIFO/coalesced/overflow/cleanup tests pass; success requires clean exit; evidence audit requires four fixtures and positive safe-integer findings. |
| 11 | Phase 7 passes only when an authorized complete, valid MCP/JSON-RPC structural check passed. | ✗ FAILED | The audit keys off the harness marker, but the harness accepts missing/wrong `jsonrpc` and does not complete the MCP initialized handshake, so that marker is not sufficient proof. Current state correctly remains open. |

**Score:** 9/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/server.ts` | Eager sanitized startup | ✓ VERIFIED | Exists, substantive, wired to validated config/provider creation, and process-tested. |
| `src/providers/config.ts` | Precise source and integral validation | ✓ VERIFIED | Integer controls use `Number.isInteger`; source-presence logic is exported and tested. |
| `scripts/docker-review-real.mjs` | Complete bounded Docker MCP proof | ✗ PARTIAL | FIFO and payload checks are substantive, but deadline, initialized-handshake, and response-envelope semantics are incomplete. |
| `tests/scripts/docker-review-real.test.ts` | Adversarial transport/proof tests | ⚠ PARTIAL | 38 tests pass; missing the three protocol classes documented above. |
| `scripts/audit-live-evidence.mjs` | Exact finite evidence consistency | ⚠ PARTIAL | Its grammar and state consistency are strict, but a success marker inherits the harness's incomplete definition of MCP success. |
| `tests/scripts/audit-live-evidence.test.ts` | Adversarial evidence grammar | ✓ VERIFIED | 53 tests pass, including impossible count and contradictory-state cases. |
| Phase 7 verification and `REQUIREMENTS.md` | Honest synchronized state | ✓ VERIFIED | Both retain protocol non-pass and open PROV-01. |

Automated artifact queries reported some false negatives because several `from` values are conceptual labels rather than filesystem paths and one frontmatter export is bracket-encoded. Manual source inspection above resolves those checks; no missing source artifact was inferred from those query limitations.

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Local executable | provider config | eager `createServer()` | ✓ WIRED | Invalid ambient config fails before MCP traffic. |
| Docker stdout | request matcher | bounded waiter-or-FIFO delivery | ✓ WIRED | Early, split, and coalesced events are queued and consumed once in wire order. |
| Request start | finite timeout | repeated `next(fullTimeout)` | ✗ PARTIAL | Notifications reset the full budget; no absolute deadline exists. |
| Initialize response | normal MCP operation | `notifications/initialized` | ✗ NOT WIRED | Main sends `tools/list` immediately after initialize. |
| JSON-RPC response | method result | id/result matching | ✗ PARTIAL | Missing/wrong `jsonrpc` envelopes are accepted. |
| Docker result payload | public contract | `reviewResponseSchema.parse` | ✓ WIRED | Production schema and identity/provenance checks run before lifecycle success. |
| Valid payload | success marker | clean code-0/no-signal child exit | ✓ WIRED | Success is emitted only after child shutdown validation. |
| Retained marker | Phase 7 and PROV-01 | strict evidence audit | ⚠ PARTIAL | State synchronization is strict, but success provenance depends on the flawed harness. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `src/server.ts` | provider config | validated injection/ambient config | Yes | ✓ FLOWING |
| `scripts/docker-review-real.mjs` | ordered stdout events | Docker MCP child | FIFO data flows, but lifecycle/envelope validity is incomplete | ✗ PARTIAL |
| `scripts/docker-review-real.mjs` | review payload | matching tools/call result | Production-schema parsed when reached | ✓ FLOWING |
| `scripts/audit-live-evidence.mjs` | completion state | retained five-line block | Strict finite grammar, conditional on harness marker | ⚠ PARTIAL |

### Behavioral Spot-Checks

| Behavior | Result | Status |
|---|---|---|
| Routine suite | `npm test`: 28 files, 319 tests passed | ✓ PASS |
| Focused Phase 10 suite | 5 files, 158 tests passed | ✓ PASS |
| TypeScript build | `npm run build`: exit 0 | ✓ PASS |
| Current evidence audit | `live evidence audit passed` for the retained non-pass/open state | ✓ PASS |
| FIFO/coalesced delivery | Existing tests pass and source queues before `next()` | ✓ PASS |
| Absolute request deadline | Two notifications allowed a 50 ms request to resolve successfully after 106 ms | ✗ FAIL |
| JSON-RPC response validity | `{id,result}` and `jsonrpc:'1.0'` matching responses were accepted offline | ✗ FAIL |
| MCP initialized handshake | Static execution trace is initialize → tools/list, with no `notifications/initialized` | ✗ FAIL |
| Authorized credentialed proof | `[docker-review:protocol] failed`; exactly once, zero retries, no fallback | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|---|---|---|---|
| SAFE-04 | 10-01–10-13 | ✓ SATISFIED | Startup/provider failures and retained proof failures use sanitized categories; offline redaction and lifecycle tests pass. |
| PROV-01 | 10-01–10-13 | ✗ BLOCKED | No successful live complete MCP proof exists, and the harness does not yet enforce a bounded valid MCP/JSON-RPC lifecycle. |

No requirement is orphaned. Phase 11 concerns Linux filesystem traversal and does not cover these proof-client protocol gaps, so nothing is deferred.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/docker-review-real.mjs` | 159-163 | Full timeout recreated after every event | Blocker | Notification traffic can extend one paid request beyond its advertised finite total budget. |
| `scripts/docker-review-real.mjs` | 313-318 | Missing `notifications/initialized` | Blocker | The transcript is not a complete conforming MCP initialization lifecycle. |
| `scripts/docker-review-real.mjs` | 168-171 | Matching id accepted without strict JSON-RPC 2.0 validation | Blocker | Non-MCP output can be treated as method success and potentially retained as proof. |
| `tests/scripts/docker-review-real.test.ts` | file-wide | Passing tests omit all three cases | Blocker-supporting | The routine suite does not detect these protocol defects. |

No TODO/FIXME/placeholder or empty implementation blocker was found.

### Human Verification Required

None. The live result is a definite non-pass, and all three implementation gaps are observable offline.

### Gaps Summary

Plan 10-12 closed the previous FIFO/coalesced-message defect without regression. Plan 10-13 truthfully consumed one fresh authorization and retained a sanitized non-pass. Phase 10 still cannot prove the required complete credentialed MCP boundary: the live proof did not succeed, its request timeout is an extendable idle timeout, it omits the initialized notification, and it accepts invalid JSON-RPC response envelopes. These concerns are not deferred to Phase 11.

---

_Verified: 2026-09-07T02:30:00Z_
_Verifier: the agent (gsd-verifier)_
