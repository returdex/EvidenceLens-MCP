# EvidenceLens MCP Contract

## Transport and tool

EvidenceLens runs as an MCP server over `stdio`. Start it with `npm run dev`. Clients discover one tool through `tools/list` and invoke it through `tools/call` with `name: "review_evidence"`. The server and response metadata version is `0.1.2`.

`review_evidence` is read-only, deterministic for identical input, and returns one MCP text content item containing JSON. The response always maps `response.requestId = request.reviewId`, uses the fixed generated timestamp `1970-01-01T00:00:00.000Z`, and keeps `findings: []` until review orchestration is implemented.

## Request

```json
{
  "reviewId": "review-001",
  "objective": "Check the submitted solution against the rubric.",
  "evidence": [{
    "id": "brief-1",
    "role": "assignment_brief",
    "type": "text",
    "reference": "course/assignment-brief",
    "content": "The assignment brief supplied by the client."
  }],
  "limits": { "maxEvidenceItems": 20, "maxObjectiveLength": 4000 }
}
```

Request fields preserve the Phase 1 contract: `reviewId` is required (1–128 characters), `objective` is required (1–4000 characters), `evidence` defaults to `[]` and has at most 20 items, and each item requires `id`, `role`, and `type`. Roles are `assignment_brief`, `rubric`, `teacher_instructions`, `solution`, and `other`; types are `text`, `pdf`, `image`, `screenshot`, and `table`.

`evidence[].reference` is optional opaque identity metadata; reference never grants filesystem access and is never interpreted as a path or permission. ASCII control characters in references are rejected.

### Phase 2 content contract

Content is accepted only when supplied explicitly in the request. Text and table payloads use UTF-8 `content`; PDF, image, and screenshot payloads use strict canonical base64 in `contentBase64`. Inconsistent content/contentBase64/mimeType combinations are rejected, as are unsafe ASCII control characters, unsupported MIME types, non-canonical base64, and decoded payloads beyond their caps.

| Type | Allowed payload | MIME rule | Limit |
| --- | --- | --- | --- |
| `text` | optional UTF-8 `content` only | `mimeType` and `contentBase64` rejected | `MAX_TEXT_BYTES` (1,000,000 bytes) |
| `table` | optional UTF-8 `content` only; CSV by default, TSV supported by parser | `mimeType` and `contentBase64` rejected | `MAX_TABLE_BYTES` (5,000,000 bytes) |
| `pdf` | optional strict canonical `contentBase64` only | omitted or exactly `application/pdf` | `MAX_PDF_BYTES` (25,000,000 decoded bytes) |
| `image` / `screenshot` | optional strict canonical `contentBase64` only | required with payload; exactly `image/png` or `image/jpeg` | `MAX_IMAGE_BYTES` (25,000,000 decoded bytes) |

Metadata-only evidence is valid and produces no normalized artifact. A content-bearing item without `reference` receives an opaque inline identity derived from its `id`; this does not create filesystem access.

### Phase 3 filesystem sources

Filesystem evidence uses a separate source object and cannot be combined with inline content, base64, MIME type, or table format:

```json
{
  "id": "brief-file",
  "role": "assignment_brief",
  "type": "text",
  "filesystem": { "kind": "filesystem", "rootId": "course", "relativePath": "brief/assignment.txt" }
}
```

The environment variable `EVIDENCELENS_ALLOWED_ROOTS` is optional and uses exactly `id=absolute-path` entries separated by comma or semicolon. IDs match `[A-Za-z][A-Za-z0-9_-]{0,31}`. There is no escaping syntax, no empty entry, and no separator character in a path. Each root must be an explicit readable directory; duplicate IDs and canonical path collisions are rejected. Unset or empty configuration creates an empty-root policy: filesystem requests fail, while Phase 2 inline content remains valid.

The default filesystem reader is platform-specific. On Linux it resolves every path component relative to the authorized root descriptor with no-follow flags. On macOS, this project does not have a supported Node `openat`/`openat2` binding, so default anchored filesystem reads fail closed with sanitized `ACCESS_DENIED` and return no bytes. It never falls back to pathname-based `lstat`/`open`, because that would not preserve the root boundary across parent-directory replacement. Embedders and tests that provide a reviewed `filesystemReadAdapter` may supply their own safe descriptor-relative implementation; this does not change the default macOS behavior. Phase 2 inline content remains supported on every platform.

Authorization canonicalizes the configured root and target before opening anything. Relative paths are POSIX, cannot be absolute or contain `.`/`..`, directory targets are rejected, and symlinks resolving outside the selected root are denied. The bounded reader authorizes before stat/open/read, opens read-only, enforces the type-specific limits, and checks descriptor identity before and after reading to reject TOCTOU substitutions. There is no directory indexing.

Successful filesystem provenance uses `filesystem://root-id/relative-path` and never includes the absolute configured root. It retains the source ID, safe logical reference, lowercase SHA-256 hash, typed line/page/cell/image references, extraction metadata, warnings, request ID, and deterministic response metadata. The caller's optional `reference` remains opaque and never grants access.

## Success response

```json
{
  "ok": true,
  "requestId": "review-001",
  "status": "accepted",
  "findings": [],
  "normalizedEvidence": [{
    "source": { "id": "brief-1", "type": "text", "reference": "course/assignment-brief" },
    "contentHash": "lowercase-sha256-hex",
    "extraction": {
      "extractor": "text-normalizer",
      "extractorVersion": "1.0.0",
      "generatedAt": "1970-01-01T00:00:00.000Z",
      "partial": false
    },
    "references": [{ "kind": "text", "startLine": 1, "endLine": 1 }],
    "warnings": []
  }],
  "metadata": {
    "serverName": "evidencelens",
  "serverVersion": "0.1.2",
    "generatedAt": "1970-01-01T00:00:00.000Z"
  }
}
```

Every normalized artifact includes source identity, a lowercase SHA-256 content hash, extractor metadata, one or more typed references, and warnings. Text references identify lines. PDF references identify pages; scanned or unextractable pages are partial and retain actual bounded rendered PNG visual payload bytes or return a safe parser error. Image and screenshot references identify dimensions and MIME, with bounded visual payload metadata and bytes. Table references identify sheet, row, column, and A1 cell coordinates. Formula-like table values remain literal and emit `CELL_FORMULA_LITERAL` warnings.

Parser limits include `MAX_TEXT_BYTES`, `MAX_TABLE_BYTES`, `MAX_PDF_BYTES`, `MAX_IMAGE_BYTES`, maximum PDF pages, maximum image pixels, maximum table rows/columns, and maximum retained visual payload bytes. Limit failures and parser failures are returned as stable machine-readable errors without raw stack traces or environment details.

## Error response

```json
{ "ok": false, "code": "INVALID_REQUEST", "message": "Review request failed validation" }
```

Stable codes are `INVALID_REQUEST`, `UNSUPPORTED_EVIDENCE_TYPE`, `UNSUPPORTED_FORMAT`, `LIMIT_EXCEEDED`, `ACCESS_DENIED`, `PROVIDER_FAILURE`, and `INTERNAL_ERROR`. Configuration failures use the stable message `Invalid filesystem root configuration` and are emitted before the server starts. Filesystem access denials, unsupported formats, size limits, parser failures, and provider-shaped read failures use generic messages (`Filesystem access denied`, `Unsupported evidence format`, `Evidence exceeds the configured limit`, `Internal error`, and `Provider failure`) without paths, secrets, errno details, or stacks.

## Phase 2 non-capabilities

Phase 2 inline content remains supported unchanged. Phase 3 adds only bounded reads under explicitly configured roots. The server provides no unrestricted file access, writes, deletes, or mutation tools, no review comparison or findings orchestration, no provider or model calls, and no Docker deployment. Those capabilities remain absent and are later-phase work.
