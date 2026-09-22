---
phase: 11-linux-filesystem-traversal-hardening
verified: 2026-09-22
status: passed
score: 8/8 must-haves verified
requirement: SAFE-01
evidence_source: committed-phase-11-source-and-offline-linux-runtime
---

# Phase 11 Verification: Linux Filesystem Traversal Hardening

## Goal and result

The Linux production reader now opens every untrusted canonical path component with `O_NOFOLLOW` after its single trusted `/proc/self/fd/<root descriptor>` hop. A real Linux production-image run denied a post-authorization intermediate-directory symlink swap while preserving normal and in-root-alias reads. Current documentation matches the code. **Result: passed, 8/8 plan must-haves verified.**

This verification was performed against the code and test commands separately from the plan summaries. The current source was committed before the final run. No provider request, GitHub Actions run, or historical audit edit was part of this verification.

## Goal-backward checks

| Must-have | Result | Evidence |
|---|---|---|
| D-01: in-root aliases retain canonical bytes and provenance; escaping aliases are denied | Pass | `policy.ts:133-150`; `linux-anchored.mjs` tests 2–3 passed in the production image. |
| D-02: every untrusted Linux directory and leaf is opened no-follow after the trusted proc hop | Pass | `read.ts:79` has the sole followable proc hop; `read.ts:81,89` use `O_NOFOLLOW` per component; Linux swap test 4 passed. |
| D-03: missing flags fail closed; read-only bounds, identity, cleanup and macOS denial remain | Pass | `policy.ts:110-115`, `read.ts:59-69,80-104,142-205`; 14 focused filesystem tests and 795 default tests passed. |
| D-04: real Linux production reader proves valid access and substitution denial | Pass | `bash scripts/test-linux-filesystem.sh` exited 0; 4/4 Node tests passed inside built Docker image with `--network none` and read-only root. |
| D-03: full offline regression and static review retain the prior boundaries | Pass | `11-SECURITY.md` has no unresolved High/Blocker; `npm run build` and `npm test` exited 0; Docker smoke exited 0. |
| D-04: evidence cites an actual Linux run | Pass | `11-READINESS.md` records exact source commit `189482e`, command exit 0 and 4/4 Linux tests; `11-01-SUMMARY.md` records the first Linux production run. |
| D-05: current planning truth is gated by evidence | Pass | Before this report, both plan summaries existed while SAFE-01 and Phase 11 stayed Pending/Awaiting verification; docs describe the tested behavior. |
| Fresh re-audit only after passed verification; old audit preserved | Pass | Historical `.planning/v1.0-MILESTONE-AUDIT.md` SHA-256 remains `7b666dfa144d51a09fbee41b5ed4264c04546344c091f672cd3ef18c2afb436d`; a fresh audit is the next gated transition. |

## Commands and traceability

- Reviewed source commit: `189482e68db85580ab02a2110b5636e33d5a8796`; later commits contain the evidence, docs and this report, without further production-source changes.
- `npm run build`: exit 0.
- `npm test`: exit 0, 43 files and 795 tests; rerun after all plan commits also passed 795/795.
- `bash scripts/test-linux-filesystem.sh`: exit 0, 4/4 Linux production-reader tests.
- `npm run docker:smoke`: exit 0, four-fixture offline MCP and read-only mount/missing-key checks passed.
- `gsd-sdk query verify.schema-drift 11`: `drift_detected: false`.
- `11-REVIEW.md`: `status: clean`; `11-SECURITY.md`: zero unresolved High/Blocker.

SAFE-01 is the only Phase 11 requirement ID in both plan frontmatter and `.planning/REQUIREMENTS.md`. The passed checks support closing it now. The requirement checkbox and roadmap/state phase-complete fields should be changed only after this report is committed, followed by a new milestone audit. The 2026-09-05 audit remains historical.

## Limits

The Linux regression forces one deterministic post-authorization swap; the general no-follow guarantee rests on the actual per-component open flags. The test uses the production `dist` modules in a Linux Docker image and does not claim a paid-provider or remote CI run.
