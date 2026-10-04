# Phase 17 — Existing patterns and planning choices

Read-only inspection for planning, 2026-10-04. No external ecosystem research, runtime acceptance run or independent agent review. Existing research=false path retained; explicit D-05 supplies this phase's validation draft.

## Artifact analogs

| Planned file | Closest existing analog | Reuse / distinction |
|---|---|---|
| Phase 12–15 `NN-VALIDATION.md` | [16-VALIDATION.md](../16-verification-tooling-and-offline-runtime-recovery/16-VALIDATION.md) | Task IDs, source-bound commands, threats, limits and sign-off; do not copy its compliant=true into manual language coverage |
| 17-RETROSPECTIVE-EVIDENCE.md | [16-RUNTIME-EVIDENCE.md](../16-verification-tooling-and-offline-runtime-recovery/16-RUNTIME-EVIDENCE.md) | Durable actual outputs, commands, source identity and retained failures; avoid another general runner |
| v1.1-MILESTONE-REAUDIT.md | [Original audit](../../v1.1-MILESTONE-AUDIT.md) | Three-source requirement matrix, I1–I6/F1–F6, debt/status/publication sections; expand original 16 rows to 22, preserve original file |
| 17-VALIDATION.md | [16-VALIDATION.md](../16-verification-tooling-and-offline-runtime-recovery/16-VALIDATION.md) | Six new task rows planned pending; complete from outcomes, with manual audit coverage explicit |
| Active tracking | [STATE](../../STATE.md), [ROADMAP](../../ROADMAP.md), [REQUIREMENTS](../../REQUIREMENTS.md), [PROJECT](../../PROJECT.md) | Reconcile frontmatter/body/counts, retain version 0.2.4 and historical remote hold |

## Executable existing patterns

Actual helper import from tests/baseline/source-boundary.mjs:

```js
import { selectBaselineSources as select, collectBaselineSources as collect } from '../../skills/assignment-review/scripts/baseline-sources.mjs';
```

Baseline historical reproduction uses real callbacks and assertions:

```js
assert.deepEqual(calls, result.selection.reads.map(r => r.id));
assert.deepEqual(result.unavailable.map(r => r.id), trial.unreadable);
assert.notEqual(current('B03-current').contentHash, current('B03-changed').contentHash);
```

Reuse the complete inspected shell blocks, not copied expected PASS labels:

| Source | Observed documented shape | Intended scope |
|---|---|---|
| Phase 12 12-BASELINE-EVALUATION.md | array of 13 collected records / seven cases | Reads, denial and same-ID changed hash |
| skills/assignment-review/references/stage-cases.md | observedAt / outputs, nine steps | Stage-specific admission |
| skills/assignment-review/references/template-disclosure-cases.md | collectedAt / steps, 17 steps; sourceStringsUnchanged | Original/current/process access, input immutability |
| skills/assignment-review/references/recheck-cases.md | observedAt / outputs, 18 steps | Per-round identities, current failure and portable-review identity |

Extraction recipe for execution: read the exact repository Markdown source; match a fenced `sh` block using a line-anchored pattern; require exactly one block in each listed file; inspect the complete block; write it to an external temporary `.sh` file; run `sh TEMP_FILE` from repository root under the bounded supervisor. Nested JavaScript regular-expression strings containing triple backticks are not fence boundaries. Keep command and block hash with outcomes. No block is executed during planning.

## Task and requirement inventory

- Phase 12: four tasks (12-01-01/02, 12-02-01/02), five IDs CTX-01/02/03, POL-01/02, B01–B07.
- Phase 13: four tasks (13-01-01/02, 13-02-01/02), SKL-01/02/03, S01–S07.
- Phase 14: five tasks (14-01-01/02/03, 14-02-01/02), TPL-01/02/03, DIS-01/02, C01–C08. Plan 01's empty completion claim is intentional.
- Phase 15: four tasks (15-01-01/02, 15-02-01/02), REV-01/02/03, E01–E06 plus variants.
- Total: 17 original tasks / 16 original requirements; original requirement completion is preserved, four new VAL obligations concern honest retrospective records.

## Pitfalls and closure ordering

Official Skill validation is metadata/structure, collector success is read/hash behavior, and semantic output review is manual. All require distinct provenance. Phase 16 can be reused for unchanged source; temporary environment paths are evidence of that run, not permanent installed prerequisites.

SDK discovery includes retained historical phases: filter active scope explicitly to 12–17. Generic gap-analysis has previously returned no rows despite real requirements; use exact frontmatter IDs and all six decision IDs as the real coverage gate. SDK status mutations can leave stale prose/counts; inspect complete report bodies after use.

Re-audit first remains provisional for Phase 17 verification; after the Plan 03 summary and phase verifier exist, reconcile the current report and tracking in the closure commit. Retain partial automated coverage and inherited debt independently from completed record obligations. Do not archive or publish from this phase.
