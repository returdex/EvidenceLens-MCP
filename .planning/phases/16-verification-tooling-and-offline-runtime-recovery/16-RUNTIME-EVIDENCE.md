# Phase 16 runtime evidence

**Final status: passed.** Fresh primary build succeeded; final unchanged default `npm test` passed 43 files / 795 tests, zero failed/skipped. Earlier failures below are retained chronological evidence. VAL-02 is verified within this local scope.

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

## Task 2 recovery attempts and retained failures

Recovery iteration 1: exact-lock dependency reconstruction. Copied only package.json/package-lock.json to a fresh temporary directory. Lock integrity remained identical. Inspected installed lifecycle declarations: esbuild has `node install.js`, fsevents has developer build scripts; installed with `--ignore-scripts --no-audit --no-fund`, so no lifecycle code ran. Native darwin-arm64 optional packages are present in the lock. No package version updates.

Initial `npm ci --prefix <temporary-directory>` from the repository failed EUSAGE (missing a temporary-folder-named package in lock). Running the same unchanged lock with the temporary directory as cwd succeeded: 61 packages in 681ms. This corrects invocation context; no lock rewrite. A disposable synthetic test proved only runner startup in that directory: 1/1 passed (1.037s including process startup), not product acceptance.

Preservation attempt: moving old node_modules out to the temporary directory stalled in the OS rename syscall (878/878 samples); the task-owned group was terminated/reaped after approximately one minute. Both source and destination were checked: original node_modules still existed; backup destination did not. This first mutation was bounded externally by tool-group ownership rather than the supervisor; subsequent mutations use the supervisor. A same-parent rename completed in 0.038s. Old dependencies now reside at `.phase16-recovery/node_modules`, locally excluded in `.git/info/exclude`; new exact-locked dependencies were moved into primary `node_modules`. Old dist was not deleted. Do not mistake preserved dependency bytes for tracked deliverables. No automatic backup deletion.

Primary recovered-tree smoke still timed out at 60s (RUN banner, no test completion). Thus the isolated startup success does not establish primary-path recovery. Broader source reads also stall: build main-thread sample has 891/891 synchronous read samples with `src/filesystem/policy.ts` open; later open files advance to roles.ts then providers/deepseek.ts. Separate Python policy read and Node original/copy reads succeed quickly. This supports intermittent filesystem access delay, without identifying its OS/storage cause.

Other bounded diagnostic results: source diff timed out at 30s; git archive timed out at 30s leaving an unusable zero-byte tar (not a snapshot); a single git object read succeeded after 27.197s. A whole-source hash helper did not finish within its externally enforced approximately 300s limit and was terminated/reaped; no completed manifest or source equivalence is claimed from it. An xattr helper failed because this Python lacks os.listxattr; `ls -ldO@` succeeded and showed provenance attribute names only, no dataless flag on the sampled paths. Several process samples arrived after the target exited and are recorded as unavailable, never proof. No attributes or OS settings changed.

Fresh build attempt 1 timed out after 300.026s, exit signal TERM, no compiler result. Prior progress through distinct source files and the successful (but slow) 58.805s baseline run justify one explicit increased build ceiling of 600s. The second run later exited 0 in 517.410s; full-suite acceptance remains required for VAL-02. The baseline is 12 passed / 0 failed / 0 skipped and is separate from Vitest.

### Command outcomes after diagnosis

| Command label | UTC start | Cap / elapsed seconds | Exit | Timeout |
|---|---|---|---|---|
| locked-install | 2026-10-03T16:50:03.848079+00:00 | 180.0 / 0.337 | 1 | false |
| locked-install-cwd | 2026-10-03T16:50:20.187833+00:00 | 180.0 / 0.809 | 0 | false |
| recovered-runner | 2026-10-03T16:50:30.029977+00:00 | 60.0 / 1.037 | 0 | false |
| preserve-dependencies-local | 2026-10-03T16:52:48.148695+00:00 | 30.0 / 0.038 | 0 | false |
| activate-locked-dependencies | 2026-10-03T16:53:05.192787+00:00 | 30.0 / 0.038 | 0 | false |
| smoke-primary-recovered | 2026-10-03T16:53:17.347864+00:00 | 60.0 / 64.802 | 1 | true |
| primary-read-probe | 2026-10-03T16:54:58.038473+00:00 | 30.0 / 5.87 | 0 | false |
| source-diff | 2026-10-03T16:57:26.425982+00:00 | 30.0 / 30.007 | -15 | true |
| archive-source | 2026-10-03T16:57:59.484196+00:00 | 30.0 / 30.006 | -15 | true |
| git-object-read | 2026-10-03T16:59:25.795535+00:00 | 30.0 / 27.197 | 0 | false |
| build | 2026-10-03T16:54:56.896819+00:00 | 300.0 / 300.026 | -15 | true |
| baseline | 2026-10-03T16:59:11.744782+00:00 | 60.0 / 58.805 | 0 | false |

All supervised rows report owned_group_remaining=false. The extended build later passed; full offline suite is running under its planned 900s ceiling. Acceptance source is `d259bee` with only planning-state/evidence edits intended; product, tests, scripts and Skill have not been edited by this phase. Full current-source verification and final diff reconciliation remain required.

## Fresh build completion

`npm run build`, primary checkout, UTC start `2026-10-03T17:00:26.092048+00:00`, explicit 600s cap, actual 517.410s, exit 0, no timeout or remaining group. Actual output: `evidencelens-mcp@0.2.4 build` then `tsc -p tsconfig.json`. This is a fresh compiler completion; prior dist alone was never accepted. A sample during this run showed 889/889 main-thread samples in OS open(), consistent with file access delays, not a demonstrated type-check error.

The full intended `npm test` is now running. Interim diagnostic gaps: the expanded 60s link pass and 60s git diff check timed out; initial 41-link Plan 01 check was successful. A non-atomic planning-state write helper timed out at 60s; its replacement wrote temporary same-parent files and renamed them atomically, completing in 0.038s with REQUIREMENTS/ROADMAP/STATE/PROJECT reconciled. No product source changed. Do not infer a historical root cause from this operational workaround.

## Source and document reconciliation after build

At UTC `2026-10-03T17:13:42.206998+00:00`, bounded `git status --short --untracked-files=normal` exited 0 in 0.126s. Only PROJECT/REQUIREMENTS/ROADMAP/STATE, Phase 16 evidence/validation/progress/review, and docs/development-validation.md are dirty/new. Product source, tests, lock, Skill, original audit and historical proof are unchanged from `d259bee` (whose runtime source is unchanged from `fe325f5`). The abandoned full-source manifest is unnecessary for a scratch acceptance claim because no product scratch acceptance is being claimed; primary source identity is now reconciled by Git status and exact lock/Skill hashes.

Changed/planned document whitespace and link check: 13 files, 20 relative links; exit 0, 53.333s, UTC start `2026-10-03T17:12:55.000535+00:00`. Skill SHA and lock SHA still match the initial record; VERSION/package/lock/config all equal 0.2.4. Reuse the original successful 41-link check for unchanged Skill references rather than promoting later timed-out broad repeats to passes. New runbook/report links are covered by this targeted check.

## Recovery iteration 2: exclude preserved dependency tests correctly

First full offline attempt was stopped deliberately at 397.306s (exit -15, 900s ceiling not reached, owned group absent), rather than accepted. The parent sample showed all four libuv worker threads blocked in reads; lsof revealed paths under `.phase16-recovery/node_modules 2/zod/.../*.test.ts`. A direct inventory confirmed the backup entry had become `node_modules 2`; the mechanism of that name drift is unknown. The recovery operation had introduced a backup within discovery range without rechecking its actual final name. This is an execution deviation corrected here, distinct from the original historical stall. No suite/test counts were reported by this rejected run.

Fix: preserved the entire observed backup under a literal exclusion container, now `.phase16-recovery/node_modules/original`; a bounded same-root rename completed in 0.039s. No package/test/config edits and no deletion. Before retry, ran `node node_modules/vitest/vitest.mjs list --filesOnly --exclude tests/providers/deepseek-live.test.ts`: exit 0 in 0.232s. Compared output with every tracked `tests/**/*.test.ts` minus the explicit live-provider file: exact set equality, 43 files, no backup/vendor tests or omitted intended offline file. This material environment correction justifies a new full run, `npm test` with the same 900s ceiling. Earlier successful build remains applicable: source, lock and active dependency bytes unchanged by moving the backup.

Future recovery must inventory the actual backup path and verify test discovery, not assume a rename outcome or rely on Git ignore to exclude tests. The original dependencies remain available for manual recovery; do not delete while diagnosis remains relevant.

## Third and final environment comparison: single worker

Correct-scope default `npm test` was deliberately stopped after 470.971s once it had 11 known 5-second timeouts and a long local clone still outstanding. Its 42 completed file rows report 714 tests: 703 passed, 11 failed; these are partial-file totals, not whole-suite totals. The missing file was audit-proof-chain.test.ts. Owned group absent after TERM/KILL cleanup.

Remaining local clone was inspected: upload-pack waits for protocol input; clone client spends 897/898 samples in copy_file/copy_fd/read on local Git objects. No remote endpoint involved. `git count-objects -v`: 226 loose objects (776 KiB), 6,989 packed objects in three packs (3,082 KiB), no garbage. A sampled 60-byte loose object read independently in 0.037s and its decompressed SHA-1 matched its filename. This is evidence of intermittent/local I/O delay, not a corrupt Git-object diagnosis; no Git storage, attributes, history or OS settings modified.

A single failed file rerun (`npm test -- tests/providers/config.test.ts --maxWorkers=1 --minWorkers=1`) passed 45/45, exit 0 in 0.669s with unchanged assertions and 5s test limit. This supports a bounded final full-suite comparison with one worker; it does not establish whether warm file state, concurrency or another host factor caused the improvement. Full command is `npm test -- --maxWorkers=1 --minWorkers=1`, same 43-file scope, same live exclusion, 900s cap. No extra skip or test timeout increase. Final outcome follows when available.

Source-equivalence check (12.104s, exit 0) confirmed identical Git object IDs across initial `fe325f5`, build source `d259bee`, and test source `b79f97c`: src `80a7fa4e3a350b7b37466112cc5b9ec5620efec7`; tests `974b6641c15a114a21879c3ee1c88a1d87b64fa8`; scripts `be284d55f92a3e0a78df6aad9590f09f5484c9b4`; skills `fbb83888b7d65b613f689f8cd7130a1a4e279abe`; package/lock/tsconfig/compose and the entire historical Phase 10 directory also match. Runtime source is unchanged across report commits. Schema-drift gate: exit 0, drift_detected=false, blocking=false, no ORM/schema files. Later git diff --check passed in 17.461s after the earlier timeout.

## Serial diagnostic run terminal result (before fixture repair)

UTC start `2026-10-03T17:25:27.097567+00:00`; cap 900.0s; elapsed 829.022s; exit 1; timeout False; owned_group_remaining=False.

```text
 FAIL  tests/smoke/docker-config.test.ts > Docker deployment configuration > requires an explicit offline profile and a provider startup failure matrix
 FAIL  tests/scripts/audit-proof-chain.test.ts > proof chain certifier > rejects a caller-selected external certifier before external effects
 FAIL  tests/scripts/audit-proof-chain.test.ts > proof chain certifier > rehearses a complete committed passed synchronization and final audit offline
 Test Files  2 failed | 41 passed (43)
      Tests  3 failed | 792 passed (795)
   Start at  04:25:27
   Duration  828.52s (transform 456ms, setup 0ms, collect 4.41s, tests 817.71s, environment 3ms, prepare 1.05s)
```

Raw log SHA-256 `fc554877c2953aec950150be46424fe52d8fb30d12a2aafb37ff9bab326b1280`. Log remains local; quoted totals are actual runner output.

## Observed test defect and minimal repair

The completed serial diagnostic run returned 792 passed / 3 failed across all 43 files. Two failures were 5s I/O timeouts; the third was a real assertion failure `PROOF_SYNC_STALE`. Inspection of `scripts/sync-proof-state.mjs:82` showed its deliberately strict v1.0 PROV-01 replacement contract. The positive rehearsal in `tests/scripts/audit-proof-chain.test.ts` cloned the current v1.1 requirements, which legitimately no longer contain PROV-01. The production stale guard behaved correctly; the fixture depended on mutable milestone state.

Normal execution deviation (observed test defect): commit `d7a8ca1` adds six lines only in that test. It writes the synthetic v1.0 requirement/checklist/trace row inside the temporary checkout and asserts the real repository requirements remain byte-for-byte unchanged. Uses the existing synthetic pattern from sync-proof-state.test.ts. No production guard weakening, extra skips, timeout increase, history rewrite or real proof edit. Full affected regression: 81 proof-chain + 5 Docker-config tests passed, 6.330s total, UTC start 2026-10-03T17:40:42.190657+00:00. The same previously slow clone test then passed in 518ms; this is current recovered behavior, not proof of a specific OS cause.

This is developer validation-fixture maintenance, not a user-visible product feature/runtime fix. Product 0.2.4 retained under DEVELOPMENT.md; dependency, runtime, Skill and historical proof bytes unchanged. Environment reconstruction and backup exclusion were the two recovery changes; single-worker execution was a diagnostic comparison. The observed fixture defect was the third cause-specific repair.

## Final primary-checkout acceptance

- Source: `d7a8ca1` (test fixture fix committed); only review/runtime/runbook docs dirty. Build source `d259bee` has identical src/package/lock/compiler configuration; the six-line test-only fix is outside tsconfig's src include. Reuse the actual successful build, no old-dist inference.
- Command: exactly `npm test`, with original script and default workers; provider-disabled sanitized environment and live exclusion retained. No serial override in the final pass.
- UTC start: `2026-10-03T17:41:33.829979+00:00`; ceiling 900s; actual 8.452s; exit 0; timeout=false; owned_group_remaining=false.
- Runner: **43 files passed / 795 tests passed / 0 failed / 0 skipped**. Runner duration 7.95s. The one live-provider file remains intentionally excluded. File-set comparison already confirmed all 43 tracked intended offline files; no backup/vendor tests.
- Separate Node source-boundary regression: **12 passed / 0 failed / 0 skipped**, 58.805s on unchanged Skill/helper source.
- Official validator: unchanged-target Plan 01 success/control reused. Build: exit 0 / 517.410s, original 300s failure retained.
- PDF synthetic fixtures emit parser/font fallback warnings; assertions pass. This does not establish document-rendering quality.
- No required local validation failure remains after final regression. No Linux-specific filesystem, real Docker-container, paid API, remote CI or broader language/host proof claimed. Historical I/O cause remains unknown; future recurrence should follow bounded diagnosis, not blind retries.

Final raw full-suite log SHA-256 `b1d0a0428e3ca42f736b3e38c2ad46e495a9864f3581ed90cad1ac6797bf7eeb`. Raw logs remain local; sanitized results above are durable.
