---
phase: 21
slug: review-handoff-and-usage-acceptance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-05
---

# Phase 21 — Validation Strategy

Planning only. No new implementation test or real inference is claimed to have passed.

## Test infrastructure and sampling

Node built-in test runner (stdlib installed helpers), existing Vitest and TypeScript build. After each task, run its exact verify command once the owning task has created the tests. Fast local suites target 30 seconds; actual CLI and final regression batches have a 120-second cap and separate progress polling. After each wave, rerun its affected prior seam tests; do not run the entire repository for every documentation change. Before completion, run the final scoped build/Vitest and Node regression from Plan 06. No watch mode, installs, paid replay or secret-bearing logs.

## Per-task verification map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure behavior | Test type | Automated command | File exists | Status |
|---|---|---|---|---|---|---|---|---|---|
| 21-01-01 | 01 | 1 | RUN-03, RUN-04 | T-21-01, T-21-02 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/metrics.mjs tests/codex/runner.mjs` | created by owning task where new | pending |
| 21-01-02 | 01 | 1 | RUN-03, RUN-04 | T-21-01, T-21-02 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/metrics.mjs tests/prompts/retention.mjs tests/codex/cli.mjs` | created by owning task where new | pending |
| 21-02-01 | 02 | 2 | RUN-01, RUN-03, RUN-04 | T-21-02, T-21-03 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/handoff.mjs tests/codex/result.mjs tests/prompts/store.mjs` | created by owning task where new | pending |
| 21-02-02 | 02 | 2 | RUN-01, RUN-03, RUN-04 | T-21-02, T-21-03 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/handoff.mjs` | created by owning task where new | pending |
| 21-03-01 | 03 | 3 | RUN-01, RUN-02 | T-21-03, T-21-04 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/recheck.mjs tests/prompts/retention.mjs` | created by owning task where new | pending |
| 21-03-02 | 03 | 3 | RUN-01, RUN-02 | T-21-03, T-21-04 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/recheck.mjs tests/codex/handoff.mjs` | created by owning task where new | pending |
| 21-04-01 | 04 | 4 | RUN-01, RUN-02, RUN-03, RUN-04, RUN-05 | T-21-05 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/records-cli.mjs tests/commands/install-review-skills.mjs tests/prompts/cli.mjs` | created by owning task where new | pending |
| 21-04-02 | 04 | 4 | RUN-01, RUN-02, RUN-03, RUN-04, RUN-05 | T-21-05 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/commands/skill-contract.mjs tests/codex/records-cli.mjs tests/baseline/source-boundary.mjs` | created by owning task where new | pending |
| 21-05-01 | 05 | 5 | RUN-01, RUN-02, RUN-03, RUN-04, RUN-05 | T-21-05, T-21-06 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/handoff-acceptance.mjs tests/codex/live-acceptance.mjs` | created by owning task where new | pending |
| 21-05-02 | 05 | 5 | RUN-01, RUN-02, RUN-03, RUN-04, RUN-05 | T-21-05, T-21-06 | bounded current identity, provenance and no implicit dispatch | manual + preparation test | `node --test tests/codex/live-acceptance.mjs` | created by owning task where new | pending |
| 21-05-03 | 05 | 5 | RUN-01, RUN-02, RUN-03, RUN-04, RUN-05 | T-21-05, T-21-06 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `node --test tests/codex/live-acceptance.mjs tests/codex/handoff-acceptance.mjs` | created by owning task where new | pending |
| 21-06-01 | 06 | 6 | RUN-01, RUN-02, RUN-03, RUN-04, RUN-05 | T-21-07 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `npm run build` | created by owning task where new | pending |
| 21-06-02 | 06 | 6 | RUN-01, RUN-02, RUN-03, RUN-04, RUN-05 | T-21-07 | bounded current identity, provenance and no implicit dispatch | automated + stated manual evidence | `npx vitest run tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts tests/review/a13-case-integrity.test.ts` | created by owning task where new | pending |

## Test ownership / Wave 0

Existing runner/result/store/prompt/command tests are available. No dependency installation is needed. The following missing test files are implementation deliverables, not missing external prerequisites:

- 21-01-01 creates tests/codex/metrics.mjs; 21-01-02 extends it for persistence.
- 21-02-01 creates tests/codex/handoff.mjs; 21-02-02 extends rendering/ID coverage.
- 21-03-01 creates tests/codex/recheck.mjs; 21-03-02 extends action projection.
- 21-04-01 creates tests/codex/records-cli.mjs.
- 21-05-01 creates tests/codex/handoff-acceptance.mjs and tests/codex/live-acceptance.mjs. The latter defaults to preparation/receipt checks only; it never makes a real call as part of node --test.

All later references depend on those owning tasks. New tests must actually fail on the targeted unsafe behavior before being used as acceptance evidence; a source-text assertion alone does not prove runtime safety.

## Manual and actual-host evidence

| Check | Requirement | Required evidence |
|---|---|---|
| Actual installed Skill discovery and invocation | RUN-05 | Installed path/hash, fixed stage, source selection, actual show/full/export/recheck output; helper-only subprocess is not proof of host Skill invocation |
| Applicable authorization | RUN-05 | Concrete two-prompt synthetic scope and human authorization reference; no approval from timeout or test result |
| Real initial review + revised-source review | RUN-01/02/05 | Two captured/exported exact prompt hashes, successful source-bound outcomes and actual run IDs; not loopback fixtures |
| Usage/model presentation | RUN-03/04 | Report actual CLI field provenance, missing vs zero, requested vs reported model; billing/quotas not queried |
| Host semantic R/F judgments | RUN-01/02 | Human-readable current evidence for one closure and one retained Low/info issue; annotations labeled host assessment |
| Full A1.3 model semantics | deferred | NOT_RUN and non-blocking; case integrity tests are not semantic evidence |

The live pair uses existing 120 s per-review timeout/cleanup. A failed first attempt prevents dependent live recheck, requires an honest gap and no automatic resend. Without applicable authorization, live acceptance stays pending while independent offline work may continue. RR/FM reminders add no completion gates.

## Sign-off

- [x] All 13 planned tasks include automated preparation/verification and explicit manual additions where needed.
- [x] New test creation precedes dependent test execution; no three-task sampling gap.
- [ ] Actual task executions and scoped regressions recorded.
- [ ] Actual installed-host and authorized live pair accepted.
- [ ] Semantic judgments checked manually, without universal automated-grading claim.

Planning validation passes do not set nyquist_compliant or wave_0_complete to true. Keep execution coverage truthful; record eventual manual-only limitations.
