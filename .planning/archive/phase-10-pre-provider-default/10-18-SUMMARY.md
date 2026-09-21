---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 18
subsystem: infra
tags: [git-archive, docker, supply-chain, toctou, fail-closed]
requires:
  - phase: 10-17
    provides: bounded deterministic Docker MCP proof harness
provides:
  - exhaustive canonical identity for every tracked non-planning blob
  - owner-only exact-commit private archive context with continuous mutation detection
  - self-contained proof Dockerfile embedding exactly four immutable fixtures
affects: [phase-10-proof-runtime, phase-10-evidence-sealing, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [NUL-safe fixed-argv Git inspection, length-prefixed source identity, no-follow private extraction, pre-post snapshot verification]
key-files:
  created:
    - scripts/live-review-source-set.mjs
    - tests/scripts/live-review-source-set.test.ts
    - Dockerfile.proof
  modified: []
key-decisions:
  - "Derive every proof-build byte from one exact reviewed commit and exclude only .planning from its exhaustive tracked tree."
  - "Permit unrelated ordinary and ignored workspace files because the private context never reads or copies workspace bytes."
  - "Permanently taint a private context after any watched mutation, even if bytes are later restored."
patterns-established:
  - "NON_PLANNING_TREE: raw UTF-8 path-sorted length-prefixed mode, object ID, length, and blob SHA-256 identity."
  - "Future builders receive only the absolute private context and its in-context Dockerfile.proof."
requirements-completed: [SAFE-04]
duration: 6min
completed: 2026-09-13
---

# Phase 10 Plan 18: Exact-Commit Private Proof Context Summary

**An exhaustive reviewed Git tree now materializes into a validated owner-only archive context whose identity and mutation history remain fail-closed across future builds**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-13T03:43:00+10:00
- **Completed:** 2026-09-13T03:49:00+10:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Defined `NON_PLANNING_TREE` from every tracked non-planning blob using fixed-argv, NUL-safe Git tree/object reads and stable length-prefixed hashing.
- Added bounded, no-follow archive extraction with path/type/mode/checksum validation and exact manifest comparison.
- Added permanent snapshot tainting plus pre/post rehash verification so mutate-restore races cannot be accepted.
- Created `Dockerfile.proof` with exactly four root-owned, mode-0444 fixtures and no planning path, workspace mount, or volume.
- Proved ordinary and ignored local files—including dependencies, build output, and local credentials—remain outside the context and unaffected on disk.

## Task Commits

1. **Task 1 RED: Define source-set boundary tests** - `3f89d85` (test)
2. **Task 1 GREEN: Define exact-commit proof source set** - `2b3ef3a` (feat)
3. **Task 2 RED: Expose private snapshot race** - `e02069f` (test)
4. **Task 2 GREEN: Continuously verify private context** - `1b13789` (feat)
5. **Task 2 fix: Preserve executable archive modes** - `9bc8470` (fix)

## Files Created/Modified

- `scripts/live-review-source-set.mjs` - Canonical manifest, safe Git archive extraction, context inventory, mutation monitoring, and cleanup.
- `tests/scripts/live-review-source-set.test.ts` - Exact-commit, drift, isolation, secret exclusion, symlink, and TOCTOU coverage.
- `Dockerfile.proof` - Self-contained proof image recipe with four immutable fixtures.

## Decisions Made

- The reviewed commit need not equal current HEAD; its full resolved commit ID and exhaustive non-planning identity travel together.
- Only tracked non-planning drift and explicitly consumed untracked pre-archive inputs block materialization. Unreachable local files do not impose global-cleanliness requirements.
- Git archive execute bits are normalized to Git's `100755` identity while extracted permissions remain least-privilege `0755`/`0644`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Normalized Git archive group execute bits**
- **Found during:** Plan-level real-repository materialization
- **Issue:** `git archive` emitted executable files as mode `0775`; an equality check against `0755` misclassified them as non-executable and rejected the archive.
- **Fix:** Derive Git executable identity from any execute bit, then normalize extracted permissions to `0755`.
- **Files modified:** `scripts/live-review-source-set.mjs`
- **Verification:** Focused tests/build passed and the current 82-entry reviewed tree materialized and verified successfully.
- **Committed in:** `9bc8470`

---

**Total deviations:** 1 auto-fixed bug. **Impact:** Required for correct Git mode comparison; security boundaries and plan scope remain unchanged.

## Issues Encountered

- The first real-repository archive check exposed Git archive's group-write/group-execute presentation. Normalization fixed it without weakening executable-mode identity.

## Verification

- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test -- --run tests/scripts/live-review-source-set.test.ts` - PASS, 8 tests.
- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test` - PASS, 29 files and 359 tests.
- `npm run build` - PASS.
- Real current-commit private materialization - PASS, 82 entries and `NON_PLANNING_TREE=5085001d2fb3683d7eb4ab5718f1a83c3a86d70e65dbaf9e08e3e2c1952c2561`.
- `git diff --check` - PASS.
- No Docker build/run, network, credential read, provider command, or paid request was executed.

## Known Stubs

None.

## Threat Flags

None beyond the plan threat model; the new Git/file-access surface implements T-10-18-01 through T-10-18-03 directly.

## User Setup Required

None - this plan is credential-free and offline.

## Next Phase Readiness

- Plan 10-19 can define the immutable proof runtime using only the private context and its sole Dockerfile path.
- PROV-01 remains open; this plan deliberately performs no live provider proof.

## Self-Check: PASSED

- All three created files and this summary exist.
- Task commits `3f89d85`, `2b3ef3a`, `e02069f`, `1b13789`, and `9bc8470` exist.
- Focused, full offline, build, real archive materialization, and diff-hygiene checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
