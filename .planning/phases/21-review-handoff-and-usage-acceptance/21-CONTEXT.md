# Phase 21: Review Handoff and Usage Acceptance — Context

**Date:** 2026-10-05 (Australia/Melbourne)
**Status:** Planning contract; no implementation or live acceptance claimed.
**Source:** Approved RUN-01–05, user-directed H-01–04 and subsequent “继续”. This consolidates existing decisions, not a new interview.

<domain>
Complete the installed review → concise complete-finding handoff → exact prompt export → current-version recheck flow, with per-run status/time and genuinely available model/token metadata. Use the accepted Phase 20 adapter and private store. No new service, UI, provider, database or command family.
</domain>
<decisions>
- **D-01:** Preserve every validated finding ID, severity, quote, action and limitation in an accessible full result. A short summary lists its represented IDs and points to the same run's full record. Invalid, failed, missing and empty are distinct. H-01/H-02; RUN-01.
- **D-02:** Keep protocol success, feature evidence, grade-band assessment and remote submission status distinct. No automatic HD/Exceeds or submitted label from succeeded. Grade-band assessment is not implemented by this phase. H-02; RUN-01.
- **D-03:** Recheck uses explicitly admitted prior summaries and current source-bound evidence. Preserve task-scoped stable F identity and four states: still_present, resolved, unverifiable, no_longer_applicable. Deferral is an action disposition, never resolution. Retired actions do not resurrect on ordinary version differences. Host semantic judgments are labeled as such. H-03; RUN-02.
- **D-04:** Capture only allowlisted numeric usage from the accepted CLI terminal event, preserving field path, event scope, provenance and missing/invalid reasons. Display cached/reasoning fields separately without adding them again; do not infer bills or usage from quotas. RUN-03/RUN-04.
- **D-05:** Requested model is local launch metadata, not proof of the effective model. Missing reported model and unavailable tokens stay null/unavailable; valid reported zero stays zero. Failure/cancel/uncertain runs may have consumed remote work. No automatic retry to obtain metadata. RUN-03/RUN-04.
- **D-06:** Keep snapshot v1, lifecycle v1/v2, execution v1/v2 compatibility and MODEL_RESULT_SCHEMA v1 unchanged (v2 safe diagnostics were added by the user-requested 0.3.4 repair). Store new local metrics and host handoff annotations as bounded, versioned, run/attempt/hash-bound private sidecars, with old-record absence explicitly unavailable. Reuse existing transactions, identity checks, retention and exact export. No model text can choose a path or invoke an action.
- **D-07:** Use installed sibling stdlib modules, existing four stage commands and help/export separation. Read-only record/handoff inspection spawns no model and reads no assignment file. Explicit old-run inspection must not masquerade as the latest result.
- **D-08:** Separate automated synthetic coverage, actual pinned CLI/installed-host coverage and authorized real inference. Prepare two small synthetic source sets and exact prompts for initial review + current-version recheck before seeking the remaining live authorization, only if not already covered by explicit human authorization. No course/private case corpus or extra chat creation. H-04; RUN-05.
- **D-09:** After all required acceptance, apply one compatible patch from 0.3.7 to 0.3.8 and refresh affected tests/metadata. No Release/tag during phase execution; milestone closure is separate. Existing RR/FM items remain non-blocking, not silently promoted.
</decisions>

### Implementation discretion

Six sequential plans avoid concurrent edits to prompt-store and CLI routing. Sidecars are local derived records, not changes to the external MCP review response or model-generated JSON. Full history scraping and a general finding database remain out of scope. Minimal host annotations supply requirement/F mapping that the model schema does not carry; missing mapping remains unknown, not an inferred satisfied criterion.

<canonical_refs>
- .planning/REQUIREMENTS.md; .planning/ROADMAP.md; DEVELOPMENT.md
- .planning/phases/21-review-handoff-and-usage-acceptance/21-PLANNING-INPUT.md
- .planning/phases/20-bounded-independent-codex-execution/20-VERIFICATION.md
- skills/assignment-review/references/recheck-workflow.md; skills/assignment-review/references/command-entrypoints.md
- skills/assignment-review/scripts/codex-contract.mjs; skills/assignment-review/scripts/codex-runner.mjs; skills/assignment-review/scripts/prompt-store.mjs
- .planning/REVIEW-REVISIONS.md; .planning/notes/2026-10-05-review-quality-future.md
</canonical_refs>

## Workflow gates

Inline research/planning/checking follows the Skill adapter and no-delegation preference. Targeted usage research continues the user's existing Codex/auth/usage research choice; research=false configuration is unchanged. Existing planning input supplies context, so no repeated design approval is needed. No frontend/ORM scope: UI-SPEC and database-push gates do not apply. Existing CLI remains the AI framework; no framework-selection prerequisite. Validation covers this bounded flow, not future semantic scoring. Auto-advance remains false.

2026-10-05 repair addendum: the user requested a fix for lost Codex failure diagnostics. Product 0.3.4 adds execution v2 diagnostics plus read-only diagnose; existing v1 receipts remain unchanged. This is a compatible Phase 20 follow-up, not completion of any Phase 21 plan. Plan 01/02 must preserve the new observations. Phase 21 acceptance still owns real inference and usage/handoff, with the next feature patch 0.3.5.

2026-10-05 startup addendum: product 0.3.5 fixes actual-home agent discovery and denied cache reads with a sealed per-run CODEX_HOME. Auth is a read-only alias to the existing file, never copied; only a private installation_id copy is writable. Fixture tests now include existing agents/cache and direct OS write-denial checks. Phase 21 starts from this baseline; Plan 06 targets 0.3.6. The earlier next-patch statement is superseded; RUN-01–05 and 0/6 plan completion remain unchanged.

2026-10-05 live-smoke addendum: user authorized the prepared single synthetic run; it failed in 0.3.5 before valid results due to the remaining original HOME/.agents/skills discovery path. No retry was sent. Product 0.3.6 isolates HOME as well as CODEX_HOME and pins production environment wiring in the contract digest. Local regression/actual-host network-denied startup pass; post-fix live acceptance remains unrun and needs applicable fresh authorization. Phase 21 baseline is 0.3.6, next feature patch 0.3.7; 0/6 and RUN-01–05 unchanged.


2026-10-05 GPT-6 amendment: user explicitly selected the GPT-6 family. Current baseline is product 0.3.7 with desktop CLI 0.160.0 / gpt-6.1-sol (low), recertified local isolation and preserved legacy receipts. One same-source live smoke reached a turn but failed on model-related stderr; catalog visibility does not establish usable inference. Plan 05 now requests this model and retains its independent two-run acceptance; Plan 06 targets 0.3.8. No requirement or plan was closed. Earlier baseline/proposed-model notes remain historical.
