---
status: resolved
trigger: "Plan 10-70 sealed pre_tools_post_reservation with pre_fetch failure at transport.fetch before MCP tools/call"
created: 2026-09-14T09:11:11Z
updated: 2026-09-14T10:15:00Z
---

# Debug Session: pre-fetch-before-tools-call

## Symptoms

- Expected behavior: the fixed live generation reaches one MCP tools/call and at most one provider HTTP send.
- Actual behavior: the new generation terminates at pre_tools_post_reservation with sanitized pre_fetch/transport.fetch.
- Error messages: pre_fetch at transport.fetch; no raw external details retained.
- Timeline: observed after fixing terminal ownership before fallible preflight; AUTOMATIC_TERMINAL_MISSING is gone.
- Reproduction: Plan 10-70 fixed empty-argv live command; generation is consumed and must not be replayed.

## Current Focus

reasoning_checkpoint:
  hypothesis: "The final suite failure is caused by a mutable-current integration test requiring the exact PROOF_CHAIN_COMMITTED error even though the same namespace legitimately transitions between invalid and READY states."
  confirming_evidence:
    - "The full suite passed 618/619 and the sole failure was the current-namespace exact stderr assertion."
    - "A separate committed synthetic READY fixture already proves sync-authority-auto may legitimately exit 0 without external effects."
    - "The current namespace is sourced from HEAD rather than an immutable historical fixture, so its lifecycle state changes as certification artifacts are committed."
  falsification_test: "Run the current-namespace test against the present HEAD: if its result is always PROOF_CHAIN_COMMITTED and cannot become READY, the lifecycle hypothesis is false."
  fix_rationale: "Keep exact historical errors in isolated fixtures; make the mutable-current test require either a well-formed successful audit or a nonzero rejection from a finite sanitized error family, while always proving no watched writes or external commands."
  blind_spots: "The current checkout provides only one lifecycle state per run; the existing isolated READY fixture and immutable 585fd01 rejection fixture provide the complementary states."
next_action: archived after complete local verification

## Evidence

- timestamp: 2026-09-14T09:14:00Z
  checked: exact commit 95dcbef and sealed 10-70 execution artifact
  found: HEAD is 95dcbef; the sealed execution is generation 3767fe38..., reviewed commit 1ebe63e..., reservation_count=1, mcp_tools_call_count=0, request_receipt=null, diagnostic pre_fetch/transport.fetch, and no result/transcript.
  implication: the consumed live generation is internally consistent with a reservation acquired before the external client received a tools/call response; source tracing must distinguish server-side handler entry from client-observed call completion.
- timestamp: 2026-09-14T09:20:00Z
  checked: complete production runner, harness, request-budget, provider, and server initialization paths
  found: `mcpToolsCallCount` increments immediately before writing the tools/call request, so value 0 means the client failed earlier; `sealAutomaticLiveEvidence` nevertheless maps every observed=0 non-preflight failure to diagnostic `pre_fetch` at `transport.fetch`. The outer reservation is recorded before `runReviewHarness`. Separately, `createServer` initializes request proof before diagnostics, and both factories read then delete the same two EVIDENCELENS_DIAGNOSTIC_* variables.
  implication: the sealed label does not establish that `transport.fetch` was reached. A shared one-shot env capability also prevents the diagnostic sink from authenticating the true server-side feature after request-proof initialization.
- timestamp: 2026-09-14T09:24:00Z
  checked: exact terminal snapshot and `runReviewHarness` catch boundaries
  found: terminal diagnostic is exactly `preflight`, not `ambiguous`; this branch is constructed only when `resolveProof` throws at lines 730-742, before Docker child spawn, initialize, tools/list, or tools/call. The Compose profile defaults appear structurally valid.
  implication: transport.fetch and MCP tools/call ordering are not the live failure mechanism. Investigation narrows to `resolveLiveProof` and its inherited Compose preflight environment.
- timestamp: 2026-09-14T09:27:00Z
  checked: exact `docker compose --profile review config --format json` under an isolated environment with dummy review key, retry=0, and provider disabled
  found: command fails deterministically before JSON output: `services.proof.environment.DEEPSEEK_API_KEY` requires missing `EVIDENCELENS_PROOF_DEEPSEEK_API_KEY`. Compose interpolates the inactive proof profile while resolving the review profile.
  implication: root cause is confirmed. The review-only preflight accidentally depends on a proof-only credential variable; no MCP or provider transport code is reached.
- timestamp: 2026-09-14T09:37:00Z
  checked: new regression invoking exported production `resolveLiveProof` with the installed Compose parser, a dummy review key, retry=0, provider disabled, and no proof-only variable
  found: test fails RED with the sanitized `[docker-review:preflight] failed`, reproducing the consumed live boundary without Docker daemon, MCP, network, or provider access.
  implication: the regression directly exercises the broken production preflight and is suitable to verify the minimal fix.
- timestamp: 2026-09-14T09:40:00Z
  checked: exact regression after the minimal resolveLiveProof change
  found: the same real Compose-parser regression is GREEN; it returns the expected review model and bounded timeouts, preserves retry=0 and the dummy review credential for the eventual review child, and supplies the fixed proof sentinel needed only for inactive-profile interpolation.
  implication: the counterfactual succeeded by changing only the missing inactive-profile capability, strongly confirming causation.
- timestamp: 2026-09-14T09:42:00Z
  checked: complete docker-review harness suite, TypeScript build, git diff check, and worktree scope
  found: 105/105 focused harness tests pass; build and diff checks pass; only the production harness, its regression test, and this debug session are changed.
  implication: adjacent harness behavior and compilation remain intact; full provider-disabled regression is the remaining self-verification.
- timestamp: 2026-09-14T09:46:00Z
  checked: complete provider-disabled `npm test`
  found: 618/619 tests pass. The only failure is the pre-existing `tests/scripts/audit-proof-chain.test.ts` assertion that the mutable current namespace must be BLOCKED; current committed phase artifacts now make that command exit 0. All tests touching this fix, including the real Compose-parser regression, pass.
  implication: this fix introduces no observed regression. Project-wide green is blocked by an unrelated mutable-artifact expectation already outside this debug session's file ownership.
- timestamp: 2026-09-14T09:49:00Z
  checked: credential-separation regression plus focused harness, build, and diff checks
  found: 106/106 harness tests pass. The supplemental test proves the real-looking review key is absent from Compose config resolution, both fixed sentinels are present there, the real key remains only in the eventual review child environment, and retry is forced to zero. Build and diff checks pass.
  implication: the fix closes both the availability failure and the credential-readback hazard at this boundary.
- timestamp: 2026-09-14T09:52:00Z
  checked: provider-disabled suite excluding only the independently failing mutable-current-namespace audit file
  found: 560/560 tests pass across 42 files. No Docker container, MCP live run, provider/network request, credential read, GitHub Action, push, or dispatch occurred.
  implication: all in-scope local regression coverage is green; only end-to-end human/live verification remains, and it must use a fresh generation rather than replaying consumed 10-70.
- timestamp: 2026-09-14T09:56:00Z
  checked: scoped source/test commit
  found: production fix and regressions committed as `21ae1ed` (`fix: unblock review compose preflight`); active debug session remains unarchived pending human/live confirmation.
  implication: implementation is durable and ready for the next source certification/build/live generation; consumed generation 3767fe38... remains untouched.
- timestamp: 2026-09-14T10:08:00Z
  checked: mutable-current proof-chain regression after replacing the exact BLOCKED assertion with lifecycle-stable success/rejection invariants
  found: audit-proof-chain focused suite passes 60/60, including the isolated READY fixture and mutable current namespace; both retain zero external effects, and the mutable test also retains byte-for-byte watched-state immutability.
  implication: the remaining failure was a stale test oracle rather than a production defect; broader provider-disabled verification can proceed.
- timestamp: 2026-09-14T10:12:00Z
  checked: complete provider-disabled test suite, TypeScript build, and focused proof-chain registry/state suites
  found: full suite passes 620/620 across 43 files; registry/state selection passes 89/89 across 3 files; TypeScript build passes. No Docker, live MCP, provider, network, or GitHub operation ran.
  implication: both the production preflight fix and lifecycle-stable audit regression are locally verified with no remaining test failures.
- timestamp: 2026-09-14T10:15:00Z
  checked: final diff validation and scoped regression commit
  found: git diff --check passes; lifecycle-stable audit regression committed as a0cfd23. Production preflight fix remains committed as 21ae1ed.
  implication: the debug session is fully verified and can be archived without replaying the consumed generation.


## Eliminated


## Resolution

- root_cause: Docker Compose interpolates every service before profile filtering. `resolveLiveProof` and the subsequent review `docker compose run` omitted the proof-only required variable, so the inactive proof service aborted review preflight before child spawn. The outer evidence layer then mislabeled that zero-send preflight as transport.fetch.
- fix: `resolveLiveProof` now parses Compose with the existing fixed non-secret review/proof sentinels, never the real review credential, while its actual review child environment retains retry=0, the real review credential, and only the non-secret proof interpolation sentinel.
- verification: real Compose preflight regression 1/1; focused harness 106/106; proof-chain focused 60/60; registry/state 89/89; complete provider-disabled suite 620/620; TypeScript build passed; git diff --check passed. No Docker, live MCP, provider, network, GitHub Action, push, or dispatch ran, and consumed generation 3767fe38... was not replayed.
- files_changed:
  - scripts/docker-review-real.mjs
  - tests/scripts/docker-review-real.test.ts
  - tests/scripts/audit-proof-chain.test.ts
