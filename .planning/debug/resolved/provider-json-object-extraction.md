---
status: resolved
trigger: "Plan 10-115 authenticated diagnostic provider-json-object-extraction after one provider send"
---

# Debug Session: provider-json-object-extraction

## Symptoms

- Expected behavior: provider response content yields one bounded JSON review object matching the strict schema.
- Actual behavior: one authenticated send returns, then provider-json-object-extraction fails before public result construction.
- Error messages: sanitized provider-json-object-extraction.
- Timeline: first exact actionable diagnostic after full Docker/MCP/request chain became authoritative.
- Reproduction: consumed Plan 10-115 cannot replay; use offline response-content fixtures only.

## Current Focus

- hypothesis: DeepSeek returns a valid JSON object wrapped in markdown/code fences or explanatory text that the current bounded extractor rejects, or extractor mishandles nested braces/string escapes.
- test: inspect current extraction grammar and official/requested response format, then exercise bounded offline variants without using retained raw provider output.
- expecting: identify a deterministic parser limitation and fix only if strict bounded extraction can remain fail-closed.
- next_action: audit JSON extraction implementation and tests

## Evidence

- timestamp: 2026-09-17T02:46:00+10:00
  observation: The production request already sets `response_format: { type: "json_object" }`, but response extraction used the first `{` and last `}` in the entire provider string as a fallback.
  implication: A bounded valid object could be rejected when otherwise harmless wrapper text contained structural delimiters; the fallback did not prove that exactly one complete object was present.
- timestamp: 2026-09-17T02:47:00+10:00
  observation: Offline fixtures reproduce the limitation and verify a string/escape-aware bounded scanner accepts direct JSON, fenced JSON, non-structural prose, nested braces in strings and escapes.
  implication: The parser limitation is deterministic without recovering or replaying the consumed provider response.
- timestamp: 2026-09-17T02:48:00+10:00
  observation: Multiple objects, truncation, unmatched trailing objects, trailing arrays, extra root keys, `__proto__`, and over-1MB content all fail closed; strict per-finding Zod validation remains unchanged.
  implication: Wrapper tolerance does not weaken single-object, size, root-key, or finding-schema boundaries.
- timestamp: 2026-09-17T02:49:00+10:00
  observation: Focused tests passed 35/35; full provider-disabled suite passed 678/678; TypeScript build and `git diff --check` passed.
  implication: The correction is covered without network, credentials, Docker, provider requests, GitHub Actions, push, dispatch, or replay.


## Eliminated

- The request format omitting DeepSeek JSON Object mode: production body already contains the required `response_format` field.
- Broad best-effort parsing: ambiguous, multiple, malformed, truncated, structurally trailing, oversized, and non-strict-root inputs remain rejected.


## Resolution

- root_cause: The fallback extractor selected the substring from the first opening brace to the last closing brace instead of proving one balanced JSON object, so wrapper delimiters could turn one valid bounded response into `provider-json-object-extraction` while ambiguity was not modeled explicitly.
- fix: Added a bounded string/escape-aware balanced-object scanner that accepts exactly one strict `{ findings }` root and rejects structural garbage, multiple objects, truncation, oversized input, extra keys, and prototype-pollution keys.
- verification: 35 focused tests, 678 full provider-disabled tests, TypeScript build, and diff check passed; zero external effects.
- files_changed: src/providers/deepseek.ts, tests/providers/deepseek.test.ts
