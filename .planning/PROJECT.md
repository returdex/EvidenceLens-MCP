# EvidenceLens MCP

## What This Is

EvidenceLens MCP is a multimodal second-review agent for Codex and other MCP clients. It gives an external model controlled, read-only access to local course evidence—text, PDFs, images, screenshots, and tables—then returns structured, traceable findings about omissions, conflicts, and evidence quality in assignment briefs, rubrics, teacher instructions, and the current solution.

The system is an independent second opinion for Codex/Luna/Spark rather than a replacement for the primary agent. It is designed to be deployable through Docker and to support DeepSeek Vision/Flash first, with compatible hosted or local models replaceable later.

## Core Value

Produce trustworthy, independently checked findings grounded in controlled local evidence, with enough provenance for the primary agent to verify every important claim.

## Requirements

### Validated

- Evidence normalization contract and provenance pipeline validated in Phase 2.
- Text, PDF, image/screenshot, and table normalization with hashes and visual context validated in Phase 2.
- Read-only allowlisted filesystem boundary, bounded reads, provenance, and sanitized failures validated in Phase 3.

### Active

- [ ] Expose an MCP server that clients can call for evidence inspection and review.
- [ ] Provide controlled read-only tools for text, PDF, image, screenshot, and table evidence. (Normalization validated in Phase 2; filesystem access remains active work.)
- [ ] Support multimodal model review of visual evidence, including charts, scans, screenshots, and image-based text.
- [ ] Compare assignment briefs, rubrics, teacher instructions, and a current solution for omissions and conflicts.
- [ ] Return stable JSON findings with file path, page/line references where applicable, hashes, model version, and review metadata.
- [ ] Enforce an allowlisted filesystem boundary and prevent unauthorized writes or reads.
- [ ] Support Docker deployment and a replaceable model-provider boundary.

### Out of Scope

- Full autonomous assignment completion — EvidenceLens is a reviewer and evidence layer, not the primary agent.
- Broad filesystem indexing or unrestricted workspace access — the security model requires explicit readable roots.
- Automatic mutation of course files or the current solution — v1 is read-only by default.
- A polished end-user UI — MCP clients remain the primary interaction surface.
- Training or fine-tuning a foundation model — v1 integrates compatible providers behind an adapter.

## Context

- The target ecosystem includes Codex, Dify, Claude, and other MCP-compatible clients.
- Primary evidence is local course material and a candidate solution supplied by the calling client.
- DeepSeek Vision/Flash is the initial model direction, but provider replacement is a deliberate architectural requirement.
- Findings need to support later GAD/GSD merging, comparison across multiple AIs, and final-check workflows.
- Provenance is a first-class concern: evidence references should remain auditable after the model responds.

## Constraints

- **Security**: Default operation is read-only and restricted to configured allowlisted directories — local course material may be sensitive.
- **Traceability**: Findings must preserve enough source metadata to reproduce or inspect the claim — unsupported model assertions are not useful as a second opinion.
- **Interoperability**: The service must speak MCP and return stable JSON — multiple clients should consume the same contract.
- **Multimodality**: The evidence pipeline must preserve visual context, not only extracted text — scans and charts can contain material facts.
- **Deployability**: Docker must be a supported deployment path — the service should be reproducible outside the developer machine.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat EvidenceLens as an independent second reviewer | Keeps primary-agent reasoning and external evidence checking separate | — Pending |
| Make read-only, allowlisted access the default | Reduces accidental disclosure and mutation risk | — Pending |
| Use a model-provider adapter | Allows DeepSeek first while preserving local/compatible model options | — Pending |
| Make provenance part of the finding contract | Enables auditability, merging, cross-model comparison, and final checks | — Pending |
| Use MCP as the integration boundary | Lets Codex, Dify, Claude, and other clients call the same service | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-22 after Phase 3 completion*
