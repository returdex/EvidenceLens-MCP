---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
verified: 2026-09-07T04:15:30Z
status: gaps_found
score: 10/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/11
  gaps_closed:
    - "Fractional integral provider settings now fail closed with sanitized errors."
    - "Harness success now requires a clean code-0/no-signal child exit."
    - "Evidence audit now requires exactly four fixtures and at least one finding."
  gaps_remaining:
    - "Complete credentialed proof remains absent: the authorized run returned [docker-review:protocol] failed, and the stdio parser drops coalesced messages when no waiter exists."
  regressions: []
gaps:
  - truth: "A credentialed, opt-in structural test exercises stdio tools/call, four evidence roles, allowlisted filesystem reads, provider DTO conversion, finding merge, and final public schema validation."
    status: failed
    reason: "The newly authorized exactly-once run returned [docker-review:protocol] failed. Independently, StdioClient discards parsed JSON-RPC events whenever no waiter is installed; a notification and matching response coalesced in one stdout chunk loses the response and turns a valid one-shot result into timeout."
    artifacts:
      - path: "scripts/docker-review-real.mjs"
        issue: "drain() removes every complete line but only delivers through waiters.shift()?.(...); next() has no FIFO pending-event queue."
      - path: "tests/scripts/docker-review-real.test.ts"
        issue: "The 29 passing tests omit coalesced notification-plus-response and output-before-next ordering."
      - path: ".planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md"
        issue: "The retained authorized outcome is [docker-review:protocol] failed and Phase 7 remains gaps_found."
    missing:
      - "Add a FIFO pending-event queue; drain() must enqueue events without waiters and next() must consume queued events first."
      - "Add an offline test emitting a notification and matching response in one stdout data event."
      - "After the fix and offline gates, obtain fresh authorization and a successful exactly-once zero-retry docker:review:real outcome."
---

# Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E Verification Report

**Phase Goal:** Invalid provider configuration fails consistently in every runtime, and an opt-in test proves DeepSeek vision through the complete MCP, filesystem, orchestration, and public-response boundary.
**Verified:** 2026-09-07T04:15:30Z
**Status:** gaps_found
**Re-verification:** Yes — after plans 10-08 through 10-11

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Missing, invalid, or conflicting provider settings fail closed with sanitized errors in local and Docker startup paths, while explicit offline disablement remains available. | ✓ VERIFIED | `parseInteger()` requires `Number.isInteger` for timeout, retry, wait, and token controls; local/environment/file regressions pass. Earlier eager startup checks remain intact. |
| 2 | A credentialed opt-in test proves the full stdio `tools/call`, four-role filesystem, provider conversion/merge, and final public-schema boundary. | ✗ FAILED | The authorized run returned `[docker-review:protocol] failed`. Lines 92-111 also drop events without a waiter; an offline reproduction lost a coalesced matching response. |
| 3 | Phase 7 has independent evidence and routine tests remain credential-free/no-network. | ✓ VERIFIED | Phase 7 retains a sanitized live-proof block and honest `gaps_found`; `npm test` excludes the live adapter and passed 310 tests. |
| 4 | Literal `EVIDENCELENS_DISABLE_PROVIDER=1` is the sole ambient offline override. | ✓ VERIFIED | Strict literal handling and startup contract tests remain present. |
| 5 | Explicit provider/providerConfig injection remains usable without ambient configuration. | ✓ VERIFIED | Injection-first construction remains implemented and covered. |
| 6 | Local and Docker startup failure output is sanitized as `PROVIDER_CONFIGURATION`. | ✓ VERIFIED | Process and Docker configuration regressions retain the stable redacted classification. |
| 7 | Only the explicit opt-in command can perform a credentialed Docker stdio review with all four roles. | ✓ VERIFIED | `docker:review:real` is disconnected from routine commands; `fixtureRequest()` has exactly four role-labelled filesystem inputs. |
| 8 | Structural assertions validate DeepSeek DTO conversion, namespace, public schema, provenance, hashes, citations, and disclosure constraints. | ✓ VERIFIED | `assertStructuralReview()` parses the production schema and checks resolved provider/model, namespace, four references, hashes, citations, and redaction. This does not establish a successful live outcome. |
| 9 | Adapter live command distinguishes absent credentials from invalid supplied configuration. | ✓ VERIFIED | Presence probing precedes `loadProviderConfig`; invalid supplied sources propagate sanitized failure. |
| 10 | Documentation and scripts preserve the opt-in/no-network boundary. | ✓ VERIFIED | Routine scripts do not invoke `docker:review:real`; documentation regressions pass. |
| 11 | Phase 7 passes only when the authorized complete MCP structural check passed. | ✓ VERIFIED | Audit grammar requires exactly four fixtures, a positive safe-integer finding count, and synchronized Phase 7/PROV-01 state. |

**Score:** 10/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/server.ts` | Eager sanitized startup | ✓ VERIFIED | Substantive, wired before stdio serving, and process-tested. |
| `src/providers/config.ts` | Precise source and integral validation | ✓ VERIFIED | All four integral controls use `parseInteger`; temperature remains fractional. |
| `tests/providers/config.test.ts` | Fractional/hostile regressions | ✓ VERIFIED | 45 tests pass across local, environment, and file inputs. |
| `scripts/docker-review-real.mjs` | Complete Docker MCP proof | ✗ PARTIAL | Structural, retry, timeout, lifecycle, and schema gates exist, but its stdio client lacks pending-event storage and the live proof failed. |
| `tests/scripts/docker-review-real.test.ts` | Adversarial proof tests | ⚠️ PARTIAL | 29 tests pass but do not cover the failing message ordering. |
| `scripts/audit-live-evidence.mjs` | Exact evidence consistency | ✓ VERIFIED | Requires four fixtures, positive findings, and synchronized state. |
| `tests/scripts/audit-live-evidence.test.ts` | Adversarial count/disclosure tests | ✓ VERIFIED | 53 tests pass, including impossible counts. |
| Phase 7 verification and `REQUIREMENTS.md` | Honest synchronized state | ✓ VERIFIED | Both retain the protocol non-pass and open PROV-01. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Local executable | provider config | eager `createServer()` | ✓ WIRED | Invalid ambient config fails before MCP traffic. |
| Docker response | public contract | `reviewResponseSchema.parse` | ✓ WIRED | Schema parsing precedes identity/provenance assertions. |
| Structural response | success marker | clean child lifecycle | ✓ WIRED | stdin closes, exit is awaited, and code 0/no signal is required. |
| Docker stdout | request matcher | `StdioClient.drain()` / `next()` | ✗ NOT WIRED | Events without a current waiter are discarded rather than queued. |
| Retained outcome | Phase 7 and PROV-01 | strict audit | ✓ WIRED | Non-pass, status, checkbox, and trace agree. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `src/server.ts` | provider config | validated injection/ambient config | Yes | ✓ FLOWING |
| `scripts/docker-review-real.mjs` | JSON-RPC response | Docker MCP stdout | Not reliably | ✗ DISCONNECTED for no-waiter/coalesced ordering |
| `scripts/audit-live-evidence.mjs` | completion state | retained five-line block | Yes, strictly parsed | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Result | Status |
|---|---|---|
| Routine suite | `npm test`: 28 files, 310 tests passed | ✓ PASS |
| Build | `npm run build`: exit 0 | ✓ PASS |
| Current evidence audit | `live evidence audit passed` | ✓ PASS |
| Fractional integral config | Focused config tests and `Number.isInteger` checks pass | ✓ PASS |
| Clean child gate | Clean/nonzero/signal/error/timeout/already-exited tests pass | ✓ PASS |
| Coalesced notification + response | Exact drain algorithm with one waiter delivered notification, emptied buffer, and lost response id 3 | ✗ FAIL |
| Authorized credentialed proof | `[docker-review:protocol] failed`; exactly once, zero retries, no fallback | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|---|---|---|---|
| SAFE-04 | 10-01–10-11 | ✓ SATISFIED | Stable sanitized errors, no retained raw diagnostics, and passing offline safety regressions. |
| PROV-01 | 10-01–10-11 | ✗ BLOCKED | No successful complete credentialed Docker MCP proof exists, and the harness can drop a valid stdio response. |

No requirement is orphaned. Phase 11 covers Linux filesystem traversal, not this live-proof/parser gap; nothing is deferred.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/docker-review-real.mjs` | 92-111 | Destructive drain with optional waiter and no pending queue | Blocker | Valid coalesced or early responses are silently lost, causing irreversible timeout in a one-attempt paid proof. |
| `tests/scripts/docker-review-real.test.ts` | file-wide | Missing parser-ordering test | Blocker-supporting | The 310-test suite passes despite the protocol data-loss defect. |

No TODO/FIXME/placeholder or empty implementation blocker was found.

### Human Verification Required

None. The live result is a definite non-pass and the parser defect is deterministic offline.

### Gaps Summary

Plans 10-08 through 10-10 closed all three previous implementation gaps. Plan 10-11 correctly consumed one fresh authorization and retained the sanitized non-pass without retry. The phase goal remains unmet because the complete credentialed proof did not succeed and the proof harness has a confirmed stdio message-loss bug. Add the pending-event queue and regression test before requesting another paid attempt.

---

_Verified: 2026-09-07T04:15:30Z_
_Verifier: the agent (gsd-verifier)_
