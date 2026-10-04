# Phase 20 — Targeted Codex Execution Research

**Researched:** 2026-10-05 local / 2026-10-04 UTC. Inline, pursuant to prior user research choice. No inference, credentials read, auth mutation or chat creation.

## Recommendation and evidence limits

Use installed Node stdlib helpers plus a fresh `codex exec` process. Supply exact captured prompt through stdin only, request JSONL/structured output, and independently validate the final result. Use an outer macOS Seatbelt sandbox for the entire CLI process and disable external execution and connector capabilities. Native command sandbox settings alone are insufficient to constrain automatic context, MCP/apps or the CLI engine. The complete outer policy and login-compatible launch are **not yet proven**; Plan 02 owns that bounded proof before command wiring. If compatibility cannot be established, execution reports unsupported and Phase 20 remains incomplete rather than weakening CDX-04/05.

## Fresh local observations

| Probe | Observed | Does not establish |
|---|---|---|
| executable/version | /opt/homebrew/bin/codex -> Homebrew Cask 0.141.0 arm64; codex-cli 0.141.0 | compatibility with every needed guard |
| codex login status | Logged in using ChatGPT | remote login freshness, model access or successful inference |
| exec --help | stdin `-`, --json, --output-schema, --ephemeral, --ignore-user-config, --ignore-rules, --strict-config | all context/tool/retry controls applied |
| features list | shell, apps, browser, computer use, plugins, hooks, memories, multi_agent and image generation capabilities present | safe default tool inventory |
| native sandbox synthetic probe | read inside ALLOWED; read outside ALLOWED; write inside ALLOWED, exit 0 | expected read/write isolation FAILED |
| explicit config repeats | added :tmpdir/:slash_tmp deny, then inline profile overrides; same unexpected allowed results | cause remains unknown; do not generalize to all Codex hosts |
| direct /usr/bin/sandbox-exec probe | allowed file read succeeded; sibling denied file read and write denied, exit 0 | only a small native OS boundary works; not a complete Codex policy |

All filesystem probes used newly created 0700 /private/tmp/el20-* directories, two synthetic sentinel files and /bin/sh invoking /bin/cat and /usr/bin/touch. They ran with deadlines, never touched coursework/auth, and removed only their owned temp directory. Native Codex probe used synthetic HOME/CODEX_HOME; no inference command. Direct Seatbelt probe used `(allow default)` plus narrow synthetic read/write denies and a single read exception: this diagnostic profile is **not** the production policy. Production must deny by default, never reuse this permissive probe profile. Reproduce these checks from committed tests in Plan 02/05; /tmp scripts are not downstream dependencies.

## Official sources and implications

1. [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) — fresh exec, stdin, ephemeral, JSONL and output schema are supported. `--ignore-user-config` and `--ignore-rules` exist. JSONL includes intermediate events; retain only an allowlisted final/receipt. Prompt argument plus stdin adds context, so use stdin alone. Ephemeral is about rollout persistence, not proof of no other logs.
2. [Authentication](https://learn.chatgpt.com/docs/auth) — Codex owns ChatGPT sign-in and credential storage. Preserve that authority; no auth.json copying into containers/temp homes and no implicit API-key route.
3. [Permissions](https://learn.chatgpt.com/docs/permissions) — profiles are beta and govern local commands; external tools require separate controls. Legacy sandbox flags override profiles. A documented profile is not actual host evidence. Native probe failure is retained above.
4. [Sandbox and approvals](https://learn.chatgpt.com/docs/agent-approvals-security) — macOS uses Seatbelt. Command network policies do not automatically govern every tool surface. Need full outer process isolation plus an independently tested tool inventory.
5. [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) — shell_tool, multi_agent, apps/hooks/plugins/memories/browser controls, web_search, project_doc_max_bytes, history and telemetry settings; request/stream retry settings are documented for provider definitions. Built-in provider IDs are reserved, so **do not assume overrides disable built-in ChatGPT retry**: verify with a synthetic endpoint and exact installed binary. Flags accepted by a parser do not prove effective behavior.
6. [App server](https://learn.chatgpt.com/docs/app-server) — offers effective-config and per-turn controls but brings a larger RPC lifecycle. It is not an automatic fallback or needed dependency. Reconsider only if the CLI compatibility proof identifies an unfixable gap, with a concrete revised plan.

Official pages were fetched including their Markdown variants; local help takes precedence for this installed version. No mirror, forum or issue report is used as implementation authority. Earlier research saying mcp-server was removed does not match current `codex --help`, which lists it; that interface is outside this plan and unnecessary.

## Exact implementation seams

- prompt-contract.mjs hardcodes lifecycle schemaVersion=1 and executionKind=host_skill. Introduce a backwards-readable v2 lifecycle for codex_exec without changing existing snapshot v1 bytes. Public finish must not manufacture codex success.
- prompt-store.mjs readForDispatch atomically marks dispatched; reserve it as the sole at-most-once consumption gate. Do not dispatch twice when startup/event delivery is uncertain. Keep begin order as latest, including failed preflight.
- prompt-records.mjs consumeCaptured currently finishes success when a callback returns. Independent execution must return only after full process/event/schema/local-binding validation, or use an explicit internal terminal commit API.
- Source material hashes describe admitted full text; excerpt hashes and offsets need a canonical capsule constructed before capture. Check both at capture using admitted in-memory bytes, bind results only to stored excerpts thereafter. Paths are not a read capability.
- All new runtime helpers must live under the installed shared Skill; no import of repository dist, paid-proof state machinery or cwd-local node_modules.

## Compatibility gate to resolve in execution

Plan 02 must produce a real-binary offline fixture exchange under the actual outer policy, an observed outgoing tool inventory, no ambient instruction/memory/config sentinels, and one model-request count on injected failure. Use a **separate synthetic home and dummy test credential** for loopback protocol tests: never point the logged-in production Codex at a test gateway. The test-only provider must be unreachable through production CLI inputs. Also run the production-shaped outer launch with the existing auth path for `codex login status` only, without exposing credentials or making inference. Pin what was actually proven; keychain or atomic auth refresh remains unsupported until safely verified.

No executable from model content, no assignment paths mounted, no write access to original auth/config/history, no provider endpoint override in production. The selected invocation-local evidencelens_bounded descriptor retains requires_openai_auth=true and omits base_url/env_key/token/auth-command while setting request_max_retries=0 and stream_max_retries=0; it preserves Codex-selected ChatGPT routing and does not enable API billing. Production network exists for Codex inference; a fixed observed tool inventory plus OS read/write boundaries are the enforcement mechanism, not an unproven domain allowlist. General adversarial same-user OS processes and a compromised trusted Codex executable are outside scope.

## Validation Architecture

Node test runner for contracts, real temp-file isolation and fake process/protocol tests. Tool catalog and retry enforcement use the actual CLI against a synthetic loopback provider with dummy auth, no paid/model inference. Count requests and inspect only synthetic request bodies; test HTTP failure, broken stream, tool-call attempt and ambiguous termination. Target macOS Seatbelt tests include positive admitted access and negative original/excluded/auth-via-tool/write/recursive/MCP/browser attempts. Real `login status` is read-only preflight evidence only. Phase 21 supplies separately authorized real ChatGPT review acceptance and usage provenance.

Require exact captured/exported/stdin hashes, source-reference validation, concurrent attempts and terminal races, cleanup after TERM/KILL, output quotas, and no raw logs/secret sentinels. Partial or unsupported checks stay pending. See 20-VALIDATION.md for all 12 task mappings. Manual semantic judgments remain partial Nyquist coverage; no evaluation or acceptance is claimed by planning.

## Planning compatibility follow-up and resolved design

Additional bounded synthetic probes on the same local binary (no real credentials/model):

- `model_providers.openai.request_max_retries=0` and stream equivalent are rejected: built-in provider IDs cannot be overridden. No request was made.
- `tools.view_image=false` is rejected as unknown under --strict-config. Local generated app-server ConfigReadResponse schema ToolsV2 only exposes web_search. Remove this invalid key from the implementation recipe.
- Disabling the listed features still advertises update_plan, request_user_input, apply_patch and view_image. A code_mode exclusion experiment added exec/wait without removing those four; do not use it. The resolved design relies on a deny-default outer OS boundary and a fixed four-tool inventory, rejects tool-use outcomes, and makes no zero-tools claim. Apply-patch/view-image must have actual deny/disclosure controls demonstrated before certification, including synthetic auth sentinels; the engine's narrow auth read remains trusted. No shell, subagent, browser, MCP or external connector is permitted.
- An invocation-local descriptor with requires_openai_auth=true, request_max_retries=0 and stream_max_retries=0 was accepted. With **fabricated test ChatGPT tokens in a fresh synthetic home** and no base_url, the error reported Codex's default ChatGPT `/backend-api/codex/responses` destination. A network-deny Seatbelt probe blocked external traffic before it could leave; the fake token was never a real user's token. With an explicit loopback fixture base_url (test only), one `/fixture/responses` POST was observed on injected HTTP 500; model-catalog GET was separate. No retry occurred in this tested case. `analytics.enabled=false` removed observed fixture analytics POSTs. Production omits endpoint/auth overrides and uses the existing login; the test-only endpoint is never a production option.
- These resolve the selected design: fixed tools under whole-process sandbox and an ephemeral Codex-auth transport descriptor for zero configured retries. Full deny-default startup, forced-call disclosure negatives, clean fixture success and other retry/error paths are executable acceptance tasks, not planning-proven behavior. No direct source code for this binary was available from the attempted public repository paths (404); no source-level implementation claim is made.

Request semantics: one logical review dispatch, no HTTP/stream retry after failed transport and no second logical review attempt. An unexpected native tool event aborts and invalidates the review; an internal continuation already in flight is uncertain and may have consumed usage. Cancellation never guarantees that an already received remote request was undone. Phase 21 must report actual available usage accordingly. Do not promise one HTTP request for all possible internal Codex behavior or claim remote rollback.
