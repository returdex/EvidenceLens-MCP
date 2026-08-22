---
phase: 04-review-orchestration-and-findings
reviewed: 2026-08-22T18:01:18Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - README.md
  - docs/mcp-contract.md
  - package.json
  - VERSION
  - src/contracts/review.ts
  - src/errors.ts
  - src/evidence/index.ts
  - src/review/analysis.ts
  - src/review/engine.ts
  - src/review/roles.ts
  - src/server.ts
  - src/tools/review.ts
  - tests/contract/evidence-contract.test.ts
  - tests/contract/review-filesystem.test.ts
  - tests/contract/review-normalized-evidence.test.ts
  - tests/contract/review-tool.test.ts
  - tests/contracts/review-contract.test.ts
  - tests/review/analysis.test.ts
  - tests/review/engine.test.ts
  - tests/review/roles.test.ts
findings:
  blocker: 3
  warning: 2
  info: 0
  total: 5
status: needs_fixes
---

# Phase 04: Code Review Report

**Reviewed:** 2026-08-22T18:01:18Z  
**Depth:** deep  
**Files Reviewed:** 20  
**Status:** needs_fixes

## Summary

Reviewed all Phase 04 implementation, tests, documentation, version metadata, and the Phase 01–03 review/verification/security artifacts. The requested checks passed: `npm test` (16 files, 81 tests), `npm run build`, `npm audit --audit-level=high` (0 vulnerabilities), `git diff --check`, version scan, and provider/network/Docker/process/mutation scans. The implementation nevertheless has correctness and provenance defects that the current tests do not cover.

## BLOCKER Issues

### BL-01: Fuzzy matching suppresses real omissions and misses ordinary negative claims

**File:** `src/review/engine.ts:18-25`

**Issue:** `sameKey()` treats a single shared token as a sufficient match for short claims, while `negation` does not recognize ordinary negative wording such as “no”, “absent”, “missing”, or “lacks”. For example, an assignment requirement `Students must include a conclusion.` and solution `The conclusion is absent.` produce no finding at all: the shared token `conclusion` suppresses the omission and the solution is not classified as contradictory. This makes deterministic findings materially incorrect for ordinary solution language.

**Fix:** Use a stricter key/value match (for example, exact normalized assignment keys or a minimum overlap proportional to both claim lengths), and expand/structure negation detection to cover common negative predicates. Add regression cases for “is absent”, “does not include”, “lacks”, and unrelated one-token overlaps.

### BL-02: TSV transient claims are parsed as CSV

**File:** `src/evidence/index.ts:22-39,82`

**Issue:** `tableCells()` always splits on `,` and tests `text.endsWith(",")`, even when the input was normalized as `format: "tsv"`. The normalized evidence correctly contains separate tab-delimited cell references, but transient analysis assigns the entire TSV row to the first cell and leaves later cells empty. Requirements or ordinary solution claims in TSV columns can therefore be missed, compared incorrectly, or cited at the wrong cell location.

**Fix:** Carry the validated table format into the transient payload and use the same delimiter/quoted-cell parser semantics as `normalizeTableEvidence`; derive each claim value from the matching row/column before analysis. Add TSV requirement, solution, contradiction, and citation-location tests.

### BL-03: Citation role is not bound to the cited evidence provenance

**File:** `src/contracts/review.ts:360-385`

**Issue:** Response validation binds citation `evidenceId`, hash, source reference, location, and visual payload, but never validates `citation.role`. A valid generated response can be mutated from the true role to another required role and still pass `reviewResponseSchema.parse()`. This permits an auditable finding to attribute a cited statement to the wrong course source role.

**Fix:** Preserve the normalized role alongside each normalized evidence identity (or pass a trusted evidence-id-to-role map into response validation) and require `citation.role` to equal it. Add a forged-role regression test alongside the existing forged hash/reference/location tests.

## WARNING Issues

### WR-01: Public documentation contradicts the actual retained visual payload contract

**File:** `docs/mcp-contract.md:118-122`

**Issue:** The contract says raw bytes and base64 payloads never appear in `ReviewResponse` (line 120), but image and scanned-PDF normalized evidence intentionally includes bounded `visualPayload.base64`/`visualPayloads[].base64` (also described on line 122 and implemented by the inherited visual contract). Clients cannot determine whether response bytes are expected or prohibited from this documentation.

**Fix:** Clarify that extracted raw text and raw filesystem read buffers are transient and excluded, while bounded retained visual payload bytes are an explicit normalized-evidence exception; document their limits and privacy implications consistently.

### WR-02: Tool description still advertises a skeleton response

**File:** `src/tools/review.ts:108`

**Issue:** The registered MCP tool description says it returns a “deterministic skeleton response”, although Phase 04 now returns populated omissions, contradictions, and requirement-conflict findings. MCP clients may rely on this stale description and underuse or misinterpret the tool.

**Fix:** Update the description to describe deterministic role-aware findings, typed citations, uncertainty, and follow-up checks.

## Verification

- `npm test` — passed, 16 files / 81 tests.
- `npm run build` — passed.
- `npm audit --audit-level=high` — passed, 0 vulnerabilities.
- `git diff --check` — passed.
- Version scan confirms `0.1.2` in `VERSION`, `package.json`, server metadata, response metadata, and docs.
- Safety scans found no provider/model/network/Docker/process/mutation implementation in product source; matches were documentation or test helpers.
- Focused adversarial probes reproduced BL-01 and BL-03 on the current implementation.

---

_Reviewed: 2026-08-22T18:01:18Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
