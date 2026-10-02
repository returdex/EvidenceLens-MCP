# Phase 14 Pattern Map

Inspected 2026-10-03 inline; existing local patterns only.

| Planned path | Closest existing analog | Reuse and wiring |
|---|---|---|
| skills/assignment-review/references/template-disclosure.md | stage-prompts.md review matrix and baseline-workflow.md source-first checks | One focused reference; classification plus existing evidence status, source/current locations, minimal handoff |
| skills/assignment-review/references/task-baseline.md | Existing sections 2/3/5 for source identity, text hash and policy | Small optional template/disclosure rows, stable S/R/P IDs; no second baseline schema |
| skills/assignment-review/SKILL.md and references/stage-prompts.md | Existing progressive loading and six-section portable prompt | Load detailed check when relevant; copy necessary rules/evidence into generated prompts; preserve generate versus review |
| skills/assignment-review/references/baseline-workflow.md | Existing Phase 14 handoff paragraph | Replace stale deferral with real reference, retain all gate/helper contracts |
| skills/assignment-review/references/template-disclosure-cases.md | stage-cases.md synthetic source map and runnable shell block | Real helper traces, specific user requests, expected invariants; cases optional, never user evidence |
| .planning/phases/14-template-and-disclosure-review/14-TEMPLATE-DISCLOSURE-EVALUATION.md | 13-STAGE-EVALUATION.md | Full observed outputs rather than a prefilled pass table; separate semantic observations from automated assertions |

## Concrete existing contracts

- task-baseline.md: `hashKind: admitted_utf8_text_sha256`, `contentHash`, `inspectedParts`, `coverage`. Reuse for original-template identity; a text hash is not original-file bytes or visual layout proof.
- baseline-workflow.md: `kind: requirements|rubric|teacher_guidance|template|solution|support|history`. Original uses template, designated current uses solution, historical work log uses history and requires process mode; do not relabel a history file as support to bypass scope.
- `collectBaselineSources(metadata, readSource)` yields selection/items/unavailable. Reuse callback assertions to prove excluded originals/logs/aliases and old drafts were not read. No helper change is needed.
- stage-prompts.md: `satisfied / gap / conflict / unknown / not_applicable`. Classification of a difference or residue is a separate column; missing comparison evidence is unknown, not a proven missing field.
- SKILL.md: generate-only stays generate; explicitly requested review runs within existing permission. Integrate the new reference into both routes.

## Validation boundary

Reuse `node --test tests/baseline/source-boundary.mjs`, local relative-link checks and the two-field stdlib frontmatter validator. The semantic proof is actual template/disclosure matrices and portable prompts on synthetic snippets. No new parser, runtime, rendering claim or independent-model evaluation. Metadata/version checks do not validate language behavior.
