# Phase 13: Reusable Skill and Stage Prompts — Context

**Gathered:** 2026-10-03
**Source:** Existing milestone discussion, confirmed roadmap and Phase 12 implementation handoff; no new user interview or independent research claimed.
**Status:** Execution complete — verified 2026-10-03

## Phase boundary

Wrap the implemented baseline workflow in one repository-managed Skill. Adapt the user's standard prompt to preparation, in-progress and final review; perform a requested review using admitted current evidence. Keep content corrections/restoration/disclosure implementation in Phase 14 and full recheck acceptance in Phase 15.

<decisions>
## Inherited confirmed decisions

- **D-01:** Deliver one repository Skill for preparation, progress review and final review, using the user's standard prompt and actual task context.
- **D-02:** Reuse the Phase 12 source-backed baseline and pre-read gate; preserve valid prior work and current-artifact designation instead of starting over or grading old drafts by default.
- **D-03:** A generated prompt states inputs, permitted actions, checks, evidence locations and output expectations; generating it alone grants no execution or expanded access permission. An already-authorized review should proceed without redundant approval.
- **D-04:** Preparation works without a solution or teacher guidance. MCP review requires genuine available evidence for the existing four roles; never fabricate roles to force a call.
- **D-05:** Continue authorized analysis/planning/review with separate truthful policy assessment. Reuse unchanged policy findings; retain actual restrictions and accurate centralized disclosure intent.
- **D-06:** User reading exclusions and host/tool permissions remain enforced before processing; partial exclusion without a safe extractor skips the whole document group. Generated prompts must retain this boundary and its coverage limits.
- **D-07:** A requested review returns a requirements-to-evidence matrix, explicit coverage limits and prioritized minimal actions grounded in current inspected material.
- **D-08:** Keep the initial delivery local and small: repository Skill and references; automatic Codex invocation, global installation, provider comparisons, document editing, signing and submission are outside this phase.
</decisions>

## Implementation discretion

- Canonical stage labels: preparation, in_progress, final; intent labels: generate, review. They are Markdown instructions, not a new JSON API or CLI.
- Prefer two new product files: SKILL.md and references/stage-prompts.md. Add one synthetic scenario reference for stage behavior; reuse baseline cases.
- Default an ambiguous request to prompt generation with stated stage assumption; use one focused question only when ambiguity blocks a requested review. Explicit user stage wins over inferred lifecycle; final without a readable artifact stays a bounded final-review preparation with unknown results.
- Use direct path loading for repository use. Do not claim automatic discovery/global installation was tested merely because SKILL.md exists.

## Canonical references

- `.planning/REQUIREMENTS.md` — SKL-01, SKL-02, SKL-03.
- `.planning/ROADMAP.md` — Phase 13 goal and Phase 14/15 scope.
- `.planning/phases/12-task-baseline-and-current-artifact-scope/12-BASELINE-EVALUATION.md` — real handoff and evaluation limits.
- `skills/assignment-review/references/baseline-workflow.md` — selection before reads and baseline updates.
- `skills/assignment-review/references/task-baseline.md` — shared baseline fields and stable identities.
- `skills/assignment-review/scripts/baseline-sources.mjs` — existing selector/collector, no replacement needed.
- `src/review/roles.ts`, `docs/mcp-contract.md` — real MCP admission and read-only boundary.

## Gate resolution

Existing milestone instructions already defer new ecosystem research. This phase adds Markdown behavior, not a model framework, provider integration, frontend or database. UI/AI-framework/schema gates do not apply; no-research Nyquist exemption applies. Plan/check work is inline under the supplied skill adapter, not delegated. Keep security threat models and behavioral trials.

## Local environment note

The installed skill-creator quick_validate.py imports PyYAML, which is absent from both default Python and the bundled runtime on this host. Execution should try an already-available validator/runtime if one exists; otherwise use a documented stdlib check of the deliberately narrow two-field frontmatter and local links, plus actual semantic trials. Do not install dependencies or claim the official validator ran successfully. Planning adds no runtime code, product version change or global installation.
