---
phase: 03
slug: read-only-filesystem-boundary
status: blocked
threats_open: 1
asvs_level: 1
created: 2026-08-22
---

# Phase 03 — Security

## OPEN_THREATS

**Phase:** 03 — Read-Only Filesystem Boundary  
**Closed:** 18/19 | **Open:** 1/19  
**ASVS Level:** 1

The phase is blocked by T-03-09. The Linux anchored reader opens the authorized relative path and checks that the resulting descriptor is a regular file, but it does not compare that descriptor to the authorized target identity before the first read. A substitution after authorization and before the anchored leaf open can therefore return bytes from a different in-root file. The injected pathname adapter has a pre-open identity check, but that does not cover the default Linux path.

### Closed

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-03-01 | Elevation of Privilege | mitigate | `src/contracts/review.ts:143-181` requires explicit `filesystem` source data, rejects unsafe root/path syntax and source/content ambiguity; `src/evidence/index.ts:22-27` requires an injected policy and never uses opaque `reference` for authorization. Tests: `tests/contract/filesystem-source.test.ts:5-49`. |
| T-03-02 | Information Disclosure | mitigate | `src/filesystem/policy.ts:98-130` and `src/filesystem/read.ts:170-175` return only `filesystem://root-id/relative-path`; integration coverage asserts absolute-root absence in `tests/contract/review-filesystem.test.ts`. |
| T-03-03 | Tampering | mitigate | `src/filesystem/policy.ts:88-130` canonicalizes roots/targets and uses segment-aware `relative` containment; escaping symlink and canonical containment tests are in `tests/filesystem/policy.test.ts`. |
| T-03-04 | Denial of Service | mitigate | `src/contracts/review.ts:143-153` bounds IDs/paths; `src/filesystem/policy.ts:51-82` rejects malformed, duplicate, colliding, unreadable, and non-directory roots without traversal/indexing. |
| T-03-05 | Repudiation | mitigate | `src/filesystem/policy.ts:119-127` preserves configured root IDs and returns normalized relative provenance; `src/filesystem/read.ts:170-175` preserves the same values in the read result. |
| T-03-06 | Tampering | mitigate | `src/filesystem/policy.ts:24-28` exposes authorization only; mutation scan over `src` and filesystem contract tests found no write/delete/rename/mkdir/chmod/remove APIs. |
| T-03-07 | Information Disclosure | mitigate | `src/filesystem/read.ts:109-116` awaits `policy.authorize` before adapter selection and filesystem primitives; denied-source tests assert no open/read calls in `tests/filesystem/read.test.ts:65-73`. |
| T-03-08 | Denial of Service | mitigate | `src/filesystem/read.ts:36-42,127-167` applies per-type caps, preflight size checks, bounded descriptor reads, and final size/byte-count checks; limits are defined in `src/evidence/limits.ts:1-15`. |
| T-03-10 | Information Disclosure | mitigate | `src/errors.ts:20-67` maps client-visible errors to stable generic messages; tests cover paths, secrets, and stack-like details in `tests/filesystem/read.test.ts:42-51` and `tests/contract/review-tool.test.ts:42-54`. |
| T-03-11 | Elevation of Privilege | mitigate | `src/server.ts:11-15` registers one tool; `src/tools/review.ts:89-98` marks it read-only/destructive-false; mutation/provider/Docker/process safety scans passed. |
| T-03-12 | Repudiation | mitigate | `src/filesystem/read.ts:170-175` returns root ID, normalized relative path, and safe filesystem URI; `src/evidence/index.ts:21-36` passes these into Phase 2 normalizers. |
| T-03-13 | Elevation of Privilege | mitigate | `src/evidence/index.ts:22-27` routes filesystem items only through the injected policy and `readFilesystemEvidence`; no caller reference path is authorized. |
| T-03-14 | Information Disclosure | mitigate | `src/filesystem/read.ts:170-175` and Phase 2 normalizer wiring retain logical provenance, hashes, typed references, metadata, and warnings without absolute roots; integration assertions are in `tests/contract/review-filesystem.test.ts`. |
| T-03-15 | Information Disclosure | mitigate | `src/errors.ts:32-67` emits stable codes/messages for access, format, limit, provider, invalid-request, and internal failures; full tests and sanitizer tests passed. |
| T-03-16 | Repudiation | mitigate | `src/tools/review.ts:21-39` preserves request ID and deterministic metadata; `src/evidence/index.ts:21-36` preserves source IDs, references, hashes, extraction metadata, typed locations, and warnings. |
| T-03-17 | Elevation of Privilege | mitigate | `src/server.ts:11-15` constructs policy from explicit `allowedRoots`; `src/filesystem/policy.ts:51-82` parses exact root entries, and unset/empty roots produce no filesystem roots. |
| T-03-18 | Denial of Service | mitigate | `src/evidence/index.ts:22-36` reads before parser fan-out and reuses bounded Phase 2 normalizers; no recursive indexing exists. Tests cover limits and unsupported/directory targets in `tests/filesystem/read.test.ts:75-83`. |
| T-03-19 | Tampering | mitigate | `src/tools/review.ts:89-98` exposes read-only/idempotent/closed-world annotations; only `review_evidence` is registered and safety scans found no mutation/provider/Docker implementation. |

### Open

| Threat ID | Category | Mitigation Expected | Files Searched |
|-----------|----------|---------------------|----------------|
| T-03-09 | Tampering | The default Linux descriptor-relative reader must bind the opened descriptor to the authorized canonical target identity before the first read, while retaining no-follow component walking and post-read identity/size checks. Current `src/filesystem/read.ts:127-153` sets `targetStat` only for the pathname adapter (`rootDescriptor === undefined`); the Linux anchored branch at `:127-128` has no authorized-target identity comparison before `:148-163`. Existing tests at `tests/filesystem/read.test.ts:85-96` cover substitution only through the pathname adapter. | `src/filesystem/policy.ts:98-130`; `src/filesystem/read.ts:51-91,103-189`; `tests/filesystem/policy.test.ts`; `tests/filesystem/read.test.ts` |

## Accepted Risks Log

None. No declared threat uses `accept` or `transfer`.

## Unregistered Flags

None reported. The three Phase 03 summaries contain no `## Threat Flags` entries; no unmapped threat flags were present.

## Verification Evidence

- `npm test`: 13 files, 62 tests passed. Existing non-fatal PDF.js fixture warnings were emitted.
- `npm run build`: TypeScript compilation passed.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Safety scans: no mutation APIs, provider/network calls, Docker references, or process-execution APIs in the checked implementation/test surface.
- Runtime version alignment: `package.json`, `VERSION`, `src/server.ts`, `src/tools/review.ts`, `docs/mcp-contract.md`, and protocol/smoke tests consistently expose `0.1.2`.
- Artifact inconsistency: Phase 03 PLAN/SUMMARY/VERIFICATION text contains stale claims of `0.1.1`, but the implemented runtime and current tests/docs consistently use `0.1.2`.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-22 | 19 | 18 | 1 | Codex security audit |

## Sign-Off

- [x] All 19 declared threats classified.
- [x] Threat flags incorporated; none were reported.
- [x] Implementation files remained unmodified.
- [ ] `threats_open: 0` — blocked by T-03-09.
- [ ] `status: verified` — not set because one declared mitigation is open.

Next: implement the Linux pre-read target-identity binding and add a default anchored substitution regression test, then re-run the secure-phase audit.
