# Roadmap: EvidenceLens MCP

## Overview

EvidenceLens will be built from the outside-in: lock the MCP contract first, then establish evidence normalization, enforce the security boundary, add review orchestration and provider integration, and finish with reproducible Docker deployment and end-to-end verification.

## Phases

- [ ] **Phase 1: MCP Contract and Skeleton** - Establish a discoverable, schema-validated MCP server.
- [ ] **Phase 2: Evidence Ingestion and Multimodal Context** - Normalize local evidence with references and hashes.
- [ ] **Phase 3: Read-Only Filesystem Boundary** - Enforce allowlisted, read-only evidence access.
- [ ] **Phase 4: Review Orchestration and Findings** - Compare role-labeled evidence and produce actionable findings.
- [ ] **Phase 5: Provider Adapter and DeepSeek Integration** - Connect DeepSeek through a replaceable provider boundary.
- [ ] **Phase 6: Docker Deployment and End-to-End Validation** - Run a reproducible, documented multimodal review.

## Phase Details

### Phase 1: MCP Contract and Skeleton
**Goal**: A client can discover and invoke a minimal, schema-validated EvidenceLens server.
**Depends on**: Nothing (first phase)
**Requirements**: [MCP-01, MCP-02, MCP-03]
**Success Criteria** (what must be TRUE):
  1. An MCP client can discover the server and invoke the review capability through documented inputs.
  2. Successful responses validate against a stable JSON findings schema and rejected requests return machine-readable errors.
  3. The repository contains a runnable local development command and contract-level tests.
**Plans**: 2 plans

Plans:
**Wave 1**
- [ ] 01-01-PLAN.md — MCP server skeleton and transport contract

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 01-02-PLAN.md — Findings schema, validation, errors, docs, and contract tests

### Phase 2: Evidence Ingestion and Multimodal Context
**Goal**: Text, PDF, image/screenshot, and table evidence are normalized with references and hashes while preserving visual context.
**Depends on**: Phase 1
**Requirements**: [EVID-01, EVID-02, EVID-03, EVID-04, EVID-05]
**Success Criteria** (what must be TRUE):
  1. Each supported evidence type produces a normalized representation with source identity and relevant page, line, cell, or sheet references.
  2. Visual evidence remains available for multimodal processing instead of being reduced to text only.
  3. Every artifact includes a reproducible content hash and extraction metadata.
**Plans**: TBD

### Phase 3: Read-Only Filesystem Boundary
**Goal**: Evidence access is confined to explicit roots and safe, auditable failure behavior.
**Depends on**: Phase 2
**Requirements**: [SAFE-01, SAFE-02, SAFE-03, SAFE-04]
**Success Criteria** (what must be TRUE):
  1. Requests outside configured allowlisted roots are rejected before file contents are read.
  2. The service exposes no default write, delete, or mutation operation.
  3. Findings and errors preserve provenance without leaking unintended filesystem details or secrets.
**Plans**: TBD

### Phase 4: Review Orchestration and Findings
**Goal**: The service compares role-labeled course evidence and a solution, producing actionable findings with uncertainty and visual citations.
**Depends on**: Phase 3
**Requirements**: [REVW-01, REVW-02, REVW-03, REVW-04]
**Success Criteria** (what must be TRUE):
  1. Callers can submit assignment brief, rubric, teacher instructions, and current solution as distinct evidence roles.
  2. Reviews identify omissions, contradictions, and requirement conflicts with source citations.
  3. Findings distinguish observations, interpretations, uncertainty, and follow-up checks.
**Plans**: TBD

### Phase 5: Provider Adapter and DeepSeek Integration
**Goal**: DeepSeek Vision/Flash performs the review through a replaceable provider adapter without changing the MCP contract.
**Depends on**: Phase 4
**Requirements**: [PROV-01, PROV-02]
**Success Criteria** (what must be TRUE):
  1. DeepSeek credentials and model selection are configurable without changing MCP request or response schemas.
  2. A second compatible or local provider can be substituted behind the same adapter interface.
**Plans**: TBD

### Phase 6: Docker Deployment and End-to-End Validation
**Goal**: A fresh environment can run the server with read-only mounts and complete a documented multimodal review.
**Depends on**: Phase 5
**Requirements**: [DEPL-01, DEPL-02]
**Success Criteria** (what must be TRUE):
  1. Docker starts the MCP server with evidence mounted read-only and configured environment variables.
  2. Documentation demonstrates a fresh local setup and one complete multimodal review.
  3. Automated checks cover the documented end-to-end path and report failures clearly.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. MCP Contract and Skeleton | 0/2 | Not started | - |
| 2. Evidence Ingestion and Multimodal Context | 0/TBD | Not started | - |
| 3. Read-Only Filesystem Boundary | 0/TBD | Not started | - |
| 4. Review Orchestration and Findings | 0/TBD | Not started | - |
| 5. Provider Adapter and DeepSeek Integration | 0/TBD | Not started | - |
| 6. Docker Deployment and End-to-End Validation | 0/TBD | Not started | - |

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Security and provenance are introduced before external model calls so later phases inherit the safe boundary.

---
*Roadmap created: 2026-08-22*
*Last updated: 2026-08-22 after initialization*
