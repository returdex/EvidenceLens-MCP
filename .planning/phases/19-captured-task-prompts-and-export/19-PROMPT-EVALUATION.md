---
phase: 19
status: passed
checked: 2026-10-05
semantic_evaluation: manual
independent_model_evaluation: false
---
# Phase 19 — Actual current-host synthetic acceptance

Executed installed el-prepare/check/final/recheck/prompt resources in the current authorized Codex chat. Installed helper: /Users/yifeng/.agents/skills/assignment-review/scripts/prompt-records.mjs. Current CODEX_THREAD_ID matched the known calling chat (boolean assertion; no environment dump). Real helper subprocesses used a private temporary state root outside Git/evidence, T19 synthetic inputs only, and actual collectBaselineSources with read traces. Each stage was begun/captured/dispatched before the assistant's manual review output; finish and export happened in a subsequent tool call after that output. No mock model callback supplied these stage judgments.

This is executing-assistant manual semantic evaluation in the current host, not independent model assessment, fresh GUI selector discovery, another project/host proof or independent Codex runner acceptance. The helper protocol is [prompt-cases](../../../skills/assignment-review/references/prompt-cases.md); automated fault tests are separate. Runtime timestamps below follow the actual host UTC clock; planning date is the supplied Australia/Melbourne 2026-10-05 date.

## Receipt and byte evidence

All four raw dispatch payloads equaled the raw export after finish, and a second export byte-for-byte. Raw stdout contained only original text; metadata was parsed separately from stderr. Raw payloads remain outside Git; only synthetic IDs/hashes and bounded outputs are published here. Hashes identify captured UTF-8, not original document bytes.

| Command | Stage | runId | dispatch/export SHA-256 | Reader attempts | Terminal |
|---|---|---|---|---|---|
| prepare | preparation | `6cc9ee63-5652-4619-9043-03abd1b389c5` | `6b587f4675e6daf42cc8c80ee5d58b6df4b34a2dbe183b4fde4e61da7e56943d` | brief | succeeded (host-reported) |
| check | in_progress | `e69fd4c8-169a-4fa9-96fc-55cb2b8d12e5` | `ce1b36b91388f67bc95c1e429c98a115ef99c8dc17d8270c61fbd274e0dfb04a` | brief, now | succeeded (host-reported) |
| final | final | `8510c144-6e63-4a9a-b943-54fb6fdbe616` | `b077eed645f5854540a171f797b9ca21a34a0755d3ea4d55de0d12a886afac08` | brief, now | succeeded (host-reported) |
| recheck | in_progress | `cc0d7351-90a7-40f2-a531-79959dd3fd07` | `9eaeb86bbfe69a6aac63c61fac98189b8eeaac09623615d53228b50d20ddbbbc` | brief, now | succeeded (host-reported) |

Capture times: prepare 2026-10-04T14:30:26.878Z; check 14:30:39.249Z; final 14:30:50.148Z; recheck 14:31:00.447Z. Final's now read was intentionally unavailable, not inspected. Other listed reads succeeded. old/deny/alias were skipped for every run; no excluded hash/content was captured. Preparation had no designated current draft; registered old metadata made selection needs_selection, without reading it or blocking the explicitly requested preparation.

## Actual manual stage outputs

### Preparation

R19-1 requirement (synthetic brief:1): Choose A or B and give one reason. Current evidence absent -> unknown. Plan: compare options, choose one, write a supporting reason. Missing draft does not block requirements/steps. Teacher/rubric/template, visual and remote state unknown; MCP not_run. No invented requirements/grade.

### In-progress check

brief:1 requires a choice and reason; current-v1:1 is `I choose A.`. R19-1 gap: no reason in the supplied complete line. F19-1 still_present, A19-1 open: supply a reason. Only the given text was checked; no edits, old-draft review or provider invocation. Remaining materials and submission unknown.

### Final with unreadable current

Stage remained final. brief:1 inspected; designated now read failed. R19-1 unknown, not gap or passed. Obtain the specified current text before checking its choice/reason; old was not substituted. No confirmed content defect from this missing evidence. Template, visual and remote submission remain unknown; MCP not_run. succeeded means this bounded host work finished, not assignment approval.

### Recheck

Explicit in_progress; current-v2:1 is `I choose A because it uses less memory.`. The narrow R19-1 text requirement is satisfied. F19-1 still_present -> resolved; A19-1 open -> done and removed from current repair actions. The given sentence supplies a reason; this does not verify its empirical memory claim. No ordinary version-difference regression warning. Other materials/visual/remote state unknown.

## Export/failure/deletion observations

- Four commands: dispatch hash equals both subsequent export hashes, separate status/material metadata present, no new review dispatched by export.
- After recheck capture/finish, the synthetic source changed to `I choose B after capture.`. Export remained the original captured bytes.
- A new latest attempt `82c0d470-e2de-4933-907b-2197b53ca4f7` finished failed before capture. Export returned uncertain with nonzero exit; it did not return the previous successful prompt.
- forget-task dry-run listed exactly five T19 runs, zero unknown files; apply returned deleted=true, incomplete=false, remainingRuns=0. Export then returned deleted. Only this test task's recognized records were removed. Other-task/foreign-file preservation is also tested in retention.mjs.
- Existing-record/lost-receipt, captured-failed export, corruption, cross-conversation concurrency and actual owned-child SIGKILL are covered in automated tests; none is represented as another real host run.

## Conclusion

Manual host flow passed for all four stages and scoped export. Automated suite at this gate: 49/49 tests, 0 skipped, exit 0, 1.986s. Semantic automation remains partial. No live API, credentials, new chat, real coursework, independent runtime, visual or remote-submission proof is claimed.
