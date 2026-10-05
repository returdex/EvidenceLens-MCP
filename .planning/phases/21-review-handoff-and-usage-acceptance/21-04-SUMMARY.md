---
phase: 21-review-handoff-and-usage-acceptance
plan: "04"
subsystem: installed-review-records
tags: [stdlib, installed-helper, no-dispatch]
requires: [21-03]
provides: [show/full/annotate CLI, four-stage complete handoff wiring]
affects: [21-05]
key-files:
  created: [skills/assignment-review/scripts/review-records.mjs, tests/codex/records-cli.mjs]
  modified: [skills/assignment-review/references/command-entrypoints.md, skills/assignment-review/references/codex-execution.md, skills/assignment-review/references/prompt-records.md, skills/el-help/SKILL.md, docs/review-commands.md, tests/commands/skill-contract.mjs]
requirements-completed: [RUN-01, RUN-02, RUN-03, RUN-04, RUN-05]
completed: 2026-10-05
---
# Phase 21 Plan 04: Installed complete-record inspection

show defaults to a complete structured/escaped report; full returns complete bound JSON; annotate validates and records immutable host judgments. Exact selector/task and CODEX_THREAD_ID identity enforced. No flags for paths, models, providers or endpoints. Input/output bounded. Six Skill commands retained and shared four-stage handoff wired with explicit runtime/quality/usage/retention distinctions.

## Task commits and verification

- 21-04-01: 825d09d — installed local CLI and symlink/copy external-cwd checks.
- 21-04-02: 8677974 — complete route/documentation and content contracts.
- Initial installed/retention/prompt CLI batch: 22/22, 4.429 s including imported recheck tests.
- Strengthened direct no-subprocess sentinel batch after moving shared fixture into helpers: 15/15, 1.869 s.
- Command/routing/source boundary batch: 27/27, 4.167 s before fixture extraction.

## Deviations

Copied installation and runtime spawn/exec/fork rejection sentinel are exercised directly by records-cli tests rather than duplicating installer tests. Shared assessmentFlow moved into existing helpers to avoid importing another test suite. Historical host discovery evidence is unchanged; helper execution alone is not host Skill invocation proof. Live two-run/host semantic acceptance still pending; requirements-completed lists plan coverage, not final requirement closure.

## Self-check

No inference in inspection/help/export/annotation, no assignment reread or secret handling. Exact snapshot/export retained. New sidecars remain private. Product 0.3.15; ready for Plan 05. No Release/tag.
