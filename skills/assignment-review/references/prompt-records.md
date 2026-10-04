# Captured task prompt records (schemaVersion 1)

The installed Node stdlib helpers capture a task-facing prompt before review. They do not record hidden instructions, reasoning, credentials, raw chat history, results or provider events. No model/transport is built into these helpers. Host composition must use the existing source gate. Recognition of common credential strings is a limited rejection check, not exhaustive secret detection.

## Contract

`prompt-contract.mjs` is the strict allowlist. Snapshot: schemaVersion, runId (UUID), taskId, conversationId (UUID), sequence, stage (`preparation|in_progress|final`), reviewMode (`artifact_only|process`), currentSourceId (nullable), promptText, promptSha256, capturedAt, materials, limitations. UTF-8 bytes are never trimmed or newline-normalized. The SHA-256 covers the exact prompt text. Materials: sourceId, role, status, sourceReference, inspectedParts, observedAt, hashKind, contentHash, availability. Inspected records use `sha256_utf8` and an actual observed time/coverage; unread/excluded materials contain no inspected parts, hash or observed time. Availability distinguishes `inline_excerpt`, `requires_reread`, `unavailable`; IDs/paths/hashes alone do not transfer files.

Lifecycle: schemaVersion, runId, taskId, conversationId, sequence, status, executionKind=`host_skill`, createdAt, updatedAt, errorCode, promptSha256. States: preparing -> captured -> dispatched -> succeeded/failed/cancelled/uncertain; failure/cancellation/uncertainty can occur before dispatch. Terminal outcomes cannot be rewritten. Host-reported success is not independent/provider proof.

Limits: 256 KiB prompt, 1 MiB encoded snapshot, 100 materials, bounded metadata, 2 MiB stdin, 100 tasks per conversation and 1000 runs per task. Unknown fields/accessors, malformed UTF-8/surrogates, duplicate material IDs and mismatched identities/hashes fail. Safe codes: identity_required, no_record, latest_mismatch, corrupt_record, busy, uncertain, deleted, store_limit, unsafe_path, storage_unavailable, unsupported. Errors never echo input content.

## Store API

`beginRun(scope)` returns a minimal attempt receipt (including attempted runId even if known-scope admission fails). Scope: `{conversationId, taskId? , stateRoot?, evidenceRoots?}`. Library identity injection is for tests; the production CLI derives conversationId from CODEX_THREAD_ID. Default root is `~/.local/state/evidencelens`; an explicit absolute EVIDENCELENS_STATE_ROOT override must be outside Git/project and evidence roots.

`captureRun(scope, runId, snapshotInput)` accepts the complete schema snapshot bound to the admitted receipt. `readForDispatch(scope, runId)` marks dispatched before returning saved bytes. `finishRun(scope, runId, {status,errorCode?})` records outcome. `exportLatest(scope,{expectedRunId})` returns `{promptText,metadata}` separately. `forgetTask(scope,{apply:false})` previews task deletion; apply is explicit. Capture/finish return receipts; errors use safe codes.

Every stage retains its latest begin receipt, including admission failures. Export must pass that receipt's expectedRunId; never drop it to retry older data. Known empty scope with no attempt returns no_record; existing records with lost receipt return identity_required. Latest means begin order, not finish order. A latest failed run with a valid snapshot can export those same bytes with failure status; failure before capture is unavailable. Incomplete states remain explicitly incomplete. No older-success fallback, source reread or prompt regeneration.

## Storage and recovery boundary

Private 0700 directories/0600 files, owner/no-follow checks, hashed path components with original identity checks, short per-conversation lock and durable metadata publication. No lock is held during review. Root/current-user ancestors are trusted except writable shared parents; a root-owned sticky temporary ancestor is allowed only with a private child. No chmod of unrelated directories. Git worktrees and known evidence-root overlap are rejected. Same-user hostile OS processes are outside the boundary; this is not an adversarial filesystem sandbox.

An interrupted write leaves a lock/dirty marker: report busy/uncertain, never scan old runs to repair latest. No PID/age-based automatic lock removal. Recovery requires an explicit request, exact inspected lock identity and proof no writer is active; if that cannot be established, preserve the state. Prefer preserving the failed task and starting a separately identified task/root after diagnosis; do not relabel older data as the latest attempt.

Retention is manual, without automatic expiry or pruning. Deletion/recovery CLI usage is documented with the implementation. Backup/cloud copies are outside local deletion guarantees. Keep all actual prompts and temporary transport files outside Git.
