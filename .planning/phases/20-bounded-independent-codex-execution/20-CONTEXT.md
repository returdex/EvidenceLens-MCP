# Phase 20: Bounded Independent Codex Execution — Context

**Date:** 2026-10-05 (Australia/Melbourne)
**Status:** Planning contract, not implementation acceptance.
**Provenance:** User-approved v1.2 requirements, prior explicit Codex invocation/auth research choice and current `$gsd-plan-phase 20`. No new interview or human approval of engineering details is claimed.

<domain>
Implement CDX-01–06 for independent review using the same captured task prompt, controlled admitted evidence, Codex-owned ChatGPT authentication, enforceable execution limits and locally validated results. Phase 21 owns concise finding/action handoff, usage presentation and authorized real inference acceptance. Preserve the completed Phase 19 capture/export baseline.
</domain>
<decisions>
- **D-01:** Reuse the existing Codex ChatGPT login. Inspect executable/version/login status only; EvidenceLens never reads/copies credentials, runs login/logout, changes global config or switches to API billing. Preflight is not inference proof.
- **D-02:** Dispatch the immutable captured prompt exactly once into a fresh independent context. Preserve run/task/conversation/stage/current source and export bytes. No resume/fork, regeneration, hidden-context capture or old-success fallback.
- **D-03:** Evidence admission occurs before read. Only approved source text/excerpts enter the payload; excluded groups/aliases/history and unread current artifacts retain explicit limits. Child review cannot read original assignments, unrelated chats or other task records, write assignments, inherit external tools, or recursively invoke the review.
- **D-04:** Enforce bounded timeout/cancellation, process cleanup and no automatic re-send/model fallback, including the selected CLI's transport retry behavior. Unknown submission or cleanup state stays uncertain.
- **D-05:** Success requires a successful terminal event, clean process completion, strict structured final response and local run/source/excerpt binding. Exit zero, a plausible answer, hashes supplied by the model or partial output are insufficient.
- **D-06:** Private records contain approved prompt/evidence and minimal receipts/validated results only. No raw event archive, reasoning, credentials or unrelated conversation. Extend scoped retention/delete behavior to new files without widening deletion authority.
- **D-07:** Four stage commands use the independent adapter after its enforcement gate passes. Help/export never launch inference. Preserve preparation without a draft, current-first recheck, sourced templates and truthful disclosure. No silent host-review fallback claiming independent success.
- **D-08:** Target current macOS first and report unsupported on other or unverified versions. Synthetic protocol tests, real binary/OS boundary tests and actual ChatGPT inference are distinct evidence classes. Phase 20 must demonstrate positive offline protocol completion plus adversarial enforcement; a fail-closed stub alone is not completion. Real inference end-to-end acceptance belongs to Phase 21 and requires applicable user authorization.
- **D-09:** Planning keeps product 0.3.2. One compatible feature patch (expected 0.3.3) follows accepted Phase 20 implementation. No release/tag, new sidebar chat, historical proof replay, credential transport or edits to Phase 01–19 evidence.

### the agent's Discretion

Use installed sibling Node stdlib modules and `codex exec`; no SDK dependency, service, daemon, database or new public command family. Implement six sequential plans. A version-bound macOS Seatbelt outer launcher plus a tightly restricted inner CLI is the selected engineering approach, subject to the explicit compatibility proof in Plan 02. This is a proposed design, not an observed full runner guarantee. Do not claim the native `codex sandbox -P` route enforces this boundary: the planning probe failed. No automatic alternate transport if proof fails; fix the narrow adapter or record the exact unresolved gap before enabling commands.

Use inline prompt evidence capsules so the child needs no assignment filesystem reader. Carry approved canonical UTF-8 excerpts with sourceId, original observed source hash, byte range and excerpt hash inside a deterministic JSON block composed BEFORE snapshot capture. Validate those ranges against admitted in-memory source text at capture; never reread original files in runner/export. Missing excerpt coverage remains unknown. Preserve snapshot schema v1; introduce lifecycle v2 only for new codex_exec runs, keep old host_skill v1 readable and untouched.

Proposed bounds: prompt existing 256 KiB and snapshot 1 MiB limits, 100 sources, 100 findings, 256 KiB final result, 512 KiB JSONL line, 2 MiB total streamed output, 10 s preflight, 120 s review deadline, 2 s TERM grace then bounded KILL/reap. Test adapters may inject smaller deadlines; no unbounded production override. Exact bounds are configuration constants in installed code and documented errors, not user-controlled child args.

Production environment is a small allowlist; retain Codex-owned auth location, remove API/provider/proxy overrides and unrelated inherited credentials, use private scratch for temp/state. Never log the environment. Freeze executable realpath/hash/version and runner/profile/schema digests; a changed binary invalidates compatibility. macOS whole-process file isolation permits runtime necessities and Codex auth access only, with assignment/state/history/skills/config roots denied. Codex may read its own auth; EvidenceLens cannot. No auth writes or keychain-wide access granted merely to make a failing probe pass. Refresh/policy/storage incompatibility is an actionable preflight/runtime outcome; manually refresh with Codex only when needed and authorized, then start a new user-requested attempt.
</decisions>
<canonical_refs>
- .planning/REQUIREMENTS.md; .planning/ROADMAP.md; .planning/PROJECT.md; DEVELOPMENT.md
- .planning/research/ARCHITECTURE.md; .planning/research/PITFALLS.md
- .planning/phases/19-captured-task-prompts-and-export/19-CONTEXT.md; 19-VERIFICATION.md in that directory
- skills/assignment-review/scripts/prompt-contract.mjs; prompt-store.mjs; prompt-records.mjs; baseline-sources.mjs in that directory
- skills/assignment-review/references/command-entrypoints.md; prompt-records.md; stage-prompts.md; recheck-workflow.md; template-disclosure.md in that directory
- 20-RESEARCH.md; 20-PATTERNS.md; 20-VALIDATION.md in this directory
</canonical_refs>

## Gate dispositions

Inline researcher/planner/checker under the skill adapter; no subagents. Targeted research continues the user's explicit milestone choice; persistent research=false is unchanged. No frontend or database: UI-SPEC and schema-push gates are not applicable (the word review is not a frontend). Existing Codex CLI is the framework; no new AI orchestration framework. This phase's protocol/evidence/security evaluation is specified here and in VALIDATION; semantic judging and live usage remain Phase 21. No execution auto-advance. Only planning docs and tracking change in this turn.

## Resolved transport/tool detail

Use an invocation-local `evidencelens_bounded` descriptor with Codex-owned ChatGPT auth, zero configured request/stream retries and no production endpoint/token/key override. The name does not denote a second billable provider. The actual allowed native tool inventory is update_plan/request_user_input/apply_patch/view_image; all external execution surfaces are disabled. Outer OS enforcement protects reads/writes before any unexpected tool event is rejected by the supervisor. Unknown inventory or unproven file/disclosure boundary blocks dispatch. One logical dispatch is the invariant; do not equate it with a guarantee of one HTTP request in every unexpected internal tool scenario, or promise remote cancellation rollback.

## Approved execution revision R1 (2026-10-05)

The user answered 可以 to retaining the CLI and revising minimum permissions/tool detection. This authorizes the concrete narrow repair; do not ask for the same approval again. Existing no-inference, no credential copying or mutation, no broad HOME/CODEX_HOME access, no fallback and no automatic retry constraints remain.

- Exec may allow file-write-data/file-write-mode on the fixed existing noncredential CODEX_HOME/installation_id only. Require regular owned single-link file, bounded UUID contents, original content unchanged after execution; no parent directory write, creation, deletion, config or auth write allowance.
- Login status uses a separate no-network policy. Allow Codex itself to read its config.toml plus regular owned immediate agents/*.toml files required by the current config loader. EvidenceLens enumerates/checks metadata only, never reads their contents. These permissions are absent from review launches. Unsupported external configuration dependencies remain a truthful incompatibility.
- Tool detection covers JSONL todo/tool items and stderr tool-router diagnostics; unknown diagnostic paths reject rather than silently succeed. Prove forced native calls abort with OS denial already in effect. Internal continuation races remain uncertain.
- Preserve original failed gate evidence; revised positive acceptance must pass before completing Plan 02. This approval is not compatibility acceptance.
