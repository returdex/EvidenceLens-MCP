# Phase 13 Pattern Map

Inspected 2026-10-03; inline, no external research or subagent.

| Planned artifact | Existing analog | Reuse |
|---|---|---|
| skills/assignment-review/SKILL.md | Local skill-creator/SKILL.md anatomy; existing baseline-workflow.md | Small name/description frontmatter, relative links, progressive loading; no existing repository entrypoint to duplicate |
| skills/assignment-review/references/stage-prompts.md | task-baseline.md eight sections; baseline-workflow.md source-first order | Reuse S/R/P IDs, current scope and actual inspected status; add stage-specific prompt contract, not a second baseline schema |
| skills/assignment-review/references/stage-cases.md | baseline-cases.md | Synthetic requests/inputs/invariants, expected versus observed separate; point to B01–B07 rather than duplicate their whole inputs |
| .planning/phases/13-reusable-skill-and-stage-prompts/13-STAGE-EVALUATION.md | 12-BASELINE-EVALUATION.md | Actual prompts/review matrices and command results; distinguish inline trials from independent evaluation |

## Actual integration

- selectBaselineSources(input) returns reads/skipped/currentArtifact; collectBaselineSources(input, readSource) returns selection/items/unavailable. Both already exist. The Skill loads baseline-workflow.md before evidence processing; no new helper, API or provider call is required.
- src/review/roles.ts requires assignment_brief, rubric, solution, teacher_instructions exactly once each. Baseline kind=teacher_guidance is not itself a valid MCP role; mapping must use genuine evidence and the actual request schema. Missing/duplicate/unreadable/placeholder roles do not become a valid review by relabeling sources.
- Generated prompts preserve human authorization and distinguish embedded document text from user instructions. A portable prompt includes the relevant shared boundaries; a relative link by itself is insufficient when the prompt is copied elsewhere.
- Existing node:test suite provides the only needed automated code regression. New Markdown behavior needs concrete trial outputs, not a new regex test framework or prompt compiler.
- Read the applicable stage only; baseline-cases and stage-cases are evaluation references, not always-loaded user material.

## Minimal validation

No new project dependency. quick_validate.py is optional only because its current PyYAML runtime dependency is unavailable; check that limitation explicitly. Use name: assignment-review and a JSON-quoted description scalar in the two-field YAML frontmatter so a short Python stdlib check can verify the exact supported shape, meaningful text and resolved local links without pretending to parse arbitrary YAML. Also execute realistic generate/review requests; static validation cannot establish semantic correctness.
