---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 21
subsystem: infra
tags: [evidence-envelope, authorization, replay-protection, stdin, crash-recovery]
requires:
  - phase: 10-20
    provides: acyclic evidence schemas and irreversible build generation
provides:
  - owner-only evidence envelope and durable fixed challenge handoff
  - strict committed-handoff resume verifier
  - replay-safe stdin-only atomic authorized review executor
affects: [10-22, 10-23, SAFE-04, PROV-01]
tech-stack:
  added: []
  patterns: [canonical no-follow evidence, committed authorization handoff, durable consume-before-spawn]
key-files:
  created:
    - scripts/evidence-envelope.mjs
    - scripts/prelive-review-gate.mjs
    - scripts/atomic-authorized-review.mjs
    - tests/scripts/evidence-envelope.test.ts
    - tests/scripts/prelive-review-gate.test.ts
    - tests/scripts/atomic-authorized-review.test.ts
  modified: [package.json]
key-decisions:
  - "Separate non-Git precommit validation from post-publication Git blob and containing-commit authentication."
  - "Accept authority only as one bounded LF-terminated UTF-8 stdin line and consume it durably before child creation."
  - "A consumed challenge is irreversible even if the child fails or the process crashes; sanitized outcome publication is separate."
patterns-established:
  - "Fixed-path challenge commands reject alternate argv before reading durable state."
  - "Atomic execution reconstructs authority from committed state instead of trusting conversational state."
requirements-completed: [SAFE-04, PROV-01]
duration: 6min
completed: 2026-09-13
---

# Phase 10 Plan 21: Durable Challenge and Atomic Authorization Summary

**Owner-only evidence envelopes now yield committed, crash-recoverable challenges whose exact stdin authority can activate one pinned-image child at most once.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-12T18:04:00Z
- **Completed:** 2026-09-12T18:09:36Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Sealed final report, generation, immutable image/runtime, dual-sentinel and four-fixture identities into canonical owner-only envelope/challenge files with bounded no-follow reads and fsync publication.
- Added distinct fixed-path prepare, precommit validation and committed-handoff verification modes; only the latter asserts Git blob and containing-commit identity and emits the strict resume block.
- Added an atomic executor that accepts exactly one bounded LF-terminated UTF-8 authorization line, timing-safe compares it with reconstructed durable authority, durably consumes replay state and permits at most one pinned-image child.
- Persisted finite sanitized outcome state while rejecting malformed stdin, alternate argv, wrong challenges, replays and concurrent attempts before child creation.

## Task Commits

1. **Task 1 RED: Define challenge sealing tests** - `97a72c6` (test)
2. **Task 1 GREEN: Seal durable review challenges** - `cf960d9` (feat)
3. **Task 2 RED: Define atomic authorization tests** - `f4a6c0c` (test)
4. **Task 2 GREEN: Enforce atomic authorized review execution** - `ec755ae` (feat)

## Files Created/Modified

- `scripts/evidence-envelope.mjs` - Canonical external envelope/challenge creation, precommit validation and committed handoff authentication.
- `scripts/prelive-review-gate.mjs` - Exact complete `evidencelens.challenge-resume.v1` schema validation.
- `scripts/atomic-authorized-review.mjs` - Bounded stdin, timing-safe comparison, durable replay consumption, pinned-image execution and sanitized outcome publication.
- `tests/scripts/evidence-envelope.test.ts` - Challenge identity, expiry, digest, path and side-effect tests.
- `tests/scripts/prelive-review-gate.test.ts` - Strict resume schema and echo binding tests.
- `tests/scripts/atomic-authorized-review.test.ts` - Stdin framing, replay, concurrency, fixed argv and at-most-one-spawn tests.
- `package.json` - Literal prepare, verify and authorized-once commands.

## Decisions Made

- Keep the public handoff inert: it stores only locators, identities and digests; all actionable authority is reconstructed through no-follow authentication of external owner-only state.
- Publish an exclusive consumed marker before any runtime/credential child path, so crash recovery always fails closed rather than permitting a retry.
- Pass the provider credential only to the final Docker child environment; it is never accepted through authorization argv, files or the resume block.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial digest-tamper test surfaced an overly broad TTL error classification. Digest/identity mismatch and temporal expiry were separated so failures remain sanitized but machine-meaningful.

## Verification

- Plan-focused suite: PASS, 3 files and 27 tests.
- Full provider-disabled offline suite: PASS, 36 files and 437 tests.
- TypeScript build: PASS.
- Exact package command contracts: PASS.
- `git diff --check`: PASS.
- Stub scan: no TODO/FIXME/placeholder implementation found.
- No Docker build/run, credential read, network/provider command or paid request was executed; all external seams in tests were injected.

## Known Stubs

None.

## Threat Flags

None beyond T-10-21-01 through T-10-21-06, which are mitigated by the committed-handoff, owner-only no-follow, exact stdin and consume-before-spawn boundaries.

## User Setup Required

None - this plan was implemented and verified entirely offline.

## Next Phase Readiness

- Plan 10-22 can publish and authenticate the inert build handoff, then create the single proof image and final reports.
- Plan 10-23 can prepare and commit a challenge, display the authenticated exact echo at its checkpoint and resume in a fresh process without relying on prior memory.
- PROV-01 remains operationally open until the later explicitly authorized credentialed proof succeeds.

## Self-Check: PASSED

- All six created implementation/test files, modified `package.json` and this summary exist.
- Task commits `97a72c6`, `cf960d9`, `f4a6c0c` and `ec755ae` exist.
- All focused, full offline, build, package-contract and diff-hygiene checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
