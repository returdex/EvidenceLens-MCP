# Phase 20 — Responsibility and Existing Pattern Map

Inspected 2026-10-05. Proposed codex-* files and tests/codex/ do not exist yet.

| New/changed responsibility | Existing analog and inspected seam | Rule |
|---|---|---|
| codex-contract.mjs + evidence capsule | prompt-contract.mjs fields/text/array/decode/hash; baseline-sources.mjs gate-before-read | bounded plain objects; exact fields; never spread untrusted input; no reader added |
| lifecycle v2 + execution result | prompt-store.mjs transaction/readForDispatch/finishRun/forgetTask | same conversation lock, exact task scope, exclusive snapshot, dirty transactions unavailable; preserve v1 |
| codex-preflight.mjs | installer canonical paths; prompt-records.mjs bounded stdin and safe CLI | version/status timeout, sanitized code, no shell or credential file read |
| codex-isolation.mjs | baseline/source-boundary tests, installer no-follow parent checks | reuse path checking concepts; OS policy and tool guard are new work, not existing guarantees |
| codex-runner.mjs | existing prompt-store dispatch gate, scripts/live-proof-state.mjs atomic pattern only | no paid-proof imports, one request, scoped group cleanup and bounded protocol parser |
| codex-result.mjs | src/tools/review.ts and provider provenance validation patterns | local IDs/hash/span validation; do not change public MCP schema or claim semantic truth |
| codex-review.mjs CLI and shared references | prompt-records.mjs installed-realpath main guard; command-entrypoints.md steps 1–7 | installed directory works outside repo; help/export no inference; scope from current host |
| tests/codex and host acceptance | tests/prompts/*.mjs; tests/commands/*.mjs | real private temp fixtures, injected faults, separate synthetic protocol vs real OS vs live inference |

Concrete inspected source: validateLifecycle currently requires executionKind==='host_skill'; beginRun constructs that value; readForDispatch changes lifecycle before returning prompt; receipt returns executionKind. These must change coherently. readForDispatch is not a second prompt constructor. Snapshot schema v1 is already immutable; renderer runs before capture. New result/scratch deletion must join the existing allowlisted task deletion flow and reject unknown entries. Root locks cannot remain held during model work.

Avoid a second general store, provider framework, user config editor or generic process manager. Split installed modules only around protocol, preflight/isolation, runner and final binding. Tests may share a tests/codex/helpers.mjs fixture factory; it must not be imported by production. Canonical scope and current-source identity stay with the parent command.
