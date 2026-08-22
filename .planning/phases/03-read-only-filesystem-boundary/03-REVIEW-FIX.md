---
phase: 03
fixed_at: 2026-08-22T23:35:00+10:00
review_path: .planning/phases/03-read-only-filesystem-boundary/03-SECURITY.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-08-22T23:35:00+10:00  
**Source review:** `.planning/phases/03-read-only-filesystem-boundary/03-SECURITY.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

## Fixed Issues

### T-03-09: Linux descriptor-relative target substitution

**Files modified:** `src/filesystem/policy.ts`, `src/filesystem/read.ts`, `tests/filesystem/read.test.ts`  
**Commit:** `b2ac35c`  
**Applied fix:** The policy now snapshots the canonical target identity (`dev`, `ino`, `mode`, `size`, and regular-file state). The reader compares the first opened descriptor `fstat` with that snapshot before allocating or reading bytes for anchored and pathname adapters; mismatches are denied and the descriptor is closed. Added a deterministic Linux regression that replaces the authorized target with another in-root file before open.

---

_Fixed: 2026-08-22T23:35:00+10:00_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1
