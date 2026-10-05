# Phase 21 — Reviewable live acceptance inputs

Prepared 2026-10-05 Australia/Melbourne. **NOT_RUN; awaiting applicable authorization.**

Exactly two logical Codex ChatGPT runs (gpt-6.1-sol / low): initial el-check and revised-source el-recheck, synthetic only. At most one dispatch per run, 600 s deadline, no automatic resend/model switch or new chat. DeepSeek paired-default acceptance is not covered by this Codex-only pair. Private receipts/results stay outside Git.

The recheck template placeholder is replaced only by the first validated synthetic result summary: taskId/runId/resultSha256/sourceScope/findings. It is historical comparison input, never current evidence. The final capture appends actual identities and source/excerpt runtime v3 guide; exact captured/exported hashes are recorded at dispatch. No private course text, auth or hidden reasoning enters either input.

## Requirements R1

```text
R-EVIDENCE (mandatory): The draft must contain the exact line "Evidence: supplied".
R-STYLE (optional): A descriptive heading is preferred; "Heading: Demo" may be retained as an info-level improvement, never a mandatory defect.
```

SHA256: `843646c126184f526bfe0b193f23cfee447959e20546e6d26ca89f100256353b`

## Initial review current S1

```text
Evidence: missing
Heading: Demo
```

Source SHA256: `aedbc87a135e7fac509b3ea80459512d40a6a5072c3e33c8c858c291b4557d10`

### Six-section prompt template

```text
## 1. Task
Check the initial current draft for this synthetic task only. Stage in_progress.

## 2. Sources
Use only the appended R1 requirement and S1 current-draft excerpts. No files, external sources, old drafts or private coursework.

## 3. Review
Check R-EVIDENCE and R-STYLE separately. The optional heading is an info-level suggestion, not a mandatory defect. Identify the missing mandatory evidence line and preserve the optional heading suggestion.

## 4. Output
Return the complete source-bound JSON using the runtime v3 schema. Use FREQ for a confirmed missing mandatory line if present, and FSTYLE for the optional suggestion. Explain each conclusion with captured references, concrete action and coverage limits. Do not claim HD, submission, universal correctness or hidden reasoning.

## 5. Constraints
No tools, commands, network lookup or source reread. No invented requirements, grading weights, retries or model switches.

## 6. Limitations
Fabricated tiny acceptance task only. Structural/reference validity is distinct from semantic correctness. Host annotation will separately evaluate current-proof closure and the retained optional action.
```

Template SHA256: `7c5adf9637e49ad5c8711488b677dda0548cb0fef7a803718395e0cdfc970b06`

## Recheck current S1

```text
Evidence: supplied
Heading: Demo
```

Source SHA256: `0e2161744f5d4d584ddd3ad44e06b0a753db4c528b0048918de5eb919fe6a315`

### Six-section prompt template

```text
## 1. Task
Recheck the revised current draft for this synthetic task only. Stage in_progress.

## 2. Sources
Use only the appended R1 requirement and S1 current-draft excerpts. No files, external sources, old drafts or private coursework.

## 3. Review
Check R-EVIDENCE and R-STYLE separately. The optional heading is an info-level suggestion, not a mandatory defect. Use the admitted source-bound prior summary below as comparison input, not current evidence. Recheck current S1; a corrected mandatory defect must not remain a current fix, while the optional heading improvement remains applicable.
{{ADMITTED_PRIOR_SUMMARY}}

## 4. Output
Return the complete source-bound JSON using the runtime v3 schema. Use FREQ for a confirmed missing mandatory line if present, and FSTYLE for the optional suggestion. Explain each conclusion with captured references, concrete action and coverage limits. Do not claim HD, submission, universal correctness or hidden reasoning.

## 5. Constraints
No tools, commands, network lookup or source reread. No invented requirements, grading weights, retries or model switches.

## 6. Limitations
Fabricated tiny acceptance task only. Structural/reference validity is distinct from semantic correctness. Host annotation will separately evaluate current-proof closure and the retained optional action.
```

Template SHA256: `c0090eeb4f80876566bc08554520db54fc0034f884c2f4416a44036cf22bd9f9`

## Expected behavior and limits

Initial: FREQ mandatory gap, FSTYLE optional info improvement. Revised: current Evidence: supplied supports host closure of stable FREQ; unchanged Heading: Demo keeps optional info actionable/deferred. IDs are requested for reproducibility; manual evidence/meaning verification is still required, not certified by matching IDs. Failed/invalid output stops the dependent pair and remains recorded. No automatic retry.

Dry-run: `node tests/codex/live-acceptance.mjs`. Authorized manual operation only: `node tests/codex/live-acceptance.mjs --execute-authorized-pair`. It imports the installed ~/.agents/skills/assignment-review helpers, creates private immutable captures under the existing CODEX_THREAD_ID and prints complete bound synthetic results. Redirect output only to an owned Git-outside 0600 file when necessary. The flag is a manual operator assertion, not proof of user consent.

After each actual result, inspect full/usage/export, bind explicit host R/F annotations to real result hashes, and manually verify one closure and one retained suggestion. Real inference does not prove A1.3 grading or general provider support.
