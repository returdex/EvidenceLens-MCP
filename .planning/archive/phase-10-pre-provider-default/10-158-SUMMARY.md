---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 158
subsystem: provider-response-certification
tags: [deepseek, finish-reason, hmac, provenance, fail-closed, asvs]

requires:
  - phase: 10-157
    provides: immutable consumed-live archive and rotated 10-158 through 10-161 authority namespace
provides:
  - hostile offline proof that complete valid stop and length responses share one strict production validation path
  - authenticated content-free production diagnostics and passed-only proof/sync authority gates
  - exact 109-blob source identity with zero-warning deep review and ASVS 4.0.3 L1 certification
affects: [10-159, 10-160, 10-161, provider-proof-chain]

tech-stack:
  added: []
  patterns:
    - transport finish hints are never standalone authority
    - production diagnostics are authenticated bounded and content-free
    - canonical source review binds all non-planning blobs and current certifiers

key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-DISCONFIRMATION.json
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-SOURCE.json
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-REVIEW.md
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-SECURITY.md
  modified:
    - tests/providers/deepseek.test.ts
    - tests/contract/review-tool.test.ts
    - tests/scripts/docker-review-real.test.ts
    - tests/scripts/audit-proof-chain.test.ts
    - tests/scripts/sync-proof-state.test.ts

key-decisions:
  - "Treat stop and length identically after the two-value finish gate; only independently complete, bounded and locally proven content may succeed."
  - "Authorize Plan 10-159 only from reviewed commit 7c99534, canonical manifest 89296db2, aggregate tree ca6a62b2 and the current certifier pair."

patterns-established:
  - "Vision requests retain provider defaults by omitting thinking and reasoning_effort while text behavior remains unchanged."
  - "A finish-reason assertion, raw provider content or gaps_found live tuple cannot authorize synchronization."

requirements-completed: [SAFE-04, PROV-01]

duration: 7min
completed: 2026-09-21
---

# Phase 10 Plan 158: Complete-Length Acceptance Recertification Summary

**Complete valid `stop` and `length` responses now have hostile production-path proof through one bounded schema/citation/provenance pipeline, bound to an exact zero-warning 109-blob source identity.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-20T16:06:26Z
- **Completed:** 2026-09-20T16:13:07Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Exercised complete-valid `stop` and `length` through the real server and `review_evidence` MCP tool path with one authenticated receipt/send and a permanently blocked second invocation.
- Rejected truncated, empty, missing, wrong-type, multiple, structurally ambiguous, wrong-root, malformed, dangerous-key, oversized, schema-invalid, citation-invalid and provenance-invalid `length` content with exact content-free diagnostics.
- Proved missing/unknown/unsupported finish reasons reject before content parsing and that neither raw content nor a finish hint can become host, proof or sync authority.
- Bound commit `7c995348a802e24fb1ddb6703c2cb26369cec93d`, 109 non-planning blobs, canonical manifest, aggregate tree, static runtime expansion and current certifiers into one SOURCE/REVIEW/SECURITY tuple.

## Task Commits

1. **Task 1: Produce hostile exact recertification of response acceptance and diagnostics** - `7c99534` (test)
2. **Task 2: Freeze, deeply review and ASVS-certify one exact build-authorized source** - `9b7a055` (docs)

## Files Created/Modified

- `10-158-DISCONFIRMATION.json` - Hostile matrix, production path, test hashes/counts and zero-external-effect evidence.
- `10-158-SOURCE.json` - Exact reviewed commit, canonical 109-blob manifest, aggregate tree and certifier identity.
- `10-158-REVIEW.md` - Zero-warning deep review of response acceptance, diagnostics, request budget and downstream gates.
- `10-158-SECURITY.md` - OWASP ASVS 4.0.3 Level 1 review for the identical source tuple.
- Five focused test files - Production tool/HMAC, adapter, harness, proof and sync coverage.

## Decisions Made

- A `length` response is accepted only when the unchanged complete-content and provenance validators independently prove it valid; the finish reason itself grants no authority.
- Provider-default Vision behavior is preserved; the review does not claim hidden thinking was proven as the prior live failure cause.
- Only the exact `7c99534` non-planning source identity may enter Plan 10-159.

## Deviations from Plan

None - plan execution followed the specified offline hostile recertification and exact certification scope.

## Issues Encountered

- The first SOURCE audit rejected the drafted manifest because its digest had been computed with ordinary `JSON.stringify` instead of the certifier's canonical JSON encoder. This was diagnosed as artifact construction error, corrected to canonical manifest SHA-256 `89296db2fd0959f3cff8e0d7be51d28cce47ef616bb3c59459f60ed05547219b`, and the complete audit chain then passed. No production behavior changed.

## Known Stubs

None.

## Threat Flags

None - this plan added tests and certification artifacts only; it introduced no new endpoint, credential path, filesystem trust boundary or schema surface.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-159 may build only the exact certified `7c99534` source identity.
- Provider/network authority remains zero until Plan 10-160; GitHub Actions authority remains zero.

## Self-Check: PASSED

- All four required artifacts exist and both task commits are present.
- SOURCE/REVIEW and SOURCE/REVIEW/SECURITY fixed audits passed.
- Focused tests: 360/360; full provider-disabled tests: 769/769 twice.
- TypeScript build, sanitized static Compose expansion, canonical manifest recreation, `git diff --check` and exact no-drift comparison passed.
- Credential reads, Docker daemon/build/run, external network/provider/paid requests, GitHub Actions/dispatch/push and synchronization writes: 0.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-21*
