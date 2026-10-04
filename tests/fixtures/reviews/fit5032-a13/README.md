# FIT5032 A1.3 real review failure case

Case ID: `fit5032-a13-2026`. Prepared 2026-10-05 from the full visible Codex conversation, submitted-candidate code, report, local brief/rubric and supplied marking screenshots. See [evidence analysis](../../../../docs/research/fit5032-a13-review-failure.md).

## Contents and provenance

- `blind-input.json`: deliberately concise, sanitized paraphrases of pre-feedback material. These are reconstructed case facts, **not exact excerpts suitable for the production quote/byte validator**.
- This curated input makes relevant code behavior explicit. It tests judgment, qualification and retention, not independent discovery in a large codebase. Raw-code discovery and complete historical replay require a separate, authorized input build from the private originals.
- `evaluation.json`: evaluator-only labels, later feedback, scenario instructions, negative controls and manual scoring. Never put the whole file in the blind model's context.
- The complete 215-record visible conversation and primary snapshots are in the user's private local case archive outside Git. Hidden reasoning and raw tool events are not part of this corpus. Source IDs link to its manifest; `Mxxx` links to its visible-message index.
- The source rubric is four-band; the marking screenshot is five-band. Their historical availability is unresolved. Claude's full original review was unavailable; retrospective claims about its deleted findings remain self-report.

## Run protocol

1. Select a scenario. For `final-blind`, supply only `blind-input.json` to a fresh review context. Use the task text and evidence there; do not expose this README, the postmortem, outcomes or oracle to the reviewer.
2. Record the exact supplied bytes/hash, input identity, model/version where available, timestamp and output. No automatic external model dispatch is provided by this dataset. Real calls follow the existing project's authorization, capture and isolation controls.
3. Give a separate evaluator the output and `evaluation.json`. Grade each applicable E requirement 0–2 with evidence. All must score 2 and no forbidden inference may occur for semantic acceptance. Keep disagreement visible; automated keyword presence is insufficient.
4. Run `anchored-comparison` in another fresh context with its explicitly reconstructed prior verdict. Compare missed risks and unsupported confidence, not just wording similarity.
5. For feedback reconciliation, add the specified later evidence only after saving the pre-feedback output. Preserve existing administrator delete behavior as counterevidence.
6. For early planning, construct input from `selectedSourceIds` and the proposal only. For recheck, materialize the synthetic code/test excerpts before execution; the textual hypothetical alone cannot prove a fix. Label synthetic changes, retain unchanged credential risk and valid item-name differences.
7. For a future full historical replay, create chronological checkpoints from the private corpus, selecting only evidence available by each cutoff and explicitly resolving transmission scope. Do not feed the complete post-grading conversation to a purported submission-time blind review. Historical attachment gaps stay unknown.

## Local fixture checks

```sh
npx vitest run tests/review/a13-case-integrity.test.ts
```

These checks validate dataset organization and safeguards only. Live model evaluation is **NOT_RUN**; this dataset is not yet a product-level semantic acceptance result. No original identity, private chat URL, credential literal or raw course file is committed.
