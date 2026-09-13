---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 43
subsystem: proof-authority
tags: [proof-chain, fail-closed, content-hash, status-parser]
requires:
  - phase: 10-42
    provides: authenticated adapter receipt and distinct request counters
provides:
  - frozen exact proof-chain mode/path/schema/cardinality registry
  - stable no-follow evidence reads with reopen content-hash verification
  - unique frontmatter/checklist/trace status authority
affects: [10-44, 10-45, 10-49, 10-50, 10-51, 10-52]
tech-stack:
  added: []
  patterns: [exact mode tuples, same-process stable reopen, unique scoped status authority]
key-files:
  created: []
  modified: [scripts/audit-proof-chain.mjs, scripts/audit-live-evidence.mjs, tests/scripts/audit-proof-chain.test.ts, tests/scripts/audit-live-evidence.test.ts]
key-decisions:
  - "Local proof authority uses canonical path identity plus stable no-follow reads and reopened byte hashes; it does not require a pre-validation commit."
  - "Only sync-authority and the legacy repair-set durable gate require committed byte-for-byte copies."
patterns-established:
  - "Each CLI mode owns one ordered canonical path and schema tuple; no generic record branch or draft mode exists."
  - "Status truth is accepted only from one YAML frontmatter status and one PROV-01 checklist/trace pair."
requirements-completed: [SAFE-04, PROV-01]
duration: 5min
completed: 2026-09-13
---

# Phase 10 Plan 43: Exact Proof and Status Authority Summary

**Proof-chain substitution now fails at exact mode boundaries, while project status can be derived only from unique scoped authority.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-13T13:24:00Z
- **Completed:** 2026-09-13T13:28:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced permissive one-or-more record dispatch with a frozen registry covering exact canonical paths, ordered schemas, and cardinality for every supported mode.
- Removed `proof-preflight` and other draft-mode acceptance, and proved missing, extra, duplicate, reordered, and SOURCE-as-build substitutions fail before authority is granted.
- Hardened evidence reads with `O_NOFOLLOW`, file/link/size checks, stable descriptor metadata, reopen, and exact SHA-256 comparison.
- Replaced first-match status regexes with unique YAML-frontmatter status parsing and exact-one PROV-01 checklist and traceability parsing.

## Task Commits

1. **RED: Expose proof and status authority gaps** - `a0df34a` (test)
2. **Task 1: Enforce exact proof-chain modes** - `0a2ca31` (feat)
3. **Task 2: Require unique status authority** - `80b1764` (fix)

## Files Created/Modified

- `scripts/audit-proof-chain.mjs` - Exact mode registry, tuple validator, stable canonical evidence loader, and committed sync gate.
- `scripts/audit-live-evidence.mjs` - Unique frontmatter/checklist/trace parsers.
- `tests/scripts/audit-proof-chain.test.ts` - Mode registry, schema order/cardinality, CLI substitution, and draft-mode disconfirmation.
- `tests/scripts/audit-live-evidence.test.ts` - Duplicate, missing-frontmatter, and body-only authority disconfirmation.

## Decisions Made

- Ordinary local validation does not depend on an intermediate Git commit; same-process stable reads and hashes establish local byte authority.
- `sync-authority` separately enforces byte-for-byte committed durable copies before synchronized project state may change.
- Markdown body mentions never supply status authority.

## Verification

- Focused proof-chain suite: 29/29 passed, including the explicit negative SOURCE-as-build command.
- Focused status suite: 70/70 passed.
- Full provider-disabled regression: 42 files, 558/558 tests passed.
- TypeScript build: passed.
- `git diff --check`: passed.
- External activity: Docker 0, credential reads 0, network 0, provider requests 0, paid requests 0.
- GitHub activity: `github_actions_runs=0`, `workflow_dispatches=0`, `repository_dispatches=0`, `gh_dispatches=0`, `git_pushes=0`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None. Test helper default objects are deliberate fixtures and do not flow to production output.

## Threat Model Results

- **T-10-43-01:** Mitigated by exact mode/path/schema/cardinality tuples and removal of generic/draft dispatch.
- **T-10-43-02:** Mitigated by unique, frontmatter-scoped phase statuses and exact-one requirement rows.
- **T-10-43-03:** Mitigated by no-follow opens, stable file identity checks, reopened content hashing, immutable source identity checks, and committed-copy enforcement at synchronization.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: local-proof-file-authority | `scripts/audit-proof-chain.mjs` | Canonical local evidence files now cross a stable no-follow read and reopened-hash trust boundary. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-44 can authenticate proof state against an exact non-substitutable chain.
- Plans 10-49 through 10-52 have fixed local-versus-durable authority semantics.

## Self-Check: PASSED

- All four modified files exist.
- RED/GREEN commits `a0df34a`, `0a2ca31`, and `80b1764` exist in Git history.
- All focused acceptance criteria, full offline regression, build, and diff checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
