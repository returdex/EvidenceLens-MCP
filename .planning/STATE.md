---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready_to_execute
stopped_at: Phase 10 gap plans 10-38 through 10-52 created and verified
last_updated: "2026-09-13T16:30:15.401Z"
progress:
  total_phases: 11
  completed_phases: 9
  total_plans: 88
  completed_plans: 79
  percent: 90
---

# EvidenceLens MCP — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-08-22)

**Core value:** Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.
**Current focus:** Phase 10 — fail-closed-provider-startup-and-credentialed-mcp-e2e

**Version:** 0.1.3
**Release policy:** See `DEVELOPMENT.md`; milestone changes increment `y`, completed features/fixes increment `z`, and `x` requires explicit human confirmation.

## Current Position

Phase: 10 (fail-closed-provider-startup-and-credentialed-mcp-e2e) — EXECUTING
Plan: 1 of 60

- Phase: 10 of 11
- Status: 15 independently verified gap-closure plans are ready; automatic execution and proof authority remain incomplete until execution
- Progress: 37 of 52 Phase 10 plans complete; plans 10-38 through 10-52 pending
- Last activity: Planned lifecycle, production diagnostics, transport-bound request accounting, strict proof authority, and automatic final proof closure

## Decisions and Assumptions

### Decisions

- Greenfield repository; no existing implementation was detected.
- Standard phase granularity and sequential execution are configured.
- Planning documents are tracked in Git.
- Domain research is deferred because the supplied project brief already establishes the initial architecture direction; phase planning should validate concrete library/API choices against current official documentation.
- GitHub target is the public `returdex/EvidenceLens-MCP` repository under the MIT License.
- Every intentional modification is expected to be committed and pushed; milestone completion and post-milestone fixes require a GitHub Release.
- Use `@modelcontextprotocol/server` v2 split package with `serveStdio` and `McpServer`.
- Use strict Zod v4 schemas as the Phase 1 runtime validation and TypeScript contract source.
- Use SDK in-memory transport tests to prove MCP `initialize`, `tools/list`, and `tools/call` behavior.
- Keep `response.requestId = request.reviewId` explicit and deterministic.
- Use a fixed `generatedAt` timestamp so skeleton tool output is deterministic.
- Require lowercase SHA-256 hashes and explicit extraction metadata for normalized evidence provenance.
- Use strict discriminated reference objects and bounded visual payload descriptors without raw content.
- Use PDF.js 6.2.108 with @napi-rs/canvas for explicit-byte PDF parsing and scanned-page rendering.
- Avoid the archived image-size dependency; parse bounded PNG/JPEG headers directly.
- Extend visualPayload with bounded base64 bytes so scanned-page success never becomes metadata-only.
- [Phase 02]: Keep reference opaque and derive inline identity only for explicit content without a reference; never read paths from requests.
- [Phase 02]: Allow line-oriented text/table content while rejecting unsafe control characters, and enforce decoded byte caps before parser fan-out.
- [Phase 02]: Return normalized evidence metadata only; findings, provider calls, filesystem access, writes, and review orchestration remain out of scope.
- [Phase 03]: Keep filesystem as an optional source object and reject ambiguity with inline content, while preserving opaque reference semantics.
- [Phase 03]: Use the exact id=absolute-path comma/semicolon grammar with no escaping and stable sanitized configuration errors.
- [Phase 03]: Canonicalize configured roots and candidate targets, then use segment-aware relative containment so escaping symlinks are denied.
- [Phase 03]: Use dependency-injected filesystem primitives for deterministic read-boundary tests. — This makes authorization ordering and substitution races reproducible without global filesystem patching.
- [Phase 03]: Validate canonical target and descriptor identity before and after bounded reads; discard mismatches. — This prevents symlink and TOCTOU substitutions from returning bytes outside the authorized identity.
- [Phase 03]: Normalize client-visible errors to stable generic messages by code. — This suppresses filesystem paths, secrets, errno details, and stack-like content at the response boundary.
- [Phase 03]: Use an empty filesystem policy when EVIDENCELENS_ALLOWED_ROOTS is unset or empty; explicit inline content remains available.
- [Phase 03]: Derive client-visible filesystem provenance from the authorized canonical relative path, never from the absolute root or opaque caller reference.
- [Phase 03]: Pass the fixed response timestamp into all normalizers so direct and MCP responses remain deterministic.
- [Phase 04]: Use deterministic-rules/1.0.0 as provider-independent analyzer identity; defer provider/model fields to Phase 5.
- [Phase 04]: Bind citations to normalized evidence hashes, source references, typed locations, and retained visual payloads.
- [Phase 04]: Keep normalizeEvidenceItems backward-compatible while exposing normalizeEvidenceBundle for the paired transient analysis handoff.
- [Phase 04]: Use deterministic-rules/1.0.0 with fixed precedence for requirement conflicts, solution contradictions, and omissions; provider/model identity remains deferred to Phase 5.
- [Phase 04]: Clear transient bytes, text, and table cells in orchestrateReview finally handling after analysis.
- [Phase 04]: Integrate review_evidence as parse, duplicate-id gate, required-role gate, authorized normalization, deterministic analysis, schema validation, and sanitized error pipeline.
- [Phase 04]: Expose deterministic-rules/1.0.0 analyzer identity only; defer provider/model version fields to Phase 5.
- [Phase 04]: Keep analyzer request-scoped and pathless: authorized bounded payloads are cleared after analysis and filesystem paths are never reopened.
- [Phase 06]: Keep routine Docker smoke and semantic E2E credential-free; reserve DeepSeek for the explicit real client. — Routine validation must not send external requests or incur provider cost.
- [Phase 06]: Preserve complete normalized image and PDF citation locations across the provider adapter. — Provider findings must remain compatible with the public citation schema.
- [Phase 09]: Expose only metadata.provider.name and metadata.provider.model when validated provider findings are public. — Preserves deterministic-only response bytes and minimizes disclosure.
- [Phase 09]: Bind provider, model, prompt version, and input fingerprint to the provider request before projection. — Prevents provider-result spoofing and request substitution.
- [Phase 09]: Reserve byte-for-byte equality for deterministic-only offline results. — Provider-backed prose may vary while schema, attribution, namespacing, and local provenance remain guaranteed.
- [Phase 09]: Validate local deterministic output before provider translation, provider-owned projection inside its own boundary, and the final merged response outside that boundary.
- [Phase 09]: Treat every configured-provider return as unknown and cap modelFindings and deterministicFindings independently at 100 entries.
- [Phase 09]: Lock deterministic behavior with complete raw MCP bytes plus a separately hand-maintained ordered finding projection.
- [Phase 09]: Validate PDF visual provenance in both citation and full-response schemas against the retained payload for the cited page. — This prevents non-visual hashes and cross-page claims.
- [Phase 09]: Translate analyzer throws at the analyzer seam and keep provider result parsing, identity, namespacing, metadata, and provider-only projection inside one sanitized provider-owned boundary. — Failure codes now identify the responsible subsystem without leaking thrown details.
- [Phase 09]: Exercise provider attribution grammar from a valid provider-backed response with synchronized provider finding namespaces. — Each invalid candidate now fails its intended child grammar.
- [Phase 09]: Use a bounded exact-token provider projection guard — Reject current fingerprint and prompt-version substrings without claiming transformed or unknown secret detection.
- [Phase 09]: Bind trusted cleanup before analyzer invocation — Analyzer replacement cannot run, and cleanup faults cannot mask pending source-specific failures.
- [Phase 09]: Use executable direct-schema provenance and documentation fixtures — Tests reach the intended PDF refinement and parse the published success response.
- [Phase 09]: Validate provider-only provenance before scanning only provider-authored ID/prose/follow-up strings. — Prevents private-token leakage without rejecting locally bound evidence and citation values.
- [Phase 09]: Build and freeze provider requests before running a deep-isolated analyzer view; publish analyzer identity only from deterministic-rules/1.0.0. — Prevents injected analyzer getters and mutations from changing provider input, fingerprints, provenance, or public identity.
- [Phase 09]: Best-effort cleanup traverses all captured payload, cell, and buffer references before reporting its first fault, while pending errors retain precedence. — Ensures transient data is erased as completely as possible without misclassifying earlier failures.
- [Phase 09]: Project production ProviderConfig into a fresh strict three-field inference object before fingerprinting and freezing.
- [Phase 09]: Register original and isolated cleanup before provider setup and preserve pending subsystem errors over cleanup faults.
- [Phase 09]: Deep-copy and freeze validated analyzer findings as the sole collision and merge source.
- [Phase 09]: Reject the entire provider result for unknown or private extra fields.
- [Phase 09]: Snapshot filesystem dependencies only for normalization, then snapshot provider, providerConfig, and analyzer once after both cleanup closures are registered.
- [Phase 09]: Reject provider results unless reflective preflight proves exactly six enumerable own string keys on a plain/null-prototype non-Proxy object before Zod parsing.
- [Phase 09]: Regression-lock best-effort cleanup continuation across claim, token, top-array, payload, cell, and buffer targets while preserving earlier-error precedence.
- [Phase 10]: Only literal EVIDENCELENS_DISABLE_PROVIDER=1 disables automatic provider loading; explicit provider and typed providerConfig retain precedence. — Invalid ambient configuration must never silently downgrade provider-enabled startup.
- [Phase 10]: Use a host-only Compose interpolation placeholder and explicitly blank container credentials for missing-key startup checks. — Inactive Compose profiles still interpolate required variables, while the container must receive a genuinely absent key.
- [Phase 10]: Harness diagnostics expose only seven stable categories and never interpolate external details.
- [Phase 10]: A credentialed timeout remains a visible non-pass; it is never converted to offline success or skip.
- [Phase 10]: Adapter-only Vision verification accepts environment or ignored local config; complete credentialed proof requires Docker and a process-level key. — The two commands exercise different boundaries and must not be conflated.
- [Phase 10]: Phase 7 remains gaps_found because the authorized Docker MCP run returned a sanitized timeout non-pass. — Executed failure evidence cannot support a passed PROV-01 claim.
- [Phase 10]: Construct one validated McpServer before serveStdio, then expose that instance through the SDK-required factory contract. — This closes lazy provider validation while retaining compatibility with the installed factory-only stdio API.
- [Phase 10]: Sanitize only PROVIDER_CONFIGURATION at the executable boundary while preserving main() rejection and unrelated-error behavior. — This prevents configuration disclosure without masking programming or transport failures.
- [Phase 10]: Treat an own DEEPSEEK_API_KEY environment property as supplied even when blank or undefined. — Validation must reject defective supplied values instead of allowing the live test to skip.
- [Phase 10]: Probe local credential source presence with lstat metadata only; only ENOENT means absence. — The skip gate must not read configuration content or conceal filesystem probe defects.
- [Phase 10]: Resolve the Docker proof expected provider model from the resolved Compose review service and retain only the validated model string.
- [Phase 10]: Collapse malformed envelopes, schema failures, attribution drift, and provenance inconsistencies into the redacted protocol category.
- [Phase 10]: Budget live tools/call as one provider timeout plus a fixed 30000ms Docker/MCP margin, with retries forced to zero.
- [Phase 10]: Keep PROV-01 open because the separately authorized single live execution returned a sanitized protocol non-pass.
- [Phase 10]: Apply integer validation only to timeoutMs, maxRetries, maxTotalWaitMs, and maxTokens while preserving fractional temperature. — Integral controls affect retry and request budgets; temperature intentionally remains fractional.
- [Phase 10]: Emit Docker proof success only after code 0 with no signal — Prevents a structurally valid response followed by abnormal child termination from becoming retained success evidence.
- [Phase 10]: Accept retained proof success only for exactly four fixtures and a positive JavaScript safe-integer finding count. — Prevents impossible or overflow-like evidence from closing PROV-01.
- [Phase 10]: Preserve the live producer's plural findings token for both one and multiple findings. — Keeps the audit aligned with the exact current production grammar.
- [Phase 10]: Keep Phase 7 gaps_found and PROV-01 open because the newly authorized single live execution returned a sanitized protocol non-pass. — A protocol non-pass cannot establish the complete credentialed Docker MCP structural proof.
- [Phase 10]: Bound pending Docker MCP stdout events at eight and consume accepted FIFO events before non-overflow terminal state. — This preserves wire order without allowing untrusted stdout to grow memory without limit.
- [Phase 10]: Keep Phase 7 gaps_found and PROV-01 open because the freshly authorized post-parser-fix execution returned a sanitized protocol non-pass. — A protocol non-pass cannot establish the complete credentialed Docker MCP structural proof.
- [Phase 10]: Treat matching-id malformed responses as sanitized method failures while unrelated notifications remain bounded by one absolute deadline.
- [Phase 10]: Validate negotiated initialize metadata before sending an id-less notifications/initialized message and beginning normal MCP operations.
- [Phase 10]: Keep Phase 7 gaps_found and PROV-01 open because the freshly authorized corrected-lifecycle execution returned a sanitized protocol non-pass.

### Blockers

- PROV-01 complete credentialed Docker MCP structural proof remains unverified after the newest separately authorized sanitized protocol non-pass.

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files | Completed |
|-------|------|----------|-------|-------|-----------|
| 02 | 01 | 4 min | 2 | 5 | 2026-08-22 |
| Phase 02 P02 | 4 min | 3 tasks | 8 files |
| Phase 02 P03 | 10 min | 3 tasks | 9 files |
| Phase 02 P04 | 12 min | 3 tasks | 8 files |
| Phase 03 P01 | 4 min | 2 tasks | 4 files |
| Phase 03 P02 | 4 min | 2 tasks | 3 files |
| Phase 03 P03 | 8 min | 3 tasks | 8 files |
| Phase 04 P01 | 4 min | 2 tasks | 7 files |
| Phase 04 P02 | 12 min | 2 tasks | 5 files |
| Phase 04 P03 | 6 min | 2 tasks | 6 files |
| Phase 06 P02 | 11min | 2 tasks | 9 files |
| Phase 09 P01 | 8 min | 3 tasks | 8 files |
| Phase 09 P02 | 7 min | 3 tasks | 7 files |
| Phase 09 P03 | 8 min | 3 tasks | 5 files |
| Phase 09 P04 | 8 min | 3 tasks | 4 files |
| Phase 09 P05 | 10 min | 3 tasks | 5 files |
| Phase 09 P06 | 10 min | 3 tasks | 7 files |
| Phase 09 P07 | 10 min | 3 tasks | 6 files |
| Phase 10 P01 | 6h 7m | 3 tasks | 9 files |
| Phase 10 P02 | 5 min | 2 tasks | 2 files |
| Phase 10 P03 | 3 min | 2 tasks | 7 files |
| Phase 10 P04 | 2 min | 2 tasks | 2 files |
| Phase 10 P05 | 2min | 2 tasks | 3 files |
| Phase 10 P06 | 2min | 2 tasks | 2 files |
| Phase 10 P07 | 20min | 3 tasks | 6 files | 2026-09-07 |
| Phase 10 P08 | 2min | 2 tasks | 2 files |
| Phase 10 P09 | 3min | 2 tasks | 2 files |
| Phase 10 P10 | 2min | 2 tasks | 2 files |
| Phase 10 P11 | 4min | 3 tasks | 2 files |
| Phase 10 P12 | 5min | 2 tasks | 2 files |
| Phase 10 P13 | 4min | 3 tasks | 2 files |
| Phase 10 P14 | 4min | 2 tasks | 2 files | 2026-09-07 |
| Phase 10 P15 | 4min | 3 tasks | 3 files | 2026-09-07 |
| Phase 10 P16 | 4min | 2 tasks | - | 2026-09-13 |
| Phase 10 P17 | 3min | 2 tasks | - | 2026-09-13 |
| Phase 10 P18 | 6min | 2 tasks | - | 2026-09-13 |
| Phase 10 P19 | 4min | 2 tasks | - | 2026-09-13 |
| Phase 10 P20 | 7min | 2 tasks | - | 2026-09-13 |
| Phase 10 P21 | 6min | 2 tasks | - | 2026-09-13 |
| Phase 10 P22 | 6min | 2 tasks | - | 2026-09-13 |
| Phase 10 P23 | 10min active | 3 tasks | - | 2026-09-13 |

## Session Continuity

- **Last session:** 2026-09-13T08:30:00Z
- **Stopped at:** Phase 10 gap plans 10-38 through 10-52 created and verified
- **Resume file:** None

## Next Action

Re-plan Phase 10 gaps before any further paid proof; Phase 7 and PROV-01 remain open until a successful audited live proof.

---
*Last updated: 2026-09-07 after Phase 10 Plan 15 execution*
