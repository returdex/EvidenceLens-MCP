# EvidenceLens MCP Contract

## Transport

EvidenceLens runs as an MCP server over `stdio`.

Development command:

```bash
npm run dev
```

An MCP client discovers tools through `tools/list` and invokes the review contract through `tools/call` with `name: "review_evidence"`.

## Tool

Tool name: `review_evidence`

The Phase 1 tool is read-only and deterministic. It validates metadata-only review requests and returns JSON in one MCP text content item.

## Request JSON

```json
{
  "reviewId": "review-001",
  "objective": "Check the submitted solution against the rubric.",
  "evidence": [
    {
      "id": "brief-1",
      "role": "assignment_brief",
      "type": "text",
      "reference": "course/assignment-brief"
    }
  ],
  "limits": {
    "maxEvidenceItems": 20,
    "maxObjectiveLength": 4000
  }
}
```

Fields:

- `reviewId`: required request identity, 1 to 128 characters.
- `objective`: required review objective, 1 to 4000 characters.
- `evidence`: optional array, defaults to an empty array, maximum 20 items.
- `evidence[].id`: required evidence identity, 1 to 128 characters.
- `evidence[].role`: required evidence role.
- `evidence[].type`: required evidence type.
- `evidence[].reference`: optional opaque metadata string. Phase 1 does not interpret it as a path and rejects ASCII control characters, including null bytes.
- `limits.maxEvidenceItems`: optional integer from 1 to 20.
- `limits.maxObjectiveLength`: optional integer from 1 to 4000.

Supported evidence roles:

- `assignment_brief`
- `rubric`
- `teacher_instructions`
- `solution`
- `other`

Supported evidence types:

- `text`
- `pdf`
- `image`
- `screenshot`
- `table`

Phase 1 limits:

- `maxObjectiveLength: 4000`
- `maxEvidenceItems: 20`

## Success Response

Successful responses are deterministic JSON text content. The response identity mapping is explicit:

`response.requestId = request.reviewId`

```json
{
  "ok": true,
  "requestId": "review-001",
  "status": "accepted",
  "findings": [],
  "metadata": {
    "serverName": "evidencelens",
    "serverVersion": "0.1.0",
    "generatedAt": "1970-01-01T00:00:00.000Z"
  }
}
```

`generatedAt` is fixed in Phase 1 so repeated identical valid requests produce exactly equal JSON content.

## Error Response

Rejected requests return one MCP text content item containing machine-readable JSON:

```json
{
  "ok": false,
  "code": "INVALID_REQUEST",
  "message": "Review request failed validation"
}
```

Stable error codes:

- `INVALID_REQUEST`: malformed request JSON or invalid field values.
- `UNSUPPORTED_EVIDENCE_TYPE`: reserved for unsupported evidence type failures.
- `LIMIT_EXCEEDED`: objective or evidence limits exceeded.
- `INTERNAL_ERROR`: unexpected server failure.

Malformed request example:

```json
{
  "reviewId": "review-001",
  "objective": "",
  "evidence": []
}
```

Expected error semantics:

```json
{
  "ok": false,
  "code": "INVALID_REQUEST",
  "message": "Review request failed validation"
}
```

## Phase 1 Non-Capabilities

Phase 1 deliberately provides the MCP contract skeleton only:

- no local file reads
- no writes, deletes, or mutation tools
- no provider calls
- no PDF, image, screenshot, text, or table parsing
- no filesystem allowlist enforcement yet
- no Docker deployment yet
- no DeepSeek integration or provider implementation yet
