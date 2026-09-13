---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 39
subsystem: provider-diagnostics
tags: [hmac, stderr, deepseek, provenance, fail-closed]
requires:
  - phase: 10-38
    provides: authoritative child lifecycle observation
provides:
  - bounded authenticated proof-child diagnostic frames
  - production DeepSeek, provenance, and orchestration failure emission
  - server-level proof-only diagnostic sink injection
affects: [10-40, docker-review-real, PROV-01]
tech-stack:
  added: []
  patterns: [one-frame authenticated stderr channel, allowlisted diagnostic features, no-op outside proof mode]
key-files:
  created: [src/providers/diagnostics.ts, tests/providers/diagnostics.test.ts]
  modified: [src/providers/deepseek.ts, src/providers/provenance.ts, src/tools/review.ts, src/server.ts, tests/providers/deepseek.test.ts, tests/providers/provider-contract.test.ts, tests/contract/review-provider.test.ts]
key-decisions:
  - "Proof-child diagnostics use one exact six-field canonical JSON frame with a fixed stderr prefix and a 4 KiB cap."
  - "The diagnostic key and generation are removed from the child environment at startup; production behavior uses a no-op sink when they are absent."
  - "Failure owners emit only allowlisted path/code features before retaining the existing sanitized ProviderError or EvidenceLensError boundary."
patterns-established:
  - "Diagnostic emission is dependency-injected and incapable of serializing error details."
  - "A sink accepts at most one authenticated feature for a proof-child generation."
requirements-completed: [SAFE-04, PROV-01]
duration: 7min
completed: 2026-09-13
---

# Phase 10 Plan 39: Production Child Diagnostic Emission Summary

**Real DeepSeek, provenance, and review-orchestration failure owners now emit one bounded HMAC-authenticated private feature while public MCP errors remain unchanged and sanitized.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-13T12:51:00Z
- **Completed:** 2026-09-13T12:58:03Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added an exact six-field child diagnostic schema, a fixed stderr prefix, a one-frame/4 KiB bound, per-generation sequence and constant-time HMAC verification.
- Rejected unknown, duplicate, oversized, malformed, stale-generation, bad-MAC, and detail-bearing frames without exposing them through MCP stdout.
- Connected real DeepSeek response decoding, provider provenance, result identity, namespace, collision, disclosure, schema, and merged-response throw sites to allowlisted features.
- Injected the same proof-only sink through server construction into the DeepSeek provider and review handler while preserving a no-op outside proof mode.

## Task Commits

1. **Task 1 RED: Define child diagnostic contract** - `d5ed5a2` (test)
2. **Task 1 GREEN: Add authenticated child diagnostic channel** - `81c74bc` (feat)
3. **Task 2 RED: Require production owner emission** - `f9c4cbd` (test)
4. **Task 2 GREEN: Emit from production failure owners** - `21cde5e` (feat)

## Files Created/Modified

- `src/providers/diagnostics.ts` - Exact allowlist, authenticated emitter/parser, bounds, and proof environment erasure.
- `src/providers/deepseek.ts` - DeepSeek response decode, choice, content, size, and JSON extraction emission.
- `src/providers/provenance.ts` - Citation, finding-schema, ordering, and uniqueness emission at validation failures.
- `src/tools/review.ts` - Provider result shape, identity, namespace, collision, disclosure, and merged-schema emission.
- `src/server.ts` - One proof-only sink injected into provider and review owners.
- `tests/providers/diagnostics.test.ts` - Channel schema, cardinality, bounds, MAC, generation, sequence, and disclosure rejection.
- `tests/providers/deepseek.test.ts` - Real response throw-site feature assertions using an injected local transport.
- `tests/providers/provider-contract.test.ts` - Provenance owner feature and no-detail assertion.
- `tests/contract/review-provider.test.ts` - Orchestration identity emission with unchanged sanitized MCP bytes.

## Decisions Made

- The private channel accepts only registry-compatible `path` and `code` pairs; no API accepts thrown text, response bodies, credentials, fingerprints, request payloads, or arbitrary detail fields.
- The emitter owns and zeroes a copy of the HMAC key after its single write. Environment source values are deleted immediately after startup injection.
- Empty provider finding arrays retain their established valid public behavior; diagnostic emission is attached only to existing failure sites.

## Verification

- Focused channel and owner suites: 61/61 passed across 4 files.
- Full offline suite: 525/525 passed across 41 files.
- `npm run build`: passed.
- `git diff --check`: passed.
- Public provider failure bytes remained `{\"ok\":false,\"code\":\"PROVIDER_FAILURE\",\"message\":\"Provider failure\"}` in owning tests.
- External budgets: Docker 0, credential reads 0, network 0, provider requests 0, paid requests 0.
- GitHub Actions: `github_actions_runs=0`, `workflow_dispatches=0`, `repository_dispatches=0`, `gh_dispatches=0`, `git_pushes=0`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial DeepSeek RED fixture wrapped malformed response envelopes inside a valid outer response. The fixture was corrected to inject the malformed envelope at the actual transport response boundary before GREEN verification.

## Known Stubs

None. Empty collections found by the mechanical scan are bounded runtime accumulators or test capture arrays, not production stubs.

## Threat Model Results

- **T-10-39-01:** Mitigated by the exact allowlist, fixed prefix, six-field schema, 4 KiB cap, and absence of a detail-bearing emission API.
- **T-10-39-02:** Mitigated by a per-generation 32-byte HMAC key and fixed sequence 1.
- **T-10-39-03:** Mitigated by constant-time MAC comparison, exact schema validation, and one-frame cardinality.
- **T-10-39-04:** Invalid, absent, or conflicting frames parse to no feature so the host can route them to ambiguous/no-repair with zero follow-up budget.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: authenticated-private-stderr | `src/providers/diagnostics.ts` | Adds a bounded proof-only child-to-host diagnostic trust boundary authenticated by per-generation HMAC. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-40 can carry the authenticated stderr frame into the outer Docker harness and classify it once.
- This plan contributes private diagnostic evidence to PROV-01; it intentionally performs no Docker or live provider request.

## Self-Check: PASSED

- All created files exist.
- RED/GREEN commits `d5ed5a2`, `81c74bc`, `f9c4cbd`, and `21cde5e` exist in git history.
- All task acceptance criteria, focused tests, full offline regression, build, and diff checks passed.

---
*Phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e*
*Completed: 2026-09-13*
