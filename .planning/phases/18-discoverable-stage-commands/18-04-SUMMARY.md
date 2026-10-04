---
phase: 18-discoverable-stage-commands
plan: "04"
subsystem: release-metadata
tags: [version, regression, offline]
requires: [{phase: 18-03, provides: Accepted installed commands}]
provides: [Product patch 0.3.1, Fresh affected regression evidence]
affects: [19]
tech-stack:
  added: []
  patterns: [Version-only diff assertions, Fresh build before compiled-process tests]
key-files:
  created: [.planning/phases/18-discoverable-stage-commands/18-RUNTIME-EVIDENCE.md]
  modified: [VERSION, package.json, package-lock.json, .planning/config.json, DEVELOPMENT.md, src/server.ts, src/tools/review.ts, docs/mcp-contract.md, tests/smoke/project-config.test.ts, tests/contract/review-tool.test.ts, tests/e2e/docker-review.test.ts, tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json, docs/development-validation.md]
requirements-completed: [CMD-01, CMD-05]
completed: 2026-10-05
---
# Plan 18-04 — Accepted feature version and current regression

## Task commits

- 18-04-01: e812fe8 — synchronized one compatible feature patch, 0.3.0 -> 0.3.1, after Plan 03 accepted in d1b94d2.
- 18-04-02: 6b9ff1b — synchronized current examples/expectations and verified fresh affected offline behavior.

## Verification

All product metadata matches 0.3.1. Parsed lock comparison differs only at root version and packages[empty].version; dependencies, integrity entries and analyzerVersion=1.0.0 preserved. Source and expectation bytes asserted equal their previous bytes with only the product version replacement. git diff --check passed. No historical phase/proof mutation, tag or release.

Current 0.3.1 commands, each with sanitized environment and owned process cleanup:

| Run | UTC start | Cap / elapsed seconds | Actual result |
|---|---|---|---|
| npm run build | 2026-10-04T13:13:24.771838Z | 300 / 0.824 | exit 0; fresh dist |
| six affected npm-test files listed in plan | 2026-10-04T13:13:37.374552Z | 120 / 2.798 | exit 0; 6 files / 118 tests, 0 failed/skipped |
| Node command/install/source-boundary tests | 2026-10-04T13:13:37.374609Z | 60 / 0.715 | exit 0; 21 tests, 0 failed/skipped |

No owned process groups remained. 18-RUNTIME-EVIDENCE.md preserves exact commands, current hashes, earlier failures and pre-patch results. PDF synthetic fixtures emit indexing/font fallback warnings; no visual-quality, real-container or paid-provider claim.

## Deviations and recovery

Added tests/e2e/docker-review.test.ts to mechanical version scope because its mock MCP identity/assertion also used the current product version. No assertion weakened. Existing dataless dependency reads caused startup delays; exact-lock scratch npm ci failed with registry 404. Existing dependency tree was then materialized read-only without replacing bytes/versions; all progress/timeouts are retained. Test inventory matched exactly 43 tracked offline files, excluding only the intended live-provider test. Full 795 historical tests were not repeated or relabeled current; Phase 18 is the first phase of this milestone, so no earlier current-milestone phase regression gate adds scope.

## Self-Check: PASSED

Both tasks completed and pushed, current build/tests passed, manual semantic/host limits retained. Ready for phase goal verification. Phase 19 capture/export and Phase 20 independent runner are not implemented by this patch.
