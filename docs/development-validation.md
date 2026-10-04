# Local development validation

Run from the repository root. Current development product version is 0.3.2. These checks establish local metadata/build/offline behavior; they do not renew paid-provider proof, certify another host, install the Skill globally or prove its language semantics.

## Official Skill validator

The installed official script is external to this repository. Inspect it before execution; do not replace it with a repository fallback. The Phase 16 environment used Homebrew Python 3.14.5 and an isolated venv under `/tmp/evidencelens-phase16-validator`. Both the default and bundled Python initially lacked PyYAML.

```sh
python3 -m venv /tmp/evidencelens-phase16-validator
/tmp/evidencelens-phase16-validator/bin/python -m pip install --disable-pip-version-check -r tooling/skill-validation-requirements.txt
/tmp/evidencelens-phase16-validator/bin/python -c 'import sys, yaml, importlib.metadata; print(sys.version); print(importlib.metadata.version("PyYAML"))'
/tmp/evidencelens-phase16-validator/bin/python /Users/yifeng/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/assignment-review
```

Use a fresh task-specific venv path if that directory belongs to another run. The [exact developer dependency](../tooling/skill-validation-requirements.txt) is separate from npm/runtime dependencies. Installation uses the configured trusted Python package source. Phase 16 resolved the cached PyPI macOS arm64 CPython 3.14 wheel; another platform may resolve a different compatible artifact. No system package changes are needed.

Use a 180-second cap for venv creation/install and 30 seconds for import/validation. Run each command in an owned process group; capture start, duration, exit and sanitized output. On timeout terminate that group, wait up to five seconds, then kill/reap only remaining owned children. Do not retry without a diagnosed change. A timeout is not a successful check.

Negative control: create a temporary directory containing `SKILL.md` with exactly `---\nname: negative-control\n---\n# Synthetic fixture\n`; invoke the same validator against it. Require nonzero exit and `Missing 'description' in frontmatter`. Real target success requires exit 0 and `Skill is valid!`. Do not alter the real Skill for the control.

Keep venv, pip reports and raw logs outside Git. Remove only task-owned temporary files after evidence capture if cleanup is desired. Record the actual script/Skill SHA-256 and interpreter/dependency version: an updated external validator requires fresh evidence.

[Phase 16 tooling evidence](../.planning/phases/16-verification-tooling-and-offline-runtime-recovery/16-TOOLING-EVIDENCE.md) records actual commands and environment outcomes. Official acceptance checks frontmatter and unfinished placeholders only; semantic review remains separately scoped.

## Offline runtime diagnosis and acceptance

Use the checked-in [package scripts](../package.json) and [lock](../package-lock.json). Node v26.0.0/npm 11.12.1 were observed on macOS arm64; lock versions are TypeScript 5.9.3 and Vitest 3.2.7. Existing package engine constraints apply. The real Compose CLI is needed by two local configuration-resolution tests; these parse config with synthetic credentials and do not start containers. Do not replace the full test script with unfiltered `vitest run`.

Before execution, inspect test subprocess/transport paths. Remove inherited provider credentials and overrides from child environments, set `EVIDENCELENS_DISABLE_PROVIDER=1`, remove inherited Compose overrides and set `COMPOSE_DISABLE_ENV_FILE=1`. This is explicit test isolation, not a network sandbox. Never run production paid proof scripts as a validation shortcut.

Record Git HEAD/dirty paths and the lock hash. First probe Node/npm versions, local compiler/runner `--version`, and the focused project-config test (60-second ceiling). Use the same owned-process method as above. If startup fails, inspect a sampled owned process and its open file before changing dependencies.

Actual Phase 16 recovery used a temporary directory containing only unchanged package.json/package-lock.json:

```sh
# cwd is the temporary directory, not the repository
npm ci --ignore-scripts --no-audit --no-fund
```

Limit installation to 180 seconds. Inspect lifecycle/native prerequisites first; Phase 16's locked darwin-arm64 optional binaries supported a runner startup test without install scripts. The `--prefix` form failed for the observed npm invocation; changing cwd succeeded without changing the lock. Preserve the old tree, then move the new exact-locked tree into the original checkout only after a diagnostic startup succeeds. Never `npm update` or delete existing dependencies speculatively.

Phase 16's original dependencies are preserved locally at `.phase16-recovery/node_modules/original` (excluded via `.git/info/exclude`, not committed). Initial movement out of the checkout stalled; same-parent preservation succeeded. Do not delete this backup while recovery is unresolved. Recovered primary startup initially timed out; see the runtime report for final acceptance status. Inspect the actual backup name after moving it: a `node_modules 2` directory was admitted by Vitest during this run. Git ignore does not define test discovery. Keep all backups beneath a literal `node_modules` exclusion container and verify the file list before a full run.

Required acceptance commands, from the primary checkout:

```sh
npm run build
npm test
node --test tests/baseline/source-boundary.mjs
```

Use 300 seconds initially for build, 900 for the full suite, and 60 for the separate boundary suite. A ceiling extension requires observed progress and a recorded new ceiling; Phase 16 recorded one build extension to 600 seconds. `npm test` excludes the one live-provider file deliberately; capture all actual pass/fail/skip totals. The Node boundary suite is not discovered by Vitest. Build must exit 0 before any full-suite result can establish current compiled-server acceptance. Existing dist or a RUN banner cannot stand in for completion.

[Runtime evidence](../.planning/phases/16-verification-tooling-and-offline-runtime-recovery/16-RUNTIME-EVIDENCE.md) retains failures, recovery details and results. A working scratch runner does not establish primary-path recovery. Linux-specific anchored filesystem tests, real Docker containers, paid providers and remote CI require separate evidence.

After any dependency preservation/recovery, run:

```sh
node node_modules/vitest/vitest.mjs list --filesOnly --exclude tests/providers/deepseek-live.test.ts
```

Compare the paths with all tracked `tests/**/*.test.ts` except the one live-provider test. Phase 16 expects 43 files on its recorded source; derive a fresh expected set if source changes. Extra vendor/backup tests or missing intended files invalidate the run scope. Preserve the normal npm test command and its assertions.

## Phase 16 verified outcome

Fresh primary build passed. After exact-lock recovery and correcting a synthetic legacy-proof test fixture, the unchanged default `npm test` passed all 43 files / 795 tests in 8.452s, zero failures/skips. The separate boundary suite passed 12/12. No permanent worker override or relaxed timeout is required by the final result. Earlier 300s build, startup and I/O timeouts remain in the evidence; their underlying OS/storage cause was not established.

When testing a historical proof-sync flow, provide its matching synthetic requirement state in the temporary checkout. The current milestone's requirements are not a v1.0 fixture. Keep production stale-state guards and real planning documents intact.

## Phase 20 scoped acceptance (product 0.3.3)

The independent Codex feature passed a fresh build, the six affected version/public-contract/runtime files (118/118), and Codex/prompt/command/source-boundary Node suites (157/157). Each batch was capped at 120 seconds with sanitized child environments. Dependency versions and analyzerVersion remain unchanged. This scoped run does not renew the historical 795-test/provider proof.

[Phase 20 runtime evidence](../.planning/phases/20-bounded-independent-codex-execution/20-RUNTIME-EVIDENCE.md) records commands, timestamps, durations, exit codes and hashes. [Host acceptance](../.planning/phases/20-bounded-independent-codex-execution/20-HOST-ACCEPTANCE.md) separates actual OS/CLI/login status from synthetic model responses. Real ChatGPT inference and usage/handoff acceptance remain Phase 21 NOT_RUN.

## Compatible Codex diagnostics repair (product 0.3.4)

[Repair evidence](codex-diagnostics-repair.md) records bounded failure diagnostics and legacy receipt compatibility. Fresh build and affected Vitest 118/118 passed; Codex/prompt/command regression 173/173 passed, followed by final changed-boundary 80/80 (including 30 diagnostic cases) and source-boundary 12/12. Actual CLI failure checks use loopback synthetic responses only. Existing private failed receipts are not replayed or relabeled; real inference acceptance remains pending in Phase 21.

## Actual-home startup repair (product 0.3.5)

[Startup repair evidence](codex-startup-repair.md) records reproduction of ambient agents/cache permission errors and the sealed per-run CODEX_HOME fix. Fresh build, 194/194 Node checks and 118/118 affected Vitest checks pass. Actual Codex login metadata stayed unchanged; a real-home network-denied launch reached thread.started/turn.started. The prepared real synthetic model smoke remains awaiting explicit authorization; no coursework was replayed.

## Authorized smoke and HOME isolation repair (product 0.3.6)

The one explicitly authorized real synthetic smoke on 0.3.5 failed with permission-class stderr; its immutable failure receipt is retained and no retry occurred. Offline investigation reproduced original HOME/.agents/skills discovery. Review HOME and CODEX_HOME are now both sealed, and the production launcher wiring is pinned. Fresh build, Node 195/195 (9.575 s) and six affected Vitest files 118/118 (4.05 s) passed. Post-0.3.6 real inference remains NOT_RUN. See [full evidence](codex-startup-repair.md).

## 0.3.6 authorized real smoke — model catalog mismatch

The second user-authorized one-shot smoke reached thread.started and failed on a CLI item error categorized model_unavailable, rather than permission stderr. No validated result, no retry, cleanup complete and exact export unchanged. Read-only model discovery in a fresh isolated home listed gpt-5.5 and hidden codex-auto-review, but not the pinned gpt-5.4. See [the dated result](codex-startup-repair.md). No code changed; 0.3.6 runtime test results above remain their original evidence. Switching the pin and another real call await explicit user authorization.


## GPT-6 desktop CLI migration (product 0.3.7)

User-directed model pin is gpt-6.1-sol / low with actual desktop CLI 0.160.0. Fresh build passed, Node regression 196/196 (11.251 s), six affected Vitest files 118/118 (2.47 s). Read-only installed preflight passed. One real synthetic attempt reached a turn but failed on model-related stderr; catalog visibility is confirmed, real success is not. See [migration and precise limits](codex-startup-repair.md). No automatic retry or A4 replay. Phase 21 remains pending.
