# Phase 16 pattern map

Inspected locally 2026-10-04. Existing research=false path retained; no ecosystem research or framework integration needed. Planning does not execute build/install/test recovery.

| Deliverable | Existing analog / concrete evidence | Reuse |
|---|---|---|
| docs/development-validation.md | DEVELOPMENT.md policy; package.json scripts | Small local runbook with exact successful commands, prerequisites and limitations |
| tooling/skill-validation-requirements.txt | Official external quick_validate.py imports yaml; local Python import probe returns unavailable | Only exact PyYAML version actually used, developer tooling isolated from npm/runtime dependencies |
| 16-TOOLING-EVIDENCE.md | Phase 15 evaluation separates command outcomes from semantics | Record actual validator path/hash, interpreter/dependency provenance, Skill source identity and exit |
| 16-RUNTIME-EVIDENCE.md | Phase 12/15 reports preserve stalled build as unverified | Preserve diagnostics/failures; record owned process termination, completed build/test summaries and source identity |
| 16-VALIDATION.md | Installed GSD VALIDATION.md template | Draft per-task map now, sign-off only after actual execution |

## Observed current prerequisites

- Main branch; prior phase creation commit 96bd922. No AGENTS.md or repository-local Skill overrides found in the scoped inventory.
- Python 3.14.5 at /opt/homebrew/opt/python@3.14/bin/python3.14; `yaml` absent under this interpreter. This does not establish absence under every available interpreter.
- node, npm, python3 and uv exist on PATH; neither timeout nor gtimeout found. Plan a stdlib bounded subprocess approach or tool-owned session termination, not an assumed timeout binary.
- node_modules and dist exist; .bin/tsc and .bin/vitest are symlinks to expected relative targets. Metadata existence is not proof of readable/executable dependencies. No root cause for the earlier stall established.
- `build`: `tsc -p tsconfig.json`; `test`: `EVIDENCELENS_DISABLE_PROVIDER=1 vitest run --exclude tests/providers/deepseek-live.test.ts`.
- tsconfig compiles src to dist with NodeNext/ES2022 and skipLibCheck. No repository Vitest configuration file discovered.
- `tests/scripts/automatic-live-review-cli.test.ts` exercises live-named commands only via invalid argv / isolated invalid preflight / injected stubs. Names alone cannot justify dropping all these regression tests; inspect side-effect boundaries before full test execution.
- `tests/providers/deepseek-live.test.ts` is credential-sensitive and explicitly excluded by npm test. Do not replace npm test with an unfiltered vitest run.
- Official quick_validate.py is an external installed tool, not a repo module. Record its actual digest/version; never patch it or substitute a local implementation to obtain a green exit.

## Scope

Reuse current locks and existing tests. No new generalized runner, dependency framework or semantic classifier. Conditional repairs follow observed causes; report exact changed paths and revalidate affected behaviors. Local runtime proof never renews historical paid-proof authority.
