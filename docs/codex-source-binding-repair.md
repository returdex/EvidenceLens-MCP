# Local quote binding repair (0.3.10)

## Observed issue and attribution limits

A real two-material preparation review completed in 241,724 ms, with terminal observed, exit 0 and cleanup complete, but its result was rejected as `source_mismatch` / `result_validation/result_rejected`. Its private receipt does not identify the failed binding condition and the rejected model output was deliberately not retained. The exact offending reference cannot be reconstructed from that receipt. A separate subsequent real review succeeded in 234,445 ms using 97 short excerpts with copied complete quotes and precomputed spans; 17 findings were stored and revalidated. That establishes a working workaround on 0.3.9, not the precise cause of the preceding rejection.

Code inspection confirms two defects in the general workflow: arbitrary source-relative UTF-8 offsets were assigned to the model to calculate, and all identity/coverage/reference/span/quote failures shared one undifferentiated trigger. The repair removes the arithmetic task and records the actual failing condition. It does not claim that every source mismatch was an offset error.

## Production changes

- The closed model wire schema is now v2. Evidence contains only `sourceId`, `excerptId` and `quote`. No model-supplied byte positions are accepted in this schema.
- Local code locates the exact non-empty quote within the specified captured excerpt. Exactly one match is required, including overlapping occurrences; absence and ambiguity both reject. It computes absolute source-relative UTF-8 positions from the captured excerpt's start and the matched bytes. No whitespace, Unicode, punctuation or fuzzy correction is performed; no cross-source search or old-draft fallback is permitted.
- Identity, material status, coverage, evidence requirement and duplicate-reference checks still apply. The resolved result passes the original byte/quote validator and is stored as the same v1 model result and envelope expected by existing readers. Historical v1 outputs retain strict validation; wrong legacy positions are never silently repaired.
- Capture adds an output guide derived from the actual snapshot: current run/task/stage/draft identity and the complete registered source/excerpt map. Full coverage is a conditional template, not a declaration that the model read unavailable evidence. The guide only selects output shape; it does not change the requested task or permitted materials. New prompt hashes include the guide, and dispatch/export preserve captured bytes.
- Safe closed `binding_*` triggers distinguish identity, coverage, material status, excerpt membership, missing evidence, reference, span, quote mismatch, missing quote, ambiguous quote and duplicate evidence. They retain no quote text, arbitrary identifiers, paths, raw events or errors. Existing diagnostics schema v1 and execution schema v2 remain readable.

The production output-schema pin is recertified by the existing isolation digest and real-host positive/negative launch tests. Model, binary, permissions, ten-minute deadline, output bounds, cancellation and no automatic resend remain unchanged. Original failure/success records are not rewritten or replayed; Phase 21 handoff/recheck/usage acceptance remains pending.

## Validation

Regression checks cover Chinese, emoji, accented text, CRLF, non-zero excerpt starts, absent/changed/empty quotes, overlapping or repeated matches, exact source selection, unavailable evidence, identity/coverage errors, duplicates, rejected numeric overrides, strict v1 compatibility, installed capture/export and terminal-result publication. An actual pinned CLI loopback fixture exercises the new schema through production supervision, without paid inference or coursework data.

Fresh build passed. The Codex/prompt/command/source-boundary Node batch passed 219/219 in 12.272 seconds; six affected Vitest files passed 118/118 in 3.67 seconds, zero failures/skips. The focused changed-boundary suite passed 68/68 in 3.388 seconds. Existing PDF/font warnings remained non-fatal. Installed command/reference graphs and real-host positive/negative isolation checks passed in the Node batch.

Exactly one post-repair production synthetic GPT-6 check ran at 16:10:24–16:10:36 Australia/Melbourne on 2026-10-05. It returned succeeded in 11,685 ms, terminal observed, exit 0, no termination requested, cleanup complete. The only requirement was fabricated text containing Chinese and emoji. The returned exact quote was locally bound to source bytes 0..75, stored in the compatible v1 envelope, and the persisted digest was independently revalidated. Captured prompt export was unchanged. No coursework was dispatched by this check and no failed attempt was replayed.

Prompt hash: `284e8d27eab7fe0fb4542ac02cc6954391301923753d629ca7d8927150afcb7a`. Result hash: `4c55309e160bdfa0547c9bbb935a0a6accafd71f815e99ffe5c7d8f82fa0a6f0`. Isolation contract hash: `bc6aaacaed14e55552f565e591b6eaa411ea729ec9f0d9f61e5181e931cb16ba`. Private run/conversation identifiers and source paths are omitted. New-protocol real A4 review and Phase 21 revised-source/usage/handoff acceptance remain separate pending checks. See [commands and scope](development-validation.md).

The already stored real A4 v1 result was revalidated under the repaired binder with its original result hash unchanged. This read-only compatibility check did not dispatch another review or reread the coursework files.
