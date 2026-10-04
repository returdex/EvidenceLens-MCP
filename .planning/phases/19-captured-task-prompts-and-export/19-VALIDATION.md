---
phase: 19
slug: captured-task-prompts-and-export
status: planned
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-05
---
# Phase 19 — Validation strategy

Voluntary task map under research=false; no new RESEARCH/Validation Architecture or automatic Nyquist acceptance is asserted. All checks below are planned, not executed. Reuse milestone architecture/pitfalls; final semantic judgment remains manual. No current runtime result is claimed from Phase 18's 118/21 counts.

| Task | Wave | Requirements | Check | Status |
|---|---|---|---|---|
| 19-01-01 | 1 | PRM-01/03/05 | contract.mjs strict schema/hash/limits/state transitions | passed (see plan summary) |
| 19-01-02 | 1 | PRM-01/03/05 | store.mjs real filesystem identity/ordering/failure guards | passed (see plan summary) |
| 19-02-01 | 2 | PRM-01/02/03/04 | cli.mjs actual subprocess and callback dispatch/raw-export byte equality | passed (see plan summary) |
| 19-02-02 | 2 | PRM-03/05 | retention.mjs dry run/tombstone/interruption/scope preservation | passed (see plan summary) |
| 19-03-01 | 3 | PRM-01/02/03/04/05 | shared route inspection; existing gate regression; actual host deferred to 04-02 | pending |
| 19-03-02 | 3 | PRM-02/04/05 | installed-helper external cwd/missing-dependency tests + guide | pending |
| 19-04-01 | 4 | PRM-01/02/03/04/05 | lifecycle.mjs concurrency, process faults, stale receipts and source changes | pending |
| 19-04-02 | 4 | PRM-01/02/03/04/05 | current installed-host synthetic four stages + repeated/failed export receipts | pending (manual semantics) |
| 19-05-01 | 5 | PRM-01/05 | version equality and unchanged dependency/analyzer metadata | pending |
| 19-05-02 | 5 | PRM-01/02/03/04/05 | fresh build + six affected offline files + all Node prompts/commands/boundary | pending |

## Timing and prerequisites

New tests are introduced by the corresponding task, not assumed to exist today. Fast focused Node checks: 60s initial; lifecycle/full Node group: 120s; build: 300s; six-file affected suite: 120s. Use docs/development-validation.md owned-process and sanitized-provider/Compose isolation. No live-provider test. On timeout record unverified, inspect actual wait/materialization and preserve logs before retrying. Do not install different dependency versions or claim stale dist acceptance.

Required run sequence at closure: fresh npm run build; npm test -- tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts; node --test tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs. Prior current-milestone command tests form the regression gate. All task tests must report actual counts, failures/skips, elapsed and exit.

## Evidence boundaries

Synthetic temporary state only for development acceptance; save only sanitized fixture receipts/hashes/read lists in Git. Test exact UTF-8 prompt bytes, not only strings/keyword presence. Host current-chat trials validate installed helper use and manually judged review outputs, not independent Codex invocation or universal read isolation. Never create/message another chat or replay paid proof as an automatic test. Actual trial data and working helpers precede any necessary human handoff.
