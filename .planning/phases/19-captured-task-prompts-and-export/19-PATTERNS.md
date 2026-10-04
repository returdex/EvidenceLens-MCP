# Phase 19 — Existing patterns and responsibility map

Inspected 2026-10-05; proposed files do not exist yet.

| Planned file | Existing analog | Reuse / boundary |
|---|---|---|
| scripts/prompt-contract.mjs under installed Skill | baseline-sources.mjs fields()/snapshot() | strict bounded plain-data input; reject extras/accessors before content use; no arbitrary input spread |
| scripts/prompt-store.mjs under installed Skill | repository scripts/live-proof-state.mjs writeExclusive()/replaceDurably()/secureRead() | O_EXCL/O_NOFOLLOW, 0600, hash, fsync, same-directory rename; copy only small generic patterns, do not import the paid-proof subsystem or its credentials |
| scripts/prompt-records.mjs under installed Skill | baseline-sources.mjs CLI and installer import.meta.url main guard | explicit action, bounded stdin, sanitized errors; no output/import side effects; no cwd-relative repository dependency |
| references/prompt-records.md | references/command-entrypoints.md / stage-prompts.md | one installed contract used by all wrappers; task-facing six-section prompt with source/current scope |
| tests/prompts/*.mjs | tests/commands/install-review-skills.mjs / tests/baseline/source-boundary.mjs | Node stdlib temp filesystem, injected readers/failures, child process behavior; keep semantic evaluation separately labeled |
| native/current-host trials | Phase 18 HOST receipts and COMMAND-EVALUATION | synthetic source only, actual helper I/O/hash/source traces; no assertion of independent provider execution |

Storage owns validation, identity binding, immutable snapshot and latest/lifecycle atomics. CLI owns host identity resolution and stdin/stdout formatting. Shared Skill owns task-facing composition from permitted evidence and actually uses the dispatched snapshot. Phase 20 will consume the same snapshot bytes; it must not regenerate them. Existing MCP API, provider prompts and public contracts remain unchanged except the final product patch metadata.

Concrete existing atomic pattern: live-proof-state.mjs lines 90–92 opens O_CREAT|O_EXCL|O_WRONLY|O_NOFOLLOW, writes bytes and syncs; lines 106–108 writes a temp then renames; lines 120–125 checks file ownership/mode/size before parsing. Existing source collector gates before readSource and hashes only admitted text. Installation exports all helpers automatically because assignment-review is a directory symlink; a helper outside that directory would break cross-project use.

Observed CODEX_THREAD_ID is set and equals the known calling conversation ID. No other environment values/auth caches/chats were inspected. Treat absence as unsupported identity, not a reason to invent a session key. No official long-term environment-variable stability claim.
