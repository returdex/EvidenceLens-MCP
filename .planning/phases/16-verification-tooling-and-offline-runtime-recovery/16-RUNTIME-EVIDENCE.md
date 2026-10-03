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
