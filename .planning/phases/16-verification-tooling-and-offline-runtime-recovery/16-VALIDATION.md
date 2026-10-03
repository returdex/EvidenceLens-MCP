---
phase: 16
slug: verification-tooling-and-offline-runtime-recovery
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-04
updated: 2026-10-04
---

# Phase 16 — Actual validation record

Both plans complete. VAL-01 and VAL-02 pass on the recorded local source and host. Compliance covers this tooling/runtime phase; it does not extend automated semantic coverage to Phases 12–15. The original milestone audit remains historical pending Phase 17 re-audit.

## Infrastructure and process

Official unchanged Python validator, isolated Python 3.14.5/PyYAML 6.0.3; locked TypeScript 5.9.3/Vitest 3.2.7; Node v26.0.0, npm 11.12.1, macOS 26.6.2 arm64. Exact commands, source hashes, UTC times, exits and failed attempts are retained in [tooling evidence](16-TOOLING-EVIDENCE.md) and [runtime evidence](16-RUNTIME-EVIDENCE.md).

Ceilings: 30s probes, 60s startup, 180s install, initial 300s build followed by justified 600s attempt, 900s full tests, 60s boundary suite. Owned groups use TERM/5s/KILL and reaping. Initial rename/hash helpers relied on external supervision; that deviation is retained. No unrelated process termination, paid provider call or remote CI run.

## Per-task verification map

| Task | Requirement | Threat | Actual automated result | Status |
|---|---|---|---|---|
| 16-01-01 | VAL-01 | T-16-01/02 | Existing yaml imports fail; isolated import and package metadata equal exact 6.0.3 pin | green |
| 16-01-02 | VAL-01 | T-16-01/03 | Official target exit 0; malformed control exit 1; unchanged script and target hashes | green |
| 16-02-01 | VAL-02 | T-16-04/05 | Bounded probes reproduce stalls; sampled reads and source/lock identities recorded; intended runner discovery exactly 43 files | green |
| 16-02-02 | VAL-02 | T-16-04/05/06 | Fresh build exit 0 (517.410s); final original npm test exit 0, 43 files/795 tests pass, 0 failures/skips (8.452s) | green |
| 16-02-03 | VAL-01, VAL-02 | T-16-03/06 | Separate Node baseline 12/12 pass; affected regression 86/86 pass; links, metadata, hashes and diff checked; standard inline review complete | green |

## Wave 0 and sign-off

- [x] Compatible isolated interpreter and exact dependency selected and exercised.
- [x] Child/provider paths inspected; owned-process supervision established.
- [x] Primary dependency/test startup recovered; fresh build and intended full suite finish successfully.
- [x] Source identity, unchanged lock/Skill and version 0.2.4 reconciled.
- [x] All five tasks have concrete checks; failures preserved instead of replaced by successful diagnostics.
- [x] Separate baseline and [standard inline review](16-REVIEW.md) complete.
- [x] Actual required results support wave_0_complete and nyquist_compliant for Phase 16.

## Scope and limits

The final suite ran at d7a8ca1 with the normal package command and unchanged live-provider exclusion. That commit changes only a legacy proof rehearsal fixture. The fresh build at d259bee remains applicable: src, compiler configuration and package/lock are identical; the later test patch is outside compiler inputs. Subsequent commits contain documentation only.

Official validation checks metadata/structure, not independent language quality or global Skill discovery. Environment filtering is not a universal network sandbox; inspected offline subprocess paths use temporary roots, stubs or injected transports. Real local Compose interpolation is distinct from Docker container execution. No renewed Linux-specific, Docker-runtime, paid-provider or remote-CI acceptance is claimed. Prior inline semantic evidence remains scoped to its original runs.

Old dependencies remain recoverable at ignored `.phase16-recovery/node_modules/original`. Read/open/rename delays were observed; the underlying OS/storage cause remains unknown. Both dependency recovery and the test fixture repair are documented, without claiming the fixture caused all I/O delays. Phase 17 remains unplanned.
