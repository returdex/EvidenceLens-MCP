---
phase: 02-evidence-ingestion-and-multimodal-context
fixed_at: 2026-08-22T22:01:30+10:00
review_path: .planning/phases/02-evidence-ingestion-and-multimodal-context/02-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-08-22T22:01:30+10:00  
**Source review:** `.planning/phases/02-evidence-ingestion-and-multimodal-context/02-REVIEW.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### BL-01: Accepted references can make successful responses violate the response contract

**Files modified:** `src/contracts/review.ts`, `tests/contract/review-tool.test.ts`  
**Commit:** `36f1c0a`  
**Applied fix:** Request references now require 1–2048 characters, and boundary handler regressions cover empty and overlong references.

### BL-02: TSV content is silently parsed as a one-column CSV through the MCP tool

**Files modified:** `src/contracts/review.ts`, `src/evidence/index.ts`, `tests/contract/review-tool.test.ts`  
**Commit:** `5e564ea` (dispatcher; schema and integration coverage are included in `36f1c0a`)  
**Applied fix:** Added strict CSV/TSV selection and propagated it through the MCP dispatcher; TSV integration asserts separate cell references.

### BL-03: Valid multi-page scanned PDFs are rejected after the first scanned page

**Files modified:** `src/contracts/review.ts`, `src/evidence/pdf.ts`, `tests/evidence/pdf-normalizer.test.ts`, `tests/fixtures/evidence/pdfs/scanned-pages.pdf`  
**Commit:** `f601222` (PDF representation; schema is included in `36f1c0a`)  
**Applied fix:** Scanned pages now retain bounded page-numbered `visualPayloads`, with a two-page scanned-PDF regression fixture.

### BL-04: Header-only image parsing accepts malformed bytes as a valid visual payload

**Files modified:** `src/evidence/image.ts`, `tests/evidence/image-normalizer.test.ts`  
**Commit:** `f049c32`  
**Applied fix:** PNG chunk lengths, CRCs, required IDAT/IEND structure, IHDR fields, and JPEG segment/scan termination are validated; malformed header-looking bytes are rejected.

### BL-05: Empty table input is reported as a limit violation instead of invalid evidence

**Files modified:** `src/evidence/table.ts`, `src/tools/review.ts`, `tests/contract/review-tool.test.ts`  
**Commit:** `ee761aa`  
**Applied fix:** Empty tables use a validation error mapped to `INVALID_REQUEST`; configured caps remain `LIMIT_EXCEEDED`.

### WR-01: Visual payload metadata does not bind its declared size and hash to its base64 bytes

**Files modified:** `src/contracts/review.ts`, `tests/contract/evidence-contract.test.ts`  
**Commit:** `9dc0d6c` (negative schema coverage; implementation is included in `36f1c0a`)  
**Applied fix:** Visual payload schema now requires base64 bytes and verifies decoded `byteLength` and SHA-256; positive and negative mismatch tests were added.

## Verification

- `npm test`: 37 tests passed.
- `npm run build`: passed.
- No providers, filesystem reads, or review findings were added.
- No GitHub Release was created.

---

_Fixed: 2026-08-22T22:01:30+10:00_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1_
