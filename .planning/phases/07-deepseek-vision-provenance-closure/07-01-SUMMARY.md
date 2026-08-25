---
phase: 07-deepseek-vision-provenance-closure
plan: 01
status: complete
requirements: [PROV-01]
completed: 2026-08-25
---

# Phase 7 Plan 01 Summary

Implemented the DeepSeek Vision provenance closure.

## Delivered

- Added a compact provider citation-reference format containing only `evidenceId`, exact normalized `location`, and `visual`.
- Kept the previous full internal citation draft compatible, but continued to verify every model-supplied provenance field when that form is used.
- Locally enriched public citations with role, content hash, source reference, and retained visual payload hash from normalized evidence.
- Preserved strict rejection for forged IDs, locations, roles, hashes, visual flags, duplicates, unsorted citations, malformed JSON, and invalid findings.
- Added bounded parsing for DeepSeek responses whose JSON is returned in an empty-content `reasoning_content` field; all candidates still pass the same strict validation.
- Added credential-free synthetic visual provenance fixtures and official Vision request assertions.
- Updated the opt-in live test to use the official `deepseek-v4-flash-vision-exp` model with a single screenshot, avoiding unstable mixed text/table prompt behavior while directly testing the multimodal boundary.
- Updated README and MCP contract documentation for model-specific thinking behavior and local citation authority.

## Verification

- `npm test`: 25 files, 130 tests passed.
- `npm run test:deepseek-live`: passed with the configured DeepSeek key; the request returned a locally validated result.
- `git diff --check`: passed.
- Secret/debug scan: no API key, raw upstream response, or temporary debug marker committed.

## Notes

The live check is intentionally opt-in and may incur provider cost. Credential-free fixtures remain the required deterministic regression gate.
