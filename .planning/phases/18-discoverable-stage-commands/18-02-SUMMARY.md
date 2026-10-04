---
phase: 18-discoverable-stage-commands
plan: "02"
subsystem: installation
tags: [skills, symlinks, node]
requires: [{phase: 18-01, provides: Six entries and shared dependency}]
provides: [Conservative seven-link installer, Installation and command guide]
affects: [18-03]
tech-stack:
  added: []
  patterns: [Preflight all destinations before mutation, Roll back only owned matching links]
key-files:
  created: [scripts/install-review-skills.mjs, tests/commands/install-review-skills.mjs, docs/review-commands.md]
  modified: [README.md]
requirements-addressed: [CMD-01, CMD-03, CMD-05]
requirements-completed: []
duration: 4min
completed: 2026-10-04
---
# Phase 18 Plan 02 — Safe local command installation

Explicit-target dry-run/apply installer with seven-name allowlist, collision refusal, symlink-parent rejection and identity-checked limited rollback. All evidence reads remain in the existing shared Skill.

## Task commits

- 18-02-01: `dfa567e` — actual filesystem installer and six behavioral tests.
- 18-02-02: `3664127` — Chinese install/help guide and README entry.

## Verification

`node --test tests/commands/install-review-skills.mjs tests/commands/skill-contract.mjs`: 8/8, 0 failures/skips. Initial bounded run UTC 2026-10-04T11:13:30.928733Z, elapsed 0.396s, cap 60s, exit 0. After docs, reordered same files at 11:15:30.223780Z: 8/8, elapsed 0.400s, exit 0. No remaining owned process group.

Actual temp filesystem checks: dry-run makes no directories; apply creates exactly seven links; repeat unchanged; file/directory/unrelated/dangling collisions preserve inode and content and prevent earlier creates; missing source prevents writes; spaces/Unicode and external cwd shared imports succeed; redirected parents rejected; synthetic third-link EACCES rolls back first two owned links while unrelated content remains; malformed CLI arguments fail.

Guide has six actions/materials/output/examples, user and project install paths, source-checkout lifetime, precise conflict/removal instructions and support matrix. Utilities do not launch checks. `git diff --cached --check` passed for both task commits. No actual host discovery claimed.

## Deviations / limits

Added explicit rollback statuses for changed or unverifiable entries, so a failure cannot masquerade as complete cleanup. No dependency/runtime engine added. No transaction guarantee against hostile concurrent filesystem replacement. No cross-project invocation yet. CMD requirements remain pending final semantic/host acceptance.

## Self-Check: PASSED

Four planned files exist, both task commits pushed and all scoped checks pass. Ready for Plan 03 synthetic and host acceptance. Product version remains 0.3.0.
