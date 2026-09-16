---
status: resolved
trigger: "Plan 10-85 naturally exited code 0 after tools/call but sealed stream_truncated with no authenticated request receipt"
---

# Debug Session: clean-exit-missing-receipt

## Symptoms

- Expected behavior: after tools/call, the child emits and the host authenticates a zero- or one-send request receipt before terminal classification.
- Actual behavior: tools/call=1, sends=0, exit/close code 0, request receipt null, stream_truncated=true, diagnostic ambiguous; execution/proof validation failed.
- Error messages: AUTOMATIC_TERMINAL_STATE with post_tools_pre_fetch.
- Timeline: observed after replacing immediate SIGTERM with bounded graceful drain.
- Reproduction: consumed Plan 10-85 generation; must not be replayed.

## Current Focus

- hypothesis: confirmed — process exit/close was incorrectly used as the authenticated stderr terminal boundary even though buffered pipe data may be delivered before stderr end/close.
- test: exercise both exit→close and close→exit before authenticated diagnostic/receipt delivery through real runReviewHarness, plus post-stderr-terminal rejection.
- expecting: authenticated frames buffered before stderr completion are retained; frames after stderr end/close remain rejected.
- next_action: complete

## Evidence

- timestamp: 2026-09-16T20:47:00+10:00
  checked: immutable evidence commit b9593fe and the production runReviewHarness, ChildDiagnosticCollector, ProviderRequestReceiptCollector, and captureChildLifecycle ordering
  found: the consumed generation had matching exit/close code 0 but null receipt and stream_truncated=true; both collectors were marked terminal on process exit and close, while lifecycle rejected any data after the process pair even when stderr had not completed.
  implication: already-buffered authenticated stderr frames could be discarded solely because Node delivered process events before pipe data callbacks.

- timestamp: 2026-09-16T20:49:00+10:00
  checked: provider-disabled real runReviewHarness permutations for exit→close and close→exit before authenticated diagnostic/zero-send receipt and stderr completion
  found: after binding terminality to stderr end/close and lifecycle late-data checks to each stream's own completion, both permutations retain the valid MAC-authenticated frames, report observed_provider_requests=0, preserve matching code-0 lifecycle, and avoid SIGTERM.
  implication: clean child exit no longer creates a false missing-receipt/truncated-stream record.

- timestamp: 2026-09-16T20:50:00+10:00
  checked: post-stderr-terminal hostile frame, focused harness/proof tests, full provider-disabled suite, TypeScript build, and diff hygiene
  found: frames emitted after stderr end remain ambiguous and unauthoritative; focused tests passed 173/173, all 43 provider-disabled files and 627 tests passed, npm run build passed, and git diff --check passed.
  implication: the change fixes legitimate buffered delivery without weakening MAC/send proof, accepting false success, or permitting frames after the stream terminal boundary.


## Eliminated

- hypothesis: the authenticated receipt envelope or MAC verifier rejected a valid zero-send receipt
  evidence: the same production receipt generator and verifier pass when the frame is delivered before stderr end; only process-event ordering changed the prior result.

- hypothesis: lifecycle must reject all output after process exit/close to prevent forged late frames
  evidence: stderr end/close is the actual bounded stream terminal; hostile frames after that boundary remain rejected, while buffered data before it is legitimate Node pipe delivery.


## Resolution

- root_cause: runReviewHarness marked diagnostic and receipt collectors terminal on child process exit/close, and captureChildLifecycle rejected data after the process event pair, even though Node may deliver already-buffered stderr data before the stderr stream emits end/close.
- fix: define collector terminality by stderr end/close and define lifecycle late output by each stream's own completion; add real harness regressions for both process-event orders and retain the hostile post-stderr-terminal rejection.
- verification: provider-disabled harness 110/110; focused harness/proof-chain 173/173; complete provider-disabled suite 627/627 across 43 files; TypeScript build and git diff --check passed. Plan 10-85 was not replayed and no live/provider/network/credential/Docker/GitHub/push/dispatch action ran.
- files_changed: [scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts]
