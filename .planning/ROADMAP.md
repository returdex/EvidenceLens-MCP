# Roadmap: EvidenceLens MCP

## Overview

EvidenceLens will be built from the outside-in: lock the MCP contract first, then establish evidence normalization, enforce the security boundary, add review orchestration and provider integration, and finish with reproducible Docker deployment and end-to-end verification.

## Phases

### Phase 1 — MCP Contract and Skeleton

**Goal:** A client can discover and invoke a minimal, schema-validated EvidenceLens server.
**Requirements:** MCP-01, MCP-02, MCP-03
**Status:** Pending

### Phase 2 — Evidence Ingestion and Multimodal Context

**Goal:** Text, PDF, image/screenshot, and table evidence are normalized with references and hashes while preserving visual context.
**Requirements:** EVID-01, EVID-02, EVID-03, EVID-04, EVID-05
**Status:** Pending

### Phase 3 — Read-Only Filesystem Boundary

**Goal:** Evidence access is confined to explicit roots and safe, auditable failure behavior.
**Requirements:** SAFE-01, SAFE-02, SAFE-03, SAFE-04
**Status:** Pending

### Phase 4 — Review Orchestration and Findings

**Goal:** The service compares role-labeled course evidence and a solution, producing actionable findings with uncertainty and visual citations.
**Requirements:** REVW-01, REVW-02, REVW-03, REVW-04
**Status:** Pending

### Phase 5 — Provider Adapter and DeepSeek Integration

**Goal:** DeepSeek Vision/Flash performs the review through a replaceable provider adapter without changing the MCP contract.
**Requirements:** PROV-01, PROV-02
**Status:** Pending

### Phase 6 — Docker Deployment and End-to-End Validation

**Goal:** A fresh environment can run the server with read-only mounts and complete a documented multimodal review.
**Requirements:** DEPL-01, DEPL-02
**Status:** Pending

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Security and provenance are introduced before external model calls so later phases inherit the safe boundary.

---
*Roadmap created: 2026-08-22*
*Last updated: 2026-08-22 after initialization*
