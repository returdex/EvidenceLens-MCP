# Phase 16 runtime evidence

## Task 1 diagnosis

2026-10-04 local / UTC timestamps below. Primary checkout source `6a59d39`; dirty `.planning/STATE.md` only. Node v26.0.0, npm 11.12.1, TypeScript 5.9.3, Vitest 3.2.7; macOS 26.6.2 arm64. Package-lock SHA-256 `0de7ca5eb94be96a10b84f7d6e759e171ce744e2f3568c4f311398b8cddf78ae`.

### Ranked hypotheses and observations

1. Existing dependency read/loading path: strongest evidence. Local symlinks resolve correctly, targeted tsc/Vitest files are readable; Node main-thread sample during the stalled smoke spends 876/877 samples in synchronous filesystem reads. Last observed open dependency: `node_modules/vitest/dist/chunks/index.BCWujgDG.js`; isolated Python read completes in 0.040s, SHA-256 `6f4c9281e2c74bbcc59fc07da1c1cc231bf539b17abbbd47dc7a739a338daff1` (8,332 bytes, stat flags 64). No evidence establishes physical corruption or cloud-storage cause.
2. Node version/startup compatibility: CLI versions succeed. Alternate installed bundled Node v24.19.0 also fails the 60-second smoke ceiling (reaches RUN but no test result). A simple Node-26-only explanation is unsupported.
3. Dependency compatibility or runner initialization: existing versions match lock; next discriminating observation is a freshly installed exact locked tree. No package upgrade justified.
4. Resource contention: possible, not established. No unrelated process terminated; no claim based on process-count alone.

Historical >5-minute initialization failure remains unverified. Current smoke reproduces a dependency-loading stall; precise underlying OS/storage cause remains unknown. One late attempt to sample the alternate child returned 255 because its deadline had already ended; this is a diagnostic miss, not runtime proof.

### Bounded outcomes

| Probe | UTC start | Cap / elapsed seconds | Exit | Result |
|---|---|---|---|---|
| node-version | 2026-10-03T16:47:29.887178+00:00 | 30.0 / 0.02 | 0 | v26.0.0 |
| npm-version | 2026-10-03T16:47:29.931266+00:00 | 30.0 / 0.123 | 0 | 11.12.1 |
| dependency-read | 2026-10-03T16:47:30.078780+00:00 | 30.0 / 0.073 | 0 | Symlinks + targeted bytes readable |
| tsc-version | 2026-10-03T16:47:30.174109+00:00 | 60.0 / 0.13 | 0 | 5.9.3 |
| vitest-version | 2026-10-03T16:47:30.326470+00:00 | 60.0 / 0.181 | 0 | 3.2.7 |
| smoke | 2026-10-03T16:47:39.886308+00:00 | 60.0 / 65.014 | -9 | TIMEOUT; empty output; TERM then KILL |
| smoke-sample | 2026-10-03T16:48:08.758814+00:00 | 30.0 / 1.304 | 0 | Read-bound main-thread sample |
| stalled-file-read | 2026-10-03T16:48:24.974218+00:00 | 30.0 / 0.04 | 0 | 8,332 bytes readable |
| bundled-node-version | 2026-10-03T16:49:03.020185+00:00 | 30.0 / 0.138 | 0 | v24.19.0 |
| smoke-bundled-node | 2026-10-03T16:49:03.185398+00:00 | 60.0 / 60.024 | 143 | TIMEOUT; RUN banner only; TERM |
| alternate-sample | 2026-10-03T16:50:03.726887+00:00 | 30.0 / 0.04 | 255 | Child already exited; unavailable sample |

Commands: `node --version`; `npm --version`; `node node_modules/typescript/bin/tsc --version`; `node node_modules/vitest/vitest.mjs --version`; `node node_modules/vitest/vitest.mjs run tests/smoke/project-config.test.ts`. Alternate smoke changes only node executable to the configured bundled Node. File probe uses Python pathlib read/stat/hash; sample uses macOS `sample <owned-child-pid> 1 -file <temporary-report>`.

The temporary stdlib supervisor starts a fresh owned group, captures output/UTC/duration and enforces 30s probes / 60s startup. Timeout TERM grace is 5s, then KILL/reap; both timed-out groups confirmed absent before further recovery. All other probes also left no owned group. No global node/npm kill or unbounded retry.

### Offline path inspection

- Existing `npm test` explicitly excludes `tests/providers/deepseek-live.test.ts`; that file really calls a provider if credentials exist. Keep the exclusion.
- Child env removes keys matching KEY/TOKEN/SECRET/PASSWORD/PROVIDER/DEEPSEEK/EVIDENCELENS/NODE_OPTIONS/VITEST/PYTHONPATH/PYTHONHOME, then sets `EVIDENCELENS_DISABLE_PROVIDER=1`. No values printed. Full-run environment additionally disables automatic Compose env-file loading and removes inherited COMPOSE overrides. No project `.env` exists (existence only inspected); private local config never read by this execution.
- `automatic-live-review-cli.test.ts` uses invalid argv, injected build dependencies, PATH stubs and isolated temporary failing preflight. Real production paid command is never invoked directly by this task.
- `docker-review-real.test.ts` does invoke real `docker compose ... config --format json`: local configuration interpolation with synthetic sentinels, no daemon container launch. Other Docker spawns are injected. `compose.yaml` has local context/binds; no remote include. CLI missing-key checks fail preflight.
- Contract executable tests disable providers or use isolated missing/invalid/conflicting configurations; provider transport tests inject fetch; E2E uses InMemoryTransport plus injected provider/fetch guard.
- Audit/source tests operate on synthetic temporary Git repos and read historical public proof fixtures. They do not refresh historical paid proof authority. Preserve these tests despite live-named files.

Task 1 acceptance: real failures retained, narrowed diagnosis supports exact-lock recovery, all owned timed-out processes reaped. Smoke is not yet green. Next: preserve existing dependencies, install exact lock in a temporary directory and prove the primary path after recovery.
