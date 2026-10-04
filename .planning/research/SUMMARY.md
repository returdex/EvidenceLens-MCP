# Project Research Summary — v1.2

**Project:** EvidenceLens MCP
**Researched:** 2026-10-04 (Australia/Melbourne)
**Scope:** New command entry points, prompt export, Codex invocation/authentication/usage.
**Method:** Inline research, per Codex skill adapter; no research subagents or model inference were run.
**Confidence:** HIGH interface evidence / MEDIUM unimplemented integration.

## Executive Summary

The confirmed workflow is feasible with existing local Codex interfaces. Start with discoverable stage skills, a shared prompt/run snapshot, and a bounded CLI execution adapter. Export the captured task prompt through `$el-prompt` after review. Preserve the existing MCP service and DeepSeek contract; preparation need not satisfy the MCP four-role precondition.

Local Codex is 0.141.0 and reports ChatGPT login. This supports planning around existing login instead of designing a new credential store. Actual review access, model availability and evidence isolation still need implementation-time proof. No live request was sent during research.

## Key Findings

- **Stack:** Node subprocess is the smallest first candidate; SDK/app-server are alternatives if concrete requirements justify them. [Details](STACK.md).
- **Features:** Six explicit commands with shared rules; immutable scoped export is essential. Arbitrary slash aliases and visible desktop chats are not promised. [Details](FEATURES.md).
- **Architecture:** Gate evidence, capture before dispatch, validate before publishing findings. Prompt snapshots stay separate from runtime metadata and minimal receipts. [Details](ARCHITECTURE.md).
- **Pitfalls:** Broad read access, inherited tools, credential leakage, recursive calls, failure replay, cross-task latest-record lookup and fictional token costs. [Details](PITFALLS.md).

## Local Interface Evidence

| Inspection | Observed result | Limit |
|---|---|---|
| `codex --version` | codex-cli 0.141.0 | Not a global latest-version claim |
| `codex exec --help` | JSONL, schema output, ephemeral, config isolation flags, stdin and read-only available | Flags not an isolation acceptance result |
| `codex login status` | Logged in using ChatGPT | No credential contents read; inference untested |
| `codex app-server generate-json-schema --out <temporary directory>` | Exit 0; per-thread token breakdown, quota and account usage schemas present | No app-server started and no account RPC called |

Locally generated token breakdown includes input, cached input, output, reasoning output and total fields. Data presence, meaning and supported version must be checked on the selected runner. Basic product receipts should retain actually reported values with an explicit unavailable state. Quota percentages and account activity are separate optional future views, not this review's cost.

## Suggested Roadmap

| Phase | Outcome | Why this order |
|---|---|---|
| 18 | Discoverable fixed stage commands and shared routing | Establish user-facing intent and inputs |
| 19 | Immutable task prompt capture and scoped export | Preserve exactly what the later runner receives |
| 20 | Authenticated bounded independent Codex runner | Establish real execution and evidence isolation |
| 21 | Validated result return, usage receipts and end-to-end recheck | Verify the complete workflow |

## Open Questions for Phase Planning

- Select/test exec versus SDK/app-server against needed lifecycle and sandbox behavior; exec is a recommendation, not a tested production integration.
- Establish safe conversation identity when the host does not supply one.
- Choose local snapshot location, permissions, retention and deletion; never commit user task state.
- Prove permitted-evidence-only reading while retaining Codex-owned auth on the target host.
- Verify reported usage field semantics on a real bounded run; missing fields remain unavailable.
- Determine installation packaging and actual host invocation names before promising `$el-*` discovery.

## Initialization Notes

Original phase directories and audits remain in place under prior evidence-preservation decisions. The workflow's `phases.clear --confirm` would recursively delete 17 directories, so it is intentionally not run. Phase numbering continues at 18. Initial SDK detection recognized only v1.0 because its milestone-heading parser expected `Shipped`; the truthful v1.1 published heading is normalized to that compatible wording without altering archived reports.

## Sources

- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Codex authentication](https://learn.chatgpt.com/docs/auth)
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [Skill discovery and invocation](https://learn.chatgpt.com/docs/build-skills)
- Current repository source and local commands above; prior user-confirmed command semantics.

*Ready for requirements/roadmap review; not implementation acceptance.*
