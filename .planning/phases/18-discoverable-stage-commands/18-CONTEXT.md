# Phase 18: Discoverable Stage Commands — Context

**Date:** 2026-10-04
**Status:** Ready for execution after plan checks; implementation not started.
**Provenance:** Reconstructed from the user's approved v1.2 discussion, requirements/roadmap and direct `$gsd-plan-phase 18` request. No separate discuss-phase interview is claimed.

<domain>
Deliver CMD-01–CMD-05: six discoverable command Skills with shared existing review behavior, installation, help and actual cross-project acceptance. Source: `.planning/ROADMAP.md` Phase 18. Product development version is 0.3.0 at planning time.
</domain>

<decisions>
## Confirmed scope and behavior

- **D-01:** Provide `$el-help`, `$el-prepare`, `$el-check`, `$el-final`, `$el-recheck`, `$el-prompt`; install/discover them in the target Codex host and another assignment project. No promise of arbitrary native `/el-*` aliases.
- **D-02:** Stage commands perform requested review immediately within existing authorization. Current artifact, scope and focus win; no repeated stage guessing or substitution of an old draft. Preparation remains useful without a solution; final remains final without a readable draft.
- **D-03:** Reuse the existing assignment-review baseline, source gating, template/disclosure and finding/action lifecycle. Do not duplicate six review engines, fabricate requirements/disclosure, or automatically edit, sign or submit assignments.
- **D-04:** Help and prompt export do not run reviews. `$el-prompt` means the latest actually captured task-facing prompt for the same task/conversation, never regeneration or cross-chat retrieval. Phase 18 exposes the entry with honest unavailability; capture/export is Phase 19, independent Codex execution Phase 20, result/usage integration Phase 21.
- **D-05:** Installation and static validation are separate from actual target-host discovery/invocation and from semantic review. Preserve truthful missing-material and host-coverage reports; use synthetic examples without disturbing coursework or importing private chat history.
- **D-06:** Preserve prior phase/audit/proof evidence and source annotations. Planning changes only planning documents; implementation follows DEVELOPMENT.md version/synchronization rules. Do not rerun paid proof or claim current tests from old counts.

### the agent's Discretion

- Use six small SKILL.md wrappers and one shared `command-entrypoints.md` reference. No new runtime dispatcher, provider, dependency or prompt store in this phase. Preserve default Skill invocation policy; the user requested explicit commands but did not request disabling implicit selection. Descriptions distinguish each capability; do not add optional UI metadata without a need.
- `$el-recheck` is review with the existing finding lifecycle: honor explicit preparation/in_progress/final; else reuse a valid same-task review stage; absent one, state `in_progress` as the fixed default. This is a recheck action, not a new evidence stage. Explicit current artifact is always preserved.
- Install seven sibling directory symlinks (six entry Skills plus assignment-review) from a local checkout into an explicit target root. Default action is inspection/dry-run; mutation requires `--apply`. No overwrites, global config edits or package publishing.
- Four sequential plans: command contract, safe installation/help docs, acceptance, mechanical version synchronization. The real-host checkpoint follows all automatic preparation; do not require a new chat or message another chat without user authorization.
</decisions>

<canonical_refs>
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/research/FEATURES.md`, `.planning/research/STACK.md` — approved scope and completed research.
- `skills/assignment-review/SKILL.md`, `references/baseline-workflow.md`, `references/task-baseline.md`, `references/stage-prompts.md`, `references/template-disclosure.md`, `references/recheck-workflow.md` under that Skill — shared behavior authority.
- `skills/assignment-review/scripts/baseline-sources.mjs`, `tests/baseline/source-boundary.mjs` — actual source gating and injected-reader tests.
- `.planning/phases/17-retrospective-validation-and-audit-closure/17-VERIFICATION.md`, `17-VALIDATION.md` — predecessor outcomes and retained semantic limits.
- `.planning/v1.2-INITIALIZATION.md`, `docs/development-validation.md`, `DEVELOPMENT.md` — unresolved current startup timeout, bounded validation and version policy.
</canonical_refs>

## Gate decisions

Existing approved discussion supplies context; existing milestone research plus narrow official skill-document refresh supplies discovery facts. `workflow.research=false` remains unchanged; no redundant phase research agent. Planning/checking is inline under the Skill adapter. No frontend, database schema or new AI execution system is implemented here, so UI-SPEC, schema-push and AI-SPEC gates are not applicable. Draft VALIDATION.md is retained voluntarily; it is not proof of Nyquist completion.
