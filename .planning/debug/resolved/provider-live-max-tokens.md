---
status: resolved
trigger: "Plan 10-150 still ended finish_reason length under Prompt v2 with maxTokens 4000"
---

# Debug Session: provider-live-max-tokens

## Symptoms

- Expected behavior: Prompt v2 completes up to four bounded findings.
- Actual behavior: provider still terminates at 4000 tokens with finish_reason length.
- Error messages: provider-finish-reason-length.
- Timeline: confirmed twice, before and after Prompt v2.
- Reproduction: consumed 10-150 cannot replay; offline config/request tests only.

## Current Focus

- hypothesis: fixed live output cap 4000 is insufficient for this provider/model despite prompt bounds; an 8000-token proof cap remains within validated 20000 maximum and should avoid truncation.
- test: align production default, Compose proof services, docs, runtime spec and request fingerprints on one fixed 8000 value; prove caller cannot silently lower/raise the certified live value.
- expecting: exact immutable proof records the higher bounded output cap without changing request count or retries.
- next_action: implement and hostile-test fixed live output budget

## Evidence

- timestamp: 2026-09-17T07:17:34Z
  observation: The production default, default review inference, and both Compose live services were independently fixed at 4000; the consumed 10-150 receipt authenticated finish_reason length at that exact cap.
  implication: Prompt v2 bounded shape did not guarantee completion within 4000 provider tokens; the fixed output budget was the remaining truncation boundary.
- timestamp: 2026-09-17T07:17:37Z
  observation: Focused provider/config/runtime/request tests passed 187/187 after raising the fixed default and certified live cap to 8000.
  implication: The request body, inference projection, exact input fingerprint, and runtime specification agree on the new bounded value.
- timestamp: 2026-09-17T07:17:45Z
  observation: Real credential-free Compose expansion under hostile host DEEPSEEK_MAX_TOKENS=1 produced reviewMaxTokens=8000, proofMaxTokens=8000, and proofRetries=0.
  implication: The certified live environment cannot silently lower or raise the reviewed output cap through host interpolation.
- timestamp: 2026-09-17T07:18:05Z
  observation: Full provider-disabled suite passed 742/742; TypeScript build and git diff hygiene passed with no provider, network, credential, Docker run/build, or GitHub Actions effects.
  implication: The fix is regression-safe offline and preserved the one-request/zero-retry proof policy and Prompt v2 post-decode bounds.

## Eliminated

- hypothesis: Raising the cap requires weakening the general 20000 maximum or provider finding bounds.
  evidence: General configuration remains validated at 1..20000, while MAX_PROVIDER_FINDINGS and all Prompt v2 field/citation/follow-up postvalidation are unchanged.
- hypothesis: A host can override the certified proof cap by supplying DEEPSEEK_MAX_TOKENS.
  evidence: Compose uses literal 8000 for both review and proof, the sanitized config subprocess does not inherit the host variable, and runtime-spec hostile tests reject coordinated lower and higher mutations.

## Resolution

- root_cause: The certified live request was still capped at 4000 tokens in four independent defaults; the provider exhausted that fixed budget even after Prompt v2 bounded the result shape.
- fix: Raise the product default and certified Compose live cap to 8000, centralize the TypeScript default, require exact 8000 in proof runtime derivation and immutable Docker argv, document the policy, and bind it into request fingerprint tests while retaining one request, zero proof retries, max-four findings, and the 20000 configuration ceiling.
- verification: Focused 187/187; full provider-disabled 742/742; TypeScript build and diff check passed; hostile Compose expansion and lower/higher runtime mutations passed; no provider/network/credential/GitHub Actions use and no replay of 10-150.
- files_changed: .evidencelens.local.example.json, README.md, compose.yaml, docs/mcp-contract.md, scripts/proof-runtime-spec.mjs, src/providers/config.ts, src/tools/review.ts, tests/contract/review-provider.test.ts, tests/providers/config.test.ts, tests/scripts/proof-runtime-spec.test.ts
