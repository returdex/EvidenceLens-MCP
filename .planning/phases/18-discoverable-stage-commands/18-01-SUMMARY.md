---
phase: 18-discoverable-stage-commands
plan: "01"
subsystem: skills
tags: [commands, evidence, packaging]
requires: []
provides: [Six command manifests, Shared fixed-stage routing, Structural command tests]
affects: [18-02, 18-03, 19]
tech-stack:
  added: []
  patterns: [Thin Skill wrappers over shared references]
key-files:
  created: [skills/el-help/SKILL.md, skills/el-prepare/SKILL.md, skills/el-check/SKILL.md, skills/el-final/SKILL.md, skills/el-recheck/SKILL.md, skills/el-prompt/SKILL.md, skills/assignment-review/references/command-entrypoints.md, tests/commands/skill-contract.mjs]
  modified: [skills/assignment-review/SKILL.md]
requirements-addressed: [CMD-01, CMD-02, CMD-03, CMD-04, CMD-05]
requirements-completed: []
duration: 4min
completed: 2026-10-04
---
# Phase 18 Plan 01 — Six commands and shared routing

Six named Skills select a fixed review action or a utility path. Existing baseline/stage/template/recheck rules remain the single authority. Standalone assignment-review still defaults to generation when intent is unclear. Help resources ship inside the shared Skill; prompt honestly reports unavailable.

## Task commits

- 18-01-01: `3ddf4fd` — shared route/help contract, assignment-review link.
- 18-01-02: `403a46c` — six wrappers and real packaging graph tests.

Both commits pushed. No real-host installation, provider call or private assignment read in this plan. Product 0.3.0 unchanged until accepted feature closure.

## Verification

Bounded `node --test tests/commands/skill-contract.mjs tests/baseline/source-boundary.mjs`: 14/14, zero failures/skips; UTC 2026-10-04T11:11:32.978696Z, cap 60s, elapsed 0.508s, exit 0, no remaining owned group. Includes six identities, distinct descriptions, actual linked-reference reads through temporary installation, missing shared dependency, and existing 12 source-boundary checks.

Unchanged official quick_validate.py ran with isolated Python / PyYAML 6.0.3; 30s per-process ceiling. Seven real targets passed; missing-description control failed as intended. This establishes metadata only. Script SHA-256: `ee6dba90f44d37171c5a6edb8095979c54919ff6822c1a907afca2e78c48738c`.

| Target | Exit | Elapsed s | Actual output | SKILL SHA-256 |
|---|---|---|---|---|
| skills/el-check | 0 | 0.038 | Skill is valid! | 7050014a28d2656004e1db7a6d9d5f5c40b38d7d96c3ffa064a9c1e8b449c9f7 |
| skills/el-final | 0 | 0.022 | Skill is valid! | 46fcccbdba1690ea6cdf616fca9af2fddde462c1511cd8cf063247d692def557 |
| skills/el-help | 0 | 0.022 | Skill is valid! | 3b5aa2c29dba8bce4daf96a32146754cc11bb755ba52915c70e1be8382f65658 |
| skills/el-prepare | 0 | 0.023 | Skill is valid! | 893ab7572886e2b24eb175a2954d04439394113b9acbc982c76e620ee156bc78 |
| skills/el-prompt | 0 | 0.022 | Skill is valid! | 03065042cc951bc4d50e37a40cd701d91d2167d4de19fb356918240350405797 |
| skills/el-recheck | 0 | 0.022 | Skill is valid! | 0903c359807621a9bf803e358bf28cfa25f102abc7b92ebaa9042a6a0b30a2b5 |
| skills/assignment-review | 0 | 0.022 | Skill is valid! | ec77462b83ab92dd062a64ff4df83f2ba55fba02e01fa114b59431a4cbc4236b |
| negative-control | 1 | 0.022 | Missing 'description' in frontmatter | 3a71358b3e807cb223a6204587bb81dadb95f9867fc99a658d57700eba0f648e |

`git diff --cached --check` passed on each task. Shared reference manually checked for six routes, current-artifact priority, preparation/final missing-material handling, no-capture utility, shared source filtering and no automatic document edits. Language semantics and real host invocation await Plan 03; these structural checks do not prove them.

## Deviations / workflow notes

The installed SDK rejects `workflow._auto_chain_active` as unknown; actual config has auto_advance=false and no active chain, so no automatic transition is enabled. Execution is sequential inline under the Skill adapter. Requirements are addressed here but not marked completed before Plan 03 acceptance; copying all plan IDs into a completed field would overclaim.

## Self-Check: PASSED

All nine planned files exist; both task commits and successful checks are recorded. Ready for Plan 02. No independent semantic evaluator claim.
