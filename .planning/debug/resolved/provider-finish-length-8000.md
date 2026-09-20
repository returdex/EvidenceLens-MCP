---
status: resolved
trigger: "Plan 10-155 returned authenticated provider-finish-reason-length at the certified maxTokens 8000 boundary after exactly one provider send. Use GSD debug to diagnose and fix without replaying the consumed generation."
created: 2026-09-21
updated: 2026-09-21T00:40:00+10:00
---

# Debug Session: provider-finish-length-8000

## Symptoms

- expected: The certified one-shot DeepSeek request completes with exact `finish_reason=stop` and a valid bounded JSON result containing at most four findings, allowing the proof chain to pass.
- actual: Generation `e2547175c86af57836fe18a8bcdb395b8f81094b839fc6983633563b59490291` returned authenticated `provider-finish-reason-length` at `maxTokens=8000`; Plan 10-156 is blocked.
- errors: Content-free diagnostic `provider-finish-reason-length`; terminal branch `post_fetch_non_pass`; lifecycle exit/close 0/0; stream_truncated=false.
- timeline: Earlier certified live execution also returned `finish_reason=length` at 4000. Prompt v2 bounded output to four findings and the certified runtime was raised to 8000, but the fresh 10-155 generation still ended with `length`.
- reproduction: The original live command consumed its one-send budget and must never be replayed. Reproduce only through offline fixtures, request/prompt inspection, token accounting, and hermetic provider-response simulations. Any later live proof requires a new certified authority chain.

## Current Focus

- hypothesis: The certified vision request omits the thinking toggle, but DeepSeek now enables thinking by default and routes the retired vision-exp alias to the latest Flash model; hidden reasoning therefore shares and can exhaust max_tokens before the bounded JSON answer completes.
- test: Serialize the production vision request offline and assert it currently contains neither thinking.type=disabled nor reasoning_effort=none; then add an explicit non-thinking contract and verify the exact request shape plus all provider-disabled regressions.
- expecting: The pre-fix request demonstrates default-thinking exposure, while the one-variable counterfactual produces an explicit non-thinking request without changing finding bounds, one-send accounting, or response validation.
- next_action: Resolved and archived after user acceptance; any future live proof requires a newly certified authority chain and must not replay generation e2547175.
- reasoning_checkpoint:
    hypothesis: "The vision branch causes finish_reason=length because it omits thinking controls while the provider now enables thinking by default, so hidden reasoning can consume the shared 8000-token generation budget before bounded JSON completes."
    confirming_evidence:
      - "Authenticated 10-155 evidence proves exact maxTokens 8000, one provider send, finish_reason length, and no transport/lifecycle/retry fault."
      - "The serialized production vision request contains neither thinking nor reasoning_effort, and current official provider documentation says omitted thinking defaults to enabled at high effort."
      - "The legacy vision-exp model name is now routed to current Flash, which officially supports explicit non-thinking mode."
    falsification_test: "The hypothesis would be false if the pre-fix serialized request already disabled thinking, or if official current contract treated omission as disabled / did not count reasoning within generated output."
    fix_rationale: "Making non-thinking explicit closes the provider-default ambiguity at request construction, so the existing 8000-token cap is reserved for the already bounded JSON answer rather than unbounded hidden reasoning."
    blind_spots: "No live provider call is authorized, so offline verification proves request semantics and regressions but a future newly certified authority chain must prove provider completion."
- reasoning_checkpoint: preserve exact single-send evidence; no live replay, provider request, synchronization, or Plan 10-156 execution
- tdd_checkpoint: pending

## Evidence

- timestamp: 2026-09-21T10:20:00+10:00
  checked: exact Plan 10-153/154/155 artifacts and authenticated terminal snapshot
  found: The certified immutable request used maxTokens=8000 and model deepseek-v4-flash-vision-exp; generation e2547175 consumed exactly one send and authenticated provider-finish-reason-length with no retry, replay, fallback, stream truncation, or lifecycle failure.
  implication: The cap and diagnostic are genuine; transport, evidence lifecycle, and silent lower-cap override do not explain the failure.
- timestamp: 2026-09-21T10:23:00+10:00
  checked: complete buildBody implementation and Prompt v2/post-decode bounds
  found: Prompt v2 limits visible JSON to four findings and bounded fields, but buildBody emits no thinking or reasoning_effort field for deepseek-v4-flash-vision-exp.
  implication: The prompt constrains only visible answer shape; it does not bound provider-generated reasoning tokens.
- timestamp: 2026-09-21T10:26:00+10:00
  checked: current official DeepSeek Thinking Mode, Chat Completions, Vision, model, and changelog documentation
  found: Thinking mode is enabled by default at high effort; max_tokens covers generated completion capacity and reasoning tokens are reported within completion usage; the retired deepseek-v4-flash-vision-exp alias is now served by the latest deepseek-flash model, which supports both thinking and non-thinking modes.
  implication: Omitting thinking parameters no longer means non-thinking for the certified legacy vision alias; the request unintentionally activates an unbounded hidden-reasoning phase that can consume all 8000 tokens before bounded JSON completion.
- timestamp: 2026-09-21T10:35:00+10:00
  checked: new focused request-shape regression before implementation
  found: The test failed exactly because the serialized vision request lacked thinking.type=disabled and reasoning_effort=none.
  implication: The root-cause mechanism is directly reproduced offline at the production request boundary; this is not an inference from the live diagnostic alone.
- timestamp: 2026-09-21T10:38:00+10:00
  checked: focused request-shape test and adjacent provider/orchestration regressions after the one-variable fix
  found: The new regression passed and 169/169 focused offline tests passed; the serialized vision request now contains thinking.type=disabled and reasoning_effort=none while retaining max_tokens, JSON mode, image payload, and response validation.
  implication: The fix closes the default-thinking exposure without weakening bounded output, provenance, or request accounting.
- timestamp: 2026-09-21T10:42:00+10:00
  checked: complete provider-disabled test suite, TypeScript build, diff hygiene, and changed-path inventory
  found: All 743 offline tests passed; npm run build and git diff --check passed; only source, regression test, request-contract documentation, and this debug record changed. No provider, Docker, synchronization, Plan 10-156, or GitHub Action command ran.
  implication: The fix is regression-safe offline and the consumed authority:false evidence remains untouched.
- timestamp: 2026-09-21T00:40:00+10:00
  checked: user acceptance plus final pre-commit offline verification and atomic source commit
  found: User accepted the offline fix; the focused suite passed 68/68, the full provider-disabled suite passed 743/743, TypeScript build and git diff --check passed, and commit f8015ff contains exactly the four intended source/test/documentation files.
  implication: The offline fix workflow is complete without any provider request, Docker run, GitHub Action, synchronization, Plan 10-156 execution, or replay of generation e2547175.


## Eliminated


## Resolution

- root_cause: The certified vision request omitted thinking controls under an obsolete assumption that the vision model must receive none. DeepSeek now enables thinking by default and routes the retired deepseek-v4-flash-vision-exp alias to current Flash, so hidden reasoning shared and exhausted max_tokens=8000 before the already bounded JSON answer completed.
- fix: Explicitly send thinking.type=disabled and reasoning_effort=none for deepseek-v4-flash-vision-exp requests; retain enabled/high thinking for text models; update the exact request regression and contract documentation.
- verification: Pre-fix focused regression failed on the absent controls; post-fix focused regression passed, final focused verification passed 68/68, all 743 provider-disabled tests passed, TypeScript build passed, and git diff --check passed. User accepted the offline fix. Live provider completion remains intentionally unverified pending a newly certified authority chain.
- files_changed: [src/providers/deepseek.ts, tests/providers/deepseek.test.ts, README.md, docs/mcp-contract.md]
