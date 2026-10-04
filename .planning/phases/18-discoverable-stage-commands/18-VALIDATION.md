---
phase: 18
slug: discoverable-stage-commands
status: in_progress
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---
# Phase 18 — Validation strategy

Execution started: Plan 01 structural and official metadata checks passed; remaining outcomes are tracked below. No real host invocation or runtime regression is claimed. Existing milestone research is reused; research=false means formal Nyquist research gating is not applicable. Keep this task map anyway; manually judged language behavior cannot be labeled automatic coverage.

## Task map

| Task | Wave | Requirement | Planned verification | Status |
|---|---|---|---|---|
| 18-01-01 | 1 | CMD-02/04/05 | Diff + route contract review; see 18-01-SUMMARY | passed |
| 18-01-02 | 1 | CMD-01/02/03/05 | Node 14/14 and official 7 positives + negative control; see 18-01-SUMMARY | passed |
| 18-02-01 | 2 | CMD-01 | Real temporary filesystem install/dry-run/collision tests | pending |
| 18-02-02 | 2 | CMD-03/05 | Six command guide/examples + structural tests | pending |
| 18-03-01 | 3 | CMD-02/04/05 | C18-01–10 actual inline outputs, map-only collection, manual semantic judgment | pending |
| 18-03-02 | 3 | CMD-01/03 | Real seven-link install after clean preflight, source/target identity record | pending |
| 18-03-03 | 3 | CMD-01/02/03/05 | Actual six-command discovery/invocation in another assignment project | pending |
| 18-04-01 | 4 | CMD-01/05 | Product version equality; lock dependency/analyzer/history preservation | pending |
| 18-04-02 | 4 | CMD-01/05 | Six affected offline files + all command/boundary Node tests | pending |

## Commands, timing and prerequisites

- Structural quick feedback: `node --test tests/commands/skill-contract.mjs` (new in 18-01-02); installer behavioral suite new in 18-02-01. No test is assumed to exist before its creating task.
- Boundary regression: `node --test tests/baseline/source-boundary.mjs` (existing).
- Fast Node groups: 60-second ceiling; official validator: 30 seconds per command in isolated existing pinned environment; actual results required.
- Affected suite: `npm test -- tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts` (initial 120-second ceiling).
- Follow `docs/development-validation.md` for owned process cleanup and sanitized provider/Compose environment; no watch/live-provider calls. The earlier initialization timeout stays in its original evidence file.
- Native host invocation has no automatic timing guarantee; do all implementation/installation/fixture preparation before asking for observations. Do not manufacture a pass when current tools cannot invoke another project.

## Coverage and sign-off

Separate four proof levels: structural/official metadata, filesystem/source boundary, manual semantic output review, actual installed-host discovery/invocation. Record repository/source identity, command/exit/time, actual outputs and redaction for each. Only rows with actual outcome evidence are updated. No full Nyquist sign-off, CMD completion, platform-general claim or independent-model proof from planning.

Threats T-18-01–09 are mapped to explicit plan tasks and negative cases. Preserve all original Phase 01–17 and milestone audit/proof files. No private coursework, credentials or unbounded host inventory in committed evidence.
