---
status: resolved
trigger: "Plan 10-125 returned ambiguous stream_truncated after adding extraction-shape diagnostics"
---

# Debug Session: extraction-diagnostic-frame-cardinality

## Symptoms

- Expected behavior: one extraction failure produces one authenticated shape diagnostic.
- Actual behavior: real post-fetch extraction failure produces ambiguous with stream_truncated=true.
- Error messages: sanitized ambiguous.
- Timeline: regression after e213bda shape taxonomy.
- Reproduction: consumed 10-125 cannot replay; injected offline provider content only.

## Current Focus

reasoning_checkpoint:
  hypothesis: "The child signing channel suppresses each new extraction diagnostic because its independent closed tuple registry was not updated with the six codes added by e213bda, so the host receives zero frames and reports ambiguous."
  confirming_evidence:
    - "deepseek.ts emits exactly one provider/content/object feature for each extraction failure."
    - "DIAGNOSTIC_INVARIANT_MAP contains all six tuples, while diagnostics.ts previously contained only invalid_format for that path."
    - "After adding the six tuples and rebuilding dist, the exact server -> tool -> provider -> stderr -> collector -> classifier test passes for all six shapes."
  falsification_test: "Any shape producing zero or multiple authenticated frames through the production stack, or any unknown/duplicate vector becoming allowlisted, would falsify the hypothesis or fix."
  fix_rationale: "Synchronizing only the six exact producer tuples restores the intended closed capability without weakening one-frame cardinality, MAC authentication, or unknown-feature rejection."
  blind_spots: "The live provider generation is intentionally not replayed; verification uses injected offline provider responses and the same production components."
next_action: archived after confirmed human verification

## Evidence

- timestamp: 2026-09-17T00:00:00+10:00
  checked: e213bda, src/providers/deepseek.ts, src/providers/diagnostics.ts, scripts/docker-review-real.mjs
  found: deepseek emits six codes at path provider/content/object and the host invariant map recognizes all six, but the child diagnostic allowedFeatures registry recognizes only invalid_format at that path.
  implication: the new shape diagnostic is suppressed before stderr, yielding zero authenticated frames and the expected fail-closed ambiguous/stream_truncated result; duplicate production is not required to explain the symptom.
- timestamp: 2026-09-17T00:01:00+10:00
  checked: focused diagnostics, provider, protocol, and host harness tests after rebuilding dist
  found: 198 tests pass; each of six injected extraction failures yields one authenticated allowlisted invariant, while existing duplicate/conflicting/unknown tests remain fail-closed.
  implication: the registry mismatch is corrected without weakening ambiguity handling.


## Eliminated


## Resolution

- root_cause: e213bda expanded the producer and host invariant map with six extraction-shape codes but did not expand the child diagnostic channel's independent closed allowlist, so every new frame was suppressed before stderr.
- fix: add exactly the six extraction tuples to the child allowlist, export the existing host collector for direct regression coverage, and test the entire offline production chain.
- verification: focused suite 198/198; complete provider-disabled suite 693/693; TypeScript build and git diff --check pass. No provider, network, credential, Docker, generation replay, or GitHub Actions action occurred.
- files_changed:
  - src/providers/diagnostics.ts
  - scripts/docker-review-real.mjs
  - tests/providers/diagnostics.test.ts
  - tests/contract/review-tool.test.ts
