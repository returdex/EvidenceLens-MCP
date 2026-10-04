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

## Installed CLI

Resolve the helper from this Skill's installed directory: `node <assignment-review>/scripts/prompt-records.mjs ACTION`. Run from the user's project cwd. All inputs are bounded JSON via stdin; never put prompt text in argv, shell interpolation or an environment variable. A private temporary input file must be outside Git with mode 0600. Actual records use the default root or an explicitly chosen EVIDENCELENS_STATE_ROOT. CODEX_THREAD_ID must exist and be UUID-shaped; a supplied conversationId must match. This host capability is observed, not promised for every host.

Actions and JSON keys (all accept optional taskId/evidenceRoots; evidenceRoots are known authorized assignment roots, not files to read):

- `begin`: `{ "taskId": "T-example" }` (taskId optional only when there is zero/one registered task). Save its receipt even on ok=false; never continue review on failure. First unlabelled begin allocates T-UUID; multiple tasks require explicit selection.
- `capture`: `{ "taskId": "T-example", "runId": "receipt UUID", "snapshot": {...complete schema...} }`. Fill conversationId, runId, taskId and sequence from the actual begin receipt; do not invent them.
- `dispatch --format=raw`: `{ "taskId": "T-example", "runId": "receipt UUID" }`. Writes exact saved UTF-8 to stdout, separate metadata JSON to stderr. Marks dispatched before output and never permits a second dispatch of the same run. Use these returned instructions for the review. JSON format instead separates promptText and metadata in one object.
- `finish`: `{ "taskId": "T-example", "runId": "receipt UUID", "status": "succeeded" }`. Only succeeded/failed/cancelled/uncertain; optional errorCode is one of the safe codes. Do not mark success until the host review actually finishes.
- `export --format=raw` or `export --format=json`: `{ "taskId": "T-example", "expectedRunId": "latest attempted UUID" }`. Raw stdout has no appended newline, metadata is on stderr. Never discard a failed attempt's ID to export an older success. Rendered chat text may not preserve exact bytes; the helper's raw output is authoritative.
- `status`: `{ "taskId": "T-example" }` returns lifecycle metadata only. It does not reconstruct the host's lost attempt receipt or authorize using an older snapshot.
- `forget-task` / `forget-task --apply`: exact taskId required; dry run is default. See retention section.

Library `consumeCaptured(scope,runId,consumer)` delivers the saved UTF-8 Buffer once, marks dispatched before delivery, finishes succeeded after consumer return or failed/uncertain after rejection, and never retries. It ships no real model consumer. Export does not call this function, a source reader, network, subprocess or model. Dispatch stdout failure is uncertain; do not resend automatically.

## Retention and exact deletion

Records remain indefinitely until explicit deletion or a reported disk limit. Inspect metadata with status; export only with the actual latest attempted receipt. There is no automatic expiry, pruning, repair or background process.

Preview: send `{"taskId":"T-example"}` via stdin to `forget-task`. Apply the user's requested deletion with the same exact task and `forget-task --apply`. The helper serializes writers, publishes a deleted tombstone first, then removes only enumerated validated snapshot/lifecycle files. It preserves unrecognized files, foreign links and all other tasks. `incomplete:true` means some records were preserved; report this, never claim full erasure. A later explicit begin can start a new generation only when the known old records were removed. Repeat deletion is safe. Tombstones retain minimal scope/deleted state and sequence; local deletion cannot erase backups/cloud copies.

For busy/uncertain after a crash: preserve the task directory and latest attempted runId. Inspect only the exact conversation lock (`SHA256(conversationId)/lock/owner.json`: lockId, pid, createdAt) and known record metadata. An age or absent PID alone is not proof of a safe transaction boundary. Recovery needs explicit authorization, the exact unchanged lock identity, and proof the owned writer has exited; validate whether the head and state committed together before changing anything. Do not unlock a partial transaction and scan for an older success. If consistency cannot be established, leave the old state unavailable and use a separately identified task/root after explaining the retained data. No automatic recovery command is provided.
