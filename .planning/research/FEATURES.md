# Feature Research — v1.2

**Date:** 2026-10-04
**Confidence:** High for user goals; medium for target-host delivery until exercised.

## Required User Outcomes

| Capability | User value | Complexity |
|---|---|---|
| Fixed stage commands and help | Direct selection without restating the workflow | Low/medium |
| Installed discovery outside this repository | Works in actual course projects | Medium |
| Exact task-prompt export after a check | Reuse the instructions that really ran | Medium |
| Independent review with concise handoff | Preserve the work conversation's flow | High |
| Current-version result and action updates | Retire resolved findings without inventing regressions | Medium |
| Per-run status, duration and reported tokens | Inspect what the invocation actually did | Medium |

User-confirmed semantics: `$el-prepare`, `$el-check`, `$el-final`, `$el-recheck` execute their named stage. `$el-help` explains them. `$el-prompt` retrieves the latest captured task-facing prompt for the same conversation and task. It neither guesses a stage nor generates another prompt, executes another review, or fetches another conversation's record. If no record exists, say so. The latest failed run must not silently resolve to an older successful run.

## Command Discovery

Official [skill documentation](https://learn.chatgpt.com/docs/build-skills) describes explicit `$` mentions, the CLI/IDE `/skills` picker, local discovery and optional invocation policy. Package focused entry skills around shared review instructions. Validate the actual installed host selector. Arbitrary `/el-*` aliases are not established by these sources and are not a promised interface.

## Dependencies and Priority

Command identity and conversation/task identity precede prompt capture. Capture precedes dispatch. Independent execution precedes trustworthy result/usage receipts. Final recheck acceptance requires the complete chain.

## Defer

Cross-model comparison, billing estimates, account-wide dashboards, guaranteed desktop sidebar chat creation, universal native slash aliases and autonomous document editing. These are not required for the confirmed command-to-review-to-export workflow. Do not infer a need to create six separate copies of the review engine.

## Source

Current user conversation: fixed-command request, rejection of ambiguous prompt generation, proposal to export the preceding stage prompt, and subsequent confirmation. Existing `skills/assignment-review` provides baseline/stage/template/recheck rules.
