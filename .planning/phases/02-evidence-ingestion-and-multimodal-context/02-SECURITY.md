---
phase: 02
slug: evidence-ingestion-and-multimodal-context
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-22
---

# Phase 02 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP client → review handler | Untrusted request metadata and explicit evidence content are schema-validated before dispatch. | IDs, opaque references, UTF-8 text/table content, canonical base64 PDF/image bytes |
| Review handler → normalizer dispatcher | Validated evidence is routed only to the type-specific normalizer. | Typed evidence items |
| Parser/decoder → response contract | Parser-derived references, hashes, extraction metadata, warnings, and bounded visual payloads are serialized through strict schemas. | Normalized evidence metadata and bounded image bytes |
| MCP tool registry → caller | The server exposes one read-only, non-destructive tool. | Review response or sanitized error |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|----------------------|--------|
| T-02-01 | Tampering | `reviewEvidenceInputSchema.reference` | mitigate | `src/contracts/review.ts:138-149,143` rejects ASCII controls and keeps `reference` an opaque field; contract tests cover control characters. | closed |
| T-02-02 | Denial of Service | `visualPayloadSchema` | mitigate | `src/contracts/review.ts:88-117` caps dimensions, pixels, bytes, and binds decoded bytes; `src/evidence/limits.ts:1-10` defines central caps. | closed |
| T-02-03 | Information Disclosure | `normalizedEvidenceSchema` | mitigate | `src/contracts/review.ts:121-136` requires `warnings` and `extraction.partial`; no raw extracted content field exists in the response contract. | closed |
| T-02-04 | Repudiation | `contentHashSchema` and `extractionMetadataSchema` | mitigate | `src/contracts/review.ts:19-36` requires lowercase SHA-256, extractor/version, timestamp, and partial state; all normalizers populate them. | closed |
| T-02-05 | Spoofing | Source identity fields | mitigate | `src/contracts/review.ts:21-27,121-130` requires strict source identity; `src/evidence/index.ts:7-21` maps validated caller id/type/reference into each normalizer. | closed |
| T-02-06 | Information Disclosure | Visual payload descriptors | mitigate | `src/evidence/image.ts:127-140` and `src/evidence/pdf.ts:51-70,79-86` retain only bounded payloads and emit omission/unavailable warnings or safe errors. | closed |
| T-02-07 | Tampering | Text references | mitigate | `src/evidence/text.ts:22-44` creates 1-based line references from parser-controlled splitting; `tests/evidence/text-normalizer.test.ts` asserts exact lines. | closed |
| T-02-08 | Denial of Service | Text/table input size | mitigate | `src/evidence/limits.ts:1-10`, `src/evidence/text.ts:24-32`, and `src/evidence/table.ts:73-107` enforce byte, row, and column bounds with partial warnings. | closed |
| T-02-09 | Tampering | Table formula/cell-content injection | mitigate | `src/evidence/table.ts:87-99` never evaluates cell values and emits `CELL_FORMULA_LITERAL`; handler integration verifies the warning survives. | closed |
| T-02-10 | Information Disclosure | Extracted text/table content | mitigate | `src/evidence/text.ts:34-45` and `src/evidence/table.ts:114-125` return only contract metadata/references/warnings; production scan found no environment/path logging or unrelated reads. | closed |
| T-02-11 | Repudiation | Content hash generation | mitigate | `src/evidence/hash.ts:1-5` hashes original strings/bytes with SHA-256; text/table tests compare against known/original-byte digests. | closed |
| T-02-12 | Denial of Service | Parser dependency behavior | mitigate | `src/evidence/table.ts:24-57,73-107` uses an explicit bounded CSV/TSV parser with project limits; dependencies are pinned in `package.json`/`package-lock.json`. | closed |
| T-02-13 | Denial of Service | PDF parser | mitigate | `src/evidence/pdf.ts:21-36` checks PDF bytes and parser-derived page count against `maxPdfBytes`/`maxPdfPages`; tests cover oversized/excess-page failures. | closed |
| T-02-14 | Denial of Service | Image decoder | mitigate | `src/evidence/image.ts:119-126` caps bytes/pixels before retaining payloads; `inspectImageBytes` performs structural and decoder validation. | closed |
| T-02-15 | Tampering | PDF page references | mitigate | `src/evidence/pdf.ts:44-49` generates page number/count from the PDF document loop, not caller metadata; PDF tests assert fixture-derived references. | closed |
| T-02-16 | Information Disclosure | Visual payload handling | mitigate | `src/evidence/image.ts:129-140` omits oversized payloads with a warning; `src/evidence/pdf.ts:51-70` bounds pixels and rendered bytes and fails safely when rendering cannot be retained. | closed |
| T-02-17 | Repudiation | PDF/image hashes | mitigate | `src/evidence/pdf.ts:59-67,81` hashes rendered payloads and original PDF bytes separately; `src/evidence/image.ts:127-138` binds payload and source hashes. | closed |
| T-02-18 | Information Disclosure | Parser errors | mitigate | `src/evidence/pdf.ts:17-19,31-34,72-75` uses sanitized parser errors; `src/errors.ts:15-22,37-51` emits stable codes/messages with paths/secrets/stack details suppressed. | closed |
| T-02-19 | Denial of Service | Parser dependency behavior | mitigate | `src/evidence/pdf.ts:21-77` applies project byte/page/pixel/visual bounds around PDF.js and canvas operations; dependency versions are locked. | closed |
| T-02-20 | Tampering | Request reference/content fields | mitigate | `src/contracts/review.ts:138-184` enforces strict fields, type-specific content, canonical base64, UTF-8 byte limits, MIME constraints, and opaque control-safe references; `src/evidence/index.ts:9-22` accepts explicit content only. | closed |
| T-02-21 | Elevation of Privilege | MCP tool registry | mitigate | `src/server.ts:6-11` registers only the review tool; `src/tools/review.ts:78-93` sets `readOnlyHint: true`, `destructiveHint: false`, and tests assert no write/delete/mutation tools. | closed |
| T-02-22 | Information Disclosure | Extracted normalized output | mitigate | `src/tools/review.ts:56-75` routes failures through sanitized errors; `src/contracts/review.ts:121-136,237-252` permits only defined normalized fields, not stack/environment data. | closed |
| T-02-23 | Denial of Service | Dispatcher and parser fan-out | mitigate | `src/contracts/review.ts:193-223` caps evidence items and applies request limits; `src/evidence/index.ts:9-24` dispatches to capped normalizers without bypass paths. | closed |
| T-02-24 | Tampering | Formula/cell-content injection | mitigate | `src/evidence/table.ts:94-99` preserves formula-like values as literals and emits `CELL_FORMULA_LITERAL`; `tests/contract/review-normalized-evidence.test.ts:50-52` checks handler propagation. | closed |
| T-02-25 | Information Disclosure | Visual payload handling | mitigate | `src/evidence/image.ts:128-140` and `src/evidence/pdf.ts:51-70,84-86` preserve bounded payload metadata and warnings through `src/tools/review.ts:17-30`. | closed |
| T-02-26 | Repudiation | Content provenance | mitigate | `src/tools/review.ts:17-30` returns dispatcher output; each normalizer populates source identity, original-input SHA-256, extractor metadata, and typed references. | closed |
| T-02-27 | Denial of Service | PDF/image/table parser bombs | mitigate | Dispatcher-to-parser wiring is direct in `src/evidence/index.ts:9-22`; each parser enforces its own byte/page/row/column/pixel limits; full suite covers oversized cases. | closed |

## Accepted Risks Log

No accepted risks. No threats use `accept` or `transfer`; all declared T-02 threats are mitigated in implemented code.

## Unregistered Flags

None. All four Phase 02 `SUMMARY.md` `## Threat Flags` sections explicitly report `None`.

## Verification Evidence

- `npm test`: 9 files, 37 tests passed.
- `npm run build`: TypeScript compilation passed.
- Production-source scan: no filesystem read/write APIs, provider/network calls, process execution, Docker behavior, or mutation tools found.
- Phase boundary confirmed: the implementation accepts explicit text/bytes only; it does not interpret `reference` as a path or permission and does not add provider calls or findings generation.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-22 | 27 | 27 | 0 | Codex security audit |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-22
