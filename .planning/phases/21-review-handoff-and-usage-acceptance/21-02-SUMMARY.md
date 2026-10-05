---
phase: 21-review-handoff-and-usage-acceptance
plan: "02"
subsystem: review-handoff
tags: [full-report, coherent-read]
requires: [21-01]
provides: [scoped immutable trusted bundles, complete finding handoff]
affects: [21-03, 21-04]
key-files:
  created: [skills/assignment-review/scripts/review-handoff.mjs, tests/codex/handoff.mjs]
  modified: [skills/assignment-review/scripts/prompt-store.mjs]
requirements-completed: [RUN-01, RUN-03, RUN-04]
completed: 2026-10-05
---
# Phase 21 Plan 02: Complete source-bound handoffs

Latest and explicit historical selectors preserve identity and rebind results to captured evidence. Immutable store-produced bundles prevent caller JSON substitution. Full output preserves every finding, evidence, severity, action and limitation; summaries are optional and count omissions with same-run retrieval metadata. Rendering neutralizes untrusted Markdown/control text. Grade and remote submission remain unassessed/unverified.

## Task commits and verification

Both tightly coupled tasks: 0bc5fd8. Handoff + result + store: 30/30, 2.508 s. Tests cover latest failure, history, foreign tasks, rewritten quote/digests, concurrent begin/delete, 0/1/100 findings, info, Unicode, active Markdown and absent old metadata.

## Deviations

Trust marker and transitive freeze prevent bare caller JSON from entering the renderer. Private DeepSeek receipts use the existing host-provider contract and source binder, preserving the selected default provider composition. First long-Unicode test exceeded the existing 8192-byte claim contract and correctly failed result validation; the fixture was reduced within the contract to test rendering. Metrics observedAt additionally binds to execution.finishedAt.

## Self-check

No model/source dispatch, no schema migration, no grade claim. Complete report IDs match validated model IDs. Read/execution boundaries remain unchanged. Product 0.3.15; ready for 21-03. Final live/installed-host acceptance pending.
