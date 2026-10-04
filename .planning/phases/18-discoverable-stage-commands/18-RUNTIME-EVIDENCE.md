# Phase 18 — Current runtime recovery and verification

## Preserved failures and diagnosis

All commands use `/tmp/el17-run.py`: sanitized provider/Compose environment, EVIDENCELENS_DISABLE_PROVIDER=1, owned process group, bounded termination. Raw metadata/logs are under `/tmp/el17-evidence/`; these temporary logs are not public proof storage. Commands below are this execution, not historical Phase 16 acceptance.

- `el18-runner-probe`: Vitest --version, UTC 2026-10-04T12:53:51Z, cap 30s / elapsed 30.007s, timeout, child -15 / supervisor 124, no owned group remaining.
- `el18-esm-diagnostic`: NODE_DEBUG=esm runner --version, UTC 12:57:01Z, 10.013s, timeout; trace reaches CJS module loading including picomatch. Read-only stat found its lib/picomatch.js and TypeScript entry/compiler marked compressed,dataless. This supports dependency materialization as the recovery target; it does not prove a unique root cause.
- `el18-dataless-read`: read 45-byte TypeScript entry, cap 3s / 2.763s, exit 0. Materialization can complete but small reads were slow.
- `el18-deps-recovery`: attempted exact-lock npm ci --ignore-scripts --no-audit --no-fund in isolated scratch directory, UTC 12:57:44Z, cap 180s / 1.238s, exit 1: registry returned 404 for locked tinyglobby-0.2.37.tgz. Repository dependencies and lock were not replaced. No alternate versions installed.
- `el18-deps-materialize`: bounded read-only 32-worker materialization of existing dependency files, UTC 12:58:18Z, cap 180s / 180.012s, timeout; progress reached 1,300 files, remainder dropped from 2,403 to 1,093. No group remained. Continued only because actual materialization progress was observed, with a fresh 240s ceiling and remaining-file selection.
- `el18-toolchain-ready`: TypeScript --version and Vitest --version after materialization progress, UTC 13:01:21Z, cap 30s / 4.538s, exit 0. TypeScript 5.9.3, Vitest 3.2.7, Node v26.0.0 darwin-arm64. No group remained.

No dependency bytes, versions, integrity entries or test assertions were intentionally changed. Prior recovery backup remains untouched. The old initialization timeout remains in v1.2-INITIALIZATION.md. Tool startup alone is not current build/test acceptance.

## Recovered primary checkout, pre-patch 0.3.0

- `el18-deps-materialize-continued`: UTC 2026-10-04T13:01:29.446119Z, cap 240s / elapsed 200.122s, exit 0; finished remaining 1,093 dependency reads, no owned group. Existing tree was materialized in place, not replaced.
- `el18-test-inventory`: initial file-list attempt during materialization, UTC 13:02:07Z, cap 60s / 60.015s, timeout -15 / supervisor 124, no group.
- `el18-inventory-materialized`: after materialization completed, same file-list command, UTC 13:05:16Z, cap 60s / 0.234s, exit 0. Exactly 43 paths match tracked tests/**/*.test.ts excluding only tests/providers/deepseek-live.test.ts; no backup/vendor tests admitted.
- `el18-prepatch-build`: `npm run build`, UTC 13:02:27.574371Z, cap 300s / 163.790s, exit 0, no group. Fresh dist generated at version 0.3.0.
- `el18-prepatch-affected`: six-file affected command specified in Plan 04, UTC 13:05:30.211556Z, cap 120s / 3.197s, exit 0. **6 files / 118 tests pass**, zero failures/skips; no group. Includes project-config, review-tool (fresh dist), public-contract-docs, fit5032-fixture, review-provider and offline mocked docker-review E2E. PDF fixture indexing/font fallback warnings were emitted; these are not real Docker/provider or visual-quality acceptance.
- Combined command/install/source-boundary Node suite at UTC 13:00:03Z: **21/21**, no failures/skips, 0.563s / cap 60s, exit 0.

This closes current 0.3.0 startup/affected-test uncertainty but does not accept a future 0.3.1 patch. Build and affected tests must run again after Plan 04 edits. The historical 795-test full-suite result is not renewed. All existing lock/package dependency metadata remain unchanged. No live provider invocation or credentials were used.

### Exact source/build SHA-256 at pre-patch acceptance

| File | SHA-256 |
|---|---|
| `VERSION` | `d915cc95d6ca8f47ae297713ed46d4e5c5d99ddd29fc3c61e263bdf305f2b5b0` |
| `package.json` | `b8e6bd96f42fe7f48962e3bfda3f3ae35df7aecc061238114b61cc8874cb6872` |
| `package-lock.json` | `6585bf59c21d063a4fe9aba719615a8c6affc02be38ee173f33700dcb683c652` |
| `src/server.ts` | `f8ca9491cd87f394e37da03de6e65bd22ab17f1e61fe266aa967a2fcf7786987` |
| `src/tools/review.ts` | `c1a1c7efcbed2da8be2233d20881b072399e6898fdf52e0c4ee9e62507109ccb` |
| `docs/mcp-contract.md` | `eb8b4f784a714fbdf801bf182d5f9295005f9bfe04d014e095eef314db9835af` |
| `tests/smoke/project-config.test.ts` | `0231cdc6cb0a89e20e486bea562b2e6428ed3ee4a79259898bfd7463e3eb30f7` |
| `tests/contract/review-tool.test.ts` | `bfc7efe55f813e505a0b289169fed67dc3cd5d6c18676ebb03b9f62999f4490d` |
| `tests/contract/public-contract-docs.test.ts` | `3f634ee2d4f2d3de47275f2ae3c0137a85cdb7bc324d517dc5af871e91174f06` |
| `tests/contract/fit5032-fixture.test.ts` | `a3696687adff2ade800ab41014bc8eadd621e6d7ee8ce2bdba1b13552de415dd` |
| `tests/contract/review-provider.test.ts` | `dc917ce7b495402c020f31597ff7605f84fc327fdc15255fe91dad9ff8719222` |
| `tests/e2e/docker-review.test.ts` | `045fc05254140b6692cd23d5cefede27ba4103fb622e479c0dcb28583888772f` |
| `tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json` | `0a0a78df1ac75dbba1cf42c7200af7f296706876929a572cc6199172e14fb331` |
| `dist/server.js` | `efeb6439a3225219904998615bcacab77be877d35e769b0c51ab7d2779dd964a` |
| `dist/tools/review.js` | `797fa76776e646afd21d14f2bd3dbff2954d99a7af7db39934011b912e16ebd8` |

After support-row documentation update: `el18-host-support-node`, UTC 2026-10-04T13:07:14.634128Z, cap 60s / 0.511s, exit 0; same 21/21 Node tests, zero failures/skips, no owned process group. No runtime/source version edits followed pre-patch hashes.
