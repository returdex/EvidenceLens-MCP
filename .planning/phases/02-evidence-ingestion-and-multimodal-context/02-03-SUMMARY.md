---
phase: 02-evidence-ingestion-and-multimodal-context
plan: 03
subsystem: testing
tags: [typescript, vitest, pdfjs, canvas, png, jpeg, evidence, multimodal, provenance]

requires:
  - phase: 02-01
    provides: Strict normalized evidence schemas, page/image references, visual payload metadata, and warnings
  - phase: 02-02
    provides: Shared SHA-256 hashing and centralized parser limits
provides:
  - Contract-valid PDF page normalization with parser-derived page references and text availability
  - Bounded rendered PNG payloads for scanned or text-unextractable PDF pages
  - Explicit-byte PNG/JPEG image and screenshot normalization with dimensions, MIME, hashes, and payloads
  - Safe size, pixel, payload, parser, and rendering failure behavior with deterministic fixtures
affects: [phase-02, phase-03, phase-04, phase-05]

tech-stack:
  added: [pdfjs-dist, '@napi-rs/canvas']
  patterns:
    - Explicit Uint8Array inputs are copied at parser trust boundaries; normalizers never read arbitrary paths
    - PDF.js extracts text first and renders actual bounded PNG bytes when page text is unavailable
    - Original evidence and retained visual payload bytes receive separate lowercase SHA-256 provenance
    - Header-only PNG/JPEG dimension parsing avoids unbounded image decoder allocations

key-files:
  created:
    - src/evidence/image.ts
    - src/evidence/pdf.ts
    - tests/evidence/image-normalizer.test.ts
    - tests/evidence/pdf-normalizer.test.ts
    - tests/fixtures/evidence/images/rubric-screenshot.png
    - tests/fixtures/evidence/pdfs/text-page.pdf
    - tests/fixtures/evidence/pdfs/scanned-page.pdf
  modified:
    - src/contracts/review.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Use Mozilla PDF.js 6.2.108 with @napi-rs/canvas for explicit-byte parsing and Node-side scanned-page rendering."
  - "Avoid the archived image-size package; parse bounded PNG/JPEG headers directly for dimensions and MIME."
  - "Extend visualPayload with optional bounded base64 bytes because scanned-page success must preserve actual visual data, not metadata alone."

patterns-established:
  - "Scanned/unextractable PDF pages either include actual bounded rendered bytes or normalization fails with a sanitized parser error."
  - "Oversized image visual payloads can return contract-valid references plus explicit partial warnings, while PDF rendering over bounds fails safely."

requirements-completed: [EVID-02, EVID-03, EVID-05]

metrics:
  duration: 10 min
  completed: 2026-08-22
---

# Phase 2 Plan 3: PDF and Image Normalizer Summary

**PDF, image, and screenshot normalization with bounded visual bytes, parser-derived references, hashes, and safe multimodal failure behavior**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-22T11:35:35Z
- **Completed:** 2026-08-22T11:41:47Z
- **Tasks:** 3 completed
- **Files modified:** 9

## Accomplishments

- Added deterministic text-PDF, scanned-PDF, and screenshot fixtures plus RED tests for hashes, references, limits, warnings, schema validation, and safe errors.
- Implemented explicit-byte PNG/JPEG normalization with dimensions, MIME type, source identity, original hash, bounded base64 visual payloads, and size/pixel warnings or errors.
- Implemented PDF.js page normalization with page count/page references, text availability metadata, bounded rendered PNG payloads for scanned pages, and sanitized parser/rendering failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing PDF and image normalizer tests with fixtures** - `21b595d` (test)
2. **Task 2: Implement image and screenshot normalization** - `2feca58` (feat)
3. **Task 3: Implement PDF page normalization and scanned-page visual preservation** - `fa2f1c3` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/evidence/image.ts` - Bounded PNG/JPEG header parsing and image/screenshot normalization.
- `src/evidence/pdf.ts` - PDF.js text extraction, page references, and scanned-page rendering.
- `src/contracts/review.ts` - Optional bounded base64 bytes on visual payloads.
- `package.json`, `package-lock.json` - Validated PDF.js and Node canvas dependencies.
- `tests/evidence/image-normalizer.test.ts` - Image/screenshot behavior and limit coverage.
- `tests/evidence/pdf-normalizer.test.ts` - Text/scanned PDF behavior, visual preservation, and safe errors.
- `tests/fixtures/evidence/images/rubric-screenshot.png` - Deterministic 320×180 PNG fixture.
- `tests/fixtures/evidence/pdfs/text-page.pdf`, `scanned-page.pdf` - Deterministic one-page PDF fixtures.

## Decisions Made

- Confirmed current official APIs for PDF.js `getDocument({ data })`, `getPage()`, `getTextContent()`, and `render()` before implementation.
- Selected direct bounded PNG/JPEG header parsing because the available `image-size` package is archived; this avoids adding an unmaintained dependency and avoids unbounded pixel decoding.
- Added base64 to the visual payload contract as required for actual scanned-page bytes; the previous contract only supported metadata and could not satisfy the plan’s safe-success requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added actual visual bytes to the strict visual payload contract**
- **Found during:** Task 2 (Implement image and screenshot normalization)
- **Issue:** The existing visual payload schema had metadata only, so scanned/unextractable PDF pages could not preserve actual bounded bytes as required.
- **Fix:** Added an optional schema-validated base64 field and populated it only for payloads within `maxVisualPayloadBytes`.
- **Files modified:** `src/contracts/review.ts`, `src/evidence/image.ts`, `src/evidence/pdf.ts`
- **Verification:** Targeted, combined, full tests and build passed; scanned test asserts non-empty bytes and matching SHA-256.
- **Committed in:** `2feca58` and `fa2f1c3`

**2. [Rule 1 - Bug] Corrected scanned PDF fixture compression**
- **Found during:** Task 3 PDF rendering verification
- **Issue:** The first generated image stream was not actually Flate-compressed despite declaring `/FlateDecode`, causing PDF.js rendering failure.
- **Fix:** Regenerated the deterministic fixture with a valid compressed image stream and verified PDF.js renders it.
- **Files modified:** `tests/fixtures/evidence/pdfs/scanned-page.pdf`
- **Verification:** PDF normalizer tests and full suite passed with actual rendered PNG bytes.
- **Committed in:** `fa2f1c3`

**3. [Rule 1 - Bug] Matched current PDF.js and canvas TypeScript APIs**
- **Found during:** Task 3 build verification
- **Issue:** Current PDF.js types require the canvas parameter and expose cleanup on the loading task; the Node canvas context types differ from browser canvas types.
- **Fix:** Used the current loading-task lifecycle, supplied the canvas to `render`, and isolated the documented Node/browser type boundary with explicit casts.
- **Files modified:** `src/evidence/pdf.ts`
- **Verification:** `npm run build` and all 30 tests passed.
- **Committed in:** `fa2f1c3`

---

**Total deviations:** 3 auto-fixed (Rule 2: 1; Rule 1: 2)
**Impact on plan:** All changes were required for correctness, current dependency compatibility, or the explicit visual-byte safety requirement; no provider, filesystem, allowlist, or review orchestration scope was added.

## Issues Encountered

- PDF.js emitted non-fatal fixture font warnings for the minimal text fixture; normalization and all assertions passed, and no raw parser details are exposed by the normalizer.

## Known Stubs

None. Scanned-page representation is backed by actual bounded rendered bytes; unsupported or unavailable representations fail safely.

## Threat Flags

None. Parser, image decoder, payload, hash, and sanitized-error surfaces are within the plan’s declared threat model and mitigations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

PDF, image, and screenshot evidence can now be normalized from explicit bytes into the shared strict contract. Plan 02-04 can wire these normalizers into the MCP review tool and documentation without adding provider calls or filesystem access.

## Verification

- `npm test -- tests/evidence/pdf-normalizer.test.ts` - passed, 3 tests.
- `npm test -- tests/evidence/pdf-normalizer.test.ts tests/evidence/image-normalizer.test.ts` - passed, 5 tests.
- `npm test` - passed, 8 files and 30 tests.
- `npm run build` - passed.
- `grep -v '^#' src/evidence/pdf.ts | grep -Eq 'PDF_PAGE_TEXT_UNAVAILABLE|visualPayload'` - passed.
- `git diff --check` - passed.

## Self-Check: PASSED

- All nine created/modified implementation, dependency, test, and fixture files exist on disk.
- Task commits `21b595d`, `2feca58`, and `fa2f1c3` exist in git history and were pushed to `origin/main`.
- Targeted tests, combined tests, full suite, build, source grep, and whitespace checks passed.

---
*Phase: 02-evidence-ingestion-and-multimodal-context*
*Completed: 2026-08-22*
