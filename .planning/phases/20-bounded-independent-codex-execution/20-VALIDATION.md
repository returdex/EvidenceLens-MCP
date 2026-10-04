---
phase: 20
slug: bounded-independent-codex-execution
status: blocked
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-05
---
# Phase 20 — Validation Strategy

Execution in progress. Plan 01 completed; Plan 02 actual compatibility gate FAILED. See 20-ISOLATION-EVIDENCE.md; dependent tasks remain pending.

## Test Infrastructure and Sampling

Node built-in test runner, existing Vitest/build and official Skill validator. No new dependency. New tests/codex helpers are created with their owning tasks before implementation, using positive/negative fixtures. After each task run its listed check; after each dependent wave run changed suites plus affected prompt/command/source-boundary regression. Bound each batch to 120 seconds (small unit cases target <30 seconds); kill/reap owned children on timeout. No watch mode or live-provider environment.

Quick: `node --test tests/codex/contract.mjs tests/codex/preflight.mjs` after Plan 01 exists.
Phase: `node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs` in bounded batches. Fresh build and six affected Vitest files are Plan 06 gates. Tests do not make real inference requests.

## Per-Task Verification Map

| Task ID | Plan/Wave | Requirements | Threat Ref | Secure behavior / verification | File exists now | Status |
|---|---|---|---|---|---|---|
| 20-01-01 | 01/1 | CDX-01, CDX-02, CDX-03, CDX-06 | T-20-01, T-20-02 | node --test tests/codex/contract.mjs | New, created in task | PASS — 16 contract tests |
| 20-01-02 | 01/1 | CDX-01, CDX-02, CDX-03, CDX-06 | T-20-01, T-20-02 | node --test tests/codex/preflight.mjs tests/codex/contract.mjs | New, created in task | PASS — 27 combined tests; real preflight 216 ms |
| 20-02-01 | 02/2 | CDX-02, CDX-04, CDX-05 | T-20-03, T-20-04 | node --test tests/codex/isolation.mjs tests/codex/protocol-host.mjs (120 s outer cap; synthetic local endpoint only) | Created | FAIL — 12/13 diagnostics; positive strict launch blocked |
| 20-02-02 | 02/2 | CDX-02, CDX-04, CDX-05 | T-20-03, T-20-04 | node --test tests/codex/isolation.mjs tests/codex/preflight.mjs tests/codex/protocol-host.mjs (120 s cap) | Launcher not created | BLOCKED — upstream gate failed; actual outer login config denied |
| 20-03-01 | 03/3 | CDX-03, CDX-05 | T-20-05, T-20-06 | node --test tests/prompts/contract.mjs tests/prompts/store.mjs tests/prompts/lifecycle.mjs tests/prompts/retention.mjs tests/prompts/cli.mjs | Mixed existing/new | pending |
| 20-03-02 | 03/3 | CDX-03, CDX-05 | T-20-05, T-20-06 | node --test tests/codex/runner.mjs tests/prompts/lifecycle.mjs tests/prompts/retention.mjs (120 s outer cap) | Mixed existing/new | pending |
| 20-04-01 | 04/4 | CDX-03, CDX-04, CDX-06 | T-20-07, T-20-08 | node --test tests/codex/result.mjs tests/codex/runner.mjs tests/codex/contract.mjs | Mixed existing/new | pending |
| 20-04-02 | 04/4 | CDX-03, CDX-04, CDX-06 | T-20-07, T-20-08 | node --test tests/codex/cli.mjs tests/commands/*.mjs tests/prompts/*.mjs tests/baseline/source-boundary.mjs (120 s cap) | Mixed existing/new | pending |
| 20-05-01 | 05/5 | CDX-01, CDX-02, CDX-03, CDX-04, CDX-05, CDX-06 | T-20-09, T-20-10 | node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs (bounded batches <=120 s) | Mixed existing/new | pending |
| 20-05-02 | 05/5 | CDX-01, CDX-02, CDX-03, CDX-04, CDX-05, CDX-06 | T-20-09, T-20-10 | Read-only installed codex preflight; node --test tests/codex/acceptance.mjs tests/codex/protocol-host.mjs tests/codex/isolation.mjs; official quick_validate.py for seven Skills plus known invalid negative control; git diff --check | Mixed existing/new | pending |
| 20-06-01 | 06/6 | CDX-01, CDX-02, CDX-03, CDX-04, CDX-05, CDX-06 | T-20-11 | Parsed product metadata equality; lock comparison allows root product version fields only; git diff --check | Existing metadata | pending |
| 20-06-02 | 06/6 | CDX-01, CDX-02, CDX-03, CDX-04, CDX-05, CDX-06 | T-20-11 | Fresh npm run build; npm test -- tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts; node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs; git diff --check (bounded batches) | Existing metadata | pending |

## Wave 0 Requirements

- Plan 01 creates tests/codex/helpers.mjs, contract.mjs and preflight.mjs with failing positive/negative assertions before implementing pure contracts.
- Plan 02 creates isolation.mjs/protocol-host.mjs and proves effective controls before runner enablement.
- Plan 03 creates runner.mjs tests and extends existing prompt lifecycle/retention tests.
- Plan 04 creates result.mjs/cli.mjs tests before wiring success.
- Plan 05 creates acceptance.mjs and current-host evidence. No stubs marked passing.
- Existing Node/Vitest infrastructure covers test execution. Official validator prerequisite is already installed outside the repo; verify it rather than reinstalling.

## Required Positive and Negative Gates

1. Capture: exact prompt/capsule/stdin/export hash; old v1 snapshots intact; source reads remain parent-gated.
2. Isolation: actual pinned binary/OS, allowed control read plus denied outside/excluded/write/recursive/tool/context sentinels. Planning native -P probe FAILED; direct Seatbelt small probe passed but full production policy remains pending.
3. Authentication: actual status category under outer policy, no credential inspection/copy/mutation/API fallback. Status does not prove remote inference freshness.
4. Execution: valid fixture response and one request; HTTP/stream failures never resend; timeout/cancel reaps group; unknown transmission/cleanup uncertain.
5. Validation: terminal+exit+strict schema+local evidence binding; forged/missing/partial results fail, unavailable coverage remains visible.
6. Installation/privacy: current installed paths from outside repo; four routes; help/export zero inference; no raw reasoning/events/secret retention; scoped deletion.

## Manual and Separate Acceptance

| Behavior | Owner | Evidence / limit |
|---|---|---|
| Semantic usefulness, claim entailment, policy/template/disclosure tone | Phase 20 manual regression and Phase 21 handoff evaluation | Matching quotes does not prove reasoning; maintain partial Nyquist status |
| macOS boundary and existing auth preflight | Phase 20 Plan 02/05 actual host | Real CLI/OS evidence with synthetic materials; no real inference |
| Actual ChatGPT independent review, usage and end-to-end handoff | Phase 21 | NOT_RUN in Phase 20; authorized live attempt required there |
| Other OS/version/native slash GUI | Unverified unless separately tested | Do not claim universal support |

## Sign-off

- [x] 12 tasks have automated verification or explicit host/tool checks.
- [x] New test files have owning creation tasks and no three consecutive unverified tasks.
- [x] Target-host compatibility is an execution gate, not a planning success claim.
- [ ] All execution outcomes populated with source-bound evidence.
- [ ] Phase goal independently checked inline after execution; no subagent claim.
- [ ] Semantic automation complete (not assumed; nyquist_compliant=false).

**Approval:** Planning validation strategy; execution acceptance pending.
