# Phase 18 — Existing patterns and implementation choices

Inspected 2026-10-04. Reuse milestone research; no inference, installation or target-host acceptance was performed during planning.

| New/changed artifact | Closest existing analog | Decision |
|---|---|---|
| `skills/el-*/SKILL.md` | `skills/assignment-review/SKILL.md` | YAML name/description and short Markdown entry; four reviews explicitly override generic generate default, two utilities stop before review |
| `skills/assignment-review/references/command-entrypoints.md` | `references/stage-prompts.md`, `references/recheck-workflow.md` | One routing table; link to existing rules, do not copy engines |
| `tests/commands/*.mjs` | `tests/baseline/source-boundary.mjs` | Node `node:test` + `node:assert/strict`, temp roots and injected/local readers; independent of Vitest startup |
| `scripts/install-review-skills.mjs` | Existing standalone `.mjs` scripts | Stdlib filesystem operations; fixed seven-name allowlist, explicit target, no shell process or course evidence reads |
| `docs/review-commands.md` | README existing Skill instructions | Installation, six concrete command examples, runtime/coverage boundary, scoped removal/update instructions |
| `command-cases.md` and Phase 18 evidence | Existing stage/template/recheck cases and Phase 17 provenance records | Actual outputs and source identities, separate human semantic review from deterministic assertions |

Existing import to reuse, not replace:
```js
import { selectBaselineSources as select, collectBaselineSources as collect } from '../../skills/assignment-review/scripts/baseline-sources.mjs';
```
`collectBaselineSources(input, readSource)` gates before the injected reader; source selection alone does not establish inspection. Documents remain untrusted task data. Do not install a new filesystem evidence reader for command routing.

## Host facts and packaging

The official [Build skills](https://learn.chatgpt.com/docs/build-skills) page was opened on 2026-10-04: Codex supports explicit `$` invocation, user/repo skill roots and symlinked Skill directories. `/skills` is documented for CLI/IDE; arbitrary native `/el-*` aliases are not established. Both user and repo discovery are supported in docs, but actual desktop acceptance must still be observed. Same-name Skills are not merged; installer collision detection and checking host duplicates matter.

Use `~/.agents/skills` as the documented user-root example, and `<project>/.agents/skills` for project-local installation. A selected root is an explicit CLI argument; do not scan every home/project root or alter Codex config. Shared sibling directory must accompany wrappers. Links are relative to the Skill location, never caller cwd. Moving the source checkout can break links: inspection must detect this and instructions must explain safe reinstall without clobbering unrelated files.

Policy stays at its default; no `agents/openai.yaml` is needed for the six simple names. Official skill-creator validation tests frontmatter, not host discovery or semantic execution.

## Acceptance and scope limits

Use synthetic task T18, requirement R18-1 and drafts current-v1/current-v2. Run finite offline structural/install tests, source gating regressions, then evaluate actual inline review outputs. Capture host selector evidence separately in an external assignment project. Do not start a second model or send messages into a course chat automatically. Human verification is needed only if direct current tools cannot supply authorized actual host invocation evidence.

Current initialization regression attempt timed out before any tests started. For the later version-only change use the affected suite and bounded supervisor from the development guide; a RUN banner or historical 795-test result is not current acceptance. Version update is mechanical and deliberately separated from command implementation.
