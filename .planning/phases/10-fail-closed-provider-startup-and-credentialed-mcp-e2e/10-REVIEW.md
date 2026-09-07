---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-07T13:07:30+10:00
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/docker-review-real.mjs
  - tests/scripts/docker-review-real.test.ts
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-07T13:07:30+10:00
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

The Phase 10-14 changes correctly introduce an absolute request deadline, strict version/id/result-vs-error response matching, initialize-result validation, and the id-less `notifications/initialized` ordering. The focused suite passes all 61 tests. However, the harness still has two fail-closed defects in its subprocess I/O handling: a closed stdin can raise an unhandled stream error, and stdout/stderr can grow without bound. Those defects can crash or exhaust the harness outside its sanitized failure contract, so the implementation is not ready for a credentialed proof run without further fixes.

## Critical Issues

### CR-01 (BLOCKER): Child stdin errors bypass the sanitized terminal state

**File:** `scripts/docker-review-real.mjs:96-99,173-178`

**Issue:** `StdioClient` listens for errors on the `ChildProcess`, but never on `child.stdin`. If the container exits or closes its input between a response and the subsequent `notifications/initialized`, `tools/list`, or `tools/call` write, Node can emit `EPIPE` on the stdin `Writable`. With no stream error listener, that becomes an uncaught process error rather than a bounded `[docker-review:docker] failed` or `[docker-review:protocol] failed` result. It also bypasses the client's terminal cleanup path.

**Fix:** Attach and detach an stdin error handler alongside the existing child/stdout handlers, and convert it to the sanitized terminal event before any request can remain pending. For example:

```js
this.onStdinError = () => this.terminate({ dockerError: true }, true);
child.stdin.on("error", this.onStdinError);

// in detach()
this.child.stdin.off("error", this.onStdinError);
```

Also wrap or check writes so a synchronous write failure is converted through the same sanitized path.

### CR-02 (BLOCKER): Subprocess output remains unbounded despite the bounded event queue

**File:** `scripts/docker-review-real.mjs:89-92,136-152,358-360`

**Issue:** `pendingEvents` is capped at eight entries, but the raw parser buffer has no byte limit until a newline arrives, and `stderr` is concatenated without any limit for the entire container lifetime. A broken or hostile container can emit an arbitrarily long unterminated stdout line or continuous stderr during the provider deadline, exhausting the Node process before the harness can produce its sanitized bounded failure. This invalidates the claimed bounded-memory/fail-closed behavior even though the parsed-event queue itself is finite.

**Fix:** Enforce explicit byte ceilings before appending stdout and stderr. On overflow, terminate the client/container with a sanitized protocol/docker marker and discard buffered private data. Prefer byte accounting (`Buffer.byteLength`) rather than JavaScript string length. For example:

```js
if (Buffer.byteLength(this.buffer) + Buffer.byteLength(chunk) > MAX_STDOUT_BYTES) {
  this.terminate({ overflow: true }, true);
  return;
}
```

Apply an equivalent cap to stderr (or do not retain it at all, since current public failures intentionally discard it).

## Warnings

### WR-01 (WARNING): The I/O boundary tests do not exercise write-side failure or raw-byte overflow

**File:** `tests/scripts/docker-review-real.test.ts:29-43,46-151`

**Issue:** The fake stdin is only a pair of spies, so it cannot emit the `Writable` error that occurs on a real closed pipe. The bounded-delivery tests cap parsed events but never send an oversized unterminated stdout fragment or sustained stderr. Consequently, the suite's 61 passing tests do not protect the fail-closed and bounded-memory guarantees implicated by CR-01 and CR-02.

**Fix:** Model stdin as an `EventEmitter`/writable test double, assert that an `error` event terminally rejects pending work with a sanitized category, and add byte-boundary tests for unterminated stdout and stderr at, below, and above the configured limits. Verify listeners and retained buffers are cleared after each terminal condition.

---

_Reviewed: 2026-09-07T13:07:30+10:00_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
