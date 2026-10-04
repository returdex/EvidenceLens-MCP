# Phase 19: Captured Task Prompts and Export — Context

**Date:** 2026-10-05
**Status:** Planning contract; no implementation or acceptance yet.
**Provenance:** Existing user-approved milestone discussion, explicit plan-phase 19 request, requirements and Phase 18 acceptance. No new discuss interview or new human approval of implementation details is claimed.

<domain>
Deliver PRM-01–05: capture before a stage review, export the actual latest same-task/conversation prompt, truthful failure/identity states, separate metadata, private local retention/deletion. Existing stage review executes in the current host until Phase 20 adds an independent runner.
</domain>
<decisions>
- **D-01:** Every stage review first saves an immutable task-facing prompt with run/task/conversation/stage/current-material identities, then uses that exact snapshot as its review instructions. This is not the host's hidden system prompt, internal reasoning, or a reconstruction after review.
- **D-02:** `$el-prompt` reads the latest scoped run, never regenerates, rereads assignment sources, calls a provider or returns an older success when the latest attempt failed. Repeated export and later source changes preserve exact captured UTF-8 bytes.
- **D-03:** Missing/corrupt/failed/interrupted/ambiguous records remain explicit. Concurrent tasks/conversations never mix; completion of an older run cannot replace the latest begun run.
- **D-04:** Export text and stage/current/material/availability warnings are separate. Include permitted excerpts in the task prompt or state a re-read requirement; paths and hashes do not imply files travel to another chat.
- **D-05:** Store minimal approved task data outside Git, excluding credentials, unrelated chats and internal reasoning. Explain location, retention and exact deletion. Preserve original coursework, source exclusions, existing template/disclosure rules and historical proof.
- **D-06:** Capture/storage is Phase 19; independent Codex, authentication/transport enforcement and usage reporting remain Phases 20–21. No paid requests or new cross-project chat/message without separate human authorization. One compatible feature patch only after acceptance; no planning version bump.

### the agent's Discretion

Use installed sibling Node stdlib helpers under skills/assignment-review/scripts, with no dependency on repository cwd, compiled dist or new runtime package. A local filesystem API plus CLI is enough; no database, service, daemon, background cleanup or new user command family.

**Identity:** Read CODEX_THREAD_ID from the current host environment, require UUID-shaped value; an actual read-only check matched this known chat on 2026-10-05. This is observed host behavior, not a documented universal API. No fallback to cwd, latest global record, random conversation or scraped history. Missing identity returns identity_required. Tests inject identity through library options; production CLI derives it from host environment. Task ID comes from explicit current user/baseline or the sole registered task in this conversation. On the first stage with no task, allocate T-UUID and report it; if multiple tasks exist, require explicit task. Never treat a document/seed as an identity override. No implicit current-task pointer selecting one of several tasks.

**Run admission:** begin reserves a run ID before source collection/assembly and durably advances latest under a short conversation lock. Record preparing -> captured -> dispatched -> succeeded/failed/cancelled/uncertain, with safe pre-dispatch failure transitions. Immutable snapshot and mutable lifecycle are separate. Unfinished preparing/captured/dispatched is not success. Older completions never change latest. A begin I/O error includes an attempted runId when identity is available. Host retains the latest attempted run receipt; export passes expectedRunId, including a failed admission, so storage recovery cannot silently expose an older run. If latest-attempt identity is unavailable/contradictory, return identity_required/uncertain instead of claiming an older capture is current. Do not parse private chat logs to recover it.

**Storage:** default absolute root ~/.local/state/evidencelens (homedir, not cwd); optional explicit EVIDENCELENS_STATE_ROOT outside any Git worktree. Reject symlinked roots/parents/record files, unsafe ownership/permissions, traversal, malformed UTF-8, extra fields and over-limit records. Hash conversation/task IDs for path segments; retain validated original IDs in records and verify on reads. Directories 0700, files 0600; recognize worktree .git files as well as directories. Ancestors may be owned by the current UID or root and must not be group/world writable, except a root-owned sticky temporary ancestor such as canonical /private/tmp. A task-owned private 0700 child is mandatory beneath that ancestor; never accept a non-sticky shared writable parent or chmod unrelated parents. Platform inability to enforce checks returns unsupported rather than a portability claim. Same-user hostile OS processes are outside the authority boundary; do not claim full adversarial filesystem sandboxing.

**Atomicity and limits:** short exclusive mkdir lock per conversation for begin/capture/dispatch/finish/delete; no lock held during model work. Durable write-to-temp, fsync, rename metadata; immutable snapshot exclusive create, hash/ID validation before use. Crash or partial multi-file publication leaves a dirty/lock marker that makes reads unavailable until explicit inspected recovery; never scan older runs to repair latest. Snapshot <=1 MiB encoded, prompt <=256 KiB UTF-8, <=100 materials, bounded metadata strings; stdin <=2 MiB. Limit task registry to 100 and run enumeration to 1000; over-limit operations report store_limit and never choose an older row. No automatic pruning.

**Retention:** until explicit deletion; no automatic expiry. forget-task defaults to dry run and requires --apply plus exact task; tombstone latest before deleting only owned, validated fixed-schema files. Interrupted deletion remains deleted/uncertain with no fallback. Never recursive-delete an arbitrary user path, follow symlinks or delete another task. Tombstone retains only minimal scope/deleted state; explain that backup/cloud copies are outside deletion guarantees. A deliberate new begin for that same task can create a new generation after deletion.

**Content:** strict allowlist for prompt/manifest and narrow lifecycle fields. Only source-gated approved excerpts enter a six-section task-facing prompt. Missing/excluded sources retain status/ID but no content/hash of unread bytes. No blanket environment dump, auth file, raw conversation, model events, results archive or hidden reasoning input fields. Recognizable credentials/private-key payloads are rejected before capture, not silently redacted after capture; do not claim exhaustive secret detection. Host construction is a trusted semantic boundary, tested with synthetic sentinels.
</decisions>
<canonical_refs>
- .planning/REQUIREMENTS.md; .planning/ROADMAP.md; .planning/PROJECT.md
- .planning/research/ARCHITECTURE.md; .planning/research/PITFALLS.md
- .planning/phases/18-discoverable-stage-commands/18-CONTEXT.md; 18-03-SUMMARY.md; 18-04-SUMMARY.md; 18-VERIFICATION.md in that directory
- skills/assignment-review/SKILL.md; references/command-entrypoints.md; references/stage-prompts.md; references/task-baseline.md; references/recheck-workflow.md; scripts/baseline-sources.mjs under that Skill
- scripts/live-proof-state.mjs (atomic I/O pattern only); scripts/install-review-skills.mjs; tests/commands/*.mjs; tests/baseline/source-boundary.mjs
- DEVELOPMENT.md; docs/development-validation.md
</canonical_refs>

## Gate dispositions

No new context interview is needed: user design is already approved. Optional research question offered; absent a new preference, use existing milestone research and targeted local inspection, preserving research=false. No new RESEARCH.md or formal Nyquist prerequisite is asserted. Voluntary task validation map will track actual outcomes. No frontend, live database or AI framework is introduced: UI-SPEC/schema push/new AI-SPEC not applicable. Planner and checker run inline under the Skill adapter. No branch change or implementation in this planning request.

## Interface clarifications from plan check

- Lifecycle schemaVersion=1 fields are exactly runId, taskId, conversationId, sequence, status, executionKind=host_skill, createdAt, updatedAt, errorCode nullable and promptSha256 nullable, plus schemaVersion. Resolve an omitted/default task under the conversation lock, so simultaneous first begins cannot allocate competing default tasks. Lock metadata is lockId, pid and createdAt; PID or age alone never authorizes recovery.
- No_record is permitted for a known scope with no stored run and no known attempted receipt. If a run exists but the host has lost the latest-attempt receipt, export returns identity_required; an explicit expectedRunId mismatch returns latest_mismatch. Never silently discard expectedRunId to retry.
- Root paths cannot be inside the current repository/project, a .git ancestor, or any ancestor/descendant overlap with known assignment evidence roots. A deliberate state-root override does not grant permission to scan or delete its unrelated contents.
