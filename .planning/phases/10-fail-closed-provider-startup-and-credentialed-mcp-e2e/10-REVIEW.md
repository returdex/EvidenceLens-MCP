---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-22T00:00:00Z
depth: deep
files_reviewed: 27
files_reviewed_list:
  - src/providers/config.ts
  - src/providers/types.ts
  - src/providers/deepseek.ts
  - src/providers/request-budget.ts
  - src/providers/retry.ts
  - src/tools/review.ts
  - src/server.ts
  - compose.yaml
  - scripts/proof-runtime-spec.mjs
  - scripts/docker-review-real.mjs
  - scripts/automatic-live-review.mjs
  - scripts/audit-live-readiness.mjs
  - scripts/audit-live-evidence.mjs
  - scripts/audit-proof-chain.mjs
  - scripts/sync-proof-state.mjs
  - tests/providers/config.test.ts
  - tests/providers/deepseek.test.ts
  - tests/providers/request-budget.test.ts
  - tests/providers/retry.test.ts
  - tests/contract/review-provider.test.ts
  - tests/contract/review-tool.test.ts
  - tests/scripts/proof-runtime-spec.test.ts
  - tests/scripts/docker-review-real.test.ts
  - tests/scripts/automatic-live-review.test.ts
  - tests/scripts/audit-proof-chain.test.ts
  - README.md
  - docs/mcp-contract.md
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-22T00:00:00Z
**Depth:** deep
**Files Reviewed:** 27
**Status:** issues_found

## Summary

The provider request itself now consistently omits `max_tokens` when no explicit value is supplied, includes an explicit value only within 1..393216, fingerprints the same optional shape, treats only `message.content` as authoritative, and validates complete `stop`/`length` JSON through schema and local provenance checks. The one-send provider capability also prevents retry/fallback sends in proof mode.

However, the current executable proof chain is not ready for another paid run. Its production registries still address the consumed 10-157..160 namespace, and its live preflight does not enforce the documented absence of an ambient `DEEPSEEK_MAX_TOKENS`. In addition, the upstream HTTP envelope is decoded without a byte bound. Plans 10-162 and 10-163 describe the first two corrections, but those corrections do not exist in the submitted source yet; the paid 10-165 step must remain blocked until this report is cleared.

The configured review scope also named `scripts/automatic-live-review-cli.mjs`, which does not exist. The actual CLI entrypoint is `scripts/automatic-live-review.mjs` through `package.json`; that existing file was reviewed instead and the nonexistent path is not included in `files_reviewed_list`.

## Critical Issues

### CR-01: BLOCKER — Production proof and synchronization registries still target the consumed generation

**Files:** `scripts/automatic-live-review.mjs:32-43`, `scripts/sync-proof-state.mjs:23-28`, `scripts/audit-proof-chain.mjs:1-1286`

**Issue:** The zero-argument production entrypoints still bind build/live execution to 10-158/159/160 and synchronization to 10-157..161. The 10-160 state path already represents a consumed authority-false generation. Consequently, invoking `npm run review:auto-live-once` now either fails as a replay or authenticates the obsolete source/image tuple; it cannot produce the planned 10-165 evidence. Likewise, `sync-proof-state.mjs recover` can only resolve the obsolete 10-161 claim/journal. Plan 10-162 promises to rotate these registries, but planning text is not executable enforcement.

**Fix:** Before any credential read or provider call, rotate every fixed registry and every exact-order audit mode together to the 10-162 forensic archive, 10-163 SOURCE/REVIEW/SECURITY, 10-164 BUILD, 10-165 state/terminal/live tuple, and 10-166 claim/journal. Add tests that invoke both zero-argument production commands and assert the exact new paths, reject every old/mixed path, and prove replay failure occurs before credential access.

### CR-02: BLOCKER — Live preflight does not reject an ambient explicit token cap

**Files:** `scripts/docker-review-real.mjs:196-209`, `scripts/docker-review-real.mjs:540-556`, `scripts/automatic-live-review.mjs:160-166`

**Issue:** `liveProofPreflight()` validates retries and timeout but never checks `DEEPSEEK_MAX_TOKENS`. It then returns `childEnv: { ...baseEnvironment }`, preserving any ambient explicit cap. `runStatefulAutomaticLive()` also begins from `process.env`. Static Compose normalization rejects a cap in the resolved service, but that is not equivalent to rejecting the runtime input that the 10-165 plan and documentation claim is absent. The next paid generation could therefore run under a process containing an unapproved explicit cap while the evidence chain asserts provider-default output behavior; even if the current Compose service happens not to forward that key, the proof does not authenticate that safety property and a later Compose change could silently activate it.

**Fix:** Make the production live preflight fail before reservation/credential access whenever `DEEPSEEK_MAX_TOKENS` is an own property of the supplied environment. Construct `childEnv` from an explicit allowlist (or explicitly remove the key after rejecting it), and independently assert the resolved review environment has no such key. Add production-path tests for hostile process environment, project `.env`/Compose resolution, and resolved-service injection; each must prove zero Docker spawn and zero provider send.

## Warnings

### WR-01: WARNING — Upstream response decoding is unbounded before content validation

**File:** `src/providers/deepseek.ts:300-304`

**Issue:** The adapter calls `response.json()` before applying the 1,000,000-character limit to `message.content`. That causes the entire response envelope—including ignored fields such as `reasoning_content`, extra choices, usage extensions, or an oversized error-shaped payload—to be buffered and parsed without a byte ceiling. The later content check does not protect this boundary. A malformed or unexpectedly large provider response can therefore consume unbounded memory or fail outside the intended bounded diagnostic path, and this locally detectable gap is not covered by the current response tests.

**Fix:** Read the response body through a bounded byte reader first, reject overflow with a content-free provider diagnostic, decode UTF-8 fatally, then `JSON.parse` the bounded string. Set a deliberate envelope limit that accommodates the largest supported explicit output plus bounded metadata, and add tests for oversized `reasoning_content`, oversized ignored choices/fields, multibyte boundary cases, malformed UTF-8, and a valid response exactly at the boundary.

---

_Reviewed: 2026-09-22T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
