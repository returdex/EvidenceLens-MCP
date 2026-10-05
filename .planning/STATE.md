---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: 快捷指令与 Codex 独立审阅
status: ready_to_execute
last_updated: "2026-10-05T03:26:03.986Z"
last_activity: 2026-10-05 — 0.3.13 three-reviewer default selected by user
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
Last activity: 2026-10-05 — 0.3.13 three-reviewer default selected by user

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

Current product 0.3.13, no Release/tag. Milestone progress: 3/4 phases (75%), 15/21 currently defined plans; Phase 21 0/6, planned and checked. 16/21 requirements complete, RUN-01–05 pending. Real bounded synthetic ChatGPT reviews and one actual A4 preparation review have succeeded with validated stored results and exact prompt export. Phase 21 revised-source, usage/handoff and two-run acceptance remain pending; semantic automation remains partial.

## Session Continuity

Last session: 2026-10-05. Phase 21 planning passed (6 plans, 13 tasks, 5/5 RUN requirements and 9/9 decisions covered); Phase 21 runtime work is pending; the subsequent diagnostic repair is separate. Phase 20 finished after explicitly approved R1 and final alias/preflight cleanup fixes. Do not request R1 approval again. v1.2 began at product 0.3.0; current product 0.3.13, latest published product 0.2.4. Preserve original phase directories, dependency backup and historical paid proof. Research choice applies only to this milestone. No new chat or auth mutation performed; subsequent explicitly authorized A4 debugging is recorded below. Six diagnostic/startup runs remain failed in private history; the seventh synthetic run succeeded. This smoke does not close Phase 21 acceptance.

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


## GPT-6 migration — 2026-10-05

User explicitly requested GPT-6, superseding the unimplemented GPT-5.5 proposal above. Product 0.3.7 now pins desktop CLI 0.160.0 and gpt-6.1-sol / low with recertified isolation, historical receipt compatibility and 196/196 Node plus 118/118 Vitest checks. Exactly one prepared synthetic live attempt reached thread/turn and failed with process/unexpected_stderr/model_unavailable; no result, cleanup complete, export unchanged. Read-only discovery under the same isolated configuration lists the model. Cause beyond the safe error category remains unconfirmed; do not assume missing account access or claim restored reviews. See [full evidence](../docs/codex-startup-repair.md). No automatic retry, coursework replay or fallback. Phase 21 remains 0/6, RUN-01–05 pending; its next accepted feature patch is 0.3.8.


## Real independent review restored — 2026-10-05

Product 0.3.8 fixes the exact non-fatal cache TTL miss and logger-prefix classification. Actual CLI ETag fixtures reproduce the trigger and pass strict supervision; genuine model/cache permission failures remain rejected. The protocol compatibility candidate was reverted. A production synthetic preparation run with gpt-6.1-sol / low succeeded on 2026-10-05 at 14:22:07–14:22:14 Australia/Melbourne: 6699 ms, terminal observed, exit 0, cleanup complete, source-bound result published and installed skill export unchanged. The persisted result digest was re-read successfully. Three preceding diagnostic runs stayed failed; no automatic retry or A4 replay occurred. See [full dispatch and validation evidence](../docs/codex-startup-repair.md).

Fresh build, Node 199/199 and Vitest 118/118 passed. Current independent runner feedback is verified for this synthetic preparation case. A4 review and the separate Phase 21 two-run revised-source/usage/handoff acceptance remain pending; Phase 21 stays 0/6 and RUN-01–05 unclosed. Plan 06 now targets 0.3.9; milestone v1.2 and non-blocking RR/FM reminders remain unchanged. No release/tag.


## Assignment review deadline repair — 2026-10-05

Product 0.3.9 raises the default independent review deadline from 120 to 600 seconds after an actual two-source preparation attempt was stopped by the old deadline at 120408 ms. The user reports ordinary assignment reviews around five minutes; the ten-minute ceiling provides margin while retaining termination, cancellation, strict result validation and cleanup. Skill guidance now waits for the same live process and offers independent-review recovery instead of making host-chat analysis the only recovery. Original failed receipts remain unchanged. Clock-controlled real-child tests verify completion after five minutes of supervisor time and termination at ten minutes; they are not real model inference. See [repair evidence](../docs/codex-timeout-repair.md). No new model call or A4 replay occurred. Phase 21 stays 0/6, RUN-01–05 remain pending; Plan 06 now targets 0.3.10. No release/tag.


## Local quote binding repair — 2026-10-05

Product 0.3.10 removes model-computed byte spans from production wire output (model v2), resolves exact unique quotes locally, then validates and stores compatible v1 results. Capture adds actual identity and complete source/excerpt mapping; binding failures retain safe specific triggers. Legacy outputs/receipts keep strict validation and remain unchanged. An actual A4 preparation review succeeded earlier on 0.3.9 using copied short-excerpt spans (234445 ms, 97 excerpts, 17 findings, saved result revalidated); that success does not test the new v2 protocol. See [repair evidence](../docs/codex-source-binding-repair.md). Phase 21 remains 0/6, RUN-01–05 pending, next accepted phase patch 0.3.11. RR/FM reminders remain non-blocking; no release/tag.

Fresh build, Node 219/219 and Vitest 118/118 passed. One real post-repair synthetic GPT-6 preparation check succeeded in 11685 ms with exact Unicode quote binding, exit 0, terminal observed, cleanup complete, persisted v1 result revalidated and exact prompt export unchanged. No course content was dispatched by this check; it does not close the separate Phase 21 acceptance.


## Captured-reference binding repair — 2026-10-05

Product 0.3.11 replaces production model quote copying with sourceId/excerptId-only v3 output. Per-run schemas constrain identity and legal source/excerpt pairs. Capture splits oversized excerpts into at most 4096 UTF-8 bytes without changing admitted text; local binding fills exact captured quotes/spans and saves compatible v1 results. Legacy v1/v2 validation and failed receipts remain strict and unchanged. Fresh build, Node 231/231 (14.709 s), six Vitest files 118/118 (4.02 s) passed. The user explicitly authorized messaging the original A4 conversation and continued repair/debugging; one new actual preparation attempt succeeded there in 126683 ms: two sources, eight excerpts, 16 findings, complete coverage, exit 0 and cleanup complete. Stored result independently revalidated with matching snapshot/envelope/execution digests; the original conversation completed and displayed the validated review. All five earlier failed/uncertain receipts remained unchanged. No assignment answer, submission or source-file edits are authorized by this repair. Phase 21 remains 0/6, RUN-01–05 pending; next accepted phase patch 0.3.12. RR/FM reminders remain non-blocking; no release/tag.


## Complete feedback and three-reviewer test — 2026-10-05

The user rejected unsolicited shortening and explicitly requested testing multi-agent decisions. Product 0.3.12 makes complete substantive analysis the shared Skill/capture default: source-backed interpretations, evidence limits, applicable risks and concrete verification/actions; no silent removal of info/Low findings. Full analysis is delivered directly or in accessible private reports, with optional summaries only on explicit request. Phase 21 D-01, handoff Plan 02, CLI Plan 04 and planning input are amended accordingly; no plan is marked complete. Next accepted phase patch is 0.3.13.

An explicitly requested bounded experiment uses three separate independent CLI reviewer contexts with identical frozen official A4 material and substantive task, separately bound run identities, the unchanged requested GPT-6/low configuration, and no earlier conclusions in their prompts. It runs serially to avoid private-store transaction contention; host comparison follows all three attempts and preserves minority findings and unresolved disagreements. This is an exploratory three-reviewer test, not a general multi-agent runtime or evidence that majority decisions are correct. All three actual preparation runs succeeded (243281/256748/253774 ms, 18/13/17 findings); root independently revalidated stored result/snapshot/execution joins and complete report preservation. All captures preceded first inference. The original conversation delivered all full reports and source-backed comparison; root corrected composite cross-topic reference omissions and clarified that metadata mapping is not proof of invented defects, retaining original composite and all independent outputs. One additional constraint-check reminder survived comparison; no accuracy gain was measured. This does not certify semantic accuracy. Fresh build, Node 231/231 (12.381 s), six Vitest files 118/118 (3.74 s) passed; no dependencies, auth, model or isolation policy changed. The optional skill-creator Python validator could not start because PyYAML is absent; existing Node packaging/reference/install checks passed. RR/FM remain non-blocking.


## Default three-reviewer selection — 2026-10-05

User explicitly selected multi-review as the default. Product 0.3.13 sets all four installed review entrypoints to three independent Codex review contexts plus source-backed host comparison, with an explicit single-reviewer override. Full feedback remains the default in either mode; help/export/generate do not launch review. Reuse the three-process workflow already validated on A4; no new inference is necessary for changing this selection policy. Internal CLI multi_agent stays disabled, each reviewer retains its own begin/capture/run and receipt; export still returns the latest actual capture. Preflight system unavailability stops undispatched rounds and is reported honestly.

The A4 experiment used Codex only, with MCP not_run and zero DeepSeek requests. The existing DeepSeek MCP provider is a separate path and is not connected to this default reviewer composition. This change does not authorize or claim a cross-provider A4 dispatch. Next accepted Phase 21 patch 0.3.14; phase stays 0/6 and RUN-01–05 pending. No release/tag or global-memory edit.

Fresh build and installed-link verification passed; Node regression 231/231 (12.164 s), six Vitest files 118/118 (3.56 s), zero failures/skips. These verify packaging/compatibility and the unchanged execution path; no new paid inference was run solely to change the default.
