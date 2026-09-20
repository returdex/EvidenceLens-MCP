---
status: resolved
trigger: "Accept a provider finish_reason=length response when and only when its returned content is independently proven complete and valid; preserve provider default vision behavior instead of disabling thinking."
created: 2026-09-21
updated: 2026-09-21T01:03:13+10:00
---

# Debug Session: accept-complete-length-response

## Symptoms

- expected: Provider default behavior is preserved, and a complete returned JSON result is accepted after strict validation even when the provider reports `finish_reason=length`.
- actual: `parseDrafts` rejects every non-`stop` finish reason before inspecting `message.content`; commit `f8015ff` instead changes Vision requests to disable thinking.
- errors: A syntactically complete, unique, schema-valid `length` response cannot reach the existing extraction and validation pipeline.
- timeline: The issue became clear after Plan 10-155 returned authenticated `provider-finish-reason-length` and the first offline fix changed the request rather than the response-acceptance rule.
- reproduction: Hermetic transport fixture returning `finish_reason=length` plus complete valid JSON is rejected before parsing. No live provider call is permitted during diagnosis or repair.

## Current Focus

- reasoning_checkpoint:
    hypothesis: `parseDrafts` rejects `finish_reason=length` before extraction, so independently complete content cannot reach the strict structural/schema/provenance pipeline; the Vision request override separately changes provider-default behavior.
    confirming_evidence:
      - focused red test rejects complete valid `length` at the finish-reason branch
      - truncated, multiple-root, and schema-invalid `length` fixtures all report the premature finish-reason diagnostic instead of their content-validation diagnostics
      - Vision request red test directly observes explicit `thinking` and `reasoning_effort` fields
    falsification_test: after permitting only `stop` or `length` into unchanged validation, a truncated, ambiguous, schema-invalid, or forged `length` fixture succeeds, or any non-`length` non-`stop` finish reason reaches content parsing
    fix_rationale: permit `length` to proceed but require the exact same complete extraction and downstream validation as `stop`; omit Vision thinking fields to restore provider defaults while retaining text-model policy
    blind_spots: no live provider behavior is tested in this offline repair; live confirmation requires a fresh separately authorized proof chain
- hypothesis: confirmed
- hypothesis: confirmed and fixed
- test: complete-valid, truncated, multiple-root, schema-invalid, and forged-provenance `length` fixtures plus the full provider-disabled suite
- expecting: only independently complete and fully validated `length` content succeeds; Vision retains provider-default thinking behavior
- next_action: resolved after explicit human confirmation; code committed as `403d2a2`
- tdd_checkpoint: green — focused 71/71 and TypeScript build passed

## Evidence

- timestamp: 2026-09-21T00:00:00+10:00
  checked: `parseDrafts` in `src/providers/deepseek.ts`
  found: every non-`stop` finish reason is rejected before `message.content` extraction.
  implication: a complete `length` payload cannot reach independent structural or provenance validation.
- timestamp: 2026-09-21T00:00:00+10:00
  checked: extraction and `validateProviderFindings` implementations
  found: extraction requires one bounded `findings` root and rejects unbalanced, multiple, malformed, structural-context, or wrong-root content; downstream Zod and provenance checks enforce field bounds, exact evidence references, uniqueness, ordering, and local hashes.
  implication: accepting `length` only after these unchanged checks can distinguish complete valid content from truncation without accepting the finish reason alone.
- timestamp: 2026-09-21T00:59:03+10:00
  checked: focused `tests/providers/deepseek.test.ts` red run
  found: 66 passed and 5 expected failures; complete-valid `length` and default Vision assertions fail, while the three invalid `length` cases are intercepted by the early finish-reason branch.
  implication: the reproduction is deterministic and isolates parser ordering plus the explicit Vision override.
- timestamp: 2026-09-21T01:00:45+10:00
  checked: focused test after minimal parser/order and Vision-body fix, TypeScript build, diff check
  found: 71/71 tests pass; build and whitespace validation pass.
  implication: complete `length` now reaches validation, unsafe content still fails, and Vision request defaults are restored.
- timestamp: 2026-09-21T01:01:08+10:00
  checked: full provider-disabled suite after adding explicit forged-provenance coverage
  found: 746/747 pass; the only failure is a legacy full-stack test expecting malformed `length` content to emit the old early `finish_reason=length` diagnostic, while production correctly emits authenticated `no_candidate` after parsing.
  implication: production behavior matches the new contract; the stale expectation must be removed from the unsupported-finish-reason table, not restored in code.
- timestamp: 2026-09-21T01:01:32+10:00
  checked: final full provider-disabled suite, TypeScript build, and diff whitespace check
  found: 43 files and 746/746 tests pass; build and `git diff --check` pass. No provider/API, live Docker, GitHub Actions, synchronization, or replay occurred.
  implication: the offline fix is regression-verified and ready for human confirmation; real-provider confirmation remains a separate fresh proof-chain step.
- timestamp: 2026-09-21T01:02:56+10:00
  checked: final focused invocation without the repository's offline environment flag
  found: adapter tests passed 72/72; three unrelated protocol tests failed at provider configuration startup because `EVIDENCELENS_DISABLE_PROVIDER=1` was omitted from the ad-hoc command.
  implication: this is an invalid test invocation rather than a product regression; repeat using the canonical `npm test` offline command before archival.
- timestamp: 2026-09-21T01:03:13+10:00
  checked: canonical final offline verification after human confirmation
  found: focused tests pass 114/114; full provider-disabled suite passes 746/746 across 43 files; TypeScript build and diff check pass.
  implication: the confirmed fix is ready to archive; no live or external action was used.


## Eliminated


## Resolution

- root_cause: `parseDrafts` treats the transport termination hint `length` as conclusive invalidity before inspecting content, preventing independently complete output from reaching strict validation; commit `f8015ff` additionally overrides provider-default Vision thinking behavior.
- fix: Allow only `stop` and `length` to enter the unchanged bounded extraction/schema/provenance pipeline; retain early rejection for all other finish reasons; remove Vision thinking overrides; document the acceptance boundary.
- verification: After explicit human confirmation, focused tests passed 114/114; full provider-disabled suite passed 746/746 across 43 files; TypeScript build and `git diff --check` passed. Code commit `403d2a2`. No live or external action performed.
- files_changed:
  - src/providers/deepseek.ts
  - tests/providers/deepseek.test.ts
  - tests/contract/review-tool.test.ts
  - README.md
  - docs/mcp-contract.md
