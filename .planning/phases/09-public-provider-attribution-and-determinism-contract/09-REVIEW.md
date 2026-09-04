---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-04T16:50:34Z
depth: standard
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
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-04T16:50:34Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

The complete seven-plan Phase 09 implementation was reviewed against every 09-01 through 09-07 PLAN/SUMMARY artifact, the current verification report, the prior review, and the live source/tests. Plan 09-07 closes the previously reported whole-options spread, repeated provider getter, source-owned option error, hidden-key preflight, reflective-trap containment, cleanup continuation, and cleanup-documentation defects on their tested paths. The focused offline suite passes 63/63 tests, the strict TypeScript build passes, and the complete credential-free/no-network suite passes 188/188 tests without invoking the DeepSeek live test.

One provider-envelope blocker remains. The new preflight accepts accessor properties, but it runs only before Zod invokes those accessors. A schema-valid getter can add a non-enumerable/symbol/inherited private field or change the prototype after preflight; the handler then accepts the mutated envelope and returns a provider-backed success. This violates the exact-six-key whole-result rejection contract and is absent from the post-preflight accessor matrix. A separate exported-handler robustness issue allows hostile request objects to throw raw exceptions before the stable MCP error boundary.

## Critical Issues

### CR-01: Accessor side effects bypass the exact provider-envelope preflight

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/providers/types.ts:32-36`
**Affected flow:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:273-278`; missing regression at `/Users/yifeng/Documents/EvidenceLens-MCP/tests/contract/review-provider.test.ts:1521-1581`
**Issue:** `isProviderReviewResultEnvelope` checks that each allowed property is enumerable, but it does not require a data descriptor. An exact-six-key ordinary or null-prototype object with an accessor therefore passes preflight without invoking the getter. When `providerReviewResultSchema.safeParse` subsequently reads the property, that getter can mutate the original envelope by adding a non-enumerable or symbol-keyed private field, installing a custom prototype, or otherwise invalidating the preflight invariant while still returning a schema-valid value. There is no second preflight after structural reads, and Zod does not reject newly added non-enumerable/symbol/prototype data.

An offline probe used an enumerable `provider` getter that added a non-enumerable `apiKey` and returned `"local-reviewer"`. The handler returned `ok: true` with public provider attribution; after the call, `Reflect.ownKeys(result)` contained the seventh `apiKey` key. This directly contradicts the documented rule at `docs/mcp-contract.md:70` that unknown/private extra fields reject the entire result. The current post-preflight matrix covers getters that throw, but never a getter that returns valid data while mutating envelope shape.

**Fix:** Reject accessor descriptors during preflight so provider results must contain six enumerable own data properties. Since surviving Proxies are already rejected and parsing is synchronous after preflight, this removes the accessor-driven TOCTOU path.

```ts
for (const key of PROVIDER_REVIEW_RESULT_KEYS) {
  const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined
    || !descriptor.enumerable
    || !("value" in descriptor)
  ) {
    return false;
  }
}
```

Add ordinary and null-prototype handler regressions whose allowed-key getter adds each hidden shape (non-enumerable key, symbol key, and custom prototype) while returning a valid value. Each must be rejected as the exact sanitized `PROVIDER_FAILURE`. If accessors are intentionally supported instead, snapshot all six values into a fresh null-prototype object and revalidate the original envelope after reads before accepting the snapshot; do not rely on a single pre-read shape check.

## Warnings

### WR-01: Hostile request objects can escape the stable tool-error boundary

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:359`
**Issue:** `reviewRequestSchema.safeParse(input)` executes before the handler's `try/catch`. Despite its name, Zod `safeParse` does not contain exceptions thrown by input getters or Proxy traps. A hostile in-process caller can therefore make the exported `handleReviewRequest(input: unknown)` reject its Promise with the original exception and sentinel/stack instead of returning a stable three-field error payload. A focused offline probe with a Proxy getter throwing `Error("REQUEST-PROXY-SECRET")` produced a raw rejected exception. This is not constructible through ordinary JSON-RPC decoding, so it is a robustness defect rather than a remote MCP exploit, but it violates the exported unknown-input boundary and the general no-raw-error contract.

**Fix:** Put request parsing and validation-error derivation inside a narrow catch that never copies the thrown value. Return a stable `INVALID_REQUEST` for hostile caller-owned request access (or a documented `INTERNAL_ERROR` if that is the chosen ownership policy), and add getter/`ownKeys`/`has` Proxy regressions.

```ts
let parsed: ReturnType<typeof reviewRequestSchema.safeParse>;
try {
  parsed = reviewRequestSchema.safeParse(input);
} catch {
  return toToolErrorResult(
    new EvidenceLensError("INVALID_REQUEST", "Invalid request")
  );
}
```

Also keep `errorFromValidation` in the same protected boundary because its `"evidence" in input` and property reads can independently trigger Proxy traps.

---

_Reviewed: 2026-09-04T16:50:34Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
