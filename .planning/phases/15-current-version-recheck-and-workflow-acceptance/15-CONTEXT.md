# Phase 15: Current-Version Recheck and Workflow Acceptance — Context

**Gathered:** 2026-10-03
**Source:** Confirmed milestone discussion, active requirements/roadmap and verified Phase 14 handoff; no new interview or external research claimed.
**Status:** Planning complete — ready to execute

## Phase boundary

Complete the repository Skill's current-version recheck workflow and prove the preparation → incremental update → template/restoration/disclosure handoff → recheck chain on synthetic evidence. Keep current confirmed issues actionable without repeating resolved findings or treating ordinary version changes as defects. This is Skill-level review; it does not add server orchestration, a database, document editing or submission.

<decisions>
## Inherited confirmed decisions

- **D-01:** Review the user's designated current artifact using this run's actual inspected identity/coverage. Old drafts and old findings do not silently become current evidence; unavailable current content stays unknown.
- **D-02:** Classify prior findings as still present, resolved, unverifiable or no longer applicable. Remove resolved and no-longer-applicable items from current repair actions while retaining a compact sourced history; evidence gaps remain explicit.
- **D-03:** Regression reminders require current evidence and an affected applicable requirement. Ordinary edits/hash changes alone are not defects; a real recurrence can reopen the same issue without multiplying reminders.
- **D-04:** Give bounded final conclusions separating mandatory defects, rubric gaps, optional improvements and unknowns. Local inspection/readiness, policy assessment and remote submission status remain distinct.
- **D-05:** Preserve incremental baselines and stable identities when clarification changes requirements; do not restart valid work or retire a finding merely because a user claims it is fixed or a requirement no longer matters.
- **D-06:** Continue authorized assistance with truthful policy/disclosure and original-template preservation. Stable policy findings are not repeated as new actions; real current declaration contradictions remain actionable.
- **D-07:** Preserve pre-read exclusions, current/history scope and provider permissions. Rechecking or copying a finding ledger grants no access to excluded records, old files, private chats or external transmission.
- **D-08:** Keep one Skill with portable generate/review routes. Prove the complete workflow with synthetic cases and actual observed outputs; no private coursework or paid provider call is required.
- **D-09:** Keep implementation small and local; reuse the source gate, matrix and baseline. Milestone audit/archive/release is a later explicit workflow, not implied by planning or completing the final phase; the existing remote-sync hold persists.
</decisions>

## Implementation discretion

Add one focused `references/recheck-workflow.md`, an optional compact finding ledger within task-baseline.md, and `references/recheck-cases.md` for acceptance. Keep existing requirement matrix statuses distinct from finding lifecycle states. Stable F IDs are task-scoped; a renamed section does not create a different logical defect. Retain source/version/coverage and state-change reasons, without storing all old draft bodies or building persistence tooling.

Two sequential plans: recheck/final-output rules and wiring, then actual end-to-end cases and observed fixes. Use still_present / resolved / unverifiable / no_longer_applicable as labels. Put unverifiable items into a visible verification-needed section, not the current confirmed repair list; an empty confirmed list with unknowns must not read as all-clear.

## Canonical references

- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md` — REV-01/02/03 and four Phase 15 outcomes.
- `.planning/phases/14-template-and-disclosure-review/14-VERIFICATION.md`, `.planning/phases/14-template-and-disclosure-review/14-TEMPLATE-DISCLOSURE-EVALUATION.md` — real preceding acceptance and remaining scope.
- `skills/assignment-review/SKILL.md`, `skills/assignment-review/references/stage-prompts.md` — stage/intent routes and matrix contract.
- `skills/assignment-review/references/task-baseline.md`, `skills/assignment-review/references/baseline-workflow.md`, `skills/assignment-review/references/template-disclosure.md` — identities, incremental updates, restoration/disclosure checks.
- `skills/assignment-review/scripts/baseline-sources.mjs`, `tests/baseline/source-boundary.mjs` — unchanged admission and actual read callback regression.
- `skills/assignment-review/references/stage-cases.md`, `skills/assignment-review/references/template-disclosure-cases.md` — reusable synthetic patterns and runnable collector blocks.
- `DEVELOPMENT.md`, `.planning/STATE.md`, `.planning/config.json` — version policy, history hold and no auto-advance.

## Gate resolution

Use existing confirmed no-research path: research=false, no RESEARCH.md or --research flag, so Nyquist research artifacts are not applicable. Keep actual behavioral acceptance and threat models. No UI, schema/database or new model framework; the word “review” does not imply frontend work. Inline pattern mapping/planning/checker under supplied adapter, no subagents or independent evaluation claimed.

Planning retains product 0.2.3. Future accepted feature closeout follows the patch rule once with exact version-only checks. Automatic release, push, archive, provider replay, global installation and broad private-history crawling are excluded. Existing official Skill validator lacks PyYAML; use documented narrow stdlib frontmatter/link fallback if still unavailable, without new dependencies.
