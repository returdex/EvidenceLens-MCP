---
phase: 03-read-only-filesystem-boundary
plan: 02
subsystem: filesystem
tags: [typescript, vitest, filesystem, security, toctou, provenance]

dependency-graph:
  requires:
    - phase: 03-read-only-filesystem-boundary
      plan: 01
      provides: Canonical configured-root authorization and safe logical filesystem provenance
    - phase: 02-evidence-ingestion-and-multimodal-context
      provides: Type-specific bounded evidence limits and explicit-byte parser contracts
  provides:
    - Bounded authorized filesystem byte reader with read-only descriptor semantics
    - Stable sanitized access, format, provider, limit, and internal error serialization
    - Automated pre-read and post-read target substitution protection
  affects: [03-03, 04, 05]

tech-stack:
  added: []
  patterns:
    - Authorize before target stat/open/read and use only the policy canonical target
    - Open read-only with O_NOFOLLOW where supported, then validate descriptor identity before and after bounded reads
    - Discard all bytes on identity/type/size mismatch and return stable generic errors

key-files:
  created:
    - src/filesystem/read.ts
    - tests/filesystem/read.test.ts
  modified:
    - src/errors.ts

decisions:
  - Use dependency-injected stat/open/fstat/read/close primitives for deterministic filesystem boundary tests.
  - Return only bounded bytes and root id, normalized relative path, and filesystem URI provenance; never return canonical absolute roots.
  - Normalize all client-visible EvidenceLensError messages to stable generic text by machine-readable code.
requirements-completed: [SAFE-01, SAFE-02, SAFE-04]

metrics:
  duration: 4 min
  completed: 2026-08-22
---

# Phase 3 Plan 2: Read-Only Filesystem Boundary Summary

**Canonical, bounded, read-only filesystem byte reads with descriptor identity checks and sanitized stable failures**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-22T12:52:00Z
- **Completed:** 2026-08-22T12:56:00Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments

- Added stable `ACCESS_DENIED`, `UNSUPPORTED_FORMAT`, and `PROVIDER_FAILURE` error codes while preserving existing error categories.
- Normalized client-visible errors to bounded generic messages that do not expose paths, secrets, errno details, or stack-like content.
- Implemented `readFilesystemEvidence` with authorize-first ordering, canonical target-only access, type-specific byte caps, read-only descriptor opens, and `O_NOFOLLOW` support.
- Validated regular-file identity and type through target stat and descriptor fstat before the first read and after the bounded read; all mismatched bytes are discarded.
- Added injected-adapter tests for traversal, absolute paths, symlink escape denial, regular-file checks, limits, unsupported types, provider failures, cleanup, authorization ordering, and pre/post substitution races.
- Exposed no filesystem mutation operation and retained only safe logical provenance in successful results.

## Task Commits

1. **Task 1: Add bounded read-only errors and failing reader tests** - `e52495c` (test, RED)
2. **Task 2: Implement canonical-target bounded descriptor reads** - `3fe43f9` (feat, GREEN)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Hardened descriptor read validation and symlink-loop handling**
- **Found during:** Task 2 implementation review
- **Issue:** A faulty adapter could report an impossible byte count, and a platform no-follow symlink substitution could surface as an unsanitized provider-shaped open failure.
- **Fix:** Reject non-positive or over-request byte counts as `INTERNAL_ERROR`, and map `ELOOP` from no-follow open to `ACCESS_DENIED`.
- **Files modified:** `src/filesystem/read.ts`
- **Commit:** `3fe43f9`

**2. [Rule 2 - Security] Genericized all known client-visible error messages**
- **Found during:** Task 1 error serialization tests
- **Issue:** Existing sanitization could redact an absolute path while retaining stack-like context in a caller-supplied `EvidenceLensError` message.
- **Fix:** Map every known error code to a stable generic message before serialization, retaining the existing redaction layer for defense in depth.
- **Files modified:** `src/errors.ts`
- **Commit:** `3fe43f9`

## Auth Gates

None.

## Known Stubs

None.

## Verification

- `npm test -- tests/filesystem/read.test.ts tests/filesystem/policy.test.ts` - passed, 11 tests.
- `npm test` - passed, 12 files and 52 tests.
- `npm run build` - passed.
- Mutation scan `rg -n "writeFile|writeFileSync|unlink|rename|mkdir|chmod|rm\\(" src/filesystem` - no matches.
- `git diff --check` - passed.

## Self-Check: PASSED

- Planned implementation and test files exist.
- RED commit `e52495c` and GREEN commit `3fe43f9` exist in git history.
- Targeted tests, full tests, build, mutation scan, and whitespace checks passed.

---
*Phase: 03-read-only-filesystem-boundary*
*Completed: 2026-08-22*
