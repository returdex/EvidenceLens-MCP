---
status: resolved
trigger: "Plan 10-145 authenticated provider-finish-reason-length at maxTokens 4000"
---

# Debug Session: provider-output-token-budget

## Symptoms

- Expected behavior: four-fixture review completes a strict findings JSON object within one response.
- Actual behavior: provider ends with finish_reason length at the configured 4000-token output cap.
- Error messages: provider-finish-reason-length.
- Timeline: confirmed after strict finish_reason contract.
- Reproduction: consumed 10-145 cannot replay; offline request-body and output-size analysis only.

## Current Focus

reasoning_checkpoint:
  hypothesis: "The v1 prompt permits up to 100 findings with 4000-character prose fields, so a schema-valid response can exceed the configured 4000-token output cap and finish with reason length."
  confirming_evidence:
    - "The exact production defaults in src/providers/config.ts and src/tools/review.ts are maxTokens=4000."
    - "The previous prompt contained no finding-count or prose-size guidance, while MAX_PROVIDER_FINDINGS was 100 and provider draft prose fields allowed 4000 characters."
    - "Plan 10-145 ended with the authenticated provider-finish-reason-length diagnostic at that exact cap."
  falsification_test: "This hypothesis would be false if the request body already carried an enforced small count/prose budget or if an output above that budget passed post-response validation."
  fix_rationale: "A shared four-finding/concise-field contract in the prompt and validator makes overflow fail closed and gives the provider a bounded response target without changing the public schema, provenance checks, or one-request budget."
  blind_spots: "No provider call is allowed in this session, so live model compliance must be confirmed only by a fresh future generation; offline tests can prove request shape and rejection behavior."
next_action: "Archived after human confirmation."

## Evidence

- timestamp: 2026-09-17T16:05:00+10:00
  checked: exact production configuration and request construction
  found: both provider configuration and review-tool defaults resolve to maxTokens=4000; the serialized request uses that value as max_tokens.
  implication: the 10-145 length finish occurred at the intended configured ceiling, not from a secret or environment override.
- timestamp: 2026-09-17T16:06:00+10:00
  checked: v1 prompt and provider draft/result schemas
  found: the prompt had no output count or concision limit, provider results allowed 100 findings, and each authored prose field allowed 4000 characters.
  implication: the accepted output language was vastly larger than the 4000-token generation budget.
- timestamp: 2026-09-17T16:09:00+10:00
  checked: focused provider/config/orchestration tests after bounded-contract implementation
  found: 167 tests passed, including request max_tokens/prompt assertions and adversarial excessive-count and excessive-prose rejection.
  implication: prompt and post-validation now share an enforceable bound while attribution and provenance tests remain green.
- timestamp: 2026-09-17T16:12:00+10:00
  checked: complete provider-disabled suite, TypeScript build, diagnostic registry, and diff whitespace
  found: all 735 offline tests passed; npm run build and git diff --check passed; the new findings/too_big tuple is registered in the authenticated diagnostic registry.
  implication: the bounded-output contract integrates without provider, network, Docker, credential, or GitHub Actions activity.


## Eliminated


## Resolution

- root_cause: "The provider prompt and validator admitted an output language too large for maxTokens=4000: no prompt count/concision limit, up to 100 findings, and 4000-character authored fields."
- fix: "Versioned the prompt to v2; limited built-in provider output to four highest-priority findings, concise authored fields, two follow-up checks, and four citations; enforced identical limits after decoding; registered the new sanitized overflow diagnostic; documented the provider-only bound."
- verification: "Focused provider/config/orchestration suite 167/167; complete provider-disabled suite 735/735; TypeScript build and git diff --check passed. No provider, network, Docker, credential, or GitHub Actions activity."
- files_changed:
  - src/providers/types.ts
  - src/providers/deepseek.ts
  - src/providers/provenance.ts
  - scripts/docker-review-real.mjs
  - tests/providers/deepseek.test.ts
  - tests/providers/config.test.ts
  - docs/mcp-contract.md
