---
status: resolved
trigger: "Plan 10-95 still produced tools=1 with null receipt after handler-level receipt coordinator"
---

# Debug Session: mcp-handler-not-entered-receipt

## Symptoms

- Expected behavior: request-level coordinator emits an authenticated receipt whether provider runs or the tool settles earlier.
- Actual behavior: tools=1, sends=0, receipt=null, stream_truncated=true, exit/close=0, post_tools_pre_fetch after coordinator fix.
- Error messages: AUTOMATIC_TERMINAL_STATE.
- Timeline: reproduced on exact image containing commit 94184b2.
- Reproduction: consumed Plan 10-95 must not replay; use provider-disabled exact fixture request and network-none Docker only.

## Current Focus

- hypothesis: the high-level SDK owns a pre-callback validation seam that is not covered by the registered handler finally; even though the exact 10-95 fixture reaches the handler, receipt ownership is not structurally guaranteed at the tools/call request boundary.
- test: exercise invalid input through in-memory and real stdio MCP while authenticating a zero-send receipt, then run the exact 10-95 image and fixture provider-disabled with network disabled.
- expecting: protocol-boundary settlement emits exactly one authenticated receipt while the provider adapter remains primary.
- next_action: archived after complete provider-disabled verification

## Evidence

- timestamp: 2026-09-16T22:02:00+10:00
  finding: SDK 2.0.0 validates registered tool input before invoking the registerTool callback; the handler-level finally cannot cover this path.
  source: node_modules/@modelcontextprotocol/server/dist/mcp-DXXb3Vv3.mjs
- timestamp: 2026-09-16T22:04:00+10:00
  finding: Exact image sha256:404b8d460f9793a707f766537d8541eef61634d4ff0f0e38c45420359da7c02c accepts the real four-file fixture through tools/call and emits a valid zero-send receipt under provider-disabled, network-none Docker.
  source: local bounded Docker probe; no provider or external network
- timestamp: 2026-09-16T22:07:00+10:00
  finding: Protocol-boundary implementation passes 131 focused tests, including in-memory pre-handler validation and real stdio process receipt authentication.
  source: tests/contract/review-tool.test.ts and tests/scripts/docker-review-real.test.ts


## Eliminated

- hypothesis: the real fixtureRequest does not reach the registered handler.
  evidence: exact 10-95 image completed the real fixture under provider-disabled network-none Docker and emitted the zero-send receipt.
- hypothesis: proof environment variables were absent from the container.
  evidence: diagnostic and request-proof constants intentionally share the same two environment variable names already forwarded by the harness.


## Resolution

- root_cause: Receipt fallback ownership was attached to the high-level registerTool callback, but SDK input validation can settle tools/call before that callback; the exact 10-95 fixture itself does reach the handler and emits a receipt when probed directly.
- fix: Keep the provider adapter as the primary exactly-once receipt producer and install the zero-send fallback around the low-level tools/call protocol handler so valid request settlement, including pre-callback input rejection, is covered.
- verification: 131 focused tests and 633 complete provider-disabled tests passed; TypeScript build and git diff check passed; exact 10-95 image and four-file fixture passed under provider-disabled network-none Docker with an authenticated zero-send receipt.
- files_changed: src/tools/review.ts; tests/contract/review-tool.test.ts
