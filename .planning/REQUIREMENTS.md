# Requirements: EvidenceLens MCP v1.1

**Defined:** 2026-10-03
**Milestone:** Assignment Prompt Adaptation and Staged Review
**Core value:** Trustworthy, independently checked findings grounded in controlled local evidence.

## v1.1 Requirements

### Task baseline and current artifact

- [x] **CTX-01**: User can provide a standard prompt and available assignment materials and receive a task baseline that distinguishes sourced requirements, user preferences, conflicts and missing information.
- [x] **CTX-02**: User can add clarifications or revised constraints and receive an incremental baseline update that explains the changes while preserving still-valid work.
- [x] **CTX-03**: User can designate the current artifact and review mode; the review identifies the actual material inspected and does not grade old versions by default.

### Continued assistance and policy assessment

- [x] **POL-01**: User can continue authorized AI-assisted analysis, planning and review when course policy is restrictive, unknown or conflicting; the workflow reports policy evidence and compliance status separately rather than using that status as a blanket execution stop or claiming that continuation proves permission.
- [x] **POL-02**: User can exclude content from reading or model processing before it enters the analysis context; when reliable exclusion is unavailable, the workflow skips the affected content, reports the coverage limit and continues the remaining work.

Policy information is evidence to assess, not tool authorization. A course-policy finding does not itself cancel all user-authorized work. Conversely, continuation does not erase a restriction, authorize excluded reads or external transfers, or make a false declaration true. Explicit user access exclusions and host/tool permissions still apply. Report a stable policy finding once and revisit it only when relevant evidence changes; distinguish work progress from submission compliance.

### Reusable Skill and stage prompts

- [x] **SKL-01**: User can use one repository-managed Skill to generate preparation, in-progress and final-review prompts, including preparation before a solution exists.
- [x] **SKL-02**: User receives prompts with explicit inputs, authorized actions, checks and output expectations; absent evidence is reported rather than fabricated to satisfy the existing MCP role contract.
- [x] **SKL-03**: User can request execution of the generated review within existing authorization and receive a requirements-to-evidence matrix, scope limits and prioritized minimal actions.

### Template preservation and draft residue

- [x] **TPL-01**: User can preserve the original template's source/content identity and distinguish required structure, normal completion, necessary additions and optional formatting changes in a working copy.
- [x] **TPL-02**: User can obtain a source-backed restoration checklist and correction handoff for missing template structure or declarations; unknown original text is not reconstructed as fact and signatures or factual attestations are not automatically affirmed.
- [x] **TPL-03**: User can review contextual draft-residue findings for TODOs, comments, chat language and tool markers without treating required disclosures, original instructions, low-fidelity placeholders or experimental AI screenshots as automatic deletion targets.

### Accurate centralized disclosure

- [x] **DIS-01**: User can separate private work records, assignment content and the required disclosure location, avoiding unsupported demands for repeated AI labels throughout the work.
- [x] **DIS-02**: User can compare known AI uses with the disclosure and see specific omissions, contradictions or incomplete records; the workflow does not invent usage percentages, manual-only provenance or compliance claims.

### Current-version recheck and final review

- [x] **REV-01**: User can recheck the current version and see findings classified as still present, resolved, unverifiable or no longer applicable; regression reminders require current evidence and an affected requirement, not a difference alone.
- [x] **REV-02**: User receives a bounded final-review conclusion separating mandatory defects, rubric gaps, optional improvements and unverified items, and separating local readiness from remote submission status.
- [x] **REV-03**: User can run documented synthetic end-to-end cases covering initial analysis, incremental changes, template-restoration handoff and current-version recheck without exposing private coursework or requiring paid provider calls.

## Approved audit-closure requirements

Added 2026-10-04 after user confirmation of Phases 16-17. These six verification obligations are separate from the original 16 completed functional requirements. All are recommended (`should`) audit cleanup, now in the approved milestone scope; none is a newly discovered functional failure.

- [x] **VAL-01**: Official assignment-review Skill validation completes successfully in a reproducible environment with interpreter/dependency and command evidence (TD-V; Phase 16).
- [x] **VAL-02**: The stalled local build/test path is diagnosed and current build plus provider-disabled offline tests complete with reproducible, source-bound results; actual failures/skips remain visible (TD-B; Phase 16).
- [ ] **VAL-03**: Phase 12 has a task/requirement-mapped `12-VALIDATION.md` with actual checks and truthful automated/manual coverage and Nyquist status (TD-12; Phase 17).
- [ ] **VAL-04**: Phase 13 has a task/requirement-mapped `13-VALIDATION.md` with actual checks and truthful automated/manual coverage and Nyquist status (TD-13; Phase 17).
- [ ] **VAL-05**: Phase 14 has a task/requirement-mapped `14-VALIDATION.md` with actual checks and truthful automated/manual coverage and Nyquist status (TD-14; Phase 17).
- [ ] **VAL-06**: Phase 15 has a task/requirement-mapped `15-VALIDATION.md` with actual checks and truthful automated/manual coverage and Nyquist status (TD-15; Phase 17).

Re-audit after closure work; missing artifacts becoming present does not by itself prove complete automated coverage. Any remaining manual-only or failed checks stay explicit. Accepted v1.0 debt is not silently expanded into this cleanup scope.

## Future Requirements

- **REVW-05**: Multi-provider comparison and disagreement surfacing.
- **REVW-06**: Incremental server-side evidence indexing and cache reuse.
- **REVW-07**: General configurable review policies in the MCP service; v1.1 addresses the course-specific workflow at Skill level only.
- **SAFE-05**: Hosted authentication and audit-log storage.
- Automatic Codex invocation and cross-model usage/comparison statistics.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Universal automatic assignment completion | This milestone produces prompts, reviews and correction handoffs; the service remains an independent reviewer |
| MCP evidence mutation, automatic signing or submission | Existing read-only and authorization boundaries remain in force |
| Fabricated declarations or hidden policy changes | Continuing assistance must not falsify policy evidence, actual usage or provenance |
| General DOCX/PDF editor or restoration engine | Reuse existing host tools for separately authorized corrections; report unsupported inspection honestly |
| AI authorship detection from prose style | Style does not establish authorship or a defensible AI percentage |
| Private course-chat ingestion into public fixtures | Use synthetic examples and general rules; keep source chats local |
| Broad history crawling, database or policy platform | A single Skill and small reference set suffice for the initial workflow |
| Automatic paid provider proof or live submission | Existing one-shot provider authorization and remote-state evidence requirements remain separate |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTX-01 | Phase 12 | Complete |
| CTX-02 | Phase 12 | Complete |
| CTX-03 | Phase 12 | Complete |
| POL-01 | Phase 12 | Complete |
| POL-02 | Phase 12 | Complete |
| SKL-01 | Phase 13 | Complete |
| SKL-02 | Phase 13 | Complete |
| SKL-03 | Phase 13 | Complete |
| TPL-01 | Phase 14 | Complete |
| TPL-02 | Phase 14 | Complete |
| TPL-03 | Phase 14 | Complete |
| DIS-01 | Phase 14 | Complete |
| DIS-02 | Phase 14 | Complete |
| REV-01 | Phase 15 | Complete |
| REV-02 | Phase 15 | Complete |
| REV-03 | Phase 15 | Complete |
| VAL-01 | Phase 16 | Complete |
| VAL-02 | Phase 16 | Complete |
| VAL-03 | Phase 17 | Pending |
| VAL-04 | Phase 17 | Pending |
| VAL-05 | Phase 17 | Pending |
| VAL-06 | Phase 17 | Pending |

**Coverage:** 22 requirements; 22 mapped; 0 unmapped. Original 16 functional requirements remain verified in Phases 12-15; VAL-01/02 are complete (18/22 overall); 4 approved audit-closure requirements remain Pending in Phase 17. The prior 16/16 audit remains historical evidence, not acceptance of these new closure obligations.

---
*Last updated: 2026-10-04 after Phase 16 execution and verification*
