---
phase: 20-bounded-independent-codex-execution
plan: "04"
subsystem: assignment-review
tags: [source-binding, installed-cli, commands]
requires: [20-03]
provides: [Locally bound result envelope, Installed capture and independent run routing]
affects: [20-05]
requirements-completed: []
completed: 2026-10-05
---
# Plan 04 — Source binding and installed routing

Two tasks complete. Strict binder matches captured run/task/stage/current identity, all coverage rows and permitted source/excerpt references, exact UTF-8 ranges/quotes, excluded/unread limitations. It stamps hashes locally and preserves local coverage limitations independently of model omissions. Store revalidates binding before publication. Cleanup failure discards an otherwise valid result; cancellation at the terminal decision wins.

Installed codex-review.mjs accepts only preflight/capture/run with bounded stdin and current host identity. Capture verifies admitted text and appends the canonical evidence block before saving; run has no endpoint/model/binary/test switches. Four shared stage routes now use begin(codex_exec) -> capture -> isolated run -> validated result, with no automatic same-host fallback. Generate/help/export retain their existing boundaries. Internal trusted adapter seam supports deterministic tests only; production CLI imports fixed production runCapturedCodex.

Verification: 34/34 binder+contract checks; 91/91 combined CLI/result/runner/commands/prompts/source-boundary checks (7.748 s). Added end-to-end trusted-adapter success and at-most-once export test then ran CLI suite 3/3 (1.103 s). Actual installed directory symlink invoked from external Unicode cwd: capture -> missing-Codex failure -> exact failure export, original input mutation does not change saved bytes. Fake Node execution covers success; actual CLI/OS proof remains separately in Plan 02/03. No live inference.

## Self-Check: PASSED

All owning artifacts and shared reference paths exist, tests pass. Product remains 0.3.2. No requirement completion claim until adversarial/host acceptance and fresh patch regression. Continue Plan 05.
