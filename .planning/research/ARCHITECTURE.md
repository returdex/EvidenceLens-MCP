# Architecture Research — v1.2

**Date:** 2026-10-04
**Confidence:** Medium; proposed integration requires adversarial and real-host checks.

## Proposed Data Flow

Stage command → resolve task/conversation/current artifact → source gate → render task prompt → save immutable run snapshot → independent runner → validate result and source references → concise handoff + usage receipt.

`$el-prompt` → scoped latest-run lookup → return captured task prompt + separate metadata/material manifest. Export never calls a model or rereads source material merely to reconstruct a missing record.

## Components and Boundaries

| Component | Responsibility | Existing integration |
|---|---|---|
| Entry skills | Fixed intent, stage and helpful missing-input handling | Shared assignment-review references |
| Run snapshot | Task/conversation/run IDs, actual prompt, input identity/coverage, lifecycle | New local non-Git state, bounded and explicitly located |
| Runner | Spawn, timeout/cancel, parse terminal events, reap owned processes | New bounded adapter; keep current DeepSeek startup contract intact |
| Result binder | Validate schema and current evidence locations before action updates | Reuse source/current-version concepts; do not trust arbitrary model citations |
| Receipt presenter | Minimal status, elapsed time, available usage, current actions | Keep raw events and reasoning out of normal responses |

The current `ReviewProvider` seam supplies normalized claims and requires four-role review data through MCP. Preparation legitimately lacks solution/teacher material. Do not force all new commands through `review_evidence` or fabricate missing roles. A dedicated stage runner can coexist with the existing MCP path; the latter remains optional under its real prerequisites.

## Prompt and State Design

Snapshot the task-facing prompt before dispatch; persist run state transitions without mutating that prompt. Store runtime/model metadata separately. Exported prompt text is the original snapshot, while material availability warnings appear outside it. Export must distinguish a prepared-but-not-submitted run from an actual attempt. Capture bounded permitted excerpts or a source manifest; a hash/path alone is not evidence available to another conversation.

Persist only the minimum needed in an explicit local state root excluded from Git; validate task/conversation identity and reject traversal, cross-task aliases and ambiguous fallback. Resolve identity when the host has no stable conversation ID before claiming isolation. Atomic writes prevent partially published records; parallel runs must not race the latest-run pointer. Retention/deletion behavior belongs in Phase 19 planning.

## Authentication and Usage

Keep authentication in Codex. [Authentication docs](https://learn.chatgpt.com/docs/auth) distinguish ChatGPT subscription and API-key access, and cached credentials; do not read or copy the auth cache into prompts, logs or snapshots. For this user, local CLI status already reports ChatGPT authentication.

App-server is a documented richer alternative. Its [protocol](https://learn.chatgpt.com/docs/app-server) includes per-thread usage events and account-wide quota/activity RPCs. A local 0.141.0 schema generation confirmed `thread/tokenUsage/updated`, `account/rateLimits/read`, `account/usage/read` shapes. Schema presence does not prove a particular account's data availability. Account aggregates are not per-run attribution or monetary cost.

## Isolation

Separate execution context alone is insufficient: read-only prevents writes but may permit broad reads. Phase 20 must establish allowed-evidence-only access, control inherited tools/configuration/project instructions, avoid nested invocation of EvidenceLens, and verify on the chosen host. Do not silently weaken isolation or reuse the work conversation when independent execution cannot start. Existing macOS MCP filesystem denial is not changed by this milestone.
