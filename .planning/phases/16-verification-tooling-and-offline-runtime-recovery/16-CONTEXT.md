# Phase 16: Verification Tooling and Offline Runtime Recovery — Context

**Gathered:** 2026-10-04
**Status:** Executed and verified — 2/2 plans complete
**Source:** User confirmed the two-phase proposal after the v1.1 tech-debt audit.

## Boundary

Close TD-V / VAL-01; TD-B / VAL-02. Depends on Phase 15. Follow the phase goal, three task groups and success criteria in [ROADMAP](../../ROADMAP.md). The [audit](../../v1.1-MILESTONE-AUDIT.md) is the original debt snapshot; [requirements](../../REQUIREMENTS.md) separately track new validation obligations. Original CTX/POL/SKL/TPL/DIS/REV completion and phase assignments stay intact.

<decisions>
## Confirmed decisions

- **D-01:** Scope is the six named v1.1 verification debts only. No automatic Codex integration, publication, private coursework collection or reopening of accepted v1.0 debt.
- **D-02:** Prefer existing tools/tests and minimal isolated environment repair. Dependency installation or changes must address a diagnosed need; avoid production dependencies just to run a development validator. Exact environment strategy belongs to detailed planning.
- **D-03:** Separate successful automated checks, inline/manual language judgments, skipped checks and unresolved host limits. No fake classifier or document-heading test can establish semantic correctness. Do not mark Nyquist compliant just by creating a file.
- **D-04:** Preserve prior evidence and test failures; record fresh commands, source identity, outcomes and bounded runtime. Diagnose stalled reads before restarting expensive commands; no paid proof replay, live-provider call, remote CI or remote mutation.
- **D-05:** Plan each new phase's own validation artifact alongside its work. Reconcile status frontmatter and report bodies; original audit debt stays open until actual closure evidence exists.
- **D-06:** Planning keeps version 0.2.4. An actual later feature/fix follows DEVELOPMENT.md only when justified; documentation-only cleanup is not an automatic product-version bump. Existing remote-history hold and no auto-advance persist.

</decisions>

## Handoff

Official validator/control, fresh build, 795-test full offline suite and separate 12-test baseline have passed. See 16-VALIDATION.md and 16-RUNTIME-EVIDENCE.md for actual outcomes, failed attempts and host limits. Phase 17 can now plan its four retrospective records and re-audit; no automatic execution. Product version remains 0.2.4.

## Planning gate resolution

Use the established research=false path and current local source/config evidence; no external framework research, UI or database gate applies. Per confirmed D-05, create a draft 16-VALIDATION.md even though the generic no-research branch would otherwise skip it. Draft/pending is not a pass. Mapping, planning and checking run inline under the supplied adapter; no independent checker claim.

## Canonical references

- .planning/REQUIREMENTS.md — VAL-01/02 and original completed functionality.
- .planning/v1.1-MILESTONE-AUDIT.md — TD-V/TD-B and immutable baseline of remaining debt.
- .planning/phases/15-current-version-recheck-and-workflow-acceptance/15-VERIFICATION.md and 15-02-SUMMARY.md — actual preceding acceptance and limits.
- DEVELOPMENT.md, package.json, package-lock.json, tsconfig.json, .gitignore — version, locked dependencies, exact build/offline test entrypoints and ignored outputs.
- skills/assignment-review/SKILL.md — actual official-validator target.
- tests/scripts/automatic-live-review-cli.test.ts and tests/providers/deepseek-live.test.ts — offline adversarial CLI tests versus excluded live test.
- /Users/yifeng/.codex/skills/.system/skill-creator/scripts/quick_validate.py — actual official validator to inspect/hash and execute unchanged.
