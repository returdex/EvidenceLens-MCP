---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 156
type: execute
wave: 150
depends_on: [10-155]
files_modified:
  - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-156-SYNC-CLAIM.json
  - .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-156-SYNC-JOURNAL.json
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
    - "Only an exact committed passed 10-152/153/154/155 chain can mark Phase 7, Phase 10 verification and PROV-01 complete."
    - "A non-pass, stale, mixed, replayed, wrong-token-runtime or uncommitted chain causes zero target writes."
    - "Final independent audits and the full credential-free suite agree with synchronized project truth."
  artifacts:
    - path: .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-156-SYNC-JOURNAL.json
      provides: transactional passed-only synchronization record
    - path: .planning/REQUIREMENTS.md
      provides: PROV-01 completion only after authenticated pass
  key_links:
    - from: committed 10-155 passed proof
      to: Phase 7 verification, Phase 10 verification and requirements
      via: fixed transactional sync plus independent full-commit audit
      pattern: "PROV-01.*Complete"
---

<objective>Synchronize and independently audit project truth only from the complete passed certified-8000 recovery chain.</objective>
<execution_context>@/Users/yifeng/.codex/get-shit-done/workflows/execute-plan.md
@/Users/yifeng/.codex/get-shit-done/templates/summary.md</execution_context>
<context>@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-152-CONSUMED-LIVE.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-153-SOURCE.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-154-FINAL-BUILD.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-155-EXECUTION.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-155-PROOF.json
@.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-155-LOCAL-VALIDATION.json
@scripts/sync-proof-state.mjs</context>

<tasks>
<task type="auto">
  <name>Task 1: Synchronize only an exact committed passed chain</name>
  <files>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-156-SYNC-CLAIM.json, .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-156-SYNC-JOURNAL.json, .planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md, .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md, .planning/REQUIREMENTS.md</files>
  <action>Before mutation, authenticate the committed 10-152 archive, exact 10-153 certifications, READY 10-154 image, and passed 10-155 transition/execution/proof/local-validation tuple through fixed committed-authority modes. Require exact sha256 image continuity, certified maxTokens 8000 and fingerprint binding, finish_reason stop, at most four fully bounded findings, one authenticated send/receipt, four fixtures, positive findings, valid attribution/provenance, clean non-truncated lifecycle and all audit hashes. Invoke exactly `node scripts/sync-proof-state.mjs recover`; its fixed path registry must acquire the one-shot sync claim, snapshot the three supported transactional targets, apply each atomic replacement with journaled recovery, and seal the journal. Any gaps_found, stale, mixed, wrong-runtime, missing, replayed or uncommitted input must exit before claim or writes. Do not invoke Docker, provider, network or GitHub Actions.</action>
  <verify><automated>node scripts/audit-proof-chain.mjs execution-committed-auto &amp;&amp; node scripts/audit-proof-chain.mjs proof-committed-auto &amp;&amp; node scripts/sync-proof-state.mjs recover &amp;&amp; node scripts/audit-proof-chain.mjs sync-authority-auto &amp;&amp; EVIDENCELENS_DISABLE_PROVIDER=1 npx vitest run tests/scripts/sync-proof-state.test.ts tests/scripts/audit-proof-chain.test.ts</automated></verify>
  <done>Project truth changes only from the exact complete passed certified-8000 chain.</done>
</task>
<task type="auto">
  <name>Task 2: Independently audit final state and regression isolation</name>
  <files>.planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-156-SYNC-JOURNAL.json</files>
  <action>After committing the claim, journal and three synchronized targets, use the fixed zero-extra-argv final-audit-auto process to reopen committed bytes and verify the unique completed journal, target hashes, exact image/source/live/runtime linkage and absence of stale authority. Independently run audit-live-evidence against 10-155-PROOF to confirm PROV-01 completion and consistent Phase 7/Phase 10/requirements truth. Run the full provider-disabled suite, TypeScript build and diff hygiene. Assert zero Docker/provider/network/GitHub effects during synchronization. If any check fails, do not rewrite evidence or rerun the live generation; leave the gap open and create a new recovery plan.</action>
  <verify><automated>node scripts/audit-proof-chain.mjs final-audit-auto &amp;&amp; node scripts/audit-live-evidence.mjs .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-155-PROOF.json .planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md .planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md .planning/REQUIREMENTS.md &amp;&amp; EVIDENCELENS_DISABLE_PROVIDER=1 npm test &amp;&amp; npm run build &amp;&amp; git diff --check</automated></verify>
  <done>The synchronized completion claim is independently reproducible and routine tests remain credential-free.</done>
</task>
</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-10-156-01 | Elevation of Privilege | synchronization | mitigate | Exact committed passed certified-8000 chain is the sole authority. |
| T-10-156-02 | Tampering | project truth files | mitigate | Transactional snapshots, target hashes and completed journal. |
| T-10-156-03 | Repudiation | final claim | mitigate | Independent full-commit audit and unique rows. |
</threat_model>
<verification>Passed-chain sync/final audit, full offline regression/build and zero Docker/provider/GitHub effects; non-pass causes zero writes.</verification>
<success_criteria>Only successful complete 10-155 proof closes PROV-01.</success_criteria>
<output>Create 10-156-SUMMARY.md. Plan 10-151 and all earlier sync plans remain superseded.</output>
