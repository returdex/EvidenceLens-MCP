---
phase: 07-deepseek-vision-provenance-closure
status: gaps_found
verified: 2026-09-06
requirements: [PROV-01]
evidence_source: phase-10
---

# Phase 7 Verification: DeepSeek Vision Provenance Closure

## Goal

Verify that DeepSeek Vision can be invoked through the production provider and complete Docker MCP stdio path while public findings retain locally bound provenance and disclose no credentials or raw provider output.

## Required Artifacts and Key Links

- `src/providers/deepseek.ts` sends the official Vision `image_url` request and delegates compact references to local validation.
- `src/providers/provenance.ts` resolves provider references against normalized local evidence before constructing public citations.
- `tests/providers/vision-provenance.test.ts` exercises representative and malformed provider responses without credentials or network access.
- `tests/providers/deepseek-live.test.ts` is the narrower opt-in adapter-only Vision structural check.
- `scripts/docker-review-real.mjs` performs the complete credentialed Docker MCP stdio structural check.

## Requirement Coverage

| Requirement | Offline evidence | Authorized live evidence | Status |
|---|---|---|---|
| PROV-01 | Credential-free provider/provenance contracts, full suite, build, and offline Docker smoke passed. | A fresh corrected-lifecycle `npm run docker:review:real` execution was separately authorized after every hardened offline gate passed; it returned a sanitized protocol non-pass. | **Gap:** complete credentialed MCP structural success is not proven. |

## Evidence

### Credential-free results

- `env -u DEEPSEEK_API_KEY npm test -- --run tests/providers/config.test.ts tests/providers/deepseek-live.test.ts tests/contract/public-contract-docs.test.ts` — passed 29 tests; the default test script excluded the opt-in live test and made no provider request.
- `npm run build` — passed.
- Phase 10 Plan 02 also recorded `npm test` passing all 200 credential-free tests and `npm run docker:smoke` passing the offline Docker MCP path.

These commands validate configuration redaction, local provenance, documentation, and offline MCP behavior. They do not establish a successful real-provider response.

### Authorized live outcome

<!-- live-proof:start -->
command: npm run docker:review:real
timestamp: 2026-09-07T03:03:21.000Z
outcome: [docker-review:protocol] failed
interpretation: complete credentialed Docker MCP structural proof remains unproven
status: gaps_found
<!-- live-proof:end -->

The fresh corrected-lifecycle command was separately authorized and executed exactly once with retries forced to zero and finite absolute deadlines. It completed with a nonzero exit and the sanitized protocol outcome above. No fallback, timeout extension, alternate provider command, diagnostic provider call, or second attempt was run.

## Scope and Conclusion

Phase 7's earlier adapter-level live result is narrower evidence: it does not substitute for the complete Docker MCP stdio proof. Routine tests remain credential-free and no-network, and injected-provider E2E is not credentialed proof. Provider-backed model prose is variable; neither live command promises byte-for-byte prose equality.

PROV-01 must not be claimed complete from the current Phase 10 evidence. A future separately authorized `npm run docker:review:real` run must complete all structural assertions before this report can be changed to `status: passed`.
