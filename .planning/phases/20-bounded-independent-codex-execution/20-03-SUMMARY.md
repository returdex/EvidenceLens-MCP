---
phase: 20-bounded-independent-codex-execution
plan: "03"
subsystem: assignment-review
tags: [lifecycle, cancellation, codex]
requires: [20-02]
provides: [Codex lifecycle v2, Atomic execution ownership, Bounded process supervisor]
affects: [20-04, 20-05]
requirements-completed: []
completed: 2026-10-05
---
# Plan 03 — Lifecycle and supervision

Two tasks implemented inline. Existing snapshot/v1 host lifecycle unchanged; explicit codex_exec creates v2. Atomic attemptId ownership before preflight prevents competing runners from changing each other's outcomes. Public host dispatch/finish cannot forge independent success. Strict execution/result/scratch sidecars remain within the same task store and lock. Busy/running/uncertain cleanup prevents deletion; partial publication remains unavailable.

Supervisor sends exact stored stdin, enforces bounded UTF-8 JSONL/total output, deadline/cancellation, process-group TERM/KILL and confirms group disappearance. One thread/turn/final/terminal sequence only; reasoning discarded, raw streams never persisted. Unknown diagnostics reject; the precise pre-turn global-AGENTS read denial and tested cache/skills initialization denials are allowed as expected OS exclusion evidence. Tools-router stderr and JSONL tool items reject. Until Plan 04 binds final source evidence, production candidate output cannot publish succeeded.

Tests include actual Node processes, malformed/duplicate/missing/nonzero terminal cases, split stderr, timeouts, cancellation, stubborn group descendants, unchanged legacy behavior, ownership conflicts, dirty publication and actual pinned CLI fixture against the production supervisor. Combined runner/prompt suites: 47/47 passed before the added cancellation-commit case; lifecycle suite with that case: 15/15 passed. Task commits accompany this summary; no live inference, release, credential read/copy or phase-wide requirement completion.

Deviation: task receipt adds private attemptId to implement cross-process ownership safely; no raw PID authority. A known denied global-AGENTS startup error is admitted only before turn and with the exact expected path/text, to distinguish proven context exclusion from a failed review event. Unknown errors remain rejected. Fixed one synthetic child-script escaped-newline bug.

## Self-Check: PASSED

Artifacts and tests exist; installed runner is bounded and cannot return production success yet. Continue Plan 04. Product 0.3.2.
