---
status: resolved
trigger: "provider-finding-draft-malformed"
created: 2026-09-22
updated: 2026-09-22
---

# Debug Session: Provider finding draft malformed

## Symptoms

- **Expected behavior:** A direct DeepSeek live adapter request returns a complete JSON object whose findings pass the strict local draft schema and provenance validation.
- **Actual behavior:** The single response was decoded and parsed as JSON, then rejected by `providerFindingDraftSchema.safeParse(draft)` in `src/providers/provenance.ts`.
- **Error messages:** `Provider response is invalid`; `ProviderValidationError` at `src/providers/provenance.ts:135`.
- **Timeline:** Began after removing the default `max_tokens` request field and completing the pre-live offline batch fixes. The earlier `provider-json-object-unbalanced` failure did not recur.
- **Reproduction:** With local config mode `0600`, no `maxTokens`, and `maxRetries: 0`, run `env -u DEEPSEEK_API_KEY npx vitest run tests/providers/deepseek-live.test.ts`. One paid request has already been consumed; do not reproduce again until offline evidence narrows the cause.

## Current Focus

- **hypothesis:** Prompt/schema contract drift allowed the provider to return a syntactically valid finding that omitted or changed a strict local requirement; the live test then discarded the adapter's content-free field diagnostic because it supplied no diagnostic sink.
- **test:** Inspect prompt/schema alignment, diagnostic plumbing, and synthetic response fixtures without network access.
- **expecting:** Identify the exact class of schema mismatch or add content-free field-level diagnostics that will make a later single live request conclusive.
- **next_action:** A later single live request may verify the corrected contract; it is intentionally outside this offline debug session.
- **reasoning_checkpoint:** Preserve fail-closed validation and do not retain or expose provider content or credentials.
- **tdd_checkpoint:** TDD mode is disabled; add regression tests before or alongside any fix.

## Evidence

- timestamp: 2026-09-22
  observation: One real request completed JSON decoding and extraction, then failed at strict finding-draft validation.
  implication: Transport, response-envelope decoding, and balanced-object extraction are no longer the immediate blocker.
- timestamp: 2026-09-22
  observation: The v2 prompt specified output size limits and citation constraints but did not enumerate the exact required finding keys, allowed enum values, or the schema requirement that followUpChecks, evidenceIds, and citations are non-empty.
  implication: A provider could follow the written prompt and still be rejected by the local strict schema.
- timestamp: 2026-09-22
  observation: tests/providers/deepseek-live.test.ts constructed the provider without a DiagnosticSink, while validateProviderFinding already emits a content-free schema feature before throwing.
  implication: The first paid request produced a useful safe failure class, but the live test discarded it.
- timestamp: 2026-09-22
  observation: The provider boundary does not assess whether a finding is substantively true; it validates the existing ReviewFinding interchange shape and binds citations to supplied evidence for routing and traceability.
  implication: Loosening only the adapter would require inventing semantic defaults or redesigning the public response contract, so the narrow correction is prompt/schema alignment rather than provider-content adjudication.
- timestamp: 2026-09-22
  observation: Six synthetic mismatch classes produced bounded content-free diagnostics, and all 785 offline tests plus the TypeScript build passed without running the live test.
  implication: The corrected prompt and diagnostic plumbing are compatible with the complete offline contract suite.

## Eliminated

- hypothesis: The current failure is another unbalanced JSON response.
  evidence: The response reached `providerFindingDraftSchema.safeParse(draft)`.

## Resolution

- **root_cause:** The v2 provider prompt under-specified the strict ReviewFinding interchange schema, and the direct live test omitted the diagnostic sink that would have preserved the safe schema-failure category.
- **fix:** Versioned the prompt contract to v3, enumerated its exact required keys, enums, non-empty arrays, bounds, citation/evidence correlation, and added a content-free diagnostic to the live test failure path.
- **verification:** 99 focused DeepSeek adapter tests, 13 adjacent provider tests, TypeScript build, and the complete 785-test offline suite passed; no provider, Docker, or GitHub Actions call was made.
- **files_changed:** src/providers/deepseek.ts; src/providers/types.ts; tests/providers/deepseek.test.ts; tests/providers/deepseek-live.test.ts; .planning/debug/provider-finding-draft-malformed.md
