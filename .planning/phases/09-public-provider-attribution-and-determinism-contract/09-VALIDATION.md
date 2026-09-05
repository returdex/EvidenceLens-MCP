---
phase: 09
slug: public-provider-attribution-and-determinism-contract
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-05
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Reconstructed after completion from all nine plans, summaries, the independent verification report, and the current test suite.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.7 |
| **Config file** | none — package scripts use Vitest defaults |
| **Quick run command** | `npm test -- --run tests/review/analysis.test.ts tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~4 seconds |

The default suite sets `EVIDENCELENS_DISABLE_PROVIDER=1` and excludes `tests/providers/deepseek-live.test.ts`; Phase 09 verification is deliberately credential-free and offline.

## Sampling Rate

- **After every task commit:** run the quick command above, plus `npm run build` for contract/source changes.
- **After every plan wave:** run `npm test` and `git diff --check`.
- **Before `$gsd-verify-work`:** full suite must be green.
- **Max feedback latency:** 10 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | MCP-02, SAFE-03 | T-09-01..05 | Strict optional provider attribution and preserved provenance | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-01-02 | 01 | 1 | MCP-02, SAFE-03 | T-09-01..06 | Identity-bound provider projection and deterministic-only byte stability | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-01-03 | 01 | 1 | MCP-02, SAFE-03 | T-09-03..05 | Published contract excludes provider internals | documentation | `npm test -- --run tests/contract/public-contract-docs.test.ts tests/contract/review-provider.test.ts` | ✅ | ✅ green |
| 09-02-01 | 02 | 2 | MCP-02, SAFE-03 | T-09-GC-01..02 | Attribution iff, namespace integrity, and image provenance binding | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-02-02 | 02 | 2 | MCP-02, SAFE-03 | T-09-GC-03..06 | Unknown provider results fail closed at the provider boundary | contract | `npm test -- --run tests/contract/review-provider.test.ts tests/providers/provider-contract.test.ts tests/providers/deepseek.test.ts && npm run build` | ✅ | ✅ green |
| 09-02-03 | 02 | 2 | MCP-02, SAFE-03 | T-09-GC-04..06 | Deterministic findings are frozen and docs reject contradictory claims | contract | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-03-01 | 03 | 3 | MCP-02, SAFE-03 | T-09-GC3-01 | PDF visual citation/hash provenance is bidirectionally bound | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-03-02 | 03 | 3 | MCP-02, SAFE-03 | T-09-GC3-02..04 | Hostile provider access and analyzer failures are source-classified | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-03-03 | 03 | 3 | MCP-02, SAFE-03 | T-09-GC3-05..06 | Attribution grammar and stable documented errors are executable | documentation | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts && npm run build` | ✅ | ✅ green |
| 09-04-01 | 04 | 4 | MCP-02, SAFE-03 | T-09-GC4-01..02 | Provider-authored private tokens never project or log | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-04-02 | 04 | 4 | MCP-02, SAFE-03 | T-09-GC4-02..04 | Analyzer errors and cleanup preserve safe error precedence | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-04-03 | 04 | 4 | MCP-02, SAFE-03 | T-09-GC4-05..06 | PDF provenance and public success examples match runtime | documentation | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-05-01 | 05 | 5 | MCP-02, SAFE-03 | T-09-GC5-01 | Provider-only token guard preserves valid local provenance | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-05-02 | 05 | 5 | MCP-02, SAFE-03 | T-09-GC5-02..04 | Analyzer input/identity and retained transient data stay isolated | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-05-03 | 05 | 5 | MCP-02, SAFE-03 | T-09-GC5-05..06 | Deterministic documentation response is exact runtime output | documentation | `npm test -- --run tests/contract/public-contract-docs.test.ts tests/contract/review-provider.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-06-01 | 06 | 6 | MCP-02, SAFE-03 | T-09-GC6-01..02,05 | Fresh provider inference and setup lifecycle retain caller ownership | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-06-02 | 06 | 6 | MCP-02, SAFE-03 | T-09-GC6-03..06 | Retained claims are scrubbed and findings snapshot across await | unit + contract | `npm test -- --run tests/review/analysis.test.ts tests/contract/review-provider.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-06-03 | 06 | 6 | MCP-02, SAFE-03 | T-09-GC6-06..07 | Extra provider fields reject whole result and docs state it | documentation | `npm test -- --run tests/contract/public-contract-docs.test.ts tests/contract/review-provider.test.ts && npm run build && npm test && git diff --check` | ✅ | ✅ green |
| 09-07-01 | 07 | 7 | MCP-02, SAFE-03 | T-09-GC7-01..02 | Handler dependencies snapshot once with source-owned failures | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-07-02 | 07 | 7 | MCP-02, SAFE-03 | T-09-GC7-03..04 | Hidden, Proxy, trap, and accessor provider-result envelopes fail closed | contract | `npm test -- --run tests/contract/review-provider.test.ts && npm run build` | ✅ | ✅ green |
| 09-07-03 | 07 | 7 | MCP-02, SAFE-03 | T-09-GC7-05..07 | Cleanup continuation and public semantics remain complete | unit + documentation | `npm test -- --run tests/review/analysis.test.ts tests/contract/public-contract-docs.test.ts tests/contract/review-provider.test.ts && npm run build && npm test && git diff --check` | ✅ | ✅ green |
| 09-08-01 | 08 | 8 | MCP-02, SAFE-03 | T-09-GC8-01..02 | Only six own enumerable data properties can enter parsing | contract | `npm test -- --run tests/contract/review-provider.test.ts` | ✅ | ✅ green |
| 09-08-02 | 08 | 8 | MCP-02, SAFE-03 | T-09-GC8-03..05 | Preflight preserves safe attribution and documents rejection | contract + documentation | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts && npm run build && npm test` | ✅ | ✅ green |
| 09-09-01 | 09 | 9 | MCP-02, SAFE-03 | T-09-09-01..04 | RED matrix proves nested parse-time outer-envelope mutation | contract | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` | ✅ | ✅ green |
| 09-09-02 | 09 | 9 | MCP-02, SAFE-03 | T-09-09-01..04 | Post-parse preflight rejects mutation before parsed data use | contract + documentation | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` | ✅ | ✅ green |
| 09-09-03 | 09 | 9 | MCP-02, SAFE-03 | T-09-09-02..05 | Offline closure, scope integrity, and prior artifact protection | integration | `npm test -- --run tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts && npm run build && npm test && git diff --check` | ✅ | ✅ green |

## Wave 0 Requirements

Existing Vitest infrastructure covers all Phase 09 requirements. No Wave 0 additions were needed.

## Manual-Only Verifications

All Phase 09 behaviors have automated verification. The opt-in DeepSeek live test is intentionally excluded: it is not a Phase 09 requirement and would require credentials/network access outside this phase's offline contract.

## Validation Audit 2026-09-05

| Metric | Count |
|--------|-------|
| Tasks mapped | 26 |
| Requirements covered | 2/2 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

## Validation Sign-Off

- [x] All tasks have automated verification.
- [x] Sampling continuity: no three consecutive tasks lack an automated check.
- [x] Existing infrastructure covers all requirements; no Wave 0 work is needed.
- [x] No watch-mode flags are used.
- [x] Feedback latency is under 10 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** verified 2026-09-05
