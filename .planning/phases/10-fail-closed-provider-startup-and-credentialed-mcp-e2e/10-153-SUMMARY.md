---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 153
subsystem: provider-proof-certification
tags: [deepseek, maxTokens, compose, fingerprint, asvs, fail-closed]

requires:
  - phase: 10-152
    provides: consumed 10-150 archive and rotated 10-153 through 10-156 authority namespace
provides:
  - hostile offline proof of one non-overridable 8000-token product and certified runtime contract
  - exact 109-blob source identity with zero-warning deep review and ASVS 4.0.3 L1 certification
  - sole source authority for Plan 10-154 immutable local build
affects: [10-154, 10-155, 10-156, provider-proof-chain]

tech-stack:
  added: []
  patterns:
    - one exported product default shared by request construction
    - literal Compose runtime values validated by an independent proof-runtime parser
    - canonical non-planning manifest bound to source review and security evidence

key-files:
  created:
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-153-DISCONFIRMATION.json
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-153-SOURCE.json
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-153-REVIEW.md
    - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-153-SECURITY.md
  modified: []

key-decisions:
  - "Authorize Plan 10-154 only from reviewed commit 1b2ce26, its 109-blob canonical manifest, exact runtime contract, and current certifier hashes."
  - "Keep the product configuration ceiling at 20000 while fixing the certified product/Compose/proof request value at exactly 8000 and retaining independent four-finding output bounds."

patterns-established:
  - "Host max-token input cannot influence the certified review or proof Compose expansion."
  - "Runtime budget, request fingerprint, output bounds, retry ceiling, and single-send authority are reviewed as one indivisible contract."

requirements-completed: [SAFE-04, PROV-01]

duration: 4min
completed: 2026-09-21
---

# Phase 10 Plan 153: Certified 8000-Token Contract Summary

**A hostile-tested, non-overridable 8000-token provider contract is bound to one exact 109-blob source identity with zero-warning deep review and ASVS L1 certification.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-20T14:03:26Z
- **Completed:** 2026-09-20T14:07:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Proved the product default, review Compose service, proof Compose service, proof-runtime parser, and immutable argv agree on exactly 8000 tokens while hostile host values cannot override them.
- Proved maxTokens remains fingerprint-bound, configuration accepts only safe integers 1..20000, output remains at most four fully bounded findings, and proof retains maxRetries 0 with one send and no fallback/replay.
- Bound commit `1b2ce2617818d705f884e8f52e33605ddc9ec85d`, 109 non-planning blobs, canonical manifest, aggregate tree, runtime evidence, and current certifiers into one SOURCE/REVIEW/SECURITY tuple.
- Passed 234 focused tests, 743 complete provider-disabled tests twice, both fixed proof-chain audits, TypeScript build, Compose expansion, and exact no-drift checks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Disconfirm 8000-token contract drift and host override** - `1b2ce26` (test)
2. **Task 2: Freeze, deeply review and ASVS-certify the exact repaired source** - `21d569d` (docs)

## Files Created/Modified

- `10-153-DISCONFIRMATION.json` - Hostile configuration, runtime, fingerprint, bounded-output, test-count, and zero-external-effect evidence.
- `10-153-SOURCE.json` - Exact reviewed commit, canonical 109-blob manifest, aggregate tree, and certifier identity.
- `10-153-REVIEW.md` - Zero-warning deep review of the unified 8000-token, one-send, bounded-output, and closed-authority contract.
- `10-153-SECURITY.md` - OWASP ASVS 4.0.3 Level 1 assessment for the identical source tuple.

## Decisions Made

- Only the exact `1b2ce26` non-planning source identity may enter Plan 10-154; any later non-planning drift requires recertification.
- The configurable validation range remains 1..20000 for general product inputs, but certified product and live-proof construction is fixed at 8000 and cannot be host-overridden.

## Deviations from Plan

None - plan execution followed the specified hostile disconfirmation and exact certification scope.

## Issues Encountered

- The first direct full-profile Compose expansion stopped at the intentional proof-secret required-variable guard. No daemon, build, container, network, or provider action occurred. The static expansion was then performed with invalid hermetic sentinels for both credential slots; all hostile host max-token cases were byte-identical and exposed only literal 8000-token values.

## Known Stubs

None.

## Threat Flags

None - this plan added certification artifacts only and introduced no new network, authentication, file-access, schema, or trust-boundary surface.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-154 may build only the exact certified `1b2ce26` source identity.
- Provider/network authority remains zero until Plan 10-155; GitHub Actions authority remains zero.

## Self-Check: PASSED

- All four required artifacts exist and both task commits are present.
- SOURCE/REVIEW and SOURCE/REVIEW/SECURITY fixed audits passed.
- Focused tests: 234/234 passed; full provider-disabled tests: 743/743 passed twice.
- TypeScript build, sanitized Compose expansion, canonical manifest recreation, and non-planning no-drift checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-21*
