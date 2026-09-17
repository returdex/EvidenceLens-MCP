---
status: resolved
trigger: "Plan 10-140 returned provider-json-object-unbalanced after one clean provider response"
---

# Debug Session: provider-finish-reason-contract

## Symptoms

- Expected behavior: a complete provider response contains a balanced findings object.
- Actual behavior: content is unbalanced with a clean HTTP/lifecycle result.
- Error messages: provider-json-object-unbalanced.
- Timeline: after wrapper grammar fixes.
- Reproduction: consumed 10-140 cannot replay; offline API response fixtures only.

## Current Focus

- hypothesis: provider choice terminated with finish_reason length/token limit, but adapter ignores finish_reason and reports only downstream unbalanced JSON.
- test: add strict bounded finish_reason parsing before content extraction and cover stop/length/content_filter/unknown/missing/type errors.
- expecting: authenticate a precise non-secret terminal category without changing max tokens or prompt behavior.
- next_action: audit provider response choice contract

## Evidence

- timestamp: 2026-09-17T14:55:00+10:00
  observation: `parseDrafts` read `choices[0].message.content` without inspecting `choices[0].finish_reason`.
  implication: A provider response terminated by `length` could reach the JSON extractor and be mislabeled as `provider-json-object-unbalanced`.
- timestamp: 2026-09-17T14:56:00+10:00
  observation: Strict offline cases reject missing, non-string, unknown, `length`, `content_filter`, `tool_calls`, and `insufficient_system_resource` before content parsing; only `stop` reaches extraction.
  implication: The terminal cause is now finite, content-free, and precedes derivative JSON-shape classification.
- timestamp: 2026-09-17T14:57:00+10:00
  observation: Full authenticated server-to-provider-to-stderr-to-host tests pass for every new category; focused 242/242 and full provider-disabled 732/732 pass with build and diff checks.
  implication: Producer allowlist, authenticated frame parser, host invariant registry, and normal success fixtures agree.


## Eliminated

- hypothesis: The JSON object extractor itself caused the clean-response failure.
  evidence: It received content without upstream completion state; the missing decision boundary was `finish_reason`, not the already-bounded extraction grammar.
- hypothesis: A raw or arbitrary finish reason must be retained to diagnose the failure.
  evidence: A closed allowlist distinguishes documented non-success categories while mapping unknown values to `invalid_value` and emitting no raw content.


## Resolution

- root_cause: The DeepSeek response adapter ignored `choices[0].finish_reason`, so token-limited and other non-normal completions fell through into content parsing and were misclassified as downstream JSON-shape failures.
- fix: Require the exact normal value `stop`; reject missing/wrong-type/unknown reasons and map the finite supported non-success reasons `length`, `content_filter`, `tool_calls`, and `insufficient_system_resource` to authenticated content-free diagnostics before parsing content.
- verification: Focused production-path suite 242/242; full provider-disabled suite 732/732; TypeScript build and `git diff --check` pass; zero provider, network, credential, Docker, or GitHub Actions use.
- files_changed: src/providers/deepseek.ts, src/providers/diagnostics.ts, scripts/docker-review-real.mjs, tests/providers/deepseek.test.ts, tests/providers/vision-provenance.test.ts, tests/contract/review-tool.test.ts
