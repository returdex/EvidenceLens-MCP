---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-06T18:12:23Z
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
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-06T18:12:23Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The final Phase 10 source state now enforces integral count-valued configuration, exact four-fixture positive-finding evidence, resolved DeepSeek model identity, literal zero retries, bounded provider/tool timeouts, and success only after a clean unsignaled child exit. The observed authorized `[docker-review:protocol] failed` remains a live non-pass and is not treated as proof of a source defect.

One correctness defect remains in the Docker MCP client. Its stdout parser has no pending-message queue, so a valid JSON-RPC response can be discarded when multiple protocol messages arrive in one stream chunk. This can turn a successful one-shot paid invocation into an unrecoverable timeout without permission to retry.

## Critical Issues

### CR-01 (BLOCKER): Stdio parser discards messages that arrive without an installed waiter

**File:** `scripts/docker-review-real.mjs:92-121`
**Issue:** `drain()` removes every complete line from `this.buffer`, but delivers it only through `this.waiters.shift()?.(...)`. If a chunk contains more messages than there are current waiters, every subsequent message is silently discarded. This occurs naturally when an MCP notification and the requested response are coalesced into one stdout chunk: the notification consumes the sole waiter, the response is dropped, and `request()` installs its next waiter only after the current callback completes. The one-shot credentialed proof then waits until timeout even though the server returned a valid response. The same defect also drops output that arrives just before `next()` is registered.
**Fix:** Maintain a FIFO event queue in addition to the waiter queue. `drain()` should enqueue each parsed/malformed event when no waiter exists, and `next()` should return a queued event immediately before registering a waiter. Add a test that emits two newline-delimited messages in one data event (an unrelated notification followed by the matching response) and verifies the request resolves rather than timing out.

---

_Reviewed: 2026-09-06T18:12:23Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
