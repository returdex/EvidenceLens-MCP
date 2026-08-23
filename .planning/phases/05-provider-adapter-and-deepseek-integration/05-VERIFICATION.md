---
phase: 05-provider-adapter-and-deepseek-integration
verified: 2026-08-23T04:07:00Z
status: passed
score: 14/14
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 13/14
  gaps_closed:
    - "The default npm test command is credential-free and no-network even when DEEPSEEK_API_KEY is present."
  gaps_remaining: []
  regressions: []
---

# Phase 05: Provider Adapter and DeepSeek Integration Verification Report

**Phase Goal:** DeepSeek Vision/Flash performs the review through a replaceable provider adapter without changing the MCP contract.
**Verified:** 2026-08-23T04:07:00Z
**Status:** passed
**Re-verification:** Yes — after default-test provider-isolation gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | DeepSeek credentials and model selection are configurable without changing MCP request or response schemas. | VERIFIED | `src/providers/config.ts` parses typed settings and allowlists models; `src/server.ts` constructs the built-in provider; `src/contracts/review.ts` is unchanged; contract tests parse the existing public response schema and exclude provider metadata. |
| 2 | A second compatible or local provider can be substituted behind the same adapter interface. | VERIFIED | `ReviewProvider` is defined in `src/providers/types.ts`; fake-provider injection is exercised by `tests/contract/review-provider.test.ts` and provider-contract tests. |
| 3 | Provider implementations receive independent bounded DTOs without analysis inputs, paths, adapters, or API keys. | VERIFIED | `src/providers/types.ts` exposes provider-owned DTOs; `src/tools/review.ts` constructs them from bounded analysis payloads; authenticated transport configuration remains in the adapter. |
| 4 | DeepSeek model selection is bounded to the documented allowlist with the vision model as default. | VERIFIED | `src/providers/config.ts` and `tests/providers/config.test.ts` enforce the three documented models and default. |
| 5 | Invalid, missing, conflicting, or secret-bearing configuration fails closed with sanitized errors. | VERIFIED | Configuration validation and stable provider errors are implemented and covered by `tests/providers/config.test.ts`. |
| 6 | Provider drafts cannot become public findings without local provenance and strict finding validation. | VERIFIED | `src/providers/provenance.ts` validates evidence identity, role, hashes, references, locations, visual payloads, citations, and `reviewFindingSchema`; forged cases are tested. |
| 7 | DeepSeek sends bounded multimodal Chat Completions with JSON Output and no persistent Files API upload. | VERIFIED | `src/providers/deepseek.ts` posts bounded data URLs to `/chat/completions` with JSON Output; injected transport assertions pass. |
| 8 | Only transient 429/5xx/network/timeout failures retry at most twice with jitter and time bounds. | VERIFIED | `src/providers/retry.ts` enforces transient classification, two-retry ceiling, jittered backoff, per-attempt timeout, and total-wait cutoff; retry tests pass. |
| 9 | Non-transient failures, malformed JSON, invalid findings, and forged citations fail without fallback or retry. | VERIFIED | Adapter and retry paths map these cases to stable provider errors; focused DeepSeek tests pass. |
| 10 | Adapter results retain provider/model/prompt/fingerprint metadata internally while deterministic findings remain separate. | VERIFIED | `ProviderReviewResult` carries attribution and `src/tools/review.ts` keeps deterministic/provider result sets internal; public serialization omits those fields. |
| 11 | Runtime registration is DeepSeek-only while explicit injection remains available. | VERIFIED | `src/server.ts` only auto-constructs `createDeepSeekProvider`; injected providers remain accepted by `ServerOptions`. |
| 12 | Provider findings are namespaced/collision-checked and public MCP schemas/annotations remain unchanged. | VERIFIED | `src/tools/review.ts` validates namespaced IDs and parses the existing response schema; read-only annotations remain present; contract tests pass. |
| 13 | Provider failures are sanitized at the MCP boundary. | VERIFIED | `src/errors.ts` maps `ProviderError` to stable `PROVIDER_FAILURE`; contract tests verify path/secret redaction. |
| 14 | Default tests are credential-free/no-network and the real DeepSeek test is isolated to the named live command. | VERIFIED | `package.json` sets `EVIDENCELENS_DISABLE_PROVIDER=1` and excludes only `tests/providers/deepseek-live.test.ts`; `src/server.ts` honors the flag; the MCP regression sets a dummy key and throwing `fetch` guard. Exact `env DEEPSEEK_API_KEY=dummy npm test` passed 21 files/114 tests. `npm run test:deepseek-live` remains `vitest run tests/providers/deepseek-live.test.ts`; missing-key preflight skips without network. |

**Score:** 14/14 truths verified

## Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `src/providers/types.ts` | VERIFIED | Provider interface, bounded DTOs, and separate result attribution; wired by adapter/orchestration. |
| `src/providers/config.ts` | VERIFIED | Strict defaults, model allowlist, bounds, conflicts, endpoint and secret checks; wired by server. |
| `src/providers/errors.ts` | VERIFIED | Stable internal error taxonomy and safe serialization; used throughout provider paths. |
| `src/providers/provenance.ts` | VERIFIED | Strict draft/citation validation and local evidence resolution; wired by adapter. |
| `src/providers/deepseek.ts` | VERIFIED | Multimodal Chat Completions adapter with parsing, provenance, metadata, and retry transport. |
| `src/providers/retry.ts` | VERIFIED | Bounded transient retry/timeout policy; called by DeepSeek transport. |
| `src/tools/review.ts` | VERIFIED | Provider DTO construction, independent deterministic analysis, merge validation, cleanup, and public schema parse. |
| `src/server.ts` | VERIFIED | DeepSeek-only runtime registration plus explicit provider injection and test isolation switch. |
| `tests/contract/review-provider.test.ts` | VERIFIED | Substitution, unchanged public response, sanitization, and collision regression coverage. |
| `tests/providers/deepseek.test.ts`, `tests/providers/retry.test.ts`, `tests/providers/config.test.ts` | VERIFIED | Credential-free adapter, retry, configuration, provenance, and failure coverage. |
| `README.md`, `docs/mcp-contract.md`, `.evidencelens.local.example.json` | VERIFIED | Setup, bounds, isolation, unchanged contract, provenance, errors, and explicit live-test documentation. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src/providers/types.ts` | `src/providers/provenance.ts` | Provider result validation before finding conversion | WIRED | DeepSeek returns provider results and invokes local validation before conversion. |
| `src/providers/config.ts` | `src/providers/errors.ts` | Stable configuration failures | WIRED | Invalid settings throw `PROVIDER_CONFIGURATION`. |
| `src/providers/provenance.ts` | `src/contracts/review.ts` | Strict finding/citation schemas | WIRED | Existing review schemas validate final findings/citations. |
| `src/providers/deepseek.ts` | Chat Completions | Configured POST transport | WIRED | Bearer-authenticated `/chat/completions` request with JSON Output. |
| `src/providers/deepseek.ts` | `src/providers/retry.ts` | Bounded transient transport | WIRED | Adapter calls `fetchWithRetry`. |
| `src/server.ts` | `src/providers/deepseek.ts` | Typed startup registration | WIRED | Only the built-in DeepSeek adapter is auto-constructed. |
| `src/tools/review.ts` | deterministic analyzer | Independent execution | WIRED | Deterministic analyzer runs separately and its findings are retained. |
| `tests/contract/review-provider.test.ts` | public MCP contract | Schema/annotation assertions | WIRED | Public response parsing and provider-field exclusion pass. |
| `package.json` | `src/server.ts` | Test isolation environment | WIRED | `npm test` exports the flag consumed by `createServer()`. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `src/tools/review.ts` | `deterministicFindings` | Deterministic analyzer over normalized analysis | Yes | FLOWING |
| `src/tools/review.ts` | `providerFindings` | Injected provider or configured DeepSeek response, then local validation/namespacing | Yes when enabled; optional by design | FLOWING |
| `src/providers/deepseek.ts` | `modelFindings` | Parsed Chat Completions response validated against request provenance | Yes in injected tests; explicit live path for real API | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Credentialed default suite is isolated | `env DEEPSEEK_API_KEY=dummy npm test` | 21 files, 114 tests passed | PASS |
| TypeScript build | `npm run build` | Passed | PASS |
| Focused provider/contract regression | `env DEEPSEEK_API_KEY=dummy EVIDENCELENS_DISABLE_PROVIDER=1 npx vitest run ...` | 6 files, 29 tests passed | PASS |
| Named live command without credentials | `env -u DEEPSEEK_API_KEY npm run test:deepseek-live -- --run` | 1 test skipped by missing-key preflight | PASS |
| Dependency audit | `npm audit --audit-level=high` | 0 vulnerabilities | PASS |
| Repository diff validation | `git diff --check` | Clean | PASS |

The live test was not run with a real key because that would require external network access and incur API cost; it remains opt-in under the exact named script.

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| PROV-01 | SATISFIED | Typed DeepSeek configuration, bounded adapter, stable errors, unchanged MCP schemas, documentation, and credentialed isolated default suite. |
| PROV-02 | SATISFIED | Independent `ReviewProvider` seam, fake/local substitution tests, DeepSeek-only automatic runtime registration, and public contract preservation. |

No orphaned Phase 05 requirements were found. `src/contracts/review.ts` remains unchanged by the phase implementation and verification-fix commits.

## Anti-Patterns Found

No blocker or warning anti-patterns were found in the changed implementation, tests, or documentation. The “Files API” match is documentation explicitly stating that persistent uploads are not used. No TODO/FIXME/placeholder implementation, arbitrary provider loading, raw response logging, or empty data path was found.

## Human Verification Required

None required for the automated phase gate. A credentialed live run remains an optional operational check requiring a real key, network access, and cost approval; it is intentionally not part of `npm test`.

## Gaps Summary

The sole prior blocker is closed. The default npm test script now exports `EVIDENCELENS_DISABLE_PROVIDER=1`, `createServer()` honors it by skipping automatic configuration/provider registration, and the protocol regression proves that a dummy DeepSeek key cannot trigger network access. Explicit provider injection remains available, normal runtime registration remains intact when the switch is absent, the public MCP contract is unchanged, and all provider/provenance/collision/retry/error/security requirements pass focused tests and source-level wiring checks.

---

_Verified: 2026-08-23T04:07:00Z_
_Verifier: the agent (gsd-verifier)_

