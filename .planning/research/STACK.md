# Stack Research — v1.2

**Date:** 2026-10-04 (Australia/Melbourne)
**Scope:** Fixed commands, recorded task prompts, independent Codex review and basic usage.
**Confidence:** High for inspected interface availability; medium for end-to-end isolation until implemented and tested.

## Recommended Stack

Keep TypeScript/Node and existing Zod validation. Prefer a small `node:child_process.spawn` adapter around the installed Codex CLI for the first single-run workflow; no new package is needed to establish the interface. Pin/test a supported CLI version range during Phase 20 rather than assuming every version shares flags or event shapes.

Local read-only inspection on this host found **codex-cli 0.141.0**. `codex exec --help` exposes `--json`, `--output-schema`, `--ephemeral`, `--ignore-user-config`, `--ignore-rules`, `--sandbox read-only`, `--cd`, and stdin prompts. These are capability observations, not successful review proof. `codex login status` returned **Logged in using ChatGPT**; credentials were not opened and no inference was sent.

## Alternatives Considered

| Option | Fit | Decision |
|---|---|---|
| CLI subprocess | One bounded review with explicit argv/stdin and a terminal result | Recommended first implementation candidate |
| TypeScript Codex SDK | Typed local-thread workflow when it materially simplifies execution | Supported alternative; package/version not selected or installed |
| App-server stdio | Rich approvals, lifecycle and account RPCs | Consider if a required behavior cannot be met by exec; avoid a second runner merely for optional quota data |
| Custom OAuth / direct API integration | Product-owned authentication and service integration | Deferred; the user wants to reuse local Codex |

Official [SDK guidance](https://learn.chatgpt.com/docs/codex-sdk) distinguishes SDK automation from richer app-server clients and says the old `codex mcp-server` route has been removed. Do not build on that removed command. [Non-interactive docs](https://learn.chatgpt.com/docs/non-interactive-mode) document saved-auth reuse, JSONL execution events and schema-constrained final output.

## Installation and Compatibility

No dependencies, credentials, models or CLI installations changed during research. The new milestone's product version is 0.3.0; last released product remains 0.2.4. Existing provider and proof contracts remain separate from the proposed Codex runner. CLI login storage and read restrictions must both work in the chosen target-host design; `--ignore-user-config` alone does not prove that project instructions, tools or all other runtime configuration are absent.

## Sources

- Local `codex --version`, `codex exec --help`, `codex login --help`, `codex login status`, `codex app-server --help` inspected 2026-10-04.
- `package.json`, `src/server.ts`, `src/providers/types.ts`: current integration boundaries.
- [Authentication](https://learn.chatgpt.com/docs/auth): local sign-in modes and credential ownership.
