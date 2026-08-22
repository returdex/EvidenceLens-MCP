---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready_to_execute
stopped_at: Completed 03-03-PLAN.md
last_updated: "2026-08-22T13:04:20.012Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 9
  completed_plans: 9
  percent: 100
---

# EvidenceLens MCP — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-08-22)

**Core value:** Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.
**Current focus:** Phase 3 — Read-Only Filesystem Boundary

**Version:** 0.1.1
**Release policy:** See `DEVELOPMENT.md`; milestone changes increment `y`, completed features/fixes increment `z`, and `x` requires explicit human confirmation.

## Current Position

Phase: 3 (Read-Only Filesystem Boundary) — EXECUTING
Plan: 3 of 3

- Phase: 3 of 6
- Status: Ready for phase execution
- Progress: [█████████░] 89%
- Last activity: Completed 03-02-PLAN.md

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

## Session Continuity

- **Last session:** 2026-08-22T13:04:19.859Z
- **Stopped at:** Completed 03-03-PLAN.md
- **Resume file:** None

## Next Action

Run `$gsd-execute-phase 3` to implement the read-only filesystem boundary.

---
*Last updated: 2026-08-22 after Phase 02 completion*
