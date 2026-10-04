---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: 快捷指令与 Codex 独立审阅
status: ready_to_execute
last_updated: "2026-10-04T18:18:40.757Z"
last_activity: 2026-10-05 — 0.3.6 live smoke reached model gate; pinned model absent from CLI catalog
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 21
  completed_plans: 15
  percent: 75
---

# EvidenceLens MCP — Project State

## Project Reference

See [PROJECT](PROJECT.md), updated 2026-10-05. Core value: trustworthy, independently checked findings grounded in controlled local evidence. Current focus: execute checked Phase 21 review handoff and usage acceptance plans. Phase 20 complete at product 0.3.3.

## Current Position

Phase: 21 (Review Handoff and Usage Acceptance)
Plan: 0/6 complete; six checked plans ready
Status: Ready to execute
Last activity: 2026-10-05 — 0.3.6 live smoke reached model gate; pinned model absent from CLI catalog

## Accepted Coverage Debt

- TD-12/13/14/15: missing records resolved; manual semantic coverage remains partial, accepted at explicit milestone completion.
- Phase 17 audit interpretation remains manual; no independent evaluator claim.
- TD-V/TD-B closed with actual source-bound evidence; intermittent I/O root cause unknown and original dependency backup preserved.
- Inherited v1.0 Nyquist gaps outside Phase 09 and WR-01/WR-02 warnings unchanged. Historical paid proof is not renewed.
- Historical open-artifact audit at Phase 20 completion: 0 open items, 0 scan errors. New 2026-10-05 improvement records are listed separately below; the historical audit is not a current reminder count.

## Non-blocking Revision Records

- [Phase 21 planning input](phases/21-review-handoff-and-usage-acceptance/21-PLANNING-INPUT.md): H-01–04 refine current RUN-01/02/05 handoff and recheck acceptance. Six checked PLAN files now cover H-01–04; no runtime implementation yet.
- [Completed-work reminders](REVIEW-REVISIONS.md): RR-01–08 are 待修订 / non-blocking, revisited when their module or related planning work is touched. Completed phase status and historical proofs remain intact.
- [Future project memo](notes/2026-10-05-review-quality-future.md): FM-01–06 are deferred proposals, not new phase requirements or dependencies. Claude originals and broader semantic evaluation are not prerequisites for continuing Phase 21.
- These are project records, not scheduled notifications. Current progress remains 3/4 phases and 16/21 requirements complete; existing safety and authorized live-inference acceptance remain applicable.

## Previous Milestone Publication

The user explicitly lifted the accumulated-history hold on 2026-10-04. Remote main was fast-forwarded from d78a115 to closure commit 4409ffb (799 commits, including 737 pre-v1.1 commits); both tags were verified at that same commit. [Product v0.2.4](https://github.com/returdex/EvidenceLens-MCP/releases/tag/v0.2.4) was published at 2026-10-04T07:19:24Z (not draft). Publication receipt documentation follows the release commit on main. This historical publication remains product v0.2.4; v1.2 development starts at 0.3.0 without a new release.

## Next Action

User-directed triage (2026-10-05): [FIT5032 A1.3 review failure](../docs/research/fit5032-a13-review-failure.md) now feeds H-01–04 into Phase 21 planning. Broader review-quality work is memoized and completed components carry non-blocking revision reminders. Existing phase completion remains technical acceptance, not demonstrated semantic review quality. Claude original transcript and new live case evaluation remain unavailable / NOT_RUN. Requirement IDs/count remain unchanged; the subsequent diagnostic repair is product 0.3.4.

`$gsd-execute-phase 21` — execute six checked sequential plans (13 tasks). Read [plan check](phases/21-review-handoff-and-usage-acceptance/21-PLAN-CHECK.md) and current planning input. Prepare live inputs before checking any still-missing authorization in Plan 05. RR/FM records remain non-blocking. No auto-advance from this planning turn.

Phase 20 complete: 6/6 plans, 12/12 tasks, CDX-01–06, 4/4 goal criteria. Approved R1 resolved the isolation gate; original failures remain recorded. Fresh build passed, six affected Vitest files 118/118, final Node suites 157/157, seven official Skills and negative control passed. Inline review and 11 planned threats have no open finding. See [verification](phases/20-bounded-independent-codex-execution/20-VERIFICATION.md).

Current product 0.3.6, no Release/tag. Milestone progress: 3/4 phases (75%), 15/21 currently defined plans; Phase 21 0/6, planned and checked. 16/21 requirements complete, RUN-01–05 pending. Successful real ChatGPT inference and usage/handoff acceptance remain pending; authorized startup smokes failed, with the latest reaching the model gate; semantic automation remains partial. Local host readiness is not remote inference evidence.

## Session Continuity

Last session: 2026-10-05. Phase 21 planning passed (6 plans, 13 tasks, 5/5 RUN requirements and 9/9 decisions covered); Phase 21 runtime work is pending; the subsequent diagnostic repair is separate. Phase 20 finished after explicitly approved R1 and final alias/preflight cleanup fixes. Do not request R1 approval again. v1.2 began at product 0.3.0; current product 0.3.6, latest published product 0.2.4. Preserve original phase directories, dependency backup and historical paid proof. Research choice applies only to this milestone. No new chat, auth mutation or coursework replay performed. Two separately authorized synthetic live attempts failed; neither counts as acceptance.

## Compatible repair — 2026-10-05

User-requested failure diagnostics fix, product 0.3.4: bounded diagnostic fields, observed terminal/exit preservation, truthful cleanup on supervisor exceptions and read-only explicit-run inspection; old v1 records remain unchanged. See [repair evidence](../docs/codex-diagnostics-repair.md). The A4 failed attempt cannot establish its original cause; no coursework replay or live inference occurred during this repair. Phase 21 stays 0/6 and RUN-01–05 pending; its next accepted patch is 0.3.5.

## Startup permission repair — 2026-10-05

Product 0.3.5: actual Codex home agents discovery reproduced the user's permission failure before thread.started; denied model cache reads reproduced a second ambient-state failure. A sealed per-run CODEX_HOME now contains only a read alias to the original auth file and a private installation_id copy. Existing auth/config/installation files are unchanged; original installation writes are no longer allowed. Actual-host network-denied startup crosses thread.started/turn.started; full loopback and boundary suites pass. See [startup evidence](../docs/codex-startup-repair.md).

A concrete one-run synthetic real inference check was subsequently authorized by the user and executed once; it failed in 0.3.5 with permission-class stderr. That approval is consumed; no retry occurred. Source/template hashes and the dry-run script are in the repair record. This optional smoke cannot close Phase 21 RUN-05's separate two-run handoff/recheck acceptance. Phase 21 remains 0/6; its next accepted patch is now 0.3.6, superseding prior next-patch notes.

## Authorized smoke and HOME repair — 2026-10-05

The direct user reply “允许” authorized exactly one prepared synthetic run. It returned failed/protocol_invalid/unexpected_stderr/permission in 925 ms, with no terminal/result, cleanup complete and exact prompt export unchanged. No A4 material was sent; no remote usage is inferred as zero. Offline diagnosis identified original HOME/.agents/skills discovery still outside the sealed CODEX_HOME. Product 0.3.6 now seals both HOME/CODEX_HOME and binds production launcher wiring into the isolation digest. See the updated [startup evidence](../docs/codex-startup-repair.md). Local verification passed; post-0.3.6 real inference is NOT_RUN and needs new applicable authorization. Phase 21 remains 0/6; next accepted feature patch 0.3.7 supersedes prior next-patch notes.


## 0.3.6 live smoke and model gate — 2026-10-05

The user's second explicit “允许” authorized one further same-source synthetic run. It reached thread.started and failed before turn.started with item.completed/error, reportedErrorCategory=model_unavailable; no permission stderr was recorded. Duration 1044 ms, cleanup complete, result null, exact export unchanged. No retry or model switch. Safe receipt details are recorded in [startup evidence](../docs/codex-startup-repair.md).

Read-only actual CLI model discovery, including a fresh sealed home without a model cache, lists gpt-5.5 and hidden codex-auto-review; gpt-5.4 is absent. Proposal: explicitly authorize changing the fixed review model to gpt-5.5, recertify its contract and run one further prepared synthetic check. This is not yet authorized or implemented. Version remains 0.3.6; next accepted compatible patch 0.3.7. Phase 21 is still 0/6 with RUN-01–05 pending; successful real review/export/recheck acceptance remains incomplete.
