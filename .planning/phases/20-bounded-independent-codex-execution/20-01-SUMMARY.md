---
phase: 20-bounded-independent-codex-execution
plan: "01"
subsystem: assignment-review
tags: [codex, evidence-capsule, preflight]
requires: [19]
provides: [Bounded evidence contract, Read-only executable and auth preflight]
affects: [20, 21]
key-files:
  created: [skills/assignment-review/scripts/codex-contract.mjs, skills/assignment-review/scripts/codex-preflight.mjs, skills/assignment-review/references/codex-execution.md, tests/codex/helpers.mjs, tests/codex/contract.mjs, tests/codex/preflight.mjs]
  modified: []
requirements-completed: []
metrics:
  tasks: 2
  files: 6
completed: 2026-10-05
---
# Phase 20 Plan 01 — Evidence contract and preflight

## Tasks and commits

- 20-01-01: 66841ca — captured evidence capsule and strict model result schema.
- 20-01-02: f2e7fd7 — bounded version/help/login preflight; b612342 — actual Homebrew ancestry correction.

## Verification

RED: both test files failed with missing modules before implementation. GREEN: `node --test tests/codex/preflight.mjs tests/codex/contract.mjs` passed 27/27, zero skipped, exit 0, 1.140 s final run. Tests cover Unicode byte ranges, source/excerpt hashes, excluded/history material, duplicates, accessors, unknown fields, credential-like error suppression, environment filtering, actual process timeout/output flood and legacy no-capsule rejection.

Actual read-only installed-binary preflight: ok=true; Codex 0.141.0, darwin/arm64, ChatGPT status, binary SHA-256 `51f848c212ee24e8da923a7175813a74c113d47e01f0d40f1fea46b12644c363`, elapsed 216 ms. executionReady=false by design. No model request, credential file read/copy or auth mutation performed by EvidenceLens. Snapshot v1 unchanged.

## Deviations and fixes

Rule 1: initial ancestry check over-rejected current user-owned Homebrew Caskroom mode 0775. Plan requires rejection of unsafe ownership/world-writable ancestry; correction permits trusted-owner group-writable ancestors, still rejects world write (except root sticky temp), and rejects group/world-writable executable files. Added positive 0770 and negative 0777 tests. Installation administrators are a trusted boundary; future isolated launch must bind binary digest.

SDK `_auto_chain_active` remains an unknown config key; key absent, auto_advance=false. No auto-next phase enabled. No phase-wide CDX completion is claimed by Plan 01; actual isolation and result/lifecycle integration remain downstream.

## Self-Check: PASSED

All six listed artifacts exist; task commits exist and pushed. Required task checks passed. Product remains 0.3.2; no release/tag, new chat, real coursework or live inference. Continue Plan 02.
