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
