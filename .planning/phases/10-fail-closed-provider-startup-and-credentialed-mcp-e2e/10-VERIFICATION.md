---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
verified: 2026-09-13T09:08:08Z
status: gaps_found
score: 7/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 10/11
  gaps_closed: []
  gaps_remaining:
    - "No successful credentialed four-fixture Docker MCP proof exists; the final sealed proof is preflight_failed with zero live provider requests."
  regressions:
    - "The new automatic build/live commands are advertised but their CLI entrypoint always fails AUTOMATIC_PREFLIGHT."
    - "The final proof/audit/synchronization chain can accept structurally valid self-asserted evidence without authenticating the required Git and execution chain."
    - "Clean success may still be inferred from exitCode without observing an actual child close event."
gaps:
  - truth: "A credentialed automatic structural test exercises a valid bounded MCP stdio lifecycle through tools/call, four evidence roles, filesystem reads, provider conversion and merge, and final public schema validation."
    status: failed
    reason: "10-35-FINAL-BUILD.json is preflight_failed and 10-36-PROOF.json is gaps_found with clean_exit=false, zero fixtures, zero findings and zero provider requests; no live execution occurred."
    artifacts:
      - path: ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-35-FINAL-BUILD.json"
        issue: "Final build never became ready."
      - path: ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-36-PROOF.json"
        issue: "Terminal evidence is preflight_failed, not a credentialed pass."
      - path: ".planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md"
        issue: "Phase 7 remains gaps_found and explicitly says complete credentialed MCP success is unproven."
    missing:
      - "A ready immutable build authenticated to the current reviewed source."
      - "One bounded automatic live execution that produces a clean-close four-fixture positive-finding result."
      - "Independent authenticated evidence sufficient to mark PROV-01 complete."
  - truth: "The automatic execution and diagnostic machinery is substantive, production-wired, enforces its own request cap, and requires an actual clean child close."
    status: failed
    reason: "The CLI is an unconditional stub; diagnostics are test-only; request caps are advisory callback arguments; and waitForChildClose treats non-null exitCode/signalCode as close evidence."
    artifacts:
      - path: "scripts/automatic-live-review.mjs"
        issue: "main() validates a mode then unconditionally throws AUTOMATIC_PREFLIGHT; runAutomaticLiveOnce delegates enforcement to caller-supplied spawnOnce."
      - path: "scripts/docker-review-real.mjs"
        issue: "classifyDiagnostic is never called by the live harness, and lines 509-510 settle without receiving close."
      - path: "tests/scripts/automatic-live-review.test.ts"
        issue: "Passing mocks voluntarily honor controls and do not test the advertised package commands as working executions."
    missing:
      - "Concrete fixed auto-build and auto-live-once CLI dispatch to authenticated reviewed artifacts."
      - "An internally enforced one-request capability that rejects a noncompliant second attempt before it occurs."
      - "Production diagnostic classification at the outer harness failure boundary."
      - "Close observation captured from child creation and required before success."
  - truth: "Only a Git- and execution-authenticated proof chain can synchronize Phase 7, Phase 10 and PROV-01 to passed."
    status: failed
    reason: "Mode-specific audit cardinality/schema is absent, proof validation checks self-asserted shapes instead of Git/execution history, and synchronization trusts that weak proof. The sealed identity also predates five current non-planning changes, including b1186e2."
    artifacts:
      - path: "scripts/audit-proof-chain.mjs"
        issue: "Generic modes accept any count/type of records; a SOURCE record passed build mode during verification. auditLiveProof does not call auditGitIdentity or bind build/diagnostic/repair/consumed-result evidence."
      - path: "scripts/audit-live-evidence.mjs"
        issue: "Sealed proof audit validates key shapes and status consistency but not Git identity or execution provenance."
      - path: "scripts/sync-proof-state.mjs"
        issue: "Synchronization derives pass solely from proof.outcome after the weak sealed-proof check."
      - path: ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-36-PROOF.json"
        issue: "Binds reviewed commit 02a49ab, while current HEAD b1186e2 changes five non-planning source/test files after that identity."
    missing:
      - "Exact schema, order, path and cardinality per proof-chain mode."
      - "Git authentication plus binding to SOURCE/reviews, final build, diagnostic, repair set and consumed live request/result."
      - "Synchronization authorization from a committed chain-certified proof only."
      - "Fresh source/review/build evidence covering b1186e2 and all other post-02a49ab code."
---

# Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E Verification Report

**Phase Goal:** Invalid provider configuration fails consistently in every runtime, and an opt-in test proves DeepSeek vision through the complete MCP, filesystem, orchestration, and public-response boundary.
**Verified:** 2026-09-13T09:08:08Z
**Status:** gaps_found
**Re-verification:** Yes — after gap plans 10-24 through 10-37 and post-execution fix `b1186e2`

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Missing, invalid or conflicting provider settings fail closed with sanitized local/Docker startup errors; literal offline disablement remains. | ✓ VERIFIED | `src/server.ts` and provider configuration remain executable-wired; the complete 506-test provider-disabled suite and TypeScript build pass. |
| 2 | A credentialed automatic test proves the complete bounded MCP/filesystem/provider/public-schema path. | ✗ FAILED | `10-35-FINAL-BUILD.json` is `preflight_failed`; `10-36-PROOF.json` records `gaps_found`, `clean_exit:false`, zero fixtures/findings, and no live request. |
| 3 | Phase 7 has independent evidence and routine tests remain credential-free/no-network. | ✓ VERIFIED | Phase 7 truthfully remains `gaps_found`; default tests exclude `deepseek-live`; this verification ran 506 tests without credentials/network/provider access. |
| 4 | Literal `EVIDENCELENS_DISABLE_PROVIDER=1` is the sole ambient offline override. | ✓ VERIFIED | Existing executable/config tests pass, including rejection of non-literal values. |
| 5 | Explicit provider/providerConfig injection works without ambient configuration. | ✓ VERIFIED | Provider contract and E2E tests exercise injected provider paths successfully. |
| 6 | Local and Docker startup configuration failures use a sanitized `PROVIDER_CONFIGURATION` boundary. | ✓ VERIFIED | Configuration and process-boundary tests pass; no raw provider details are serialized. |
| 7 | The automatic live route is a real fixed execution path with an enforced finite provider budget and no retry/fallback. | ✗ FAILED | `npm run review:auto-build` exits 50 with `AUTOMATIC_PREFLIGHT`; callback-supplied controls do not enforce actual requests. |
| 8 | Payload assertions validate production schema, provider identity, provenance, hashes, citations and disclosure constraints. | ✓ VERIFIED | `assertStructuralReview` and contract/provider/provenance suites remain substantive and pass. |
| 9 | Adapter configuration distinguishes absent credentials from invalid supplied configuration. | ✓ VERIFIED | Focused configuration/provider tests pass. |
| 10 | The proof harness preserves bounded sanitized I/O and requires an observed consistent child close before success. | ✗ FAILED | I/O limits exist, but `waitForChildClose` settles from `exitCode`/`signalCode` at lines 509-510 without observing `close`; its test blesses this path. |
| 11 | Phase 7/PROV-01 can pass only from an authenticated committed Git/build/execution proof chain and independent audit. | ✗ FAILED | The current non-pass is honestly synchronized, but a future shaped `passed` proof can reach synchronization without Git/build/consumed-execution authentication. |

**Score:** 7/11 truths verified

### Roadmap Success Criteria

| # | Roadmap contract | Status | Evidence |
|---|---|---|---|
| 1 | Provider configuration fails closed in local and Docker startup while explicit offline disablement remains. | ✓ VERIFIED | Source wiring plus 506 offline regressions and build pass. |
| 2 | Credentialed opt-in structural test exercises the complete stdio/tools/filesystem/provider/merge/public-schema path. | ✗ FAILED | Final proof is a zero-request `preflight_failed` non-pass. |
| 3 | Phase 7 receives independent evidence and routine tests remain credential-free/no-network. | ✓ VERIFIED | State is synchronized to the truthful gap; routine suite remains isolated. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/server.ts`, `src/providers/config.ts` | Eager sanitized fail-closed configuration | ✓ VERIFIED | Exists, substantive, executable-wired and regression-tested. |
| `scripts/docker-review-real.mjs` | Bounded full MCP proof plus live diagnostics | ✗ PARTIAL | Structural harness is substantive; diagnostics are disconnected and close semantics are unsound. |
| `scripts/automatic-live-review.mjs` | Fixed automatic immutable build/live executor | ✗ STUB | Exported primitives exist, but the actual CLI always throws `AUTOMATIC_PREFLIGHT`. |
| `scripts/audit-proof-chain.mjs` | Mode-specific authenticated chain certifier | ✗ PARTIAL | Generic modes accept wrong schemas/counts and proof records are not Git/execution authenticated. |
| `scripts/audit-live-evidence.mjs` / `scripts/sync-proof-state.mjs` | Authenticated final proof and transactional state | ✗ PARTIAL | Non-pass synchronization is consistent, but the pass authority is structurally self-asserted. |
| `10-27/10-34` source review and security reports | Exact source certification | ⚠ STALE | Reports claim zero serious findings, contradicted by current `10-REVIEW.md`; final identity is at `02a49ab`, before five later non-planning changes. |
| `10-35-FINAL-BUILD.json` | Ready immutable final image | ✗ FAILED | Terminal status is `preflight_failed`; no image identity exists. |
| `10-36-PROOF.json` | Credentialed terminal proof | ✗ FAILED | Authentic non-pass artifact, but no live provider execution or full-path proof. |
| Phase 7 verification and `REQUIREMENTS.md` | Honest synchronized live-proof state | ✓ VERIFIED | Both consistently retain `gaps_found` / unchecked PROV-01. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Provider config | executable server | eager validation and sanitized catch | ✓ WIRED | Verified by process/config tests. |
| `review:auto-build` / `review:auto-live-once` | immutable build/live operations | fixed package CLI | ✗ NOT WIRED | Both modes route to unconditional `AUTOMATIC_PREFLIGHT`. |
| Protocol failure | retained diagnostic | production classifier | ✗ NOT WIRED | `classifyDiagnostic` is referenced only by tests. |
| Request reservation | actual provider operation | guarded one-request capability | ✗ NOT WIRED | Enforcement is delegated to arbitrary `spawnOnce`. |
| Child lifecycle | success output | observed `close` metadata | ✗ PARTIAL | Existing `exitCode` can synthesize close completion. |
| Proof-chain mode | exact expected records | schema/path/order/cardinality gate | ✗ NOT WIRED | A SOURCE record passes `build` mode. |
| Sealed proof | Git/build/live evidence | identity and consumed-result authentication | ✗ NOT WIRED | Shape checks are not provenance checks. |
| Sealed non-pass | Phase 7/Phase 10/REQUIREMENTS | WAL synchronization | ✓ WIRED | Current gap state and completed journal are mutually consistent. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `src/server.ts` | provider configuration | injection or validated environment/config file | Yes | ✓ FLOWING |
| `scripts/docker-review-real.mjs` | MCP transcript/public response | child stdio | Offline simulations only; final live run did not occur | ✗ LIVE FLOW ABSENT |
| `scripts/automatic-live-review.mjs` | automatic build/live result | CLI dispatch | No; CLI terminates at preflight | ✗ DISCONNECTED |
| `scripts/audit-proof-chain.mjs` | chain authority | supplied JSON/report files | Accepts real files but does not prove required execution provenance | ⚠ HOLLOW AUTHORITY |
| `scripts/sync-proof-state.mjs` | phase/requirement status | sealed proof | Current non-pass is truthful; hypothetical pass is insufficiently authenticated | ⚠ PARTIAL |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Complete offline regression | `EVIDENCELENS_DISABLE_PROVIDER=1 npm test` | 40 files, 506 tests passed | ✓ PASS |
| TypeScript build | `npm run build` | exit 0 | ✓ PASS |
| Automatic build package command | `npm run review:auto-build` | exit 50, `AUTOMATIC_PREFLIGHT` | ✗ FAIL |
| Reject wrong schema in build audit | `node scripts/audit-proof-chain.mjs build .../10-34-SOURCE.json` | exit 0, `proof chain audit passed` | ✗ FAIL |
| Final credentialed proof | Read-only inspection of `10-35`/`10-36` | preflight_failed/gaps_found, zero requests | ✗ FAIL |
| Diff hygiene | `git diff --check` before report write | exit 0 | ✓ PASS |

No Docker, credential, network, provider or paid command was run during verification.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|---|---|---|---|
| SAFE-04 | 10-01 through 10-37 | ✓ SATISFIED | User-visible configuration/provider/filesystem failures remain sanitized and bounded; no evidence of credential or raw provider disclosure was found. The lifecycle and proof-authority blockers must still be fixed before a live proof is safe to trust. |
| PROV-01 | 10-01 through 10-37 | ✗ BLOCKED | No ready final build or successful credentialed complete MCP proof exists. |

No Phase 10 requirement is orphaned. Phase 11 specifically concerns Linux filesystem traversal and does not defer any of these gaps.

### Anti-Patterns and Disconfirmation Pass

| File | Pattern | Severity | Impact |
|---|---|---|---|
| `scripts/automatic-live-review.mjs:123-127` | Unconditional production CLI stub | Blocker | Advertised automation cannot build or run. |
| `scripts/docker-review-real.mjs:108-123` | Tested classifier with no production caller | Blocker | Live failures cannot produce planned actionable diagnostics. |
| `scripts/audit-proof-chain.mjs:149-154` | Generic type/cardinality acceptance | Blocker | Wrong artifacts can satisfy a named audit mode. |
| `scripts/audit-proof-chain.mjs:58-67` | Self-asserted final proof | Blocker | Fabricated-shaped JSON can appear sufficient for closure. |
| `scripts/automatic-live-review.mjs:81-120` | Advisory cap handed to callback | Blocker | Tests do not prove actual provider-request enforcement. |
| `scripts/docker-review-real.mjs:509-510` | Exit metadata treated as close | Blocker | Success can precede teardown/late stream failure. |
| `scripts/automatic-live-review.mjs:109-115` | Request count records reservation as observation | Warning | Cost evidence is conservative but inaccurate. |
| `scripts/audit-live-evidence.mjs:28-33` | Non-unique regex extraction | Warning | Duplicate/conflicting status rows can be accepted. |

Disconfirmation findings: PROV-01 is only partially supported by offline simulation; the 506 passing tests do not execute either package automation command successfully or prove a real provider response; the missing-close and noncompliant callback error paths are not covered by adversarial tests that establish the promised behavior.

### Human Verification Required

None. The failures are deterministic code/evidence failures and require implementation, not subjective human testing.

### Gaps Summary

The gap cycle did not close the phase goal. It truthfully sealed a zero-request `preflight_failed` result, which is useful evidence but cannot prove DeepSeek through the production boundary. More seriously, the current independent deep review identifies six blockers that the earlier exact-source review reports missed: the advertised CLI is a stub, diagnostics are disconnected, proof modes accept wrong artifact types, final proof authority is forgeable from shapes, request limits are not internally enforced, and clean-close semantics are incomplete. The post-execution `b1186e2` fix improves private snapshot mutation detection but neither resolves these blockers nor belongs to the sealed `02a49ab` source identity. Phase 10 must remain `gaps_found` and PROV-01 must remain open.

---

_Verified: 2026-09-13T09:08:08Z_
_Verifier: the agent (gsd-verifier)_
