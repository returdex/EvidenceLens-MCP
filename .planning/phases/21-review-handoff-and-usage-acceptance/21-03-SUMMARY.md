---
phase: 21-review-handoff-and-usage-acceptance
plan: "03"
subsystem: review-recheck
tags: [host-assessment, evidence-binding, immutable-sidecar]
requires: [21-02]
provides: [host R/F annotation, current-action projection, verified local origin]
affects: [21-04, 21-05]
key-files:
  created: [skills/assignment-review/scripts/review-recheck.mjs, tests/codex/recheck.mjs]
  modified: [skills/assignment-review/scripts/prompt-store.mjs, skills/assignment-review/scripts/review-handoff.mjs, skills/assignment-review/references/recheck-workflow.md, tests/codex/helpers.mjs]
requirements-completed: [RUN-01, RUN-02]
completed: 2026-10-05
---
# Phase 21 Plan 03: Current-proof host assessments

Host annotations remain distinct from immutable model findings. Current evidence and requirement references are locally bound; verified admitted local origins support historical closing/reopening. External history is limited. Four finding states stay separate from requirement states and action dispositions. Closed/retired issues leave repair lists; deferred issues remain visible; unknowns become verification tasks.

## Task commits

- 21-03-01: 68892cf — assessment schema/binding, immutable sidecar, prior admission, adversarial guards.
- 21-03-02: e318b35 — current actions, full adjacent tables and workflow guidance.

## Verification

Recheck + retention + handoff: 15/15, 3.987 s. Extended recheck + handoff: 13/13, 4.262 s. Current close/reopen, foreign/denied history, absent/partial/excluded proof, deferred-vs-resolved, applicability retirement, corrupt annotation/raw-result preservation and task/name/policy differences covered. An initial renderer assertion expected literal underscore despite correct HTML escaping; corrected fixture expectation. No live inference.

## Deviations

Reusable capturedFlow gains trusted test-only transformation/scope options for current and prior bound source sets. Assessment read caps recursive explicit prior chains at ten levels; an over-limit/corrupt assessment is visibly unavailable while the valid immutable model result survives. This is bounded safety, not an automated semantic grader. Identity/digest-checked handoff retention uses the existing private-store transaction.

## Self-check

All raw findings retained. Host judgments explicitly require semantic verification. Exact-repeat annotation idempotent; different rewrite rejected. Product 0.3.15, no release/tag. Ready for 21-04; real two-run acceptance pending.
