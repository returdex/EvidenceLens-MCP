# EvidenceLens MCP

## What This Is

EvidenceLens MCP is a shipped multimodal second-review service for Codex and other MCP clients. It gives an external model controlled, read-only access to local evidence—text, PDFs, images, screenshots, and tables—then returns structured, traceable findings about omissions, conflicts, and evidence quality.

The service supports deterministic offline review and a replaceable DeepSeek provider path. Docker deployment, strict provenance, sanitized failures, and a no-follow Linux filesystem boundary are part of the verified v1.0 product contract.

## Core Value

Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.

## Requirements

### Validated

- ✓ MCP discovery, invocation, stable JSON results, documented inputs, limits, evidence types, and error semantics — v1.0 (`MCP-01` to `MCP-03`).
- ✓ Text, PDF, image, screenshot, and table normalization with hashes and precise source context — v1.0 (`EVID-01` to `EVID-05`).
- ✓ Four-role comparison for omissions, contradictions, conflicts, visual citations, uncertainty, and follow-up checks — v1.0 (`REVW-01` to `REVW-04`).
- ✓ Allowlisted read-only access, Linux no-follow traversal, provenance, and sanitized failures — v1.0 (`SAFE-01` to `SAFE-04`).
- ✓ Replaceable DeepSeek provider integration and reproducible Docker/local deployment — v1.0 (`PROV-01`, `PROV-02`, `DEPL-01`, `DEPL-02`).

### Active

- [ ] Compare independent findings from multiple model providers and surface disagreements (`REVW-05`).
- [ ] Support incremental evidence indexing and cache reuse across reviews (`REVW-06`).
- [ ] Add configurable review policies for course-specific rubrics and institutional formats (`REVW-07`).
- [ ] Add optional authenticated multi-user access and audit log storage for hosted deployments (`SAFE-05`).

### Out of Scope

- Full autonomous assignment completion — EvidenceLens remains a reviewer and evidence layer.
- Broad filesystem indexing or unrestricted workspace access — explicit readable roots remain part of the security model.
- Automatic mutation of evidence or solution files — review stays read-only by default.
- A polished end-user UI — MCP clients remain the interaction surface.
- Foundation-model training or fine-tuning — providers remain replaceable integrations.

## Context

- v1.0 shipped on 2026-09-24 after 11 phases, 39 plans, and 79 tasks.
- The implementation and validation surface contains 18,042 lines of TypeScript/JavaScript across `src/`, `scripts/`, and `tests/`.
- Current evidence includes a 795-test offline regression run, focused Linux traversal checks, Docker stdio/mount smoke checks, and an authenticated one-request DeepSeek proof bound to the certified Phase 10 source.
- Accepted debt is recorded in `milestones/v1.0-MILESTONE-AUDIT.md`: most phases lack Nyquist `VALIDATION.md`, two Phase 9 warnings remain, and the current-source provider path was verified offline rather than with a new paid request.
- Product version remains `0.1.3`; selecting and publishing a release version is a separate release decision.

## Constraints

- **Security**: Default operation is read-only and restricted to configured allowlisted directories.
- **Traceability**: Findings preserve source metadata needed to reproduce or inspect each claim.
- **Interoperability**: The service speaks MCP and returns stable JSON.
- **Multimodality**: The evidence pipeline preserves visual context in addition to extracted text.
- **Deployability**: Docker is a supported reproducible deployment path.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat EvidenceLens as an independent second reviewer | Keeps primary-agent reasoning and external evidence checking separate | ✓ Validated in v1.0 |
| Make read-only, allowlisted access the default | Reduces accidental disclosure and mutation risk | ✓ Validated in v1.0 |
| Use a model-provider adapter | Supports DeepSeek while preserving replacement options | ✓ Validated in v1.0 |
| Make provenance part of the finding contract | Enables auditability, merging, comparison, and final checks | ✓ Validated in v1.0 |
| Use MCP as the integration boundary | Gives compatible clients one stable service contract | ✓ Validated in v1.0 |
| Separate paid provider proof from routine regression | Preserves exact evidence and prevents accidental cost or replay | ✓ Validated in v1.0 |
| Bind live claims to exact source and immutable image identities | Keeps external evidence scoped to the code actually executed | ✓ Validated in v1.0 |

---
*Last updated: 2026-09-24 after v1.0 milestone*
