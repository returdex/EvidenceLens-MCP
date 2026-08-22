---
phase: 02-evidence-ingestion-and-multimodal-context
reviewed: 2026-08-22T12:04:47Z
depth: deep
files_reviewed: 29
files_reviewed_list:
  - README.md
  - docs/mcp-contract.md
  - package.json
  - src/contracts/review.ts
  - src/errors.ts
  - src/evidence/hash.ts
  - src/evidence/image.ts
  - src/evidence/index.ts
  - src/evidence/limits.ts
  - src/evidence/pdf.ts
  - src/evidence/table.ts
  - src/evidence/text.ts
  - src/server.ts
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
  - tests/fixtures/evidence/pdfs/scanned-pages.pdf
  - tests/fixtures/evidence/pdfs/text-page.pdf
  - tests/fixtures/evidence/tables/rubric.csv
  - tests/fixtures/evidence/text/assignment.txt
  - tests/smoke/project-config.test.ts
findings:
  blocker: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-22T12:04:47Z
**Depth:** deep
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Re-reviewed the fixed `codex/review-fix-02` branch, including the prior review, `02-REVIEW-FIX.md`, all phase plans/summaries, source, tests, fixtures, and the full test/build gates. `npm test` passes (37 tests) and `npm run build` passes. BL-01, BL-02, BL-03, BL-05, and the byte-length/hash portion of WR-01 are fixed. Two issues remain: image parsing validates PNG/JPEG container markers but not the compressed image data, and the shared visual contract still permits MIME/dimension metadata that disagrees with the bound bytes.

## Blockers

### BL-06: Corrupted compressed image data is accepted as a valid image

**File:** `src/evidence/image.ts:21-54` (PNG), `src/evidence/image.ts:66-100` (JPEG)

**Issue:** The BL-04 fix verifies signatures, chunk/segment boundaries, CRCs, required markers, and dimensions, but it never decodes PNG IDAT data or validates JPEG entropy data. A PNG made from the real fixture with one IDAT byte corrupted and its CRC recomputed is accepted and returned with `image/png` visual payload metadata, even though the compressed image stream is invalid. The same trust gap exists for JPEG scan data. Downstream consumers can therefore receive invalid binary content while normalization reports success.

**Fix:** Decode the bounded image bytes with a strict decoder configured with the existing byte/pixel limits, or at minimum inflate and validate PNG scanlines and fully validate JPEG entropy/decode structure before returning a visual payload. Add regression fixtures/tests with CRC-valid but decode-invalid PNG/JPEG payloads that must be rejected.

## Warnings

### WR-01: Visual payload contract does not bind dimensions and MIME type to the bytes

**File:** `src/contracts/review.ts:87-108`

**Issue:** The fix correctly binds `byteLength` and `sha256` to decoded `base64`, but the schema still accepts contradictory visual descriptors. For example, a one-byte payload with a matching hash can be declared as `image/png` with arbitrary positive dimensions, and a payload of a different image format can be labeled with either allowed image MIME. The shared contract is consumed at a downstream boundary, so it should not accept metadata that contradicts the payload. Internal normalizers derive these fields correctly, but direct contract consumers can still create inconsistent artifacts.

**Fix:** Validate the decoded bytes with the same bounded image parser/decoder used by normalizers and require the parsed MIME, width, and height to equal the declared fields. Add negative schema tests for MIME and dimension mismatches.

---

_Reviewed: 2026-08-22T12:04:47Z_
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
