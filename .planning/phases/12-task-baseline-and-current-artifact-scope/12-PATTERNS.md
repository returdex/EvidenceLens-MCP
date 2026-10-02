# Phase 12 Pattern Map

**Inspected:** 2026-10-03. Inline mapping; no subagents or external research.

## File Classification

| Planned file | Role and data flow | Closest existing source | Reuse and limits |
|---|---|---|---|
| `skills/assignment-review/references/task-baseline.md` | User materials to reusable baseline worksheet | `docs/mcp-contract.md`; Phase 12 CONTEXT | Reuse explicit source identity and partial/unknown evidence states. This is a new Markdown workflow, not a new MCP request schema. |
| `skills/assignment-review/references/baseline-workflow.md` | Baseline plus new evidence to updated baseline and current-artifact scope | `src/review/roles.ts`; `docs/mcp-contract.md` | Keep existing role admission and opaque-reference semantics; never invent missing evidence to invoke MCP. |
| `skills/assignment-review/scripts/baseline-sources.mjs` | Trusted metadata to pre-read selection; optional injected reader to admitted text | `scripts/live-review-source-set.mjs`; `src/review/roles.ts` | Reuse small ESM functions, explicit validation and stable error codes. Do not copy Git, archive or filesystem traversal machinery into this helper. |
| `tests/baseline/source-boundary.mjs` | Synthetic metadata and injected reader to observable call trace | `tests/filesystem/linux-anchored.mjs` | Reuse `node:test` and `node:assert/strict`; run directly on the host, without `/app` imports, Docker, provider calls or node_modules. |
| `skills/assignment-review/references/baseline-cases.md` | Synthetic user scenarios to manually exercised baseline workflow | `tests/fixtures/reviews/README.md` | Reuse explicit fixture scope; all new cases must be synthetic, not derived coursework or private chat excerpts. |
| `.planning/phases/12-task-baseline-and-current-artifact-scope/12-BASELINE-EVALUATION.md` | Actual trial artifacts and test output to acceptance evidence | `.planning/phases/11-linux-filesystem-traversal-hardening/11-02-SUMMARY.md` | Record observed commands, outputs and limitations. Never copy historical pass claims into current results. |

## Concrete Existing Patterns

`src/review/roles.ts`:

```typescript
export const requiredReviewRoles = [
  "assignment_brief",
  "rubric",
  "solution",
  "teacher_instructions"
] as const satisfies readonly EvidenceRole[];
```

`tests/filesystem/linux-anchored.mjs` uses `node:test`, `node:assert/strict` and actual assertions against returned data or errors. Reuse this dependency-free check style; the Linux-specific runtime and filesystem integration do not apply to the metadata helper.

`scripts/live-review-source-set.mjs` uses small exported functions and stable errors, for example `function fail(code) { throw new Error(code); }`. Reuse bounded validation; do not reuse its large archive limits or external Git execution.

## No Existing Skill Analog

No repository-local Skill currently exists. Phase 12 creates immediately usable supporting references and one small helper under the confirmed future repository Skill location. Phase 13 owns `SKILL.md`, stage routing and installation guidance. Do not generate a dormant Skill entrypoint, UI metadata, extra package or global installation in this phase.

## Shared Constraints

- No runtime MCP contract changes, new dependencies, provider sends or unrestricted filesystem readers.
- The helper takes source metadata, not paths or raw document bodies. Source IDs are not access grants.
- Exclude before reading. Unsupported partial exclusion skips the entire source and any known aliases; partial capability must never be simulated by reading and then discarding content.
- Source selection is distinct from policy assessment: course restrictions do not become a blanket execution gate.
- Existing filesystem authorization remains the host adapter's responsibility; this helper cannot certify an arbitrary reader as safe.
- Synthetic boundary tests verify selected-reader calls; manual workflow trials verify baseline judgments. Neither alone proves universal model obedience or arbitrary PDF/DOCX isolation.

## Gate Applicability

Research was already deferred at milestone scope confirmation; no new integration or dependency is selected here. No RESEARCH.md or Nyquist VALIDATION.md is required for this run under the workflow's no-research path. Each plan still includes explicit verification and a threat model. No frontend or database is introduced, so UI-SPEC, AI framework selection and database-push gates are inapplicable.
