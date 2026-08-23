---
phase: 05-provider-adapter-and-deepseek-integration
plan: 02
subsystem: api
tags: [providers, deepseek, multimodal, retry, provenance, security]

# Dependency graph
requires:
  - phase: 05-provider-adapter-and-deepseek-integration
    plan: 01
    provides: provider DTOs, provenance validator, config bounds, sanitized provider errors
provides:
  - bounded DeepSeek OpenAI-compatible multimodal adapter
  - transient-only retry, timeout, jitter, and total-wait policy
  - credential-free injected adapter and transport failure tests
affects: [05-03-mcp-provider-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [platform fetch transport injection, JSON Output boundary, local provenance validation, injectable retry clock]

# Key files
key-files:
  created: [src/providers/deepseek.ts, src/providers/retry.ts, tests/providers/deepseek.test.ts, tests/providers/retry.test.ts]
  modified: []

# Decisions
decisions:
  - "Reconstruct only provider-safe normalized evidence metadata at the adapter boundary so citations are resolved locally without exposing filesystem adapters or paths."
  - "Enforce a hard two-retry ceiling inside the retry utility even when a caller supplies an unsafe maxRetries value."

# Metrics
metrics:
  duration: 2 min
  completed: 2026-08-23
---

# Phase 5 Plan 2: DeepSeek Adapter and Bounded Retry Summary

**Strict DeepSeek multimodal Chat Completions with locally validated findings and bounded transient-only transport retries.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-23T13:49:00Z
- **Completed:** 2026-08-23T13:52:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `createDeepSeekProvider` behind the replaceable `ReviewProvider` interface.
- Sends stable, bounded text and retained visual evidence as OpenAI-compatible Chat Completions content with JSON Output enabled.
- Computes and verifies the request input fingerprint before transport, and returns provider/model/prompt/fingerprint metadata.
- Rejects malformed JSON, invalid finding drafts, forged citations, and non-success HTTP responses with stable sanitized provider errors.
- Added transient-only 429/5xx/network/timeout retries with a hard maximum of two retries, jittered exponential delays, per-request timeout, and total-wait cutoff.
- Added injected tests proving request shape, bounded data URLs, provenance enforcement, retry classification, timeout behavior, jitter bounds, and error redaction.

## Task Commits

1. **Task 1: Build the bounded DeepSeek multimodal Chat Completions adapter** — `6e71ded`
2. **Task 2: Implement transient-only retries, timeout, and stable failure mapping** — `5440fc5`

## Files Created

- `src/providers/deepseek.ts` — DeepSeek provider implementation, safe request serialization, fingerprint verification, strict response parsing, and provenance validation.
- `src/providers/retry.ts` — injectable bounded retry/timeout policy and transient classification.
- `tests/providers/deepseek.test.ts` — injected request, valid response, malformed/forged response, and error disclosure coverage.
- `tests/providers/retry.test.ts` — status, network, timeout, retry-count, jitter, and total-wait coverage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the retry utility with the adapter boundary commit**
- **Found during:** Task 1 implementation
- **Issue:** The adapter's required bounded transport behavior depended on the new retry module, while Task 1 verification required the project to build before Task 2 could complete.
- **Fix:** Added the initial retry utility and injected retry tests with the adapter commit, then hardened and expanded the utility in Task 2.
- **Files modified:** `src/providers/retry.ts`, `tests/providers/retry.test.ts`
- **Commit:** `6e71ded` (completed in `5440fc5`)

No unresolved deviations remain.

## Verification

- Focused provider tests — passed: 8 tests.
- Full `npm test` — passed: 20 files, 110 tests.
- `npm run build` — passed.
- `npm audit --audit-level=high` — passed: 0 vulnerabilities.
- `git diff --check` — passed.
- Static scans for Files API use, arbitrary loading, path serialization, and raw response logging — passed.

## Known Stubs

None found in files created by this plan.

## Threat Flags

None. The planned outbound provider and retry trust boundaries are mitigated by bounded serialization, config-derived endpoint use, local provenance validation, sanitized errors, and retry limits.

## Self-Check: PASSED

- All four created implementation/test files exist.
- Summary file exists.
- Task commits `6e71ded` and `5440fc5` exist in Git history.
- `.planning/STATE.md` was intentionally left unchanged by this plan; its pre-existing working-tree modification remains for the orchestrator.
