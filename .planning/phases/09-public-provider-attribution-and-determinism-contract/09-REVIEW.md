---
phase: 09-public-provider-attribution-and-determinism-contract
reviewed: 2026-09-04T13:17:54Z
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
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-04T13:17:54Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

The complete six-plan Phase 09 implementation was reviewed against all PLAN/SUMMARY artifacts and the prior `09-VERIFICATION.md`, with particular attention to the 09-06 ownership, cleanup, snapshot, setup-error, and strict-result-rejection closures. The three-field inference projection, request-owned freezing, claim/payload cleanup implementation, and deep-copied analyzer snapshot are present, and the focused 55-test suite plus strict TypeScript build pass.

Two uncovered boundary failures remain. Spreading the complete handler options before analysis invokes option getters outside the registered cleanup/error lifecycle, and later repeated provider reads permit a configured provider to disappear without failure. Separately, Zod strict-object parsing does not reject non-enumerable or symbol-keyed provider-result extras, contradicting the whole-result rejection contract. Cleanup regression coverage and public cleanup documentation also remain materially incomplete.

## Critical Issues

### CR-01: Handler option access still escapes cleanup and can fail open

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/tools/review.ts:196`
**Issue:** `normalizeEvidenceBundle(request.evidence, { ...options, generatedAt })` enumerates and reads every `ReviewHandlerOptions` property before `buildReviewAnalysisInput`, before either cleanup closure is registered, and before the lifecycle `try/catch/finally`. A throwing `provider`, `providerConfig`, or `analyzer` getter therefore returns the client-facing `INVALID_REQUEST` response through the outer TypeError classifier instead of sanitized `INTERNAL_ERROR`, with no analysis cleanup lifecycle. A focused probe reproduced all three misclassifications. The same provider option is then read repeatedly at lines 207, 243, 250, and 258. A stateful getter can return a provider during the initial spread/read and `undefined` later, causing a successful deterministic-only response without invoking the configured provider; the probe observed three reads, zero provider calls, and `ok: true`. This violates the 09-06 requirement that post-analysis setup be source-correct and that a configured provider cannot fail open.
**Fix:** Pass only normalization-owned fields to `normalizeEvidenceBundle`, then snapshot every handler dependency exactly once inside the registered lifecycle and use those locals throughout.

```ts
const bundle = await normalizeEvidenceBundle(request.evidence, {
  filesystemPolicy: options.filesystemPolicy,
  filesystemReadAdapter: options.filesystemReadAdapter,
  generatedAt: GENERATED_AT
});
const analysis = buildReviewAnalysisInput(bundle);
registerCleanup(analysis);
try {
  const provider = options.provider;
  const providerConfig = options.providerConfig;
  const analyzer = options.analyzer ?? createDeterministicReviewAnalyzer();
  // Use only these snapshots below; never read options.provider again.
}
```

Add regressions for throwing getters on the option object itself and a changing `provider` getter; require exact `INTERNAL_ERROR`, registered cleanup where analysis exists, and no successful provider bypass.

### CR-02: “Strict” provider-result parsing accepts hidden extra fields

**Classification:** BLOCKER
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/src/providers/types.ts:22-31`
**Issue:** `.strict()` rejects ordinary enumerable string extras, but it does not inspect all own property keys. Otherwise-valid provider results with a non-enumerable `apiKey` or a symbol-keyed private field both pass `providerReviewResultSchema.safeParse`. This directly contradicts the Phase 09 whole-result rule and the normative statement that any unknown/private extra field rejects the entire provider result. The six cases at `tests/contract/review-provider.test.ts:1173-1216` use object spread, so they cover only enumerable string properties and cannot detect this bypass. Although Zod's parsed copy currently prevents these hidden values from reaching the public response, the promised strict rejection behavior is false and future consumers of the original envelope could unknowingly retain private data.
**Fix:** Before schema parsing, require a plain/null-prototype object and compare `Reflect.ownKeys(result)` against the exact six allowed string keys, rejecting symbols, non-enumerable unknown keys, custom prototypes, and any key not on the allowlist. Keep this preflight inside the existing provider-owned catch so hostile Proxy traps remain sanitized.

```ts
const allowed = new Set([
  "provider", "model", "promptVersion", "inputFingerprint",
  "modelFindings", "deterministicFindings"
]);
const keys = Reflect.ownKeys(untrustedProviderResult as object);
if (keys.some((key) => typeof key !== "string" || !allowed.has(key))) {
  throw new ProviderError("PROVIDER_INVALID_RESPONSE");
}
```

Add direct-schema and handler tests for non-enumerable, symbol-keyed, inherited/custom-prototype, and Proxy-trapped extras.

## Warnings

### WR-01: Cleanup fault tests do not exercise the promised exhaustive matrix

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/tests/review/analysis.test.ts:53-70`
**Issue:** The direct first-error-continuation test injects only a `claim.text` setter failure. It does not induce failures in the current token array, original token array, top-level requirements/solution arrays, payload fields, table-cell values, or mutable-buffer wiping as required by 09-06. Handler coverage likewise injects only a payload `text` setter failure. A regression that aborts after a token/cell/buffer/top-array fault would therefore pass while leaving other retained claims or payload data uncleared.
**Fix:** Add table-driven, object-local fault cases for every cleanup target category. For each case, retain all claim objects, original/current token arrays, top-level arrays, payloads, cells, and buffers; assert fresh `INTERNAL_ERROR` and verify every independently clearable target after the fault was still scrubbed. Avoid global prototype instrumentation.

### WR-02: The public cleanup contract omits claim and token scrubbing

**Classification:** WARNING
**File:** `/Users/yifeng/Documents/EvidenceLens-MCP/docs/mcp-contract.md:259`
**Issue:** The documentation describes cleanup only for original/isolated payload text, table strings, and buffers. Phase 09 now also creates and scrubs derived requirement/solution claim text, keys, values, original/current token arrays, and top-level claim arrays. Omitting these retained-reference categories leaves the security contract incomplete and makes it difficult for future changes or consumers to know which derived sensitive data is covered.
**Fix:** Extend the cleanup paragraph to explicitly enumerate requirement/solution claim objects, claim text/key/value, original and current token arrays, and the top-level claim arrays, while retaining the existing best-effort and earlier-error-precedence qualifications. Add a semantic documentation assertion tied to those categories.

---

_Reviewed: 2026-09-04T13:17:54Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
