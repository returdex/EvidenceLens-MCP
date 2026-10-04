---
phase: 17
slug: retrospective-validation-and-audit-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 17 — Validation strategy

Planning contract only. No listed runtime/collector checks have been executed in Phase 17 yet. Existing source/evidence inspection establishes available checks, not their future success. D-05 requires this artifact despite the generic research=false exemption.

## Infrastructure and bounded sampling

Reuse Node's built-in test runner, existing collectors, local Markdown/link/hash assertions and the isolated Phase 16 YAML environment if still available. No new framework/dependency assumed. Quick check: `node --test tests/baseline/source-boundary.mjs`; document check: `git diff --check` plus concrete task/requirement/link assertions. Source blocks and output schemas are in [patterns](17-PATTERNS.md).

Each plan runs its relevant collector blocks once. Reuse a prior successful baseline after hash equality; rerun only checks affected by a real change. Reuse Phase 16 full runtime proof after verifying compiler/runtime inputs are unchanged; do not rerun 795 tests for documentation edits alone. Source-affecting changes require bounded appropriate regression.

30s metadata / 60s baseline or collector bounds with owned-group TERM/5s/KILL and reaping. These are limits, not predicted latency. If a read stalls, record it and diagnose before one justified larger attempt; no repeated blind install/run. No watch mode. Retain actual failures and skip counts. No provider, Docker runtime, remote CI or publication.

## Per-task verification map

| Task | Wave | Requirement | Threat | Automated checks planned | Manual evidence review planned | Status |
|---|---|---|---|---|---|---|
| 17-01-01 | 1 | VAL-03 | T-17-01/02/03 | Node baseline; 13-step block; four-task/five-ID map and source hashes | B01–B07 actual outputs against sources/oracles | pending |
| 17-01-02 | 1 | VAL-04 | T-17-01/02 | Nine-step block; four-task/three-ID map; Skill hash and links | S01–S07 prompt/review semantics; structural validator scope | pending |
| 17-02-01 | 2 | VAL-05 | T-17-01/02/04 | 17-step block and original-string assertion; five-task/five-ID map | C01–C08 template, restoration, residue and disclosure decisions | pending |
| 17-02-02 | 2 | VAL-06 | T-17-01/04 | 18-step block; four-task/three-ID map, identities and links | E01–E06 actual lifecycle, current actions and final conclusions | pending |
| 17-03-01 | 3 | VAL-03/04/05/06 | T-17-01/05/06 | 22 unique IDs, six debt IDs, source-hash preservation and links | Three-source evidence, six connections and six flows, residual debt | pending |
| 17-03-02 | 3 | VAL-03/04/05/06 | T-17-05/06 | Six current/17 original task rows; YAML/count/link/diff checks; post-summary completeness | Truthful statuses and post-verifier audit/state reconciliation | pending |

## Wave 0 prerequisites

- [ ] Read actual existing tests and complete source blocks; inspect child side-effect paths.
- [ ] Establish bounded local execution and current source identity; retain original audit/report hashes.
- [ ] Verify Phase 16 reuse applies to unchanged relevant source and recorded host scope.
- [ ] Use existing environment; any missing dependency or runtime limitation gets explicit evidence before repair.

Existing infrastructure is sufficient for the planned deterministic checks. There are no invented MISSING-test stubs or dependency-install tasks.

## Manual-only verification

| Behavior | Method and limit |
|---|---|
| Language/workflow correctness of B/S/C/E cases | Read actual output against admitted source and oracle; retain historical date/author, record new retrospective judgment separately. New inline trial only when an actual evidence gap warrants it. No independent model generalization claim. |
| Evidence sufficiency and debt classification | Inspect actual commands, outputs, source scope and missing/manual coverage. File existence and metadata are not semantic proof. |
| Complete records versus complete automated coverage | Four VAL obligations may be complete with PARTIAL Nyquist; retain residual debt and accurate sign-off, never force compliant=true. |

## Sign-off criteria — execution pending

- [ ] All six task rows have actual outputs/source/time and explicit manual attribution.
- [ ] Four original records cover 4/4/5/4 tasks and all 16 original requirement IDs.
- [ ] Original evidence/audit bytes preserved; prior failures and limits stay visible.
- [ ] Required checks complete or actual gaps block corresponding requirement claims.
- [ ] Current audit accounts for 22 requirements/six debts and follows actual Phase 17 verification.
- [ ] Report frontmatter/body and active tracking agree; no publication or automatic milestone completion.

Set wave_0_complete only after prerequisites are demonstrated. Keep nyquist_compliant:false/status:partial if relevant manual-only behavior remains; document the exact reason. A complete honest validation deliverable is distinct from complete automated coverage.

**Approval:** pending execution; plan-check acceptance is recorded separately in 17-PLAN-CHECK.md.
