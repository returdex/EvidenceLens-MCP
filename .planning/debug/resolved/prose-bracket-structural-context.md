---
status: resolved
trigger: "Plan 10-135 repeated structural_context after exact singleton-array support"
---

# Debug Session: prose-bracket-structural-context

## Symptoms

- Expected behavior: one unique findings object may be surrounded by harmless prose.
- Actual behavior: structural_context persists; exact singleton array did not match.
- Error messages: provider-json-object-structural-context.
- Timeline: after bab40b9.
- Reproduction: consumed 10-135 cannot replay; offline wrapper grammar only.

## Current Focus

- hypothesis: raw square brackets in prose/markdown outside the unique object are treated as JSON structure even when they do not form a valid JSON value.
- test: distinguish parseable balanced external JSON values from inert prose punctuation using a bounded string-aware scanner.
- expecting: ignore inert brackets while rejecting any second valid JSON array/object, multiple candidate, truncation or ambiguous balanced structure.
- next_action: build hostile wrapper grammar tests

## Evidence

- timestamp: 2026-09-17T14:17:47+10:00
  observation: three bounded wrapper cases with unmatched prose square brackets failed with structural_context while all existing unsafe structural cases remained rejected
  implication: the failure was caused by unconditional bracket classification before semantic structure analysis
- timestamp: 2026-09-17T14:18:42+10:00
  observation: string-aware bounded bracket classification passed 59 focused provider tests, including valid arrays, balanced malformed fragments, JSON-like truncation, multiple objects, root-shape and prototype-key rejection
  implication: inert unmatched prose punctuation can be distinguished without weakening structural ambiguity rejection
- timestamp: 2026-09-17T14:19:04+10:00
  observation: full provider-disabled suite passed 717 tests; TypeScript build and git diff check passed
  implication: the fix is compatible with the full offline contract and introduces no formatting defect


## Eliminated

- hypothesis: accepting arbitrary balanced prose brackets is safe
  evidence: balanced malformed fragments remain structurally ambiguous and are explicitly rejected
- hypothesis: accepting any unmatched array opener is safe
  evidence: JSON-value-like openers and openers containing a candidate object can represent truncation and remain rejected


## Resolution

- root_cause: extractSingleJsonObject treated every square bracket outside the candidate object as structural JSON, including unmatched prose punctuation that could not form a JSON value.
- fix: classify external square brackets with a bounded string-aware scanner; reject balanced, mismatched, JSON-like truncated, and JSON-ending fragments while ignoring only clearly inert unmatched prose brackets.
- verification: 59 focused provider tests, 717 full provider-disabled tests, TypeScript build, and git diff check passed; no provider, network, credential, Docker, or GitHub Actions operation ran.
- files_changed: src/providers/deepseek.ts, tests/providers/deepseek.test.ts
