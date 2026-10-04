# Phase 21 — Existing patterns to reuse

Read actual files before edits. New module names below are planned, not implemented.

| Target | Closest existing pattern | Concrete anchor / use |
|---|---|---|
| codex-metrics.mjs | codex-contract.mjs | `fields(input, required)` / safe integer, enum and size validation; allowlisted closed record shape |
| runner metrics | codex-runner.mjs | `if(e.type==='turn.completed')` consumes terminal once; preserve stop/cleanup semantics and immediate reasoning discard |
| metrics/handoff persistence | prompt-store.mjs | `transaction(scope,false,async tx=>...)`, `recordPath`, `writeExclusive`, `replace`; never raw caller paths |
| coherent readRunRecord | prompt-store.mjs | `readCodexResult`, `exportLatest`: snapshot/identity/hash and unlocked/index recheck before returning |
| sidecar retention | prompt-store.mjs | `deletionPreview` recognized names plus bounded enumeration; `forgetTask` checks record identity and retains unknown files |
| review-handoff.mjs | codex-result.mjs | `validateBoundCodexResult(snapshot,modelResponse)` before rendering; preserve local limitations and same result hash |
| review-recheck.mjs | references/recheck-workflow.md | Four F states; independent R matrix states; current proof for closure; prior summaries not current evidence |
| review-records.mjs | prompt-records.mjs | Bounded stdin, task+CODEX_THREAD_ID, strict keys, realpath main guard, sanitized error JSON |
| tests | tests/codex/result.mjs; tests/prompts/retention.mjs; tests/codex/helpers.mjs | Synthetic evidence capsule, real temp file safety, boundary fault injection, actual CLI loopback fixture |
| installed acceptance | scripts/install-review-skills.mjs; tests/commands/install-review-skills.mjs | Explicit target root, conflict preservation, isolated external cwd |

No new generic storage framework, queue, report database, application UI or paid provider test infrastructure.
