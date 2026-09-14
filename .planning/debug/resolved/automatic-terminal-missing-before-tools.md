---
status: resolved
trigger: "Plan 10-65 fixed live entrypoint returned AUTOMATIC_TERMINAL_MISSING before tools/call with zero observed provider sends"
created: 2026-09-14
updated: 2026-09-14T00:00:00+10:00
---

# Debug Session: automatic-terminal-missing-before-tools

## Symptoms

- **Expected behavior:** The fixed `review:auto-live-once` path should reach one MCP `tools/call`, seal a terminal result, and use at most one provider HTTP send.
- **Actual behavior:** The sole Plan 10-65 generation sealed `gaps_found/request_failed` with `AUTOMATIC_TERMINAL_MISSING`, reservation 1, tools/call 0, and observed provider sends 0.
- **Error messages:** `AUTOMATIC_TERMINAL_MISSING` with process exit 50.
- **Timeline:** Recurred after terminal-owner and receipt/auditor fixes; the same-process execution/proof validators and receipt audit now pass.
- **Reproduction:** Exact fixed empty-argv `npm run review:auto-live-once` against the authenticated Plan 10-64 image; the consumed generation must not be replayed.

## Current Focus

- hypothesis: Confirmed lifecycle fix remains correct; the remaining suite failure is a certification-state-dependent test that runs against the mutable checkout and assumes current 10-65 authority must reject even after b7573aa committed the exact consumed tuple.
- test: Run the complete provider-disabled suite under a 60-second bound, TypeScript build, diff hygiene, and source/registry-focused checks.
- expecting: 616/616 tests pass with no external sentinel effects; build and source checks are clean.
- next_action: Resolved and archived after complete local verification; no live replay is required for this debug closure.
- reasoning_checkpoint:
    hypothesis: runReviewHarness causes AUTOMATIC_TERMINAL_MISSING because its second compose preflight can reject after reservation but before terminal callback ownership is initialized.
    confirming_evidence:
      - Both rotated 10-59 and 10-65 registries contain the identical authenticated callback-missing 0/1/0 terminal state.
      - A deterministic invocation of production runReviewHarness with resolveProof rejecting returned preflight with terminal=0, evidence=0, and spawned=0.
    falsification_test: If runReviewHarness invokes both retention callbacks with authenticated 0/1/0 evidence when resolveProof rejects, this hypothesis is wrong.
    fix_rationale: Establishing terminal ownership before the fallible second preflight and retaining its failure result closes the exact callback gap at its source.
    blind_spots: The historical live execution does not preserve the underlying compose-config stderr, so the exact environmental reason resolveLiveProof rejected cannot be recovered; the structural callback defect is independently reproducible.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-09-14T00:00:00+10:00
  checked: Commit b7573aa and repository-wide references to AUTOMATIC_TERMINAL_MISSING, reservation, and tools/call.
  found: b7573aa changes only seven .planning evidence/state artifacts; runtime behavior is owned by scripts/automatic-live-review.mjs and scripts/docker-review-real.mjs. The sealed failure corresponds to automatic-live-review's missing terminal callback fallback.
  implication: The investigation must identify a pre-existing runtime lifecycle defect or registry/image mismatch rather than attribute the behavior to code changed in b7573aa.

- timestamp: 2026-09-14T00:05:00+10:00
  checked: Complete runFixedAutomaticLive/runStatefulAutomaticLive path, runReviewHarness ordering, rotated 10-59 and 10-65 states, and commit 14ce080 registry rotation.
  found: Both consumed registries seal the identical 0 tools / 1 reservation / 0 observed callback-missing state. runReviewHarness awaits resolveProof before defining terminal retention state and before entering its only try/catch. runStatefulAutomaticLive consumes and records the reservation before calling this harness.
  implication: A failure in the harness's second compose-config preflight is structurally indistinguishable from the observed failure and necessarily bypasses the terminal callback; registry rotation only reproduced the same lifecycle hole.

- timestamp: 2026-09-14T00:10:00+10:00
  checked: Deterministic production runReviewHarness seam with fake credential, resolveProof rejection, child-spawn sentinel, and real retention callbacks.
  found: It rejected with message preflight; terminal callbacks=0, evidence callbacks=0, child spawns=0.
  implication: The hypothesis is confirmed directly. The owner must initialize and retain terminal evidence before awaiting resolveProof.

- timestamp: 2026-09-14T18:38:00+10:00
  checked: Focused automatic-live-review and docker-review-real test suites after the owner fix.
  found: 121 tests passed, including a new regression that drives runStatefulAutomaticLive through the real runReviewHarness with a post-reservation resolveProof rejection and verifies an authenticated pre_tools_post_reservation 0/1/0 terminal; child spawn remained uncalled.
  implication: The original lifecycle gap is closed at the production owner and adjacent terminal behavior remains green.

- timestamp: 2026-09-14T18:39:00+10:00
  checked: Complete provider-disabled npm test suite.
  found: 615 of 616 tests passed. The sole failure is tests/scripts/audit-proof-chain.test.ts:176, whose stale expectation requires current 10-65 authority to reject; b7573aa has now sealed that tuple so the command exits 0. The focused lifecycle suites remain green and this fix does not modify proof-chain authority.
  implication: Broad regression coverage is green for the changed owner path; one unrelated registry-state expectation predating this debug change prevents an all-green aggregate suite.

- timestamp: 2026-09-14T18:40:00+10:00
  checked: Repository scripts and final diff hygiene.
  found: npm run build passed and git diff --check passed. package.json defines no typecheck or lint scripts. The diff is limited to the production terminal owner, its production-path regression, and this debug session.
  implication: Local verification is complete within the provider-disabled boundary; end-to-end live confirmation requires a new authorized generation and user workflow.

- timestamp: 2026-09-14T18:45:00+10:00
  checked: Failing audit-proof-chain assertion and BL-57-05 summaries/review precedent.
  found: The test executes sync-authority-auto in the mutable working checkout and hardcodes nonzero status. BL-57-05 requires exact historical errors in isolated Git fixtures and only stable bounded rejection/no-write/no-external-effect invariants for deliberately drifted current lifecycle state.
  implication: The test must isolate current HEAD, verify the exact consumed tuple, then mutate one authority member before asserting the sanitized rejection invariant.

- timestamp: 2026-09-14T18:47:00+10:00
  checked: Focused proof-chain, automatic-live, and docker-review-real suites after stable-lifecycle test correction.
  found: 179/179 tests passed. The current consumed 10-65 tuple is accepted in an isolated HEAD repository; deliberate 10-63 review drift then rejects within the sanitized error family with watched files unchanged and zero external command sentinel calls.
  implication: The stale assertion is corrected without weakening historical exact-error or production runReviewHarness-to-runStatefulAutomaticLive coverage.

- timestamp: 2026-09-14T18:50:00+10:00
  checked: Bounded complete provider-disabled suite, TypeScript build, registry/state focused suites, diff hygiene, and atomic code commit.
  found: Full suite passed 616/616 within 60 seconds; registry/state checks passed 35/35; npm run build and git diff --check passed. Production fix and tests committed as a85d2bf. No Docker, live provider, network, GitHub Actions, push, dispatch, or 10-65 replay occurred.
  implication: The root cause is fixed and verified across the complete permitted local surface.

## Eliminated

## Resolution

- root_cause: runReviewHarness awaited its fallible live-proof Docker Compose preflight before creating terminal callback ownership and outside its guarded lifecycle. Because runStatefulAutomaticLive had already consumed the one-shot reservation, a rejection there escaped with no terminal or request-evidence callback, forcing the wrapper's AUTOMATIC_TERMINAL_MISSING 0/1/0 fallback.
- fix: Initialize terminal and request-evidence ownership before resolveLiveProof; on its failure, retain authenticated pre-tools 0/1/0 evidence and terminal state before rethrowing. Added a regression through runStatefulAutomaticLive and the real runReviewHarness.
- verification: Focused owner/proof suites passed 179/179; bounded full provider-disabled suite passed 616/616; registry/state suites passed 35/35; npm run build and git diff --check passed. Commit a85d2bf. No prohibited external or live actions occurred.
- files_changed:
  - scripts/docker-review-real.mjs
  - tests/scripts/automatic-live-review.test.ts
