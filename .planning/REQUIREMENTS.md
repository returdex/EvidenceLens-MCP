# Requirements: EvidenceLens MCP

**Defined:** 2026-08-22
**Core Value:** Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.

## v1 Requirements

### MCP Interface

- [x] **MCP-01**: An MCP client can discover and invoke the EvidenceLens review capability through a documented server interface.
- [x] **MCP-02**: The server returns deterministic, schema-valid JSON for successful reviews and machine-readable errors for rejected requests.
- [x] **MCP-03**: The interface documents request inputs, supported evidence types, limits, and review output semantics.

### Evidence Access

- [x] **EVID-01**: A review can read text evidence from configured local files while preserving source path and line references where available.
- [x] **EVID-02**: A review can inspect PDF evidence and report page-level references, including scanned pages when visual processing is required.
- [x] **EVID-03**: A review can inspect image and screenshot evidence while retaining the source identity and visual context.
- [x] **EVID-04**: A review can inspect table evidence without silently losing cell, row, column, or sheet context.
- [x] **EVID-05**: Each evidence artifact is fingerprinted with a content hash and relevant extraction metadata before it is sent to the model.

### Review Quality

- [x] **REVW-01**: A caller can submit assignment brief, rubric, teacher instructions, and current solution evidence as distinct review roles.
- [x] **REVW-02**: The reviewer identifies omissions, contradictions, and requirement conflicts across the supplied evidence and solution.
- [x] **REVW-03**: Visual claims can cite the originating image/PDF page/screenshot rather than only extracted text.
- [x] **REVW-04**: Findings distinguish evidence-backed observations, model interpretations, uncertainty, and recommended follow-up checks.

### Provenance and Safety

- [x] **SAFE-01**: The server only reads files under explicitly configured allowlisted roots.
- [x] **SAFE-02**: Default requests cannot write, delete, or mutate local files.
- [x] **SAFE-03**: Findings include source path, page/line/cell references when available, content hashes, model/provider version, and review timestamp or request identifier.
- [x] **SAFE-04**: Access denials, unsupported formats, size limits, and provider failures are returned without exposing unintended filesystem details or secrets.

### Provider and Deployment

- [ ] **PROV-01**: DeepSeek Vision/Flash can be configured as the initial model provider without changing the MCP contract.
- [ ] **PROV-02**: The model provider is isolated behind an adapter that can later support a local model or another compatible API.
- [ ] **DEPL-01**: The service runs from a documented Docker image/configuration with read-only evidence mounts.
- [ ] **DEPL-02**: A local development path and a minimal end-to-end review example are documented.

## v2 Requirements

### Advanced Review Operations

- **REVW-05**: Compare independent findings from multiple model providers and surface disagreements.
- **REVW-06**: Support incremental evidence indexing and cache reuse across reviews.
- **REVW-07**: Add configurable review policies for course-specific rubrics and institutional formats.
- **SAFE-05**: Add optional authenticated multi-user access and audit log storage for hosted deployments.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Autonomous assignment authoring | The primary agent owns solution generation; EvidenceLens supplies an independent check. |
| Unrestricted filesystem browsing | Conflicts with the allowlist and least-privilege security model. |
| In-place file edits | Read-only review is the safe default and keeps findings independently auditable. |
| End-user web UI | MCP clients are the initial interface; UI would expand scope without improving the core evidence contract. |
| Model training/fine-tuning | Provider integration and adapter boundaries are sufficient for v1 validation. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MCP-01 | Phase 1 | Complete |
| MCP-02 | Phase 1 | Complete |
| MCP-03 | Phase 1 | Complete |
| EVID-01 | Phase 2 | Complete |
| EVID-02 | Phase 2 | Complete |
| EVID-03 | Phase 2 | Complete |
| EVID-04 | Phase 2 | Complete |
| EVID-05 | Phase 2 | Complete |
| SAFE-01 | Phase 3 | Complete |
| SAFE-02 | Phase 3 | Complete |
| SAFE-03 | Phase 3 | Complete |
| SAFE-04 | Phase 3 | Complete |
| REVW-01 | Phase 4 | Complete |
| REVW-02 | Phase 4 | Complete |
| REVW-03 | Phase 4 | Complete |
| REVW-04 | Phase 4 | Complete |
| PROV-01 | Phase 5 | Pending |
| PROV-02 | Phase 5 | Pending |
| DEPL-01 | Phase 6 | Pending |
| DEPL-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-08-22*
*Last updated: 2026-08-22 after initialization*
