---
status: resolved
trigger: "Plan 10-90 repeated clean exit with no receipt after stderr-terminal fix"
---

# Debug Session: docker-compose-clean-exit-no-receipt

## Symptoms

- Expected behavior: authenticated request receipt is collected before terminal authority after one tools/call.
- Actual behavior: tools=1, sends=0, receipt=null, stream_truncated=true, exit/close=0, post_tools_pre_fetch ambiguous; local validators fail.
- Error messages: AUTOMATIC_TERMINAL_STATE.
- Timeline: repeats Plan 10-85 despite commit 18ca920 moving collector terminality to stderr end/close.
- Reproduction: consumed Plan 10-90 cannot replay; use provider-disabled local Docker or deterministic Compose process probes only.

## Current Focus

- hypothesis: receipt ownership is incorrectly scoped to `createDeepSeekProvider.review()`; a tools/call failure before provider invocation completes cleanly with no authenticated receipt even though the request reservation exists.
- test: retain the pre-provider fallback regression and add a real createServer plus MCP tools/call test whose DeepSeek adapter reaches a zero-network injected transport and emits through coordinatedProviderRequestProof.
- expecting: the sink is called exactly once with an authenticated observed-send receipt; tool settlement and a hostile second settlement do not emit a duplicate.
- next_action: archive resolved session and append the knowledge-base entry

reasoning_checkpoint:
  hypothesis: "The provider adapter is the sole receipt producer, so any tools/call failure before provider.review skips its finally block and yields the observed tools=1/receipt=null clean exit."
  confirming_evidence:
    - "10-90 recorded one tools/call, clean exit/close 0, zero observed sends, no authenticated diagnostic, and no receipt."
    - "Code emits receipts only in createDeepSeekProvider.review() finally; earlier validation/filesystem/analyzer failures bypass it."
    - "Exact-image Docker and Compose probes prove proof env propagation, receipt formatting, stderr forwarding, immediate-exit flushing, and event ordering all work."
  falsification_test: "A pre-provider tools/call failure that already produces exactly one authenticated zero-send receipt without request-boundary coordination would disprove the hypothesis."
  fix_rationale: "Keep the adapter as primary emitter, but coordinate it with a tool-settlement fallback that emits the same MAC-authenticated current budget receipt only when the adapter never emitted."
  blind_spots: "The consumed 10-90 private MCP error detail is intentionally unavailable, so the exact pre-provider failing stage cannot be named; the fix covers the complete pre-provider class without weakening receipt validation."

## Evidence

- timestamp: 2026-09-16T22:00:00+10:00
  checked: commits 18ca920 and 772d9fb plus runReviewHarness, createDeepSeekProvider, and request-budget proof creation
  found: lifecycle now waits for both process terminal events and both stdio completion events; the receipt is emitted synchronously from the provider review finally block before the MCP error response can finish, while 10-90 nevertheless recorded clean exit/close 0, complete stderr, and no receipt.
  implication: a simple early parent classification is insufficient; either Compose loses the final stderr write or the runtime image/proof path never emitted it.

- timestamp: 2026-09-16T22:10:00+10:00
  checked: exact 10-89 image sha256:2f4060... under docker run and minimal docker compose, both with network_mode none and a zero-send request-budget receipt
  found: both paths emitted the authenticated receipt at the start of a stderr line before stderr end/close and process exit/close; Compose name-only -e propagation also preserved both proof variables.
  implication: Docker Compose forwarding, event ordering, collector terminality, and name-only environment propagation do not explain 10-90.

- timestamp: 2026-09-16T22:12:00+10:00
  checked: same exact image and Compose probe with process.exit(0) immediately after receiptSink
  found: the receipt was still delivered before clean Compose close.
  implication: ordinary async stderr flush loss is not the cause; 10-90 most likely produced no receipt at all.

- timestamp: 2026-09-16T22:27:00+10:00
  checked: request-boundary regression with a schema-valid tools/call rejected for incomplete roles before provider invocation
  found: provider calls remained zero while exactly one authenticated receipt recorded reservation_count=1 and observed_provider_requests=0; 33 focused contract/provider tests and TypeScript build passed.
  implication: the request-scope fallback closes the precise receipt-production gap without fabricating a send or weakening MAC verification.

- timestamp: 2026-09-16T22:31:00+10:00
  checked: real createServer plus MCP tools/call using the production DeepSeek adapter and an injected zero-network transport
  found: the adapter acquired exactly one send, emitted one authenticated receipt, tool settlement emitted no duplicate, and a second one-shot tools/call neither reached transport nor emitted another receipt.
  implication: primary adapter emission, fallback emission, and one-generation one-shot semantics are jointly covered.


## Eliminated

- hypothesis: Docker Compose loses or delivers the authenticated receipt after stderr terminality.
  evidence: exact-image network-none probes delivered the receipt before stderr end/close and process exit/close under both natural and immediate clean exit.
  timestamp: 2026-09-16T22:12:00+10:00


## Resolution

- root_cause: Provider receipt emission was owned solely by createDeepSeekProvider.review(). Any tools/call failure before provider invocation bypassed its finally block, leaving a valid reservation and completed tools call with no authenticated receipt.
- fix: Coordinate receipt ownership at createServer: preserve adapter emission as primary, record successful emission, and invoke the same authenticated budget receipt sink at tool-settlement only when the adapter never emitted.
- verification: exact-image network-none Docker/Compose probes confirmed receipt-before-terminal ordering; focused tests pass 34/34; full provider-disabled suite passes 630/630; TypeScript build and git diff check pass; adapter-path MCP test proves exactly-one authenticated observed-send receipt and no duplicate on second settlement; zero provider/network/GitHub actions.
- files_changed: [src/server.ts, src/tools/review.ts, tests/contract/review-tool.test.ts]
