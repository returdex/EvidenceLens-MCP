---
status: resolved
trigger: "Plan 10-130 diagnosed provider-json-object-structural-context with JSON mode already enabled"
---

# Debug Session: json-structural-context-shape

## Symptoms

- Expected behavior: JSON mode returns one strict findings object, optionally in a safe non-structural wrapper.
- Actual behavior: authenticated diagnostic identifies structural_context outside the unique candidate object.
- Error messages: provider-json-object-structural-context.
- Timeline: after balanced extraction and allowlist fixes.
- Reproduction: consumed 10-130 cannot replay; offline parser shapes only.

## Current Focus

- hypothesis: response is an exact singleton array wrapper around the findings object, or reasoning/wrapper text contains brackets; current category conflates safe provable singleton wrapping with ambiguous extra structure.
- test: distinguish exact full-document singleton-array-of-one-findings-object from all other prefix/suffix/nested/multiple structural contexts.
- expecting: accept only if the complete parsed root is an array of length one whose sole member has exactly findings; otherwise retain fail-closed rejection and precise safe category.
- next_action: audit and test exact structural root shapes

## Evidence

- timestamp: 2026-09-17T13:47:31+10:00
  observation: Exact whole-document JSON parsing can prove a singleton array contains exactly one strict findings root without scanning or inferring response text.
  implication: The compatibility rule can be limited to JSON.parse success, array length one, and the existing exact-root validator.
- timestamp: 2026-09-17T13:47:32+10:00
  observation: Focused provider tests passed 48/48, including hostile prose brackets, array-plus-prose, multiple members, nested arrays, primitive members, extra keys, prototype-pollution keys, fenced arrays, and truncation.
  implication: All non-exact structural contexts remain rejected with sanitized diagnostics.
- timestamp: 2026-09-17T13:47:48+10:00
  observation: Complete provider-disabled suite passed 705/705; TypeScript build and git diff --check passed.
  implication: The narrow parser change introduces no observed offline regression.


## Eliminated

- hypothesis: Accepting fenced singleton arrays is necessary.
  reason: It is not required for the proven full-document shape and would broaden structural wrapper parsing; fenced arrays remain structural_context.
- hypothesis: Any array containing one candidate object is safe.
  reason: Arrays with prose, extra members, nesting, trailing structure, or malformed/truncated structure cannot prove the exact singleton-root contract and remain rejected.


## Resolution

- root_cause: The parser only accepted an exact findings object at the full-document root, so a provably unambiguous full-document singleton array was collapsed into the same structural_context class as unsafe wrappers.
- fix: Accept only JSON.parse-complete documents whose root is an array of length one and whose sole member passes the existing exact findings-root key check; preserve every bounded-wrapper and ambiguous structural rejection.
- verification: Focused tests 48/48; complete provider-disabled suite 705/705; TypeScript build and git diff --check passed; no provider, network, credential, Docker, GitHub Actions, push, dispatch, or 10-130 replay occurred.
- files_changed: src/providers/deepseek.ts; tests/providers/deepseek.test.ts
