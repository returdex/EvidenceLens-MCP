# Phase 12: Task Baseline and Current Artifact Scope — Context

**Gathered:** 2026-10-03
**Status:** Execution complete — verified 2026-10-03

## Phase boundary

Define the smallest reusable task baseline and reference workflow for sourced requirements, incremental clarifications, designated current artifacts, continued assistance and explicit content exclusions. This phase does not introduce a policy platform, change the MCP schema or build document editing.

<decisions>
## Confirmed decisions

- **D-01:** AI-assisted progress is the default. Course restrictions, unknown policy and conflicts remain visible audit information, but do not automatically stop all user-authorized analysis, planning or review.
- **D-02:** Continuing work is not permission or compliance evidence. Preserve the actual course statement even if absent from a working copy; do not repeatedly report an unchanged policy finding in every step.
- **D-03:** Centralized disclosure is accepted. Work records, assignment content and required disclosure can be separate; disclosures must accurately reflect known uses and uncertainty.
- **D-04:** User-specified reading exclusions and tool permissions remain enforced. Exclude before model ingestion; if unavailable, skip the affected content and continue the rest. Do not claim reliable isolation merely because a prompt says to ignore already-read text.
- **D-05:** Review the user-designated current artifact. Old artifacts are optional context, not the default scoring target; a version difference alone is not a defect.
- **D-06:** Merge new information into the existing baseline; preserve valid earlier conclusions and show changes.
- **D-07:** Requirements must have a source or be explicitly labeled as user preference/advice. Resolve source conflicts using scope, dates and authority; do not assume a universal document-type ranking.
- **D-08:** Original templates remain intact; working copies may simplify display. Template restoration and residue checks are delivered in Phase 14.
- **D-09:** One repository Skill with Markdown references is the initial delivery. Do not create a database or generic configuration engine for this workflow.

</decisions>

## Implementation discretion

- Choose a concise Markdown baseline format, stable item identifiers and bounded provenance fields.
- Define how artifact identity and review time are captured with existing tools, without retaining unrelated private material.
- Use synthetic examples of unknown/restrictive policy, updated clarification, changed artifact content and excluded content.
- Identify supported extraction/exclusion paths explicitly; do not promise arbitrary DOCX/PDF isolation without an actual tool path and verification.

## Existing integration constraints

`src/review/roles.ts` currently requires exactly one item for each of assignment_brief, rubric, solution and teacher_instructions. Skill preparation can proceed without these; invoking MCP review requires genuine available evidence. Do not synthesize empty teacher guidance or a pretend solution to pass validation.

The MCP remains read-only. Artifact corrections, publication and paid calls use their own existing authorizations. A generated prompt does not expand those permissions.

## Acceptance focus

1. A user with no solution receives a useful sourced baseline and missing-information list.
2. New clarification updates affected items without resetting the whole plan.
3. A prohibited/unknown policy is reported separately while authorized work continues, without an unsupported compliance claim.
4. A designated current artifact is the review target; an older version cannot silently replace it.
5. Excluded content is kept out of model inputs or visibly skipped, with the rest of the work continuing.

## Deferred

Automatic Codex invocation, multi-provider comparisons, persistent indexing, full document restoration, global Skill installation and real coursework evaluation are outside this phase.

## Planning provenance

Derived from the milestone discussion and the user's final correction on 2026-10-03. Private source chats and excerpts are not included in this repository. The four-phase proposal is retained with POL-01 updated to prioritize continued AI assistance.

<canonical_refs>
## Canonical references

- `.planning/REQUIREMENTS.md` — CTX-01, CTX-02, CTX-03, POL-01, POL-02.
- `.planning/ROADMAP.md` — Phase 12 goal and Phase 13–15 boundaries.
- `src/review/roles.ts` — existing four-role admission contract.
- `docs/mcp-contract.md` — read-only service and source/provenance limits.
- `.planning/phases/11-linux-filesystem-traversal-hardening/11-02-SUMMARY.md` — prior filesystem assurance scope, not fresh verification.
</canonical_refs>
