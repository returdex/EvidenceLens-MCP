---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: active
stopped_at: Completed 09-02-PLAN.md; awaiting Phase 09 verifier
last_updated: "2026-09-02T18:16:31.093Z"
progress:
  total_phases: 11
  completed_phases: 8
  total_plans: 21
  completed_plans: 21
  percent: 73
---

# EvidenceLens MCP — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-08-22)

**Core value:** Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.
**Current focus:** Phase 09 — public-provider-attribution-and-determinism-contract

**Version:** 0.1.3
**Release policy:** See `DEVELOPMENT.md`; milestone changes increment `y`, completed features/fixes increment `z`, and `x` requires explicit human confirmation.

## Current Position

Phase: 09 (public-provider-attribution-and-determinism-contract) — IMPLEMENTATION COMPLETE, AWAITING VERIFICATION
Plan: 2 of 2

- Phase: 9 of 11
- Status: Gap-closure implementation complete; phase verifier pending
- Progress: 73%
- Last activity: Executed all 09-02 tasks with focused/full tests, build, and scope checks passing

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

## Session Continuity

- **Last session:** 2026-09-02T18:16:31.088Z
- **Stopped at:** Completed 09-02-PLAN.md; awaiting Phase 09 verifier
- **Resume file:** None

## Next Action

Run the Phase 09 verifier before marking the phase complete or advancing to Phase 10.

---
*Last updated: 2026-09-03 after Phase 09 gap-closure implementation; verifier pending*
