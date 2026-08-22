---
phase: 03
slug: read-only-filesystem-boundary
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-22
verified: 2026-08-22
verified_commit: b2ac35c
---

# Phase 03 — Security

## SECURED

**Phase:** 03 — Read-Only Filesystem Boundary  
**Threats Closed:** 19/19  
**ASVS Level:** 1

### Threat Verification

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-03-01 | Elevation of Privilege | mitigate | `src/contracts/review.ts:143-181` requires explicit filesystem source data and rejects unsafe syntax/ambiguity; `src/evidence/index.ts:22-27` requires injected authorization. |
| T-03-02 | Information Disclosure | mitigate | `src/filesystem/policy.ts:138-150` and `src/filesystem/read.ts:173-177` emit only logical `filesystem://root-id/relative-path` provenance; integration tests assert no absolute root leakage. |
| T-03-03 | Tampering | mitigate | `src/filesystem/policy.ts:107-151` canonicalizes roots/targets and applies segment-aware containment; policy tests cover escaping and in-root symlinks. |
| T-03-04 | Denial of Service | mitigate | `src/contracts/review.ts:143-153` bounds ids/paths; `src/filesystem/policy.ts:67-115` rejects malformed, duplicate, colliding, unreadable, and non-directory roots without traversal. |
| T-03-05 | Repudiation | mitigate | `src/filesystem/policy.ts:138-143` preserves root id and normalized relative path; `src/filesystem/read.ts:173-177` returns them with the safe URI. |
| T-03-06 | Tampering | mitigate | `src/filesystem/policy.ts:37-39` exposes authorization only; required mutation scans found no write/delete/rename/mkdir/chmod/remove APIs. |
| T-03-07 | Information Disclosure | mitigate | `src/filesystem/read.ts:109-116` authorizes before adapter selection or content I/O; denial tests assert no open/read calls. |
| T-03-08 | Denial of Service | mitigate | `src/filesystem/read.ts:36-42,129-169` applies per-type caps, preflight size checks, bounded reads, and final byte-count/size checks. |
| T-03-09 | Tampering | mitigate | `src/filesystem/policy.ts:130-150` snapshots canonical target identity (`dev`, `ino`, `mode`, `size`, `isFile`). Linux `src/filesystem/read.ts:69-91` walks descriptor-relative `/proc/self/fd` components with `O_NOFOLLOW`; `:148-156` compares the first descriptor `fstat` before allocation/read and returns stable `ACCESS_DENIED` on mismatch, while `:158-171` reads only after the check and revalidates afterward. `tests/filesystem/read.test.ts:130-161` deterministically swaps the authorized target and verifies denial. |
| T-03-10 | Information Disclosure | mitigate | `src/errors.ts:20-67` maps client-visible failures to stable generic messages; sanitizer tests cover paths, secrets, and stack-like details. |
| T-03-11 | Elevation of Privilege | mitigate | `src/server.ts:11-15` registers one tool and `src/tools/review.ts:89-98` marks it read-only/destructive-false; mutation/provider/Docker/process scans passed. |
| T-03-12 | Repudiation | mitigate | `src/filesystem/read.ts:173-177` returns root id, normalized relative path, and filesystem URI; `src/evidence/index.ts:21-36` preserves them through normalization. |
| T-03-13 | Elevation of Privilege | mitigate | `src/evidence/index.ts:22-27` routes filesystem items only through injected policy and bounded reader; opaque caller references do not authorize access. |
| T-03-14 | Information Disclosure | mitigate | `src/filesystem/read.ts:173-177` and normalizer wiring preserve logical provenance, hashes, typed references, metadata, and warnings without absolute roots; integration tests assert this. |
| T-03-15 | Information Disclosure | mitigate | `src/errors.ts:32-67` emits stable sanitized codes/messages for access, format, limit, provider, invalid-request, and internal failures. |
| T-03-16 | Repudiation | mitigate | `src/tools/review.ts:21-39` preserves request/deterministic metadata; `src/evidence/index.ts:21-36` preserves source ids, references, hashes, extraction metadata, locations, and warnings. |
| T-03-17 | Elevation of Privilege | mitigate | `src/server.ts:11-15` constructs policy from explicit `allowedRoots`; unset/empty `EVIDENCELENS_ALLOWED_ROOTS` yields no filesystem roots. |
| T-03-18 | Denial of Service | mitigate | `src/evidence/index.ts:22-36` reads bounded bytes before parser fan-out and reuses Phase 2 limits; tests cover limits, directories, and unsupported types. |
| T-03-19 | Tampering | mitigate | `src/tools/review.ts:89-98` exposes read-only/idempotent/closed-world annotations; only `review_evidence` is registered and safety scans found no mutation/provider/Docker implementation. |

### Unregistered Flags

None. No `## Threat Flags` section or unmapped flags were present in the three Phase 03 summaries.

## Accepted Risks Log

None. No declared threat uses `accept` or `transfer`.

## Verification Evidence

- `npm test` at `b2ac35c`: 13 files, 63 tests passed; only existing non-fatal PDF.js fixture warnings.
- `npm run build`: passed.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Phase safety scans: no mutation APIs, provider/network calls, Docker, or process execution in the checked scope; no stale `0.1.0` in implementation/version/docs scope.
- `git diff --check`: passed.

## Security Audit Trail

| Audit Date | Commit | Threats Total | Closed | Open | Run By |
|------------|--------|---------------|--------|------|--------|
| 2026-08-22 | pre-b2ac35c | 19 | 18 | 1 | Codex security audit |
| 2026-08-22 | b2ac35c | 19 | 19 | 0 | Codex security audit |

## Sign-Off

- [x] All 19 declared threats classified and verified.
- [x] Threat flags incorporated; none were reported.
- [x] Implementation files remained unmodified.
- [x] `threats_open: 0`.
- [x] `status: verified`.
