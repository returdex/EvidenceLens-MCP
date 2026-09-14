---
status: resolved
trigger: "Plan 10-75 reached MCP tools/call then sealed post_tools_pre_fetch with ambiguous diagnostic and failed same-process validation"
---

# Debug Session: post-tools-pre-fetch-ambiguous

## Symptoms

- Expected behavior: after one MCP tools/call, transport either records one authenticated HTTP send or a coherent pre-fetch terminal branch accepted by local validators.
- Actual behavior: generation sealed request_failed/post_tools_pre_fetch, tools/call 1, observed sends 0, reservation 1; execution and proof validation both failed.
- Error messages: AUTOMATIC_TERMINAL_STATE; sanitized diagnostic ambiguous.
- Timeline: occurred after Compose preflight fix; startup and tools/call now succeed.
- Reproduction: consumed Plan 10-75 generation; it must not be replayed.

## Current Focus

- hypothesis: confirmed; post-tools evidence was sampled before bounded child stderr/lifecycle drainage.
- test: provider-disabled production owner regression plus complete provider-disabled suite, build, diff and registry coverage.
- expecting: user/orchestrator confirms the corrected path is acceptable without replaying the consumed generation.
- next_action: resolved and archived after human verification; never replay generation 21c4e3fecc07c196cab364d870d8520321ae5d7ad15c33314eb15cf036d9f9b6

## Evidence

- timestamp: 2026-09-14T00:00:00+10:00
  checked: exact committed Plan 10-75 artifacts at cc35eae
  found: terminal snapshot is post_tools_pre_fetch with tools=1/reservation=1/observed=0 but diagnostic ambiguous, stream_truncated=true, request_receipt=null, exit=null and close=null; execution/proof validation both failed.
  implication: the consumed tuple is internally incomplete and must remain immutable/non-authoritative; it cannot be repaired or replayed.

- timestamp: 2026-09-14T00:00:01+10:00
  checked: runReviewHarness failure catch in scripts/docker-review-real.mjs
  found: after tools/call failure it calls child.kill(SIGTERM), then immediately reads lifecycle.observed(), receiptCollector.receipt(), and diagnosticCollector.feature() without awaiting lifecycle.wait() or stream completion.
  implication: buffered authenticated child frames and exit/close events can arrive after evidence classification, explaining all missing fields in the exact tuple.

- timestamp: 2026-09-14T00:00:02+10:00
  checked: auditExecution receipt and lifecycle rules
  found: every tools=1 branch calls auditReceipt and requires separately observed matching exit/close/transcript; the auditor rejects the exact tuple as designed.
  implication: producer timing, not auditor strictness, owns the defect; the fix must preserve the authenticated-receipt invariant.

- timestamp: 2026-09-14T00:00:03+10:00
  checked: new provider-disabled production-harness regression
  found: 106 existing tests passed and the new test failed with exactly receipt=null, exit=null, close=null even though the authenticated zero-send receipt and lifecycle were scheduled immediately after SIGTERM.
  implication: the race is directly reproduced without provider, network, Docker, credential, or live-generation activity.

- timestamp: 2026-09-14T00:00:04+10:00
  checked: counterfactual after adding one bounded lifecycle wait before collector sampling
  found: the focused production-harness suite passed 107/107 and the regression retained an authenticated observed=0 receipt, matching exit/close and transcript.
  implication: changing only the sampling order removes the contradictory tuple while preserving strict receipt authentication.

- timestamp: 2026-09-14T00:00:05+10:00
  checked: full provider-disabled suite, TypeScript build, diff and registry tests
  found: 43 files and 622 tests passed; npm run build and git diff --check passed; diagnostic and proof-chain registry tests were included.
  implication: the minimal fix is regression-safe within all locally testable, non-external paths.

- timestamp: 2026-09-14T00:00:06+10:00
  checked: human verification checkpoint
  found: the corrected local path was confirmed after the complete provider-disabled verification set passed.
  implication: the session can be marked resolved and archived without replaying the consumed live generation.


## Eliminated


## Resolution

- root_cause: runReviewHarness terminated a failed tools/call child and immediately sampled receipt, diagnostic and lifecycle collectors before asynchronous stderr/end/exit/close delivery, sealing incomplete evidence that strict auditors correctly rejected.
- fix: await the existing bounded lifecycle after SIGTERM before sampling collectors; add a production-path asynchronous-drain regression and admit PROOF_CHAIN_RECEIPT as a legitimate fail-closed result for the mutable-current registry test.
- verification: provider-disabled focused suite 107/107; full provider-disabled suite 622/622 across 43 files; TypeScript build passed; git diff --check passed; no Docker/live/provider/network/credential/GitHub operation performed.
- files_changed:
  - scripts/docker-review-real.mjs
  - tests/scripts/docker-review-real.test.ts
  - tests/scripts/audit-proof-chain.test.ts
