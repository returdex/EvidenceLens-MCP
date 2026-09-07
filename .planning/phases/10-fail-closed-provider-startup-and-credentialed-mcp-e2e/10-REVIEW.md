---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - README.md
  - docs/docker-deployment.md
  - docs/mcp-contract.md
  - scripts/audit-live-evidence.mjs
  - scripts/docker-provider-startup-matrix.sh
  - scripts/docker-review-real.mjs
  - scripts/docker-smoke.sh
  - src/providers/config.ts
  - src/server.ts
  - tests/contract/review-tool.test.ts
  - tests/providers/config.test.ts
  - tests/providers/deepseek-live.test.ts
  - tests/scripts/audit-live-evidence.test.ts
  - tests/scripts/docker-review-real.test.ts
  - tests/smoke/docker-config.test.ts
findings:
  critical: 3
  warning: 0
  info: 0
  total: 3
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The FIFO change fixes the previously reported coalesced-message loss and its queue overflow path is fail-closed. The configuration, evidence-audit, and clean-child-exit changes are also internally consistent. However, the credentialed proof client still does not implement a bounded request deadline or a valid MCP initialization handshake, and it accepts non-JSON-RPC objects as successful responses. These defects mean the harness can both hang beyond its advertised budget and certify a transport that did not complete the required MCP protocol.

The authorized post-fix `[docker-review:protocol] failed` remains a non-pass and is not itself treated as a source defect; the findings below are independently reproducible from the offline client logic.

## Critical Issues

### CR-01 (BLOCKER): Notifications reset the request timeout indefinitely

**File:** `scripts/docker-review-real.mjs:159-163`
**Issue:** `request()` calls `next(methodTimeoutMs(...))` again after every message whose `id` does not match. Each call creates a fresh full-duration timer. A server that emits progress/log notifications before the response can therefore extend a nominal 60-second `tools/call` without limit by sending one notification per timeout interval. This violates the advertised single finite `tools/call` budget and can leave the paid proof running indefinitely. The old `withTimeout()` wrapped the entire request promise; the FIFO rewrite accidentally changed the timeout into an idle timeout.
**Fix:** Compute one absolute deadline before entering the loop and pass only `Math.max(0, deadline - Date.now())` to each `next()` call, failing immediately when the remaining budget is exhausted. Add a fake-timer regression that emits multiple nonmatching notifications and proves the request still times out at the original total deadline.

### CR-02 (BLOCKER): The client skips the required initialized notification

**File:** `scripts/docker-review-real.mjs:313-318`
**Issue:** After receiving the `initialize` response, the client immediately sends `tools/list`. MCP initialization requires the client to send `notifications/initialized` before beginning normal operations. A tolerant server may accept this sequence, but it is not a valid end-to-end MCP lifecycle and a conforming server may reject or defer `tools/list`. Consequently this harness cannot establish the claimed complete MCP stdio proof and may classify a conforming implementation as a protocol failure.
**Fix:** Validate the initialize result, then write a JSON-RPC `notifications/initialized` notification (with no `id`) before requesting `tools/list`. Add an offline transcript test that asserts the exact order `initialize` response -> `notifications/initialized` -> `tools/list` -> `tools/call`.

### CR-03 (BLOCKER): Response matching accepts objects that are not JSON-RPC responses

**File:** `scripts/docker-review-real.mjs:168-171`
**Issue:** A line is accepted solely when its `id` matches and it has a `result`. The client never requires `jsonrpc === "2.0"`, never verifies that the response is an object with an allowed response shape, and does not reject an object containing both `result` and `error`. For example, `{ "id": 1, "result": {} }` is accepted as a successful initialize response, while `{ "jsonrpc": "1.0", "id": 2, "result": { "tools": [...] } }` can pass tool discovery. This lets non-MCP or contradictory output satisfy the proof harness.
**Fix:** Before consuming a matching response, require an ordinary object with exactly JSON-RPC 2.0 response semantics: `jsonrpc: "2.0"`, the expected `id`, and exactly one of `result` or `error`. Validate the initialize result's required protocol fields as well. Add negative transcript tests for missing/wrong `jsonrpc`, both/neither `result` and `error`, and malformed initialize results.

---

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
