---
phase: 03-read-only-filesystem-boundary
verified: 2026-08-22T13:27:07Z
status: passed
score: 13/14 must-haves verified
overrides_applied: 0
deferred:
  - truth: "Findings include source path, page/line/cell references when available, content hashes, model/provider version, and review timestamp or request identifier."
    addressed_in: "Phases 4 and 5"
    evidence: "Phase 4 success criteria add findings with source citations; Phase 5 success criteria add the model-provider boundary and configuration. Phase 3 intentionally has findings: [] and no provider."
---

# Phase 3: Read-Only Filesystem Boundary Verification Report

**Phase Goal:** Evidence access is confined to explicit roots and safe, auditable failure behavior.
**Verified:** 2026-08-22T13:27:07Z
**Status:** passed
**Re-verification:** No — no previous Phase 03 VERIFICATION.md existed.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Filesystem evidence names one configured root id and one relative path; Phase 2 explicit content remains unchanged. | VERIFIED | `src/contracts/review.ts:140-181` defines the strict source and rejects source/content ambiguity; `src/evidence/index.ts:28-36` retains the inline/base64 paths. Contract and full-suite tests pass. |
| 2 | Absolute paths, traversal segments, empty paths, and control characters are rejected before content I/O. | VERIFIED | `filesystemSourceSchema` rejects controls, empty values, POSIX/Windows/UNC absolute paths, and `.`/`..` segments at `src/contracts/review.ts:140-153`; denial tests assert no open/read. |
| 3 | Canonical roots expose only root id and safe logical provenance, never absolute configured paths. | VERIFIED | `src/filesystem/policy.ts:98-130` canonicalizes and returns `filesystem://root-id/relative-path`; integration test asserts the absolute root is absent from serialized output. |
| 4 | The boundary has no write, delete, rename, mkdir, chmod, or mutation operation. | VERIFIED | Production safety scan found no mutation APIs; the only filesystem production operations are root canonicalization and read-only descriptor operations. MCP annotations at `src/tools/review.ts:92-97` are read-only/destructive-false. |
| 5 | A filesystem read authorizes the configured root before stat/open/read and returns only bounded bytes. | VERIFIED | `src/filesystem/read.ts:109-120` awaits authorization before adapter selection/I/O; `:147-163` allocates only after type/size checks and reads within the type-specific cap. |
| 6 | Directories, unsupported formats, oversized files, and OS/read failures become stable sanitized errors. | VERIFIED | `src/filesystem/read.ts:117-145` and `src/errors.ts:32-53` map failures to stable codes; `tests/filesystem/read.test.ts:75-83` covers these paths and `toToolErrorResult` strips paths/secrets/stacks. |
| 7 | The reader uses read-only descriptor operations, validates the opened target, closes it, and exposes no mutation operation. | VERIFIED | `src/filesystem/read.ts:127-187` uses read-only/no-follow opening, fstats before/after reading, and closes in `finally`; Linux uses descriptor-relative component walking at `:69-91`. |
| 8 | Symlink/path traversal and simulated TOCTOU substitution cannot return outside bytes. | VERIFIED | Policy canonical containment and symlink tests pass; reader tests cover pre-open identity mismatch, post-read identity mismatch, and parent-directory substitution (`tests/filesystem/read.test.ts:85-128`). |
| 9 | The MCP review tool normalizes configured-root filesystem evidence while explicit Phase 2 content continues to work unchanged. | VERIFIED | `src/evidence/index.ts:18-36` routes filesystem bytes through the existing normalizers; direct and MCP integration tests pass for filesystem plus inline/metadata-only inputs. |
| 10 | Outside-root requests are rejected before contents are read; no configured roots rejects filesystem sources but permits explicit content. | VERIFIED | `createServer` constructs `createFilesystemPolicy(options.allowedRoots ?? [])` (`src/server.ts:11-15`); integration tests cover outside/traversal/absolute denials, rootless behavior, and inline compatibility. |
| 11 | Filesystem output preserves safe provenance, source id, typed locations, hashes, extraction metadata, warnings, and deterministic review metadata without absolute-root leakage. | VERIFIED | `src/evidence/index.ts:21-36` supplies canonical provenance and bytes to Phase 2 normalizers; integration assertions validate source/reference, line references, schema, hash/metadata, fixed timestamp, request id, and no root path. |
| 12 | The tool registry remains read-only and exposes no write/delete/mutation/provider operation. | VERIFIED | `src/server.ts:12-15` registers only `review_evidence`; MCP `tools/list` integration asserts no prohibited tool and read-only annotations. Safety scans found no provider/model/Docker/process implementation. |
| 13 | Access denials, unsupported formats, size limits, parser failures, and provider-shaped failures are stable sanitized errors. | VERIFIED | Stable error taxonomy is defined in `src/errors.ts:3-67`; handler maps all failures through `toToolErrorResult`; targeted/full tests and audit pass. |
| 14 | Findings include model/provider version as required by SAFE-03. | DEFERRED | The current response intentionally has `findings: []`, no provider boundary, and only exposes server version. Phase 4 explicitly owns findings/citations and Phase 5 owns the provider/model boundary; this is deferred by roadmap evidence, not silently treated as implemented. |

**Score:** 13/14 must-haves verified. The one unmet truth is explicitly deferred to later roadmap phases and is not an actionable Phase 03 gap.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | SAFE-03’s model/provider version in findings cannot exist while findings and providers are intentionally absent. | Phases 4 and 5 | Phase 4 goal is review orchestration/findings with source citations; Phase 5 goal is the replaceable provider adapter and model configuration. |

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/contracts/review.ts` | Strict filesystem source contract | VERIFIED | 316-line substantive schema; imported by policy, dispatcher, handler, and tests. |
| `src/filesystem/policy.ts` | Explicit-root canonicalization and authorization | VERIFIED | 141-line implementation; validates grammar/roots, canonical containment, symlink behavior, and safe URI provenance. |
| `tests/contract/filesystem-source.test.ts` | Contract/path-syntax tests | VERIFIED | 4 passing tests covering exclusivity, unsafe paths, and Phase 2 compatibility. |
| `tests/filesystem/policy.test.ts` | Root/traversal/symlink tests | VERIFIED | 6 passing tests covering grammar, collisions, unreadable/non-directory roots, containment, and in-root/escaping symlinks. |
| `src/filesystem/read.ts` | Bounded authorized byte reader | VERIFIED | 189-line reader with adapter injection, read limits, descriptor identity checks, and cleanup. |
| `src/errors.ts` | Stable sanitized error serialization | VERIFIED | Stable taxonomy and generic client-visible messages; raw error details are not serialized. |
| `tests/filesystem/read.test.ts` | Ordering/limit/descriptor/TOCTOU tests | VERIFIED | 7 passing tests, including Darwin fail-closed regression (executed on this Darwin host). |
| `src/evidence/index.ts` | Filesystem dispatch through existing normalizers | VERIFIED | Imported by handler and imports/calls `readFilesystemEvidence` before normalization. |
| `src/tools/review.ts` | Handler/tool filesystem integration | VERIFIED | Handler passes filesystem policy/adapter into dispatcher; MCP registration uses the same path. |
| `src/server.ts` | Explicit root configuration and rootless default | VERIFIED | `createServer` injects policy; startup parses only `EVIDENCELENS_ALLOWED_ROOTS`. |
| `tests/contract/review-filesystem.test.ts` | Direct/MCP safety and provenance coverage | VERIFIED | 8 passing tests cover success, denials, rootless mode, configuration, version, annotations, and MCP discovery. |
| `docs/mcp-contract.md` | Filesystem/error/provenance/non-capability documentation | VERIFIED | Documents exact grammar, limits, fail-closed Darwin behavior, provenance, stable errors, and absent mutation/provider/Docker behavior. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src/contracts/review.ts` | `src/filesystem/policy.ts` | `filesystemSourceSchema`, `rootId`, `relativePath` | WIRED | Manual source inspection and SDK query confirm the policy validates the shared contract. |
| `src/filesystem/policy.ts` | normalized provenance | `filesystem://` | WIRED | Policy returns the safe logical reference; dispatcher/normalizers consume it. |
| `src/filesystem/read.ts` | `src/filesystem/policy.ts` | `authorize` before I/O | WIRED | `readFilesystemEvidence` awaits `policy.authorize` before stat/open/read. |
| `src/filesystem/read.ts` | `src/evidence/limits.ts` | type-specific caps | WIRED | `MAX_BYTES` maps all five evidence types to the existing limits. |
| `src/errors.ts` | client-visible tool errors | `toToolErrorResult` | WIRED | Handler routes validation, read, parser, and provider-shaped failures through the sanitizer. |
| `src/server.ts` | `src/filesystem/policy.ts` | explicit roots / env grammar | WIRED | `createServer` injects `createFilesystemPolicy`; `main` passes parsed env roots. |
| `src/tools/review.ts` | `src/evidence/index.ts` | dispatcher options | WIRED | Handler awaits `normalizeEvidenceItems(request.evidence, { ...options, generatedAt })`; the SDK pattern query was a false negative because the property is spread, not a literal `filesystemPolicy` token. |
| `src/evidence/index.ts` | `src/filesystem/read.ts` | bounded read before normalizers | WIRED | `readFilesystemEvidence` is awaited at lines 23-27 before type-normalizer branches. |
| normalized source | `docs/mcp-contract.md` | URI/error contract | WIRED | Documentation matches the actual `filesystem://` reference and stable error codes; SDK’s source-file heuristic was not applicable to this documentation link. |

## Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| `src/filesystem/read.ts` | `bytes` | authorized descriptor read | Yes, bounded bytes only; discarded on identity mismatch | FLOWING |
| `src/evidence/index.ts` | `reference`, `bytes` | reader result or explicit Phase 2 payload | Yes, filesystem bytes flow into existing text/table/PDF/image normalizers | FLOWING |
| `src/tools/review.ts` | `normalizedEvidence` | dispatcher result | Yes, integration returns schema-valid line-referenced normalized evidence | FLOWING |
| `src/tools/review.ts` | client error | policy/reader/parser exceptions | Yes, stable generic code/message only | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full test suite | `npm test` | 13 files, 62 tests passed; PDF.js emitted only existing non-fatal fixture warnings | PASS |
| TypeScript build | `npm run build` | `tsc -p tsconfig.json` exited 0 | PASS |
| Dependency vulnerability gate | `npm audit --audit-level=high` | found 0 vulnerabilities | PASS |
| Mutation/provider/Docker/process safety scan | `rg` scans over `src`, filesystem contract tests, docs | No production matches for mutation APIs, child process, network/provider, or Docker terms | PASS |
| Stale-version scan | `rg '0\\.1\\.0' src package.json VERSION docs README.md` | No matches; package/VERSION/server/response all expose 0.1.1 | PASS |
| Whitespace gate | `git diff --check` | No output; exit 0 | PASS |
| Darwin fail-closed behavior | `npm test` on `uname=Darwin`, `process.platform=darwin` | Regression test executed and passed; default anchored read returns sanitized `ACCESS_DENIED` without pathname fallback | PASS |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SAFE-01 | 03-01, 03-02, 03-03 | Reads only under explicitly configured allowlisted roots | SATISFIED | Strict source contract, canonical root containment, no-follow descriptor reads, symlink/TOCTOU tests, MCP denial tests, and Darwin fail-closed default. |
| SAFE-02 | 03-01, 03-02, 03-03 | Default requests cannot write, delete, or mutate local files | SATISFIED | Rootless-by-default policy, read-only annotations, no mutation APIs or tools in production scan, and full suite. |
| SAFE-03 | 03-03 | Findings carry source/reference context, hashes, extraction metadata, model/provider version, and review timestamp/request identity | DEFERRED | Current normalized evidence carries source URI, typed references, hash, extraction metadata, request id, and deterministic server metadata; findings/provider version are explicitly owned by Phases 4/5 and are absent by design here. |
| SAFE-04 | 03-02, 03-03 | Access/format/limit/provider failures do not leak filesystem details or secrets | SATISFIED | Stable error codes/messages, sanitizer tests with paths/secrets/stacks, parser/read failure mapping, configuration sanitization, and audit gate. |

No orphaned SAFE requirements were found: SAFE-01/02 are declared in 03-01, SAFE-01/02/04 in 03-02, and all SAFE-01..04 in 03-03.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| — | — | No production TODO/FIXME/placeholder, mutation, provider, Docker, process-spawn, or broad-root fallback pattern found | — | Test-only fixture writes and cleanup are outside product source and are intentionally used to create adversarial fixtures. |

## Human Verification Required

None. The requested Darwin behavior was executable in this environment and passed; no visual, external-provider, or deployment behavior is part of this phase.

## Gaps Summary

The explicit-root boundary, authorization-before-I/O ordering, bounded descriptor reads, symlink/traversal/TOCTOU defenses, stable sanitized failures, provenance flow, MCP wiring, rootless default, no-mutation/provider/Docker surface, and Darwin fail-closed behavior are verified in the actual source and passing tests. SAFE-03 is not fully realized literally because this phase intentionally produces no findings and has no provider; the missing model/provider version is explicitly deferred to the later findings and provider phases. No non-deferred blocker remains.

---

_Verified: 2026-08-22T13:27:07Z_
_Verifier: the agent (gsd-verifier)_
