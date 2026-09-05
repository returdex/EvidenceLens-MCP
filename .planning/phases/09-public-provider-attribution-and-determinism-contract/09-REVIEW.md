---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-05T06:29:36Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - docs/mcp-contract.md
  - src/contracts/review.ts
  - src/providers/types.ts
  - src/review/analysis.ts
  - src/tools/review.ts
  - tests/contract/public-contract-docs.test.ts
  - tests/contract/review-provider.test.ts
  - tests/fixtures/reviews/deterministic-only-mcp-text.fixture.json
  - tests/review/analysis.test.ts
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-05T06:29:36Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 09's top-level descriptor check correctly rejects all top-level accessor descriptors without reading them, and the existing reflective/proxy exception handling remains sanitized. However, the result envelope is only checked before Zod traverses nested values. A nested `modelFindings` proxy can mutate the otherwise ordinary outer result during schema parsing, add a hidden seventh field, and still produce an attributed success. This violates the documented whole-result rejection contract; **a blocker exists**.

The focused Phase 09 suite passed (65 tests), `npm run build` passed, and the full credential-free/no-network suite passed (190 tests). Those green results do not cover the successful nested-mutation path below. The full suite emitted non-failing PDF.js font/indexing warnings.

## Critical Issues

### CR-01: Nested parser traps can mutate and bypass the provider-result envelope preflight

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/providers/types.ts:23-36`
**Affected flow:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:273-278`
**Issue:** The preflight proves only that the six *outer* properties are data descriptors before `providerReviewResultSchema.safeParse()` begins. Its values remain untrusted. A `modelFindings` array Proxy is itself stored in a valid data descriptor, so it passes `isProviderReviewResultEnvelope`. During Zod's normal reads of `length`/indexes, the Proxy can add a non-enumerable `apiKey` (or symbol/custom prototype) to the outer result and return valid findings. No post-parse envelope check runs, and the handler returns `ok: true` with `metadata.provider`.

I reproduced this with an ordinary six-key result whose `modelFindings` Proxy adds a non-enumerable `apiKey: "nested-secret"` on its `get` trap. The handler returned success; the trap ran four times and `Reflect.ownKeys(result)` afterwards contained all six allowlisted keys plus `apiKey`. This is the same validation-time mutation class that 09-08 intended to close, now reachable through nested structural parsing. It contradicts the public contract at `docs/mcp-contract.md:70`, which says any unknown/private extra field rejects the entire provider result.

**Fix:** Re-run the descriptor/key/prototype/proxy preflight immediately after `safeParse` and before using `parsedProviderResult.data`; reject if the outer envelope changed. Add regression cases for proxied/accessor-backed `modelFindings` and `deterministicFindings` that mutate the outer object during parsing, asserting exact `PROVIDER_FAILURE`, no public sentinel, and no attributed success.

```ts
const parsedProviderResult = providerReviewResultSchema.safeParse(untrustedProviderResult);
if (!parsedProviderResult.success || !isProviderReviewResultEnvelope(untrustedProviderResult)) {
  throw new ProviderError("PROVIDER_INVALID_RESPONSE");
}
const providerResult = parsedProviderResult.data;
```

## Warnings

### WR-01: Hostile request objects escape the documented sanitized error boundary

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:359-363`
**Issue:** Request `safeParse` and `errorFromValidation` run before the handler's catch. Zod and the follow-on `in`/property reads can invoke Proxy traps. A direct call to the exported `handleReviewRequest` with a Proxy whose `ownKeys` throws `Error("REQUEST-PROXY-SECRET")` rejects the promise with that exact raw exception instead of returning a three-field stable error. Normal JSON-RPC decoded input cannot construct a Proxy, but this remains an unsafe exported unknown-input boundary and conflicts with `docs/mcp-contract.md:271`'s broad error-sanitization statement.

**Fix:** Wrap request parsing and validation-error derivation in a narrow boundary that discards the thrown value and returns a stable `INVALID_REQUEST` (or another explicitly documented stable code). Cover `ownKeys`, `has`, and getter traps.

```ts
let parsed: ReturnType<typeof reviewRequestSchema.safeParse>;
try {
  parsed = reviewRequestSchema.safeParse(input);
  if (!parsed.success) return toToolErrorResult(errorFromValidation(parsed.error, input));
} catch {
  return toToolErrorResult(new EvidenceLensError("INVALID_REQUEST", "Invalid request"));
}
```

### WR-02: The 09-08 regression does not test all six allowed accessor fields

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:1550-1567`
**Issue:** The test and summary claim descriptor-only rejection for all six allowlisted fields, but every accessor case replaces only `provider` (`Object.defineProperty(candidate, "provider", ...)`). The same is true of the accessor-mutation matrix at lines 1637-1661. The current production loop is generic, but this test cannot catch a future per-key regression affecting `model`, `promptVersion`, `inputFingerprint`, `modelFindings`, or `deterministicFindings`.

**Fix:** Nest the ordinary/null-prototype matrix under `PROVIDER_REVIEW_RESULT_KEYS` and install a throwing or mutation-capable accessor for each key. Assert both direct preflight and handler execution leave every getter count at zero and return exact `PROVIDER_FAILURE`.

---

_Reviewed: 2026-09-05T06:29:36Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
