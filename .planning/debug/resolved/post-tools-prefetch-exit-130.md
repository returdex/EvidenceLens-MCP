---
status: resolved
trigger: "Plan 10-80 reached tools/call then pre-fetch terminated with consistent exit/close code 130 and failed internal validation"
---

# Debug Session: post-tools-prefetch-exit-130

## Symptoms

- Expected behavior: tools/call proceeds to at most one authenticated provider HTTP send or a coherent accepted pre-fetch non-pass.
- Actual behavior: tools/call=1, provider sends=0, request_failed/pre_fetch at transport.fetch, exit and close both code 130; execution/proof validation failed.
- Error messages: sanitized pre_fetch/transport.fetch and exit 130.
- Timeline: after lifecycle drain fix; missing lifecycle evidence is resolved and code 130 is now consistently observed.
- Reproduction: consumed 10-80 generation; must never be replayed.

## Current Focus

- hypothesis: confirmed — immediate catch cleanup SIGTERM preempted the child-owned failure/finally evidence path.
- test: run the full provider-disabled test suite, TypeScript build, proof-chain/registry tests, and inspect the final diff for scope and secret/network safety.
- expecting: all gates pass; receipt authentication and one-send budget tests remain green; only the bounded graceful-drain behavior and regression change.
- next_action: resolved and archived after independent human verification

reasoning_checkpoint:
  hypothesis: "runReviewHarness causes the observed premature abort because its catch block calls child.kill(SIGTERM) immediately after child.stdin.end(), before the child can complete its in-flight tools/call finally block and emit the authenticated request receipt."
  confirming_evidence:
    - "The provider AbortController is created inside fetchWithRetry, but acquireHttpSend runs synchronously before transport.fetch, so any provider timeout would authenticate observed_provider_requests=1, not 0."
    - "The injected production-path regression reproduces exit=close=130 with an authenticated zero-send receipt and directly observes child.kill(SIGTERM) called once before natural settlement."
    - "The existing regression intentionally emits the receipt from the child.kill handler, demonstrating that current evidence drainage is coupled to parent-initiated termination."
  falsification_test: "If the same injected child is allowed a bounded graceful drain and still requires child.kill before it can emit its receipt and exit 130, immediate parent termination is not the cause."
  fix_rationale: "Waiting briefly for authoritative lifecycle completion after closing stdin lets the server finish its own failure/finally path and emit authenticated evidence; retaining a bounded fallback SIGTERM prevents hangs without accepting success or weakening receipt verification."
  blind_spots: "The real consumed provider generation cannot be replayed, so verification is limited to injected provider-disabled production paths plus full offline/build/diff/registry suites; Docker signal translation to numeric 130 is inferred from the sealed lifecycle, not reproduced against a live provider."

## Evidence

- timestamp: 2026-09-14T21:10:00+10:00
  checked: commit ef53b71 and project-local skill discovery
  found: ef53b71 only sealed the consumed live evidence artifacts; it changed no runtime code. No project-defined .codex/skills or .agents/skills were present.
  implication: the abort mechanism predates the evidence commit and must be isolated in the production harness/provider path, not inferred from the sealing commit.

- timestamp: 2026-09-14T21:18:00+10:00
  checked: complete StdioClient request path, runReviewHarness catch/finally cleanup, provider retry AbortController, and automatic artifact outcome mapping
  found: the provider AbortController can fire only after operation() synchronously calls acquireHttpSend immediately before transport.fetch, so it cannot explain an authenticated zero-send receipt. In contrast, runReviewHarness catch calls child.kill("SIGTERM") before lifecycle.wait and already has a regression that emits the zero-send receipt only from that kill handler. automatic-live-review maps all post-tools zero-send snapshots to request_failed/pre_fetch regardless of terminal ownership or exit code.
  implication: the initiating abort is the parent harness cleanup, not the provider request timer; producer classification currently erases this distinction and can generate artifacts its own auditors reject.

- timestamp: 2026-09-14T21:23:00+10:00
  checked: provider-disabled production-path regression with stdin EOF scheduling an authenticated zero-send receipt and natural exit/close 130
  found: before any code change, the regression fails because child.kill was called exactly once with SIGTERM; all other inputs reproduce tools/call failure and the sealed 130 lifecycle shape.
  implication: direct counterfactual evidence confirms the harness catch block is the abort initiator.

- timestamp: 2026-09-14T21:27:00+10:00
  checked: fixed production-path regressions for natural exit 130 and forced termination fallback
  found: the natural drain test passes with no child.kill call and an authenticated observed_provider_requests=0 receipt; the injected zero-grace stuck-child test still sends SIGTERM and drains its authenticated receipt/lifecycle.
  implication: the minimal change removes premature abort ownership while retaining bounded fail-closed cleanup and unmodified authentication.

- timestamp: 2026-09-14T21:34:00+10:00
  checked: TypeScript build, complete provider-disabled test suite, focused proof-chain/production-harness/source-set registry suite, and git diff whitespace validation
  found: build passed; all 43 test files and 624 tests passed; focused registry suite passed 178 tests; git diff --check passed. No live/provider/network/credential/GitHub Actions/push/dispatch action was used.
  implication: the fix is stable across the available production-shaped offline, build, proof auditor, diff, and registry gates.

- timestamp: 2026-09-14T21:45:00+10:00
  checked: independent human verification checkpoint
  found: reviewer accepted the diff after focused real-path 187/187, provider-disabled 624/624, TypeScript build, diff check, and clean-worktree verification; an accidental explicit live-test inclusion failed configuration before any request and is outside the package test contract.
  implication: the fix is confirmed end-to-end within the authorized provider-disabled verification boundary and the session may be archived.


## Eliminated


## Resolution

- root_cause: runReviewHarness immediately sent SIGTERM in its catch block after tools/call failure, before stdin EOF could let the child finish its in-flight request and emit the authenticated request receipt. The provider AbortController cannot produce zero-send evidence because the send budget is acquired synchronously before transport.fetch. The immediate parent kill therefore created the exit-130/post-tools/pre-fetch shape and left request_receipt null, which the execution/proof auditors correctly rejected.
- fix: close stdin, allow a bounded graceful lifecycle drain, and send SIGTERM only if that grace expires; after forced termination, continue awaiting the existing authoritative bounded lifecycle before sampling receipt and terminal collectors.
- verification: targeted natural-drain and forced-termination regressions pass; npm run build passed; provider-disabled full suite passed 624/624 tests across 43 files; focused proof-chain/docker-harness/source-set registry suite passed locally and independent focused real-path verification passed 187/187; git diff --check passed; human verification accepted.
- files_changed: [scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts]
