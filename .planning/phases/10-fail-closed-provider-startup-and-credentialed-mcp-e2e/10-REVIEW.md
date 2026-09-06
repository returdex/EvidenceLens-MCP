---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-06T12:48:05Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - README.md
  - docs/docker-deployment.md
  - docs/mcp-contract.md
  - scripts/docker-provider-startup-matrix.sh
  - scripts/docker-review-real.mjs
  - scripts/docker-smoke.sh
  - src/server.ts
  - tests/contract/review-tool.test.ts
  - tests/providers/config.test.ts
  - tests/providers/deepseek-live.test.ts
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

**Reviewed:** 2026-09-06T12:48:05Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The fail-closed provider startup and Docker proof paths contain two release-blocking false-success/failure-contract gaps. The direct stdio executable does not actually fail during startup when configuration is missing, and the credentialed Docker proof accepts output that is not demonstrably from DeepSeek or schema-valid. The opt-in live test can also silently skip malformed configuration, making an explicitly requested validation command exit successfully without validating anything.

## Critical Issues

### CR-01 (BLOCKER): Direct stdio startup defers provider configuration failure until MCP initialization

**File:** `src/server.ts:36-41`
**Issue:** `main()` passes `createServer()` as a lazy callback to `serveStdio`. Consequently, missing provider configuration is not checked when the executable starts. A direct invocation stays alive until an MCP request arrives; an `initialize` request then receives only JSON-RPC `Internal server error`, and the process can exit with status 0 when stdin closes. This contradicts the documented contract that provider-enabled local startup terminates with a sanitized `PROVIDER_CONFIGURATION` classification. It also prevents operators and MCP clients from distinguishing a configuration failure from an internal server defect. The unit test at `tests/contract/review-tool.test.ts:173-195` calls `createServer()` directly and therefore does not exercise this executable behavior.
**Fix:** Eagerly create/validate the server before entering the stdio loop, and catch `ProviderError` at the executable boundary to emit exactly the sanitized classification and set a non-zero exit code. Add a child-process test that launches `dist/server.js` with no configuration and asserts failure occurs before any MCP request and without stack/path leakage.

### CR-02 (BLOCKER): Credentialed E2E proof accepts fake or structurally invalid provider output

**File:** `scripts/docker-review-real.mjs:122-151`
**Issue:** The real-provider gate does not parse the payload with the public response schema and only requires any finding ID beginning with `provider:` plus any string-valued `metadata.provider.name` and `model`. A response attributed to another provider (for example `name: "fake"`, `id: "provider:fake:x"`) or a malformed response with missing/invalid finding, citation, evidence, or metadata fields can pass. Therefore the command can report `credentialed review passed` without proving the documented DeepSeek MCP contract. The test fixture in `tests/scripts/docker-review-real.test.ts:15-43` only covers a valid-looking happy path and has no adversarial cases for fake attribution or missing schema fields.
**Fix:** Parse the decoded payload with the same strict public `reviewResponseSchema` (or an equivalent standalone schema usable from the script), require `metadata.provider.name === "deepseek"`, require the expected configured model, and require at least one `provider:deepseek:` finding. Add negative tests for another provider name, another namespace, invalid/missing finding fields, invalid normalized evidence, and inconsistent citation/evidence IDs.

## Warnings

### WR-01 (WARNING): Live command treats every configuration defect as an absent credential

**File:** `tests/providers/deepseek-live.test.ts:12-18`
**Issue:** The blanket `catch` around `loadProviderConfig()` calls `skip()` for every `ProviderError`. An explicitly invoked `npm run test:deepseek-live` therefore succeeds as skipped not only when credentials are absent, but also when the local JSON is malformed or unreadable, environment and file sources conflict, the model is invalid, or numeric settings are out of bounds. This hides actionable setup regressions and contradicts the documentation that the command skips only when neither usable credential source exists.
**Fix:** Decide whether credentials are absent before loading (for example, check the environment key and default config-file existence). Skip only for the precise no-credential case; allow malformed, unreadable, conflicting, and invalid configuration errors to fail the test. Add tests that distinguish absent credentials from invalid supplied configuration.

---

_Reviewed: 2026-09-06T12:48:05Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
