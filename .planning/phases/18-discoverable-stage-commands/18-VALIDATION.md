---
phase: 18
slug: discoverable-stage-commands
status: passed_with_manual_semantic_limits
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---
# Phase 18 — Validation strategy

All nine tasks passed. Seven official metadata targets/control, 21 final Node tests, ten manual semantic cases/eleven reader steps, six actual cross-project command turns plus corrected help retest, and fresh 0.3.1 build/6-file/118-test regression are recorded in the linked summaries and evidence files. Existing milestone research is reused; research=false makes formal research gating inapplicable. Semantic judgments remain manual, so Nyquist compliance and wave-zero flags are not promoted to automatic-complete.

## Task map

| Task | Wave | Requirement | Planned verification | Status |
|---|---|---|---|---|
| 18-01-01 | 1 | CMD-02/04/05 | Diff + route contract review; see 18-01-SUMMARY | passed |
| 18-01-02 | 1 | CMD-01/02/03/05 | Node 14/14 and official 7 positives + negative control; see 18-01-SUMMARY | passed |
| 18-02-01 | 2 | CMD-01 | Real temp filesystem 6 behavioral + 2 structural tests; 18-02-SUMMARY | passed |
| 18-02-02 | 2 | CMD-03/05 | Guide/examples checked; 8/8 tests rerun; 18-02-SUMMARY | passed |
| 18-03-01 | 3 | CMD-02/04/05 | 10 manual cases + 11 collector steps, Node 21/21 after identity error repair; 18-COMMAND-EVALUATION / 18-03-PROGRESS | passed (manual semantics) |
| 18-03-02 | 3 | CMD-01/03 | Clean dry-run / apply / unchanged; installed references verified; 18-HOST-EVIDENCE | passed |
| 18-03-03 | 3 | CMD-01/02/03/05 | Actual six-command discovery/invocation in another assignment project | passed; six observed plus corrected help retest |
| 18-04-01 | 4 | CMD-01/05 | Product version equality; lock dependency/analyzer/history preservation | passed |
| 18-04-02 | 4 | CMD-01/05 | Six affected offline files + all command/boundary Node tests | passed: 118 + 21; fresh build |

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
