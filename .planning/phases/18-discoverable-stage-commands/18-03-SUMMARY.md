---
phase: 18-discoverable-stage-commands
plan: "03"
subsystem: acceptance
tags: [skills, host, synthetic]
requires: [{phase: 18-02, provides: Conservative local installation}]
provides: [Ten semantic cases, Six actual cross-project command invocations, Corrected help acceptance]
affects: [18-04, 19]
tech-stack:
  added: []
  patterns: [Separate host catalog discovery from GUI observation]
key-files:
  created: [skills/assignment-review/references/command-cases.md, .planning/phases/18-discoverable-stage-commands/18-COMMAND-EVALUATION.md, .planning/phases/18-discoverable-stage-commands/18-HOST-EVIDENCE.md, .planning/phases/18-discoverable-stage-commands/18-HOST-RECEIPTS.json, .planning/phases/18-discoverable-stage-commands/18-HELP-RETEST.json]
  modified: [docs/review-commands.md, skills/assignment-review/references/command-entrypoints.md]
requirements-completed: [CMD-01, CMD-02, CMD-03, CMD-04, CMD-05]
completed: 2026-10-05
---
# Plan 18-03 — Installed commands accepted in another project

## Task commits and outcomes

- 18-03-01: ac95f69 — ten manually judged semantic cases and eleven actual map-reader collection steps; no automatic semantic evaluator claim.
- 18-03-02: a75a6a5 — seven user-root links created and repeat inspection unchanged. No config edits or collisions.
- Rule-1 repair: 531ffb3 — report post-create identity-read failure truthfully; real fault injection plus combined 21/21 checks.
- 18-03-03: six authorized synthetic host turns in FIT5032. Exact results/commands in 18-HOST-RECEIPTS.json. Help omission repaired in 6f16da4; explicit continuation authorized one corrected help retest, passed in 18-HELP-RETEST.json. Acceptance documentation follows in this summary commit.

## Verification

Actual host catalog contains six names, followed by actual commands in another project. Preparation works without draft; check/final find synthetic missing reason with fixed stages; current-v2 recheck resolves F18-1 and retires A18-1; prompt returns unavailable without regeneration. Corrected help contains all examples. Recorded tool commands only read installed Skill resources. No actual course file/history, provider request, edit or submission. Wrapper hashes are in the installation table; shared-rule revision and exact help output are retained.

Current 0.3.0 build and 118 affected tests passed after dependency materialization; Node 21/21 also passed. These are pre-patch results, not acceptance of Plan 04's future version. See 18-RUNTIME-EVIDENCE.md.

## Deviations / limits

Native UI tool disallows Codex control. Human-authorized dedicated chat and actual host catalog/invocation provide discovery evidence; selector GUI remains unobserved. Exact app build, slash aliases and other hosts remain unverified. Help omission and installer status defects were repaired within phase scope. Semantic judgments are manual and bounded, not universal host isolation. No paid proof replay or historical artifact changes.

## Self-Check: PASSED

All three tasks have actual evidence. Plan 04 may now increment the single feature patch from 0.3.0 to 0.3.1 and verify it freshly. No milestone release/tag created.
