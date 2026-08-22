---
phase: 02-evidence-ingestion-and-multimodal-context
reviewed: 2026-08-22T11:54:47Z
depth: deep
files_reviewed: 25
files_reviewed_list:
  - README.md
  - docs/mcp-contract.md
  - package.json
  - src/contracts/review.ts
  - src/evidence/hash.ts
  - src/evidence/image.ts
  - src/evidence/index.ts
  - src/evidence/limits.ts
  - src/evidence/pdf.ts
  - src/evidence/table.ts
  - src/evidence/text.ts
  - src/tools/review.ts
  - tests/contract/evidence-contract.test.ts
  - tests/contract/review-normalized-evidence.test.ts
  - tests/contract/review-tool.test.ts
  - tests/contracts/review-contract.test.ts
  - tests/evidence/image-normalizer.test.ts
  - tests/evidence/pdf-normalizer.test.ts
  - tests/evidence/table-normalizer.test.ts
  - tests/evidence/text-normalizer.test.ts
  - tests/fixtures/evidence/images/rubric-screenshot.png
  - tests/fixtures/evidence/pdfs/scanned-page.pdf
  - tests/fixtures/evidence/pdfs/text-page.pdf
  - tests/fixtures/evidence/tables/rubric.csv
  - tests/fixtures/evidence/text/assignment.txt
findings:
  blocker: 5
  warning: 1
  info: 0
  total: 6
status: needs_fixes
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-22T11:54:47Z  
**Depth:** deep  
**Files Reviewed:** 25  
**Status:** needs_fixes

## Summary

The Phase 2 implementation was reviewed across the normalized-evidence contract, all five normalizer/dispatcher modules, the MCP handler, tests, package changes, and contract documentation. `npm test` passes (34 tests) and `npm run build` passes, but adversarial probes found five blocker-level correctness/contract issues and one warning. The most serious issue is that accepted content can produce success payloads that fail the response schema; visual input validation also accepts malformed image bytes.

## Blockers

### BL-01: Accepted references can make successful responses violate the response contract

**File:** `src/contracts/review.ts:114`

**Issue:** The request `reference` is only checked for control characters and has no minimum or maximum length. Content-bearing requests with `reference: ""` or a 2049-character reference are accepted, then copied into `source.reference` by the dispatcher/normalizers. `evidenceSourceIdentitySchema` requires a non-empty reference of at most 2048 characters, so the handler returns `ok: true` even though the resulting payload fails `reviewResponseSchema` validation. This is a direct contract compatibility failure at the MCP boundary.

**Fix:** Apply the same bounds to the request field and add handler-level regression tests for both boundaries:

```ts
reference: z.string()
  .min(1)
  .max(2048)
  .regex(noAsciiControlCharacters, "reference must not contain ASCII control characters")
  .optional(),
```

### BL-02: TSV content is silently parsed as a one-column CSV through the MCP tool

**File:** `src/evidence/index.ts:17`

**Issue:** `normalizeTableEvidence` supports a `format` selector, but the MCP request schema has no table-format field and the dispatcher never supplies one. Consequently, tab-delimited content sent through `review_evidence` always uses the CSV default and produces references such as A1/A2 instead of A1/B1/A2/B2, silently losing table cell context while still returning success. This contradicts the documented/parser-supported CSV/TSV behavior.

**Fix:** Add a strict table-only `format: z.enum(["csv", "tsv"]).optional()` request field and pass it through the dispatcher, or implement deterministic format detection with an explicit ambiguity rule. Add an MCP integration test asserting TSV produces separate columns and preserves all cell references.

### BL-03: Valid multi-page scanned PDFs are rejected after the first scanned page

**File:** `src/evidence/pdf.ts:50-53`

**Issue:** The normalizer stores only one `visualPayload`. When a second page has no extractable text, `if (visualPayload) throw safePdfError()` rejects the entire otherwise-valid PDF. Thus a multi-page scanned PDF cannot be normalized, despite the contract promising page-level references and scanned/unextractable-page handling. The failure is especially problematic because the parser has already accepted the document and can safely process within the configured page/pixel/payload limits.

**Fix:** Represent visual payloads per PDF page (for example, add a page-associated visual-payload collection/reference), or define and implement a bounded deterministic policy that retains multiple page payloads and emits a partial warning when a cap is reached. Add a multi-page scanned-PDF fixture and assert every page is either represented or explicitly warned, never rejected merely because it is the second scanned page.

### BL-04: Header-only image parsing accepts malformed bytes as a valid visual payload

**File:** `src/evidence/image.ts:21-24`

**Issue:** `parsePng` accepts any 24-byte buffer with a PNG signature and `IHDR` marker; it does not validate the IHDR length, dimensions against the actual structure, required chunk boundaries/CRC, or the presence of image data/end marker. A focused probe with a 24-byte fake PNG was normalized successfully and returned those bytes as `visualPayload.base64`. Downstream consumers can therefore receive an invalid image while the artifact claims `image/png`, undermining visual payload correctness and MIME/security validation.

**Fix:** Keep bounded header parsing, but validate the complete bounded PNG chunk structure (including IHDR length, required fields, and IEND) or run a decoder configured with strict resource limits before retaining bytes. Apply equivalent marker/segment validation to JPEG. Add malformed-but-header-looking PNG/JPEG regression tests that must return a safe parser error.

### BL-05: Empty table input is reported as a limit violation instead of invalid evidence

**File:** `src/evidence/table.ts:110-111`, `src/tools/review.ts:65-69`

**Issue:** `normalizeTableEvidence` throws `RangeError("table evidence contains no cells")` for an empty string, and the handler maps every `RangeError` to `LIMIT_EXCEEDED`. Empty content is accepted by `reviewEvidenceInputSchema`, so the externally observable result is a misleading limit error for malformed/empty evidence. This also makes the stable error contract unable to distinguish actual configured cap violations from parser validation failures.

**Fix:** Reject empty table content in the request schema as `INVALID_REQUEST`, or throw a dedicated parser/validation error and map it to `INVALID_REQUEST`; reserve `LIMIT_EXCEEDED` for actual configured byte/row/column/page/pixel limits. Add a handler test for empty table content and assert the stable code.

## Warnings

### WR-01: Visual payload metadata does not bind its declared size and hash to its base64 bytes

**File:** `src/contracts/review.ts:86-96`

**Issue:** When `base64` is present, the schema validates only its alphabet/padding. It does not require the decoded byte length to equal `byteLength`, require `sha256` to equal the decoded bytes, or require the dimensions/MIME to agree with the payload. A contract-valid artifact can therefore carry inconsistent provenance and payload metadata. The current internal normalizers happen to populate matching values, but the shared contract is explicitly the boundary consumed by downstream context builders and should not accept contradictory visual descriptors.

**Fix:** Add a `superRefine` that decodes `base64`, checks decoded length against `byteLength`, recomputes SHA-256, and rejects mismatches; if bytes are omitted, require the warning/partial combination that documents their absence. Add positive and negative schema tests for size/hash mismatch.

---

_Reviewed: 2026-08-22T11:54:47Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
