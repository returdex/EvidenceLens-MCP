---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 161
type: execute
wave: 155
depends_on: [10-160]
files_modified:
  - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-CLAIM.json
  - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-JOURNAL.json
  - .planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md
  - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md
  - .planning/REQUIREMENTS.md
autonomous: true
gap_closure: true
requirements: [SAFE-04, PROV-01]
github_actions_run_budget: 0
provider_request_budget: 0
must_haves:
  truths:
    - "Only an exact committed passed 10-157/158/159/160 chain can change Phase 7, Phase 10 and PROV-01 to complete."
    - "A non-pass, stale, mixed, old, missing, replayed, uncommitted or invalid-length tuple causes zero claim, journal or target writes."
    - "A fresh independent full-commit audit and complete provider-disabled suite agree with synchronized project truth."
  artifacts:
    - path: .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-JOURNAL.json
      provides: transactional passed-only synchronization record
    - path: .planning/REQUIREMENTS.md
      provides: PROV-01 completion only from the exact passed chain
  key_links:
    - from: committed 10-160 passed proof
      to: Phase 7 verification, Phase 10 verification and requirements
      via: fixed transactional synchronization plus independent full-commit audit
      pattern: "PROV-01.*Complete"
---

<objective>Synchronize project truth only from the exact passed complete-length recovery chain, then independently audit it.</objective>
<execution_context>@/Users/yifeng/.codex/get-shit-done/workflows/execute-plan.md
@/Users/yifeng/.codex/get-shit-done/templates/summary.md</execution_context>
<context>@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-157-CONSUMED-LIVE.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-SOURCE.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-159-FINAL-BUILD.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-EXECUTION.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-PROOF.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-LOCAL-VALIDATION.json
@scripts/sync-proof-state.mjs
@scripts/audit-proof-chain.mjs
@scripts/audit-live-evidence.mjs</context>

<tasks>
<task type="auto">
  <name>Task 1: Apply or recover only passed-chain transactional synchronization</name>
  <read_first><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-157-CONSUMED-LIVE.json</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-SOURCE.json</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-REVIEW.md</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-158-SECURITY.md</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-159-FINAL-BUILD.json</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-TRANSITION.json</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-EXECUTION.json</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-PROOF.json</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-LOCAL-VALIDATION.json</file><file>scripts/sync-proof-state.mjs</file><file>scripts/audit-proof-chain.mjs</file></read_first>
  <files>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-CLAIM.json, .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-JOURNAL.json, .planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md, .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md, .planning/REQUIREMENTS.md</files>
  <action>Before creating a claim or writing a target, run fixed zero-extra-argv `execution-committed-auto`, `proof-committed-auto` and `sync-authority-auto` in fresh processes. Require the exact ordered nine-member committed tuple 10-157 forensic, 10-158 SOURCE/REVIEW/SECURITY, READY 10-159 BUILD, and passed 10-160 TRANSITION/EXECUTION/PROOF/LOCAL_VALIDATION. Require exact commit/tree/manifest/certifier/image/config/runtime/daemon/Compose/generation/hash continuity, request ceiling 1, maxRetries=0, exactly one reservation/tools/send/authenticated receipt, four fixtures, positive safe-integer findings, clean non-truncated lifecycle and valid provider attribution/public provenance. Accept terminal `stop` or `length` only because the committed passed proof establishes complete bounded extraction/schema/provenance validation; a finish reason alone is never authority. Invoke exactly `node scripts/sync-proof-state.mjs recover`. Its fixed registry must create/recover only 10-161 owner-only claim/journal, bind original and replacement SHA-256 of exactly Phase 7 verification, Phase 10 verification and REQUIREMENTS, apply atomic replacements with monotonic fsynced journal, and finish all three. Any `gaps_found`, reference to historical `10-156-SUPERSEDED.md` as authority, stale/mixed tuple, missing member, wrong runtime, invalid length, replay or uncommitted byte exits before claim and writes. Do not invoke Docker, provider, network or GitHub Actions.</action>
  <verify><automated>node scripts/audit-proof-chain.mjs execution-committed-auto &amp;&amp; node scripts/audit-proof-chain.mjs proof-committed-auto &amp;&amp; node scripts/audit-proof-chain.mjs sync-authority-auto &amp;&amp; node scripts/sync-proof-state.mjs recover &amp;&amp; EVIDENCELENS_DISABLE_PROVIDER=1 npx vitest run tests/scripts/sync-proof-state.test.ts tests/scripts/audit-proof-chain.test.ts</automated></verify>
  <acceptance_criteria>Only the exact committed passed nine-member chain creates 10-161 claim/journal and exactly three atomic target changes; all non-pass/old/stale/mixed variants cause zero writes; Docker/provider/network/GitHub counters are 0.</acceptance_criteria>
  <done>Phase truth is transactionally changed only from the exact passed 10-160 authority.</done>
</task>
<task type="auto">
  <name>Task 2: Independently audit final committed state and regression isolation</name>
  <read_first><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-CLAIM.json</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-JOURNAL.json</file><file>scripts/audit-proof-chain.mjs</file><file>scripts/audit-live-evidence.mjs</file><file>.planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md</file><file>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md</file><file>.planning/REQUIREMENTS.md</file></read_first>
  <files>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-JOURNAL.json, .planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md, .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md, .planning/REQUIREMENTS.md</files>
  <action>After the claim, completed journal and three targets are committed, run fixed `final-audit-auto` in a fresh process. It must resolve each exact tuple member and 10-161 claim/journal via full-commit `git show`, compare committed bytes to O_NOFOLLOW reopened files and hashes, enforce exact eleven-member order/cardinality, completed journal order, original/replacement target hashes and absence of old/mixed authority. Independently run `audit-live-evidence` against 10-160-PROOF and require Phase 7/Phase 10 status `passed`, exactly one PROV-01 checklist row checked and exactly one trace row `Complete`. Re-run the complete provider-disabled suite, TypeScript build, Compose/runtime expansion, canonical manifest/source no-drift and diff hygiene. If any check fails, do not rewrite evidence, roll forward from a non-pass or replay live; retain the gap and create a new additive recovery chain.</action>
  <verify><automated>node scripts/audit-proof-chain.mjs final-audit-auto &amp;&amp; node scripts/audit-live-evidence.mjs .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-160-PROOF.json .planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md .planning/REQUIREMENTS.md &amp;&amp; EVIDENCELENS_DISABLE_PROVIDER=1 npm test &amp;&amp; npm run build &amp;&amp; docker compose --profile review config &gt;/dev/null &amp;&amp; git diff --check</automated></verify>
  <acceptance_criteria>A fresh audit authenticates the exact eleven-member committed chain and completed target hashes; Phase 7/10/PROV-01 truth is unique and consistent; full offline tests/build/Compose/manifest/diff pass; external counters are 0.</acceptance_criteria>
  <done>The PROV-01 completion claim is independently reproducible from committed evidence without additional provider activity.</done>
</task>
</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-10-161-01 | Elevation of Privilege | synchronization | mitigate | Exact committed passed nine-member chain is the sole authority. |
| T-10-161-02 | Tampering | target files | mitigate | Original/replacement hashes, atomic rename and monotonic fsynced journal. |
| T-10-161-03 | Repudiation | completion claim | mitigate | Independent full-commit eleven-member audit and unique truth rows. |
</threat_model>
<verification>Passed-only transactional sync, independent final audit, full offline regressions/build/Compose/no-drift and zero Docker/provider/network/GitHub effects.</verification>
<success_criteria>Only a complete passed 10-160 proof closes PROV-01; every non-pass performs zero synchronization writes.</success_criteria>
<output>Create 10-161-SUMMARY.md. Historical 10-156-SUPERSEDED.md and all earlier synchronization plans remain non-authoritative.</output>
