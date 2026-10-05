---
phase: 21-review-handoff-and-usage-acceptance
plan: "01"
subsystem: review-metrics
tags: [stdlib, private-store, cli-usage]
requires: [Phase 20 bounded runner]
provides: [allowlisted CLI turn metrics, attempt-bound private telemetry]
affects: [21-02, 21-05]
tech-stack:
  added: []
  patterns: [existing transaction and no-follow storage]
key-files:
  created: [skills/assignment-review/scripts/codex-metrics.mjs, tests/codex/metrics.mjs]
  modified: [skills/assignment-review/scripts/codex-runner.mjs, skills/assignment-review/scripts/prompt-store.mjs, tests/codex/protocol-host.mjs]
requirements-completed: [RUN-03, RUN-04]
completed: 2026-10-05
---
# Phase 21 Plan 01: Source-scoped terminal metrics

First accepted terminal yields four normalized numeric fields with missing/invalid/reported states. No raw events, reasoning, derived total or billing estimate. Requested model comes only from launch -m; effective model remains unavailable. Sidecars bind run/task/conversation/attempt/prompt/binary and survive result rejection or cancellation; dirty publication remains locked. Exact export and old schema readers remain unchanged.

## Task commits

- 21-01-01: f7cd0ee — allowlisted observer/normalization and process checks.
- 21-01-02: f1ba8d2 — private persistence/read/retention and crash/binding checks.

## Verification

- metrics + runner: 19/19, 7.769 s.
- metrics + retention + CLI: 13/13, 2.269 s (before additional binding test).
- metrics + lifecycle + actual CLI protocol: 37/38 initially; protocol assertion incorrectly required absence of unrelated cache_write_input_tokens. All metrics/lifecycle checks passed. Corrected assertion verifies the four required numeric fields individually, retaining unknown-field discard.
- Final standalone actual CLI protocol regression: 15/15, recorded after completion.
- No live inference, real account consumption, coursework transmission or release/tag.

## Deviations

Added readCodexMetrics as a scoped coherent read seam for sidecar validation. Numeric fields from the actual pinned CLI include an additional cache-write field; it is deliberately outside the approved allowlist. SDK rejects workflow._auto_chain_active; auto_advance remains false and no auto-chain key existed. This is tooling compatibility, not a phase completion gate.

## Self-check

Owned sidecars are bounded, non-symlink, identity/digest-bound. Failure/cancel, foreign attempt/hash, absent old sidecars, corrupt record, interrupted publication and scoped retention exercised. RUN-03/04 implementation covered here; final presentation/live acceptance remains pending. Ready for 21-02. Product 0.3.15.
