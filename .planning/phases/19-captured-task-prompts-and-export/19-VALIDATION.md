---
phase: 19
slug: captured-task-prompts-and-export
status: complete
nyquist_compliant: false
wave_0_complete: true
created: 2026-10-05
---
# Phase 19 — Validation strategy

Voluntary task map under research=false; no new RESEARCH/Validation Architecture or automatic Nyquist acceptance is asserted. All ten task rows are completed below; actual runtime evidence is recorded in 19-RUNTIME-EVIDENCE.md. Reuse milestone architecture/pitfalls; final semantic judgment remains manual. Fresh final counts are 118 affected runtime tests and 51 Node tests; Phase 18 historical results are not reused.

| Task | Wave | Requirements | Check | Status |
|---|---|---|---|---|
| 19-01-01 | 1 | PRM-01/03/05 | contract.mjs strict schema/hash/limits/state transitions | passed (see plan summary) |
| 19-01-02 | 1 | PRM-01/03/05 | store.mjs real filesystem identity/ordering/failure guards | passed (see plan summary) |
| 19-02-01 | 2 | PRM-01/02/03/04 | cli.mjs actual subprocess and callback dispatch/raw-export byte equality | passed (see plan summary) |
| 19-02-02 | 2 | PRM-03/05 | retention.mjs dry run/tombstone/interruption/scope preservation | passed (see plan summary) |
| 19-03-01 | 3 | PRM-01/02/03/04/05 | shared route inspection; existing gate regression; actual host deferred to 04-02 | passed (see plan summary) |
| 19-03-02 | 3 | PRM-02/04/05 | installed-helper external cwd/missing-dependency tests + guide | passed (see plan summary) |
| 19-04-01 | 4 | PRM-01/02/03/04/05 | lifecycle.mjs concurrency, process faults, stale receipts and source changes | passed (see plan summary) |
| 19-04-02 | 4 | PRM-01/02/03/04/05 | current installed-host synthetic four stages + repeated/failed export receipts | passed (see plan summary) |
| 19-05-01 | 5 | PRM-01/05 | version equality and unchanged dependency/analyzer metadata | passed (see plan summary) |
| 19-05-02 | 5 | PRM-01/02/03/04/05 | fresh build + six affected offline files + all Node prompts/commands/boundary | passed (see plan summary) |

## Timing and prerequisites

New tests are introduced by the corresponding task, not assumed to exist today. Fast focused Node checks: 60s initial; lifecycle/full Node group: 120s; build: 300s; six-file affected suite: 120s. Use docs/development-validation.md owned-process and sanitized-provider/Compose isolation. No live-provider test. On timeout record unverified, inspect actual wait/materialization and preserve logs before retrying. Do not install different dependency versions or claim stale dist acceptance.

Required run sequence at closure: fresh npm run build; npm test -- tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts; node --test tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs. Prior current-milestone command tests form the regression gate. All task tests must report actual counts, failures/skips, elapsed and exit.

## Evidence boundaries

Synthetic temporary state only for development acceptance; save only sanitized fixture receipts/hashes/read lists in Git. Test exact UTF-8 prompt bytes, not only strings/keyword presence. Host current-chat trials validate installed helper use and manually judged review outputs, not independent Codex invocation or universal read isolation. Never create/message another chat or replay paid proof as an automatic test. Actual trial data and working helpers precede any necessary human handoff.

## Actual completion

Fresh build, six runtime files (118 tests), Node prompt/command/source suites (51 tests), seven official Skill validations and the negative control passed. Actual installed current-host synthetic four-stage/export flow passed with identical hashes and no old-success fallback; deletion observed. All fixtures are synthetic. Nyquist remains false because semantic evaluation is manual; wave_0_complete means the planned test files now exist, not that all semantics are automated. No new formal RESEARCH/Nyquist acceptance is asserted.
