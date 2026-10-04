# Phase 17: Retrospective Validation and Audit Closure — Context

**Gathered:** 2026-10-04
**Status:** Execution complete — 3/3 plans and 4/4 goal criteria verified; residual manual coverage awaits milestone disposition
**Source:** User confirmed the two-phase proposal after the v1.1 tech-debt audit.

## Boundary

Close TD-12 / VAL-03; TD-13 / VAL-04; TD-14 / VAL-05; TD-15 / VAL-06. Depends on Phase 16. Follow the phase goal, three task groups and success criteria in [ROADMAP](../../ROADMAP.md). The [audit](../../v1.1-MILESTONE-AUDIT.md) is the original debt snapshot; [requirements](../../REQUIREMENTS.md) separately track new validation obligations. Original CTX/POL/SKL/TPL/DIS/REV completion and phase assignments stay intact.

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

Reconstruct Phase 12-15 task maps from their actual plans, summaries, tests and semantic reports; create the four VALIDATION.md files with honest sign-off. A remaining manual-only item can remain PARTIAL and must stay visible at re-audit. Do not turn review of those files into new independent-model proof. Re-audit the expanded milestone after execution; archive/release/synchronization remain separate.

## Planning basis and canonical references

Phase 16 now supplies official positive/negative validator evidence, fresh build and 795-test default offline acceptance plus a separate 12-test baseline. Reuse these only after source/command/host scope checks; filesystem delay root cause remains unknown. The existing research=false maintenance path is retained; no external framework, UI or database implementation is introduced. D-05 requires a draft 17-VALIDATION.md even on this no-research path.

- `.planning/phases/16-verification-tooling-and-offline-runtime-recovery/16-VERIFICATION.md`, `16-TOOLING-EVIDENCE.md`, `16-RUNTIME-EVIDENCE.md` — actual predecessor outcomes and limitations.
- `.planning/phases/12-task-baseline-and-current-artifact-scope/12-BASELINE-EVALUATION.md` — B01–B07 and reproducible 13-step block.
- `.planning/phases/13-reusable-skill-and-stage-prompts/13-STAGE-EVALUATION.md` — S01–S07 actual inline outputs.
- `.planning/phases/14-template-and-disclosure-review/14-TEMPLATE-DISCLOSURE-EVALUATION.md` — C01–C08 actual inline outputs.
- `.planning/phases/15-current-version-recheck-and-workflow-acceptance/15-WORKFLOW-EVALUATION.md` — E01–E06 connected actual outputs.
- Each phase's original PLAN.md, SUMMARY.md and VERIFICATION.md — task and requirement authorities; preserve historical contents.
- `tests/baseline/source-boundary.mjs`, `skills/assignment-review/references/*-cases.md` — existing executable synthetic collection checks.
- `docs/development-validation.md`, `DEVELOPMENT.md`, `.planning/config.json` — bounded execution, version and remote boundaries.

Re-audit publication strategy: retain `.planning/v1.1-MILESTONE-AUDIT.md` byte-for-byte as the original snapshot; write `.planning/v1.1-MILESTONE-REAUDIT.md` as the current report and point active state there. This is an implementation choice preserving D-04/D-05, not an extra scope requirement. A completed validation record can truthfully report PARTIAL automated coverage; requirement completion and Nyquist completeness are distinct.
