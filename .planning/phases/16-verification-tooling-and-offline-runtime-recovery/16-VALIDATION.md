---
phase: 16
slug: verification-tooling-and-offline-runtime-recovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 16 — Validation Strategy

Planning contract only; no official validator, build or full runtime test was executed by planning. D-05 explicitly requires this artifact despite the generic no-research exemption. Fill outcomes from actual execution, not projected success.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Existing official Python Skill validator; TypeScript compiler; existing Vitest npm suite; separate Node stdlib source-boundary tests |
| Config | package.json, package-lock.json, tsconfig.json; no separate Vitest config discovered |
| Quick commands | Selected Python yaml import/version; official quick_validate.py on actual Skill; node --test tests/baseline/source-boundary.mjs |
| Full commands | npm run build; npm test (existing provider-disabled script, live test excluded) |
| Runtime | Unknown until measured; caps are 30s probes/validator, 60s runner startup, 300s build, 900s full suite |
| Process handling | Owned process group; report/poll <=30s; terminate/reap only owned children on timeout; no assumed timeout binary |

## Sampling Rate

- After tooling task: actual import/version or official validation plus diff/link checks as relevant.
- After diagnosis: capture bounded probe/single-test outcome, including failure.
- After runtime repair: affected regression, then one complete current build/offline run. Avoid full reruns after report-only changes.
- Before phase verification: both requirements have successful actual results, plus separate source-boundary suite and standard review. Reuse unchanged-source evidence rather than rerun expensive checks without reason.
- Feedback latency target: progress at most every 30 seconds. Process ceilings are limits, not expected duration or blanket completion proof.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Type | Automated command / evidence | Available | Status |
|---|---|---|---|---|---|---|---|---|---|
| 16-01-01 | 01 | 1 | VAL-01 | T-16-01/02 | Isolated dependency, no secrets | prerequisite | Selected Python import yaml + installed distribution version equals exact pin | Isolated Python 3.14.5 / PyYAML 6.0.3; tooling evidence | green |
| 16-01-02 | 01 | 1 | VAL-01 | T-16-01/03 | Real validator, current input | validator/control | Selected Python official quick_validate.py skills/assignment-review => 0; missing-description temp target => nonzero | Actual official exit 0 / negative exit 1; tooling evidence | green |
| 16-02-01 | 02 | 2 | VAL-02 | T-16-04/05 | Bounded owned process, offline path | diagnostic/smoke | node/npm/tsc/vitest version + single project-config test under caps, actual outcome retained | Existing scripts; startup health not established | pending |
| 16-02-02 | 02 | 2 | VAL-02 | T-16-04/05/06 | Current-source offline success | build/regression | npm run build; npm test; exits, counts, exclusions, source and lock digests | Existing entrypoints; prior stall unresolved | pending |
| 16-02-03 | 02 | 2 | VAL-01, VAL-02 | T-16-03/06 | No false sign-off or stale pass | regression/reconciliation | node --test tests/baseline/source-boundary.mjs; link/metadata checks; git diff --check; prior actual exits for unchanged input | Existing stdlib test; runbooks/evidence pending | pending |

## Wave 0 Requirements

- [ ] Select a compatible existing interpreter or isolated local venv; pin the actual PyYAML version used.
- [ ] Inspect child/provider side-effect paths and establish bounded owned-process handling without shipping a generalized runner.
- [ ] Establish actual dependency readability/runner startup before expensive retry; classify historical cause as unknown if not reproduced.
- [ ] Record exact current source/dirty-file identity for every acceptance run.

No test stubs or new framework are needed. New tests only for demonstrated behavioral bugs uncovered during execution.

## Manual-Only Verifications

| Behavior | Requirement | Why manual | Instructions |
|---|---|---|---|
| Diagnosis and minimal repair rationale | VAL-02 | Passing commands cannot prove historical root cause | Compare hypotheses/probes; separate current success from unreproduced historical cause |
| Scope of official validation | VAL-01 | Metadata acceptance is not semantic/installed-skill proof | Inspect actual script/target hashes and positive/negative output; no fallback promotion |
| External side effects, source equivalence and skipped scope | VAL-02 | Env flag alone does not sandbox all subprocesses | Inspect actual child call paths/stubs, changes, source manifests and skip reasons |
| Status reconciliation | Both | Narrative must match terminal evidence | Check full report bodies/frontmatter and task rows; retain unresolved limits |

These manual review activities supplement direct automated acceptance. They do not make the broader assignment Skill independently evaluated. If any requirement retains only manual evidence or a failed required command, keep compliance/sign-off partial.

## Validation Sign-Off

- [ ] Each task has actual automated outcome/evidence or an explicitly retained gap.
- [ ] Official positive/negative validation complete; pinned dependency matches actual environment.
- [ ] Fresh current build and full intended offline tests pass; omissions and host-specific limits explained.
- [ ] Separate Node boundary regression and standard review complete.
- [ ] No pending required result, unowned process termination, secret leakage or paid proof replay.
- [ ] wave_0_complete and nyquist_compliant updated only from actual met criteria.

**Approval:** pending execution; no pass asserted during planning.
