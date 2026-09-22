---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
verified: 2026-09-22
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
evidence_source: committed-10-167-through-10-170-and-post-review-offline-audits
---

# Phase 10 Verification: Fail-Closed Provider Startup and Credentialed MCP E2E

## Goal and result

Invalid provider configuration fails closed, and a credentialed DeepSeek request has traversed the complete Docker MCP stdio, filesystem, review, provenance, and public-response boundary. **Result: passed, with no verification override.** Phase 11's Linux intermediate-component no-follow work remains a separate, open SAFE-01 scope; this report does not claim it is complete.

This is a current re-verification. The earlier 2026-09-13 report described the then-current `10-35`/`10-36` non-pass and is retained in Git history, not as present Phase 10 truth.

## Current evidence

| Evidence | Verified observation |
|---|---|
| `10-167-SOURCE.json`, `10-167-REVIEW.md`, `10-167-SECURITY.md` | Exact reviewed source, deep review and security review bind the executed certifier identity. |
| `10-168-FINAL-BUILD.json` | Ready immutable image is bound to that reviewed source. |
| `10-169-EXECUTION.json`, `10-169-PROOF.json`, `10-169-LOCAL-VALIDATION.json` | One `review_evidence` tools/call completed with observed clean exit and close, four fixtures, four findings, public schema and provenance checks, one observed provider request, zero retries, zero fallback and zero diagnostic second call. |
| `10-170-SYNC-CLAIM.json`, `10-170-SYNC-JOURNAL.json` | A completed passed-state transaction synchronized Phase 7, Phase 10 and the unique PROV-01 trace row. |
| `10-REVIEW.md`, `10-REVIEW-FIX.md` | The two final synchronization authority blockers were fixed and the re-review is clean. |

The committed 11-member `final-audit-auto` passed after the review fixes. The independent `audit-live-evidence.mjs` consistency check also passed. The latest offline TypeScript build and provider-disabled suite passed, with 795/795 tests; the focused synchronization/proof/evidence suite passed 172/172. These later offline checks did not issue a provider request, use the Docker daemon, or dispatch GitHub Actions.

## Observable truths

| # | Must-have | Result | Evidence |
|---|---|---|---|
| 1 | Missing, invalid and conflicting provider configuration fails closed with sanitized errors. | Verified | Provider configuration, startup and Docker harness contract tests; full offline suite. |
| 2 | A credentialed automatic run covers MCP stdio, tools/call, filesystem evidence, provider conversion, merge and public schema. | Verified | Committed `10-169-EXECUTION.json` and `10-169-PROOF.json`: four fixtures and four findings. |
| 3 | Phase 7 receives independent evidence while routine tests remain credential-free. | Verified | Phase 7 status and PROV-01 synchronized from the passed chain; default `npm test` excludes the opt-in live test. |
| 4 | Only literal `EVIDENCELENS_DISABLE_PROVIDER=1` disables ambient provider loading. | Verified | Configuration/startup regression tests. |
| 5 | Explicit provider and providerConfig injection works without ambient configuration. | Verified | Provider contract and injected-provider E2E tests. |
| 6 | Local and Docker startup configuration failures use the sanitized `PROVIDER_CONFIGURATION` boundary. | Verified | Process-boundary and Docker harness tests. |
| 7 | The automatic live route has a finite one-request cap and no retry or fallback. | Verified | Production harness tests and authenticated `10-169` receipt: one request, zero retries and no fallback. |
| 8 | Structural assertions cover production schema, provider identity, provenance, hashes, citations and disclosure. | Verified | Review/provider/provenance contracts plus authenticated `10-169` result. |
| 9 | Absent credentials and invalid supplied configuration remain distinct. | Verified | Configuration and provider tests. |
| 10 | The proof harness has bounded sanitized I/O and requires an observed consistent child close. | Verified | Harness regressions and `10-169-EXECUTION.json` observed exit/close code 0. |
| 11 | Passed project truth requires an authenticated Git/build/execution chain and independent audit. | Verified | Committed `10-167`–`10-170` tuple, final audit, live-evidence audit and post-review authority fixes. |

**Score: 11/11 verified; unresolved Phase 10 gaps: 0.**

## Scope of the synchronization claim

The `10-170` claim's `replacement_sha256.phase10` identifies the earlier status-only version produced by that transaction. This re-verification updates the report body after the transaction and therefore does not present that historical replacement digest as the hash of this current document. The claim and completed journal remain unchanged as evidence of the original synchronization; the current report is authenticated as a subsequent committed documentation revision and checked against the still-committed live proof and audits. No provider replay is implied.

## Conclusion

Phase 10 and PROV-01 are complete. The next planned engineering work is Phase 11 Linux filesystem traversal hardening, not another Phase 10 paid-provider run.
