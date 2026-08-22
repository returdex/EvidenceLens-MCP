---
phase: 03-read-only-filesystem-boundary
reviewed: 2026-08-22T13:06:51Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - README.md
  - docs/mcp-contract.md
  - src/contracts/review.ts
  - src/errors.ts
  - src/evidence/index.ts
  - src/filesystem/policy.ts
  - src/filesystem/read.ts
  - src/server.ts
  - src/tools/review.ts
  - tests/contract/filesystem-source.test.ts
  - tests/contract/review-filesystem.test.ts
  - tests/filesystem/policy.test.ts
  - tests/filesystem/read.test.ts
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
status: needs_fixes
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-22T13:06:51Z
**Depth:** deep

### BL-01: Parent-directory substitution can escape the configured root

**File:** `src/filesystem/read.ts:98-130` (with target construction in `src/filesystem/policy.ts:116-125`)

**Issue:** `authorize()` canonicalizes and checks the target, but the reader later performs `stat(target)` and `open(target)` by pathname. A replaced parent directory can redirect the target outside the configured root. `O_NOFOLLOW` only protects the final path component and does not anchor parent directory resolution.

**Fix:** Anchor resolution to an already-authorized root directory descriptor and use descriptor-relative, no-follow resolution for every path component (for example `openat2` with `RESOLVE_BENEATH|RESOLVE_NO_SYMLINKS` where available, or an equivalent component-by-component `openat` implementation). Validate the resulting descriptor against the authorized root descriptor and perform all reads through that descriptor; add a deterministic parent-directory swap test asserting `ACCESS_DENIED` with no bytes returned.

### WR-01: Policy provenance preserves a symlink alias instead of the canonical relative path

**File:** `src/filesystem/policy.ts:119-125`

**Issue:** The policy computes `safeRelativePath` from the canonical target, but constructs `AuthorizedFilesystemTarget.reference` with `parsed.data.relativePath`, making an in-root symlink alias internally inconsistent.

**Fix:** Build the policy reference from `safeRelativePath` and update the in-root symlink test to expect the canonical reference.
