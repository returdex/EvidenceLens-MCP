---
status: resolved
trigger: "provider-json-object-unbalanced"
created: 2026-09-21
updated: 2026-09-21T23:30:12+10:00
---

# Debug Session: provider-json-object-unbalanced

## Symptoms

- expected: The one-shot DeepSeek Vision response contains one complete, bounded JSON result that passes extraction, schema, citation, provenance, fingerprint, merge, and public-response validation.
- actual: Plan 10-160 generation `bc9bd1dd55b095d4a279c87fca014398b5ede9452ff9c5bcb46fa4707af34bde` consumed exactly one provider send and terminated as immutable `authority:false` gaps evidence with `provider-json-object-unbalanced`.
- errors: Terminal branch `post_fetch_non_pass`; authenticated content-free diagnostic `provider-json-object-unbalanced`; `stream_truncated=false`; child exit/close code 0; retries, fallback, alternate, second diagnostic call, replay, synchronization, and GitHub Actions all zero.
- timeline: The prior 10-155 request returned `finish_reason=length` before content parsing. Commit `403d2a2` then allowed `stop` or `length` to enter the same strict validation pipeline when content is independently complete. The fresh 10-160 run reached that pipeline and proved the returned JSON object was not balanced.
- reproduction: The consumed live generation must never be replayed and raw provider content is intentionally not persisted. Reproduce only with offline serialization, bounded synthetic responses, prompt/output-budget analysis, and hermetic production-path fixtures. Any future live request requires a newly certified authority chain.

## Current Focus

- hypothesis: The certified 8000-token ceiling is not derived from the shared four-finding output contract: a schema-valid maximal response can serialize to 44,662 UTF-8 bytes before any hidden provider reasoning, so provider-default generation can exhaust 8000 and leave message.content unbalanced; independently, reasoning_content fallback is an unsafe field-selection defect but did not cause the observed non-empty unbalanced content.
- test: Add RED hermetic tests proving the maximal valid boundary is materially larger than the old 8000 contract, the certified request uses the safe configured ceiling, complete valid stop/length still pass, truncated output still fails closed, and reasoning_content is never treated as final content.
- expecting: Tests fail on the current 8000 default/runtime and reasoning fallback, then pass after a minimal 20000-token contract change and content-only selection; unbalanced JSON remains rejected.
- next_action: Archive this resolved session and commit the verified code/test changes plus planning records without executing any external or live workflow.
- reasoning_checkpoint:
    hypothesis: max_tokens=8000 is below the worst-case output admitted by the shared four-finding contract, so provider-default generation can terminate mid-object; parsing reasoning_content as final output is an independent unsafe field-selection bug.
    confirming_evidence:
      - The authenticated live terminal reached post-fetch parsing and emitted provider-json-object-unbalanced after exactly one successful send and clean child lifecycle.
      - A schema-valid maximal four-finding fixture serializes to 44,662 UTF-8 bytes, while the certified request ceiling is 8000 tokens and Vision intentionally retains provider-default reasoning.
      - parseDrafts explicitly substitutes reasoning_content only when message.content is empty.
    falsification_test: If the maximal schema-valid fixture is not materially larger than the old certified envelope, or current code already uses 20000 and rejects empty content even when reasoning_content contains valid JSON, the hypothesis is false.
    fix_rationale: Raise the single-request/default/certified ceiling to the already validated configuration maximum of 20000 and accept final JSON only from message.content. This preserves provider defaults and one-send behavior while addressing the capacity mismatch and field-ownership defect; incomplete JSON remains rejected.
    blind_spots: Raw live content and provider token accounting were deliberately not retained, so the exact live truncation mechanism cannot be proven; 20000 reduces the confirmed contract mismatch but cannot mathematically bound arbitrary hidden reasoning or unbounded provider behavior.
- reasoning_checkpoint: preserve provider-default Vision behavior; do not reintroduce a thinking override unless independently required and user-approved; do not accept or repair incomplete JSON; do not issue provider/API requests, execute Plan 10-161, synchronize, run GitHub Actions, or replay generation bc9bd1dd
- tdd_checkpoint: not applicable; workflow.tdd_mode=false, while the regression tests were still observed RED before the fix and GREEN after it.
- human_verification: confirmed by user on 2026-09-21; accepted max_tokens=20000, message.content-only authority, provider-default Vision, and fail-closed incomplete JSON handling.

## Evidence

- timestamp: 2026-09-21T00:10:00+10:00
  checked: committed 10-158/159/160 plans, summaries, terminal snapshot, execution, proof, and owner validation
  found: reviewed commit 7c99534 and image sha256:5ddf3a56 were authenticated; generation bc9bd1dd consumed exactly one send; terminal branch post_fetch_non_pass authenticated provider-json-object-unbalanced with stream_truncated=false and exit/close 0; authority remained false and sync/GitHub/replay were zero.
  implication: transport and lifecycle completed; the only proven content fact is that the selected provider content was structurally unbalanced. Raw content and exact provider-side cause remain unknowable by design.

- timestamp: 2026-09-21T00:12:00+10:00
  checked: src/providers/deepseek.ts request serialization and response selection
  found: Vision correctly omits thinking/reasoning_effort and sends response_format json_object, stream false, and max_tokens from inference; stop and length share validation. parseDrafts selects message.content, but if it is the empty string it falls back to reasoning_content.
  implication: provider defaults are preserved. reasoning_content fallback is a distinct unsafe acceptance path because hidden reasoning is not the provider's final JSON answer; it cannot explain a non-empty unbalanced content diagnostic.

- timestamp: 2026-09-21T00:14:00+10:00
  checked: shared Prompt v2/post-decode limits and maximal synthetic schema-valid four-finding serialization
  found: each finding permits 120 title chars, four 360-char prose fields, two 240-char follow-ups, four citations and 128-char IDs. A conservative maximal fixture using valid table references serialized to 28,342 JavaScript characters / 44,662 UTF-8 bytes; location cell syntax itself has no explicit length cap. The certified max_tokens is only 8000 and provider-default reasoning shares provider output capacity.
  implication: 8000 is not a sound upper bound for the accepted output contract. Even without claiming the discarded live bytes, insufficient request budget is a confirmed contract defect capable of producing the observed unbalanced terminal state.

- timestamp: 2026-09-21T00:18:00+10:00
  checked: RED regression run for config/runtime ceiling and response-field ownership
  found: Current code failed exactly as predicted: defaults/runtime remained 8000 and a response with empty message.content plus valid-looking reasoning_content was accepted. The existing unbalanced fixture continued to fail closed.
  implication: Both the capacity-contract mismatch and reasoning_content ownership defect are reproducible offline; no external call was needed.

- timestamp: 2026-09-21T00:23:00+10:00
  checked: GREEN focused suite, full provider-disabled suite, TypeScript build, static Compose expansion, and git diff check
  found: Focused tests passed 206/206; full provider-disabled tests passed 771/771; build, Compose expansion, and diff check passed. Complete stop/length, boundary-sized valid content, unbalanced length, and content/reasoning combinations are covered. Provider/API, live Docker review/proof, synchronization, GitHub Actions, and replay counts remained zero.
  implication: The minimal offline fix preserves fail-closed parsing and provider-default Vision behavior while increasing the certified single-send output allowance and removing reasoning fallback.

- timestamp: 2026-09-21T23:30:12+10:00
  checked: final post-confirmation offline re-verification and user acceptance
  found: Focused tests passed 206/206; all 771 provider-disabled tests passed; TypeScript build, sanitized static Compose contract derivation, and git diff check passed. The user explicitly confirmed the 20000 ceiling, message.content-only authority, provider-default Vision behavior, and continued fail-closed handling of incomplete JSON. No provider/API request, credential access, live Docker review/proof, Plan 10-161 execution, synchronization, GitHub Actions, or replay generation occurred.
  implication: The approved fix is stable under the original hermetic regression gates and is eligible for archival; the consumed live generation remains immutable authority:false evidence and is not reclassified.


## Eliminated


## Resolution

- root_cause: The exact discarded live bytes cannot establish why the provider produced incomplete content. Offline investigation nevertheless confirmed two contract defects: max_tokens=8000 was not derived from the maximum response admitted by Prompt v2/schema and can be insufficient for provider-default generation; separately, empty message.content incorrectly delegated authority to reasoning_content. The observed live fact remains only that selected content was genuinely unbalanced and correctly rejected.
- fix: Raise product and certified review/proof max_tokens to the existing validated configuration maximum 20000, keep Vision provider defaults untouched, and parse final JSON exclusively from message.content. Continue rejecting empty, truncated, unbalanced, ambiguous, malformed, oversized, schema-invalid, citation-invalid, and provenance-invalid content.
- verification: RED reproduced both defects. GREEN and final post-confirmation rerun passed focused 206/206, full provider-disabled 771/771, TypeScript build, sanitized static Compose expansion, and git diff check. The user confirmed the fix in the intended offline workflow. External/provider/live Docker/GitHub/sync/replay actions remained zero; Plan 10-161 was not executed and the consumed generation remains immutable authority:false.
- files_changed: [src/providers/config.ts, src/providers/deepseek.ts, scripts/proof-runtime-spec.mjs, compose.yaml, README.md, tests/providers/config.test.ts, tests/providers/deepseek.test.ts, tests/scripts/proof-runtime-spec.test.ts, tests/contract/review-provider.test.ts]
