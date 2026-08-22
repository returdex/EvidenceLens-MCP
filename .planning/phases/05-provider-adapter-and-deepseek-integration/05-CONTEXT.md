# Phase 5: Provider Adapter and DeepSeek Integration - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate DeepSeek as the first model provider behind a stable internal adapter while preserving the existing MCP request and response schemas. The provider must support DeepSeek's OpenAI-compatible multimodal API, controlled configuration, structured model findings, bounded retries, and auditable input/output provenance. Other providers are not implemented in this phase, but the adapter boundary must allow later substitution.

</domain>

<decisions>
## Implementation Decisions

### Provider input and output boundary
- Define a stable internal `ReviewProvider` interface and an independent provider request DTO; do not pass internal `ReviewAnalysisInput` directly to a provider.
- The DTO contains the normalized role-labeled evidence package, text/table claims, bounded visual payloads, review objective, fixed system prompt version, and input fingerprint.
- Use DeepSeek's OpenAI-compatible Chat Completions multimodal content blocks. The default model is `deepseek-v4-flash-vision-exp`; local image bytes should be sent as bounded base64 data URLs rather than uploaded to persistent Files API storage.
- DeepSeek returns a JSON findings draft using JSON Output. Local code remains responsible for schema validation, bounds, evidence IDs, citation locations, role binding, hashes, and provenance; model output is never accepted as the final MCP response without validation.
- Preserve DeepSeek findings and `deterministic-rules` findings as separate result sets. Neither is a ground-truth answer. Future multi-model comparison must compare independent opinions, consensus, disagreements, and uncertainty rather than force output equality.
- Keep deterministic local analysis as an independently labeled heuristic/baseline only; it must not overwrite, silently replace, or adjudicate DeepSeek findings.

### Controlled and reproducible inputs
- Keep the normalized evidence bytes, role mapping, ordering, prompt version, objective, model ID, and inference parameters stable and auditable for cross-model comparison.
- Record an input fingerprint and provider/model metadata with each provider result. Output text is expected to vary; tests must not require identical natural-language wording.

### Configuration and credentials
- Use a project-local configuration file for the DeepSeek API key and settings, with a concrete local filename to be selected during planning (for example `.evidencelens.local.json`).
- The local configuration file is ignored by Git and never committed. Commit a redacted example configuration file only.
- Default settings are `baseUrl=https://api.deepseek.com` and model `deepseek-v4-flash-vision-exp`.
- Permit only the allowlisted models `deepseek-v4-flash-vision-exp`, `deepseek-v4-flash`, and `deepseek-v4-pro`; reject unknown model IDs.
- If configuration sources conflict, fail closed with a clear configuration error rather than silently choosing one. Do not put secrets into MCP requests or planning documents.

### Provider failure behavior
- Retry only transient rate-limit/server/network/timeout failures: HTTP 429, 5xx, connection failures, and timeouts.
- Do at most two retries with jittered exponential backoff, a per-request timeout, and a total wait bound.
- Do not retry authentication, balance, authorization, request-format, or parameter errors such as 400, 401, 402, 403, and 422.
- Return stable local provider error codes, retryability, retry count, and request ID. Never expose API keys, complete upstream URLs, raw response bodies, or stack traces.
- If DeepSeek returns HTTP 200 but malformed JSON, invalid findings, or citations that fail local provenance validation, return `PROVIDER_INVALID_RESPONSE`; do not guess, partially parse, silently fall back, or present deterministic output as the model result.

### Tests and replacement
- Register only DeepSeek at runtime in this phase, while keeping the internal interface replaceable; do not support arbitrary npm-module provider loading.
- Tests should directly call the real DeepSeek API by default, using repository fixtures that are small, fixed, and non-sensitive. The test suite therefore requires a local API key, network access, and may incur API cost.
- Real API assertions should check request/API success, response structure, findings schema, evidence/citation provenance binding, model metadata, and expected finding categories—not exact natural-language snapshots.

### the agent's Discretion
- Exact provider interface method names and DTO type names.
- Exact local configuration filename and validation library usage.
- Exact prompt wording, bounded serialization layout, retry delay values within the chosen limits, and HTTP client implementation.
- Whether provider metadata is represented as an extension field in the internal result or a dedicated provider result envelope, provided the MCP contract remains unchanged.

</decisions>

<specifics>
## Specific Ideas

- The official DeepSeek Vision documentation identifies the multimodal model as `deepseek-v4-flash-vision-exp`, not the text-only `deepseek-v4-flash`, and documents OpenAI-compatible content block arrays with `image_url`, base64 data URLs, public URLs, and Files API options.
- Cross-model comparison requires controlled inputs, not identical outputs: same evidence bytes, roles, prompt version, objective, model settings, and recorded fingerprint.
- The user's intended workflow is independent second opinions from multiple models; no canonical answer or model is treated as truth.

</specifics>

<canonical_refs>
## Canonical References

### Project and phase requirements
- `.planning/PROJECT.md` — project purpose, provider-adapter decision, multimodality, safety, and traceability constraints.
- `.planning/REQUIREMENTS.md` — PROV-01 and PROV-02 acceptance requirements and v1 traceability.
- `.planning/ROADMAP.md` § Phase 5 — fixed phase goal and success criteria.
- `docs/mcp-contract.md` — existing MCP request/response contract, normalized evidence, findings, provenance, and no-contract-change constraint.

### Existing implementation
- `src/tools/review.ts` — current MCP handler and deterministic response construction; provider integration point.
- `src/review/analysis.ts` — normalized analysis input and transient payload boundary.
- `src/review/engine.ts` — current deterministic heuristic analyzer; its findings must remain distinguishable from model findings.
- `src/contracts/review.ts` — response schemas and citation/provenance validation that provider results must satisfy.
- `src/evidence/index.ts` — bounded evidence normalization and visual payload handoff.
- `src/server.ts` — MCP server registration and version identity.

### Official DeepSeek documentation
- `https://api-docs.deepseek.com/zh-cn/guides/vision` — official multimodal `deepseek-v4-flash-vision-exp` model, OpenAI-compatible image content blocks, supported image transfer methods, detail controls, and limits.
- `https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/` — official Chat Completions request/response format and model parameters.
- `https://api-docs.deepseek.com/zh-cn/guides/json_mode/` — official JSON Output requirements and caveats.
- `https://api-docs.deepseek.com/zh-cn/quick_start/error_codes/` — official transient and non-transient API error categories.
- `https://api-docs.deepseek.com/zh-cn/quick_start/rate_limit/` — official rate-limit behavior and concurrency guidance.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `reviewRequestSchema` / `reviewResponseSchema` already enforce stable MCP contracts and strict citation provenance.
- `normalizeEvidenceBundle` already produces bounded normalized evidence and visual payload metadata from the same authorized bytes.
- `buildReviewAnalysisInput` already creates request-scoped claims and citation resolution inputs.
- `toToolErrorResult` and `EvidenceLensError` provide the existing sanitized MCP error path.

### Established Patterns
- Evidence IDs, roles, hashes, typed locations, and deterministic generated metadata are validated locally.
- Filesystem reads are authorized and read-only; provider code must receive bounded payloads and never receive a filesystem path or read adapter.
- Existing tests use Vitest and strict TypeScript builds; new live-provider tests must avoid asserting exact model prose.

### Integration Points
- Add provider orchestration between normalized analysis input creation and final `ReviewResponse` validation in `src/tools/review.ts` or a dedicated provider module.
- Keep the MCP tool name, request schema, response schema, and read-only annotations unchanged.
- Add configuration parsing and provider error mapping without exposing credentials or changing the public MCP contract.

</code_context>

<deferred>
## Deferred Ideas

- Runtime registration of additional hosted or local providers — later phase or milestone.
- Multi-model consensus/disagreement aggregation — later review-comparison phase.
- Persistent Files API upload/caching — not selected for this phase; local inline data URLs are preferred initially.

</deferred>

---

*Phase: 05-provider-adapter-and-deepseek-integration*
*Context gathered: 2026-08-23*
