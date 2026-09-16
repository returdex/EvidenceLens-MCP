---
status: resolved
trigger: "Plan 10-120 repeated provider-json-object-extraction after balanced unique-object parser fix"
---

# Debug Session: json-extraction-shape-diagnostic

## Symptoms

- Expected behavior: bounded balanced parser accepts a uniquely wrapped findings object or reports a precise safe failure shape.
- Actual behavior: real response still maps to broad provider-json-object-extraction after one send.
- Error messages: provider-json-object-extraction.
- Timeline: persists after e91d3ac unique balanced scan.
- Reproduction: consumed 10-120 cannot replay; use offline parser inputs and shape-only diagnostics.

## Current Focus

reasoning_checkpoint:
  hypothesis: "extractSingleJsonObject returns only undefined for every rejected shape, so parseDrafts necessarily emits the same provider/content/object invalid_format feature for no candidate, multiple candidates, unbalanced input, wrong root, malformed JSON, and structural context."
  confirming_evidence:
    - "The implementation has one combined `if (...) return undefined` and parseDrafts has one terminal invalidResponse(... invalid_format) site."
    - "Existing hostile tests assert only one feature, not its shape, so the collapse is not detected offline."
  falsification_test: "Table-driven hostile inputs produce distinct closed features before any implementation change."
  fix_rationale: "Return an internal closed extraction result union and emit only its constant category; this changes observability, not parsing acceptance."
  blind_spots: "The consumed real response is unavailable by policy, so the next live generation—not this offline fix—must identify which category actually occurred."
hypothesis: all extraction failures are collapsed because the parser discards its internally observable failure shape.
test: assert distinct constant diagnostics for a table of no-candidate, multiple, unbalanced, wrong-root, malformed, and structural-context inputs.
expecting: tests initially demonstrate the common invalid_format feature; after the minimal fix each shape has one registered content-free feature.
next_action: archive the resolved session and report the implementation commit

## Evidence

- checked: production parser and diagnostic call site at e91d3ac
  found: all six distinguishable rejection shapes were converted to `undefined`, followed by one `invalid_format` feature
  implication: authenticated live evidence could not distinguish shape even though the bounded scanner already observed it
- checked: focused DeepSeek and diagnostic-registry tests after the fix
  found: 152/152 pass; accepted direct/wrapped/nested-string objects remain accepted and hostile cases retain rejection with one constant allowlisted feature
  implication: observability is refined without broadening parser acceptance
- checked: complete provider-disabled suite, TypeScript build, and diff hygiene
  found: 681/681 tests pass; build and git diff --check pass
  implication: the closed taxonomy integrates without regression or external effects


## Eliminated


## Resolution

- root_cause: The bounded scanner preserved only success versus undefined, discarding closed structural failure state before the authenticated diagnostic sink.
- fix: Return a closed internal result union and register six content-free extraction features: no candidate, multiple candidates, unbalanced, wrong root, structural context, and malformed JSON; retain the existing separate oversize feature.
- verification: Focused tests 152/152, complete provider-disabled suite 681/681, TypeScript build, and git diff --check pass; no provider, network, credential, Docker, or GitHub Actions execution occurred.
- files_changed: [src/providers/deepseek.ts, scripts/docker-review-real.mjs, tests/providers/deepseek.test.ts]
