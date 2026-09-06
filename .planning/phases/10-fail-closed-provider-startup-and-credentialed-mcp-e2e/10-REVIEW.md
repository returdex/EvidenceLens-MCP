---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-07T00:58:00Z
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
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-07T00:58:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The final Phase 10 source state fixes the earlier eager-startup, live-test skip, schema-validation, provider-identity, and zero-retry defects. The focused credential-free suite passed 50 tests. The separately authorized live result was `[docker-review:protocol] failed`; this report correctly treats that result as a non-pass, not by itself as a source-code defect.

Three remaining defects were found. Two can let the retained proof path report success without proving the complete command outcome it claims, and one permits fractional values for settings documented and consumed as integral counts.

## Critical Issues

### CR-01 (BLOCKER): Evidence audit accepts impossible success summaries

**File:** `scripts/audit-live-evidence.mjs:7-27`
**Issue:** The success expression accepts any decimal fixture and finding counts, including `0 fixtures, 0 findings`, and `passedOutcome` is based only on that loose expression. Consequently a verification report containing `outcome: credentialed review passed: 0 fixtures, 0 findings`, a checked PROV-01 box, and `status: passed` passes the audit even though the live harness requires exactly four normalized fixtures and at least one `provider:deepseek:` finding. This creates a false-positive proof path in the artifact-consistency gate.
**Fix:** Require the exact harness success contract and reject all other counts, for example:

```js
const success = /^outcome: credentialed review passed: 4 fixtures, ([1-9]\d*) findings$/u;
```

Add adversarial tests for zero, non-four, and malformed counts.

### CR-02 (BLOCKER): Live harness reports success after an abnormal container exit

**File:** `scripts/docker-review-real.mjs:236-238`
**Issue:** After receiving a structurally valid response, the harness prints `credentialed review passed` before waiting for shutdown, and the exit promise resolves for every exit code or signal. A container that returns one response and then terminates with a fatal non-zero status is therefore recorded as a successful complete Docker MCP stdio proof. This is especially problematic because the retained stdout line is the evidence consumed by the audit workflow.
**Fix:** Wait for the exit result, require `code === 0` and `signal === null`, and only then print the success summary. Add a child-process seam test covering a valid response followed by exit code 1.

## Warnings

### WR-01 (WARNING): Integral provider settings accept fractional values

**File:** `src/providers/config.ts:51-53`
**Issue:** `parseFiniteNumber` enforces only numeric bounds. It therefore accepts values such as `maxRetries: 0.9` and `maxTokens: 1.5`, even though these are count-valued settings. Retry execution silently floors `maxRetries`, while token APIs may reject fractional `max_tokens` later. The accepted typed configuration can thus behave differently from the configured value or fail only after a paid request is attempted.
**Fix:** Add an integer-aware parser (or an `integer` parameter) and use it for `timeoutMs`, `maxRetries`, `maxTotalWaitMs`, and `maxTokens`; retain finite-number validation for `temperature`. Add local-file and environment regression cases for fractional values.

---

_Reviewed: 2026-09-07T00:58:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
