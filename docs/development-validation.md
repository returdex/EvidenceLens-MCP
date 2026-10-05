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


## Model-cache TTL repair and successful real smoke (product 0.3.8)

The actual CLI fixture with matching catalog/inference ETags reproduces a non-fatal cache TTL miss, previously misclassified as model_unavailable and rejected. Only its exact known log is now tolerated; new negative controls retain genuine failures. Fresh build passed, Node regression 199/199 (10.505 s), six affected Vitest files 118/118 (2.52 s); focused checks 62/62 (7.754 s). One real production synthetic review succeeded (exit 0, terminal observed, source validation, complete cleanup), with persisted result and installed skill export verified afterward. Three preceding diagnostic runs remained failed; no old record was retried. See [precise evidence and dispatch accounting](codex-startup-repair.md). Phase 21 two-run/recheck/usage acceptance stays pending.


## Assignment review duration repair (product 0.3.9)

After an actual two-source preparation review hit the former 120-second ceiling, the independent supervisor's default and maximum deadline is now 600 seconds. Fresh `npm run build` passed. `node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs` passed 201/201 in 11.943 seconds with zero failures/skips. The six affected Vitest files (`project-config`, `review-tool`, `public-contract-docs`, `fit5032-fixture`, `review-provider`, `docker-review`) passed 118/118 in 3.80 seconds with zero failures/skips. Existing PDF/font warnings remained non-fatal.

The two new deadline tests use actual supervised child processes with the parent's deadline clock controlled: successful completion after five minutes of supervisor time, and termination/cleanup at ten minutes. These tests do not claim a live ten-minute model run. Installed command/reference graph regression passed within the Node suite. No new model request, A4 replay, dependency change or Phase 21 acceptance closure occurred. See [duration repair evidence](codex-timeout-repair.md).


## Local quote binding repair (product 0.3.10)

Fresh `npm run build` passed. `node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs` passed 219/219 in 12.272 seconds, zero failures/skips. Six affected Vitest files (`project-config`, `review-tool`, `public-contract-docs`, `fit5032-fixture`, `review-provider`, `docker-review`) passed 118/118 in 3.67 seconds; existing PDF/font warnings remained non-fatal. Focused changed-boundary suites (`citations`, `diagnostics`, `result`) passed 68/68 in 3.388 seconds. New tests include UTF-8, source-relative offsets, exact and ambiguous quotes, rejection branches, old v1 compatibility, installed capture/export, terminal publication, and an actual pinned CLI quote-only schema fixture.

One real production synthetic GPT-6 review succeeded in 11.685 seconds with a Chinese/emoji quote locally resolved to bytes 0..75, complete cleanup, compatible persisted result revalidated and unchanged exact prompt export. No actual A4 content was dispatched, no replay or second inference occurred. New-protocol full-coursework and Phase 21 handoff/recheck/usage acceptance remain pending. See [binding repair evidence](codex-source-binding-repair.md).


## Captured-reference binding repair (product 0.3.11)

Fresh `npm run build` passed. `node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs` passed 231/231 in 14.709 seconds, zero failures/skips. The six affected Vitest files passed 118/118 in 4.02 seconds; existing PDF/font warnings remain non-fatal. Twelve reference-protocol checks include exact Unicode/CRLF/tab text, repeated content, source/excerpt rejection, immutable input, legacy stored-result roundtrip, capture splitting/collision/budget boundaries, per-run output schema, installed terminal publication, and an actual pinned CLI loopback fixture accepted through strict binding.

One actual A4 preparation run in its original conversation succeeded in 126683 ms under explicit user authorization: two official sources, eight excerpts, 16 findings, both coverage rows covered, exit 0, terminal observed and complete cleanup. The saved result was independently revalidated against its snapshot and execution digest. The original conversation completed and displayed the validated review; five preceding failed/uncertain receipts retained their original statuses. This establishes preparation-path execution for these materials, not solution correctness or submission acceptance. Phase 21 handoff/recheck/usage acceptance remains pending. See [reference repair evidence](codex-reference-repair.md).


## Complete-feedback correction (product 0.3.12)

Fresh build passed. Node Codex/prompt/command/source-boundary batch passed 231/231 in 12.381 seconds; six affected Vitest files passed 118/118 in 3.74 seconds, no failures/skips. Default complete analysis is now requested by shared Skill and capture guide; summarization requires explicit user choice and an accessible same-run full report. No schema, auth, isolation permissions, model or dependency changes. A user-authorized three-reviewer experiment used identical frozen official A4 material and task in independent captures, all prepared before first inference. Three actual reviews succeeded (243281/256748/253774 ms, 18/13/17 findings). Root independently revalidated saved results and matching execution hashes, and checked complete preservation of all findings, claims, actions, evidence quotes and limitations in private Markdown reports. Exit 0, terminal observed and cleanup complete for all three. Host source-backed comparison and full reports were delivered in the original conversation. Root additionally corrected composite coverage references and retained its original privately; no model result was changed. One complementary constraint-check reminder was retained, with shared visual-rubric limitations and no measured accuracy improvement. Structural checks do not certify semantic correctness. [Evidence and limits](codex-complete-feedback.md). Phase 21 remains 0/6, next accepted phase patch 0.3.13.


## User-selected multi-review default (product 0.3.13)

Shared installed Skills now default to three independent Codex reviewers with source-backed host comparison, preserving full reports and supporting explicit single-reviewer selection. Reuses the actual three-reviewer A4 proof above; no new inference or DeepSeek request accompanied the default policy edit. Fresh build and installed shared/four-entry symlink checks passed. Node regression 231/231 (12.164 seconds), six affected Vitest files 118/118 (3.56 seconds), zero failures/skips. Provider configuration, dependencies, runtime isolation and per-run schema are unchanged. Phase 21 stays 0/6; next accepted phase patch 0.3.14.


## Cross-provider default (product 0.3.14)

User selects one DeepSeek plus one Codex independent stage reviewer by default, replacing three Codex reviewers. Both full reports precede source-backed host comparison; explicit single-provider mode is retained. Installed stage API supports real requirements-only preparation with shared immutable capture/v3 schema and source binding; no placeholder MCP roles or four-short-finding cap. Exactly one HTTP request, no retry/fallback/tools, no redirected credential forwarding, 600-second request/body deadline. Atomic dispatch claim prevents competing runners overwriting the owner. Validated result and safe provider receipt are saved under existing private state policy; cancellation and active-run deletion are checked. Shared guide embeds the JSON schema for both transports while preserving final identity mapping.

Fresh `npm run build` passed. Final Node Codex/prompt/command/source-boundary batch passed 241/241 in 13.815 seconds; six affected Vitest files passed 118/118 in 2.54 seconds. Ten DeepSeek checks exercise full findings beyond the old MCP cap, requirements-only evidence, cross-provider capture independence, saved-result revalidation, exact export, rejected identities/citations, truncated/tool finishes, HTTP failure privacy/no retry, deadline across response body, disabled/misconfigured transport, CLI override rejection, cancellation publication, running deletion protection and competing ownership. All 359 checks passed, zero failures/skips. A transient test failure after adding schema text was fixed by retaining the guide's final identity JSON line; final complete rerun passed.

Installed seven-link dry run is unchanged; DeepSeek installed-helper read-only preflight passed in an external cwd with inference=not_run. Existing project-local provider configuration is selected as one complete configuration, excluding different ambient credentials; environment config is used only without the project-local file. No original credential/config file was edited. Python skill-creator quick validator could not import missing PyYAML; Node frontmatter/reference/install graph checks passed with their narrower scope. No new paid inference, A4 paired rerun, external chat message, dependency, Release/tag or Phase 21 completion is implied. Historical three-Codex A4 records remain unchanged. Next accepted Phase 21 patch is 0.3.15.

## User preparation-template repair (product 0.3.15)

The original user-provided “Assignment HD 完成流程提示词模板” stage 1 was verified against its actual user message. The actual prior A4 captured prompt used a generic six-section preparation request without mapping this template's tasks. The shared instructions previously preserved language and format but did not require complete semantic clause adaptation. This was a prompt assembly omission, not a failed source binding or missing requirement file.

Shared preparation now reads [HD-PREP-01](../skills/assignment-review/references/preparation-template.md), prefers current or registered same-task seeds, records each clause's retained/adapted/inapplicable/unverifiable handling, and gives both reviewers the same complete tasks. The default remains one DeepSeek plus one Codex. No runtime schema or dependency changes.

Manual comparison against the real user template and a revised private A4 draft covered:

| Original preparation task | Repaired coverage |
|---|---|
| Official requirements | Topic, actual deliverables and submission limits, mandatory versus optional, evidence and unknowns |
| Rubric breakdown | Each criterion, actual grade-band differences, highest-band evidence, lost-mark risks and verification |
| Zero-to-submission workflow | Each step's inputs, outputs, dependencies, parallel work and review checkpoints |
| Next material requests | Task-relevant material, purpose, sufficient format/scope and priority |
| HD strategy | Source-backed priorities, reasoning beyond execution, evidence and actual deliverable organization |

All nine original preferences were accounted for: no fabrication; conflict handling; rubric-linked advice; missing-material best effort; academic report expression; complete runnable code/files when later implementing; task-appropriate data analysis; realistic highest-band aim; incremental living-plan updates. A4 maps report planning to its actual Quiz/video deliverables, keeps code generation outside this preparation scope, and follows its explicit no-cleaning requirement. No new report or generic EDA requirement is invented. Actual rubric column boundaries remain unknown where text extraction cannot establish them.

The revised A4 prompt is draft/not_run, uses the same frozen two sources/eight excerpts, and preserves original captures, exports and results. Real future execution must check current materials and create fresh bound captures for each provider. Private source identifiers, paths, raw chats and coursework evidence are excluded from this repository. This manual clause comparison does not establish future model output quality or a completed paired review.

Fresh `npm run build` passed. `node --test tests/commands/*.mjs tests/baseline/source-boundary.mjs` passed 23/23 in 0.559 seconds; six affected Vitest files (`project-config`, `review-tool`, `public-contract-docs`, `fit5032-fixture`, `review-provider`, `docker-review`) passed 118/118 in 2.64 seconds with provider inference disabled. All 141 checks passed without failure/skip. Seven installed Skill links are unchanged; their shared reference graph includes the new preparation reference. These packaging, source-boundary and version/contract checks do not certify semantic prompt coverage; that comparison was performed manually above. Python skill-creator validator remains unavailable due to missing PyYAML. Phase 21 remains 0/6 and next accepted phase patch becomes 0.3.16; no new inference, external chat message or Release/tag.

## 2026-10-05 — Phase 21 implementation and live checkpoint (0.3.15)

Plans 01–04 implemented and locally verified: source-scoped terminal metrics, coherent complete handoffs, immutable source-bound host R/F annotations/current actions, installed show/full/annotate with strict identity and no inference. Plan 05 Task 01 offline acceptance and reviewable synthetic inputs prepared. Plan 05 real pair and Plan 06/version patch remain pending; no Release/tag or new account inference.

- Build exit 0, 0.917 s.
- Node affected codex/prompt/command/baseline regression: 272/272, 18.294 s, no failures/skips (before final additional retention test).
- Offline Vitest seven targeted files: 124/124, 2.38 s. Correct invocation includes existing EVIDENCELENS_DISABLE_PROVIDER=1. Initial omitted-flag invocation failed four configuration/isolation assertions; corrected without source/dependency edits. Ordinary test providers remain disabled; no real inference.
- Final local security review tightened handoff deletion to the current stored result digest. Added valid-removal and recomputed-foreign-digest preservation check; affected recheck/retention 11/11, 3.403 s. Metrics/recheck/retention earlier affected batch 18/18, 4.594 s.
- Current installed manifests and read-only actual ChatGPT/isolation preflight verified, inference=not_run; no effective-model claim. Helper subprocesses with spawn/exec/fork throw sentinel work from both installed link/copy layouts outside repo.
- Inline trust-boundary review: metrics allowlist/null/provenance, once-only terminal observer, attempt/hash-bound private transaction, frozen trusted bundles/source rebind, escaped Markdown, explicit admitted prior origins, current proof/deferral separation, strict installed CLI, owned sidecar retention. No open high-severity finding after result-digest retention repair. Structural source checks do not establish semantic grading or correctness.

Details: [host/offline evidence](../.planning/phases/21-review-handoff-and-usage-acceptance/21-HOST-ACCEPTANCE.md), [reviewable live inputs](../.planning/phases/21-review-handoff-and-usage-acceptance/21-LIVE-INPUTS.md), [NOT_RUN live status](../.planning/phases/21-review-handoff-and-usage-acceptance/21-LIVE-ACCEPTANCE.md). Historical smokes and A4 experiments do not authorize this new two-run pair; no automatic resend/model switch/coursework replay.
