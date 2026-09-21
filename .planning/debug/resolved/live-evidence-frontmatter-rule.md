---
status: resolved
trigger: "live evidence audit rejects Markdown horizontal rules during passed-only synchronization"
created: 2026-09-22
updated: 2026-09-22
---

# Debug Session: Live evidence frontmatter rule

## Symptoms

- **Expected behavior:** Plan 10-166 authenticates the committed passed 10-165 chain and transactionally synchronizes Phase 7, Phase 10, and PROV-01 status without another Provider request.
- **Actual behavior:** All committed execution/proof/sync-authority audits pass, then `node scripts/sync-proof-state.mjs recover` fails before writes with `live evidence audit failed`.
- **Error messages:** `live evidence audit failed`.
- **Timeline:** First observed after the complete Docker MCP proof passed with one Provider request and Plan 10-166 attempted passed-only synchronization.
- **Reproduction:** Run the fixed committed audits, then `node scripts/sync-proof-state.mjs recover`. No claim, journal, or target write is produced.

## Current Focus

- **hypothesis:** The parser bug is fixed, but `sync-authority-auto` authenticates the historical certifier tuple without proving that the certifier code executed during synchronization matches the sealed certifier digest.
- **test:** Compare the fixed live certifier digest with the sealed proof and run only the read-only sync authority audit at the fixed commit.
- **expecting:** Exact authority should reject the digest mismatch; acceptance demonstrates an independent sync-time certifier binding gap.
- **next_action:** The parser defect is resolved. Do not run Plan 10-166 recovery against the old proof. Create a separate authority-chain plan that binds the actually executed certifier before any target write and produces a newly certified compatible chain.
- **reasoning_checkpoint:**
  - **hypothesis:** The body-wide delimiter search causes the rejection because it does not limit parsing to the opening frontmatter.
  - **confirming_evidence:** `uniqueFrontmatterStatus()` finds the first closing delimiter, then rejects any later `\n---\n`; the current Phase 10 verification contains legitimate body delimiter lines after its opening frontmatter.
  - **falsification_test:** If an otherwise-valid sealed phase input with one body horizontal rule passes before the fix, the hypothesis is false.
  - **fix_rationale:** Parse and validate only the single opening frontmatter block; continue requiring exactly one authoritative status inside that block.
  - **blind_spots:** The exact recovery command has not been rerun; existing claim/journal state and all fixed authority audits must remain untouched until the parser behavior is verified offline.
- **tdd_checkpoint:** GREEN — focused regression passes after removing only the body-wide second-delimiter rejection; 88 focused tests and the TypeScript build pass.

## Evidence

- timestamp: 2026-09-22
  observation: execution-committed-auto, proof-committed-auto, and sync-authority-auto passed at full_commit 7069568; recover failed before any write.
  implication: Live proof authority is valid, but the synchronization target validator rejects the proposed Markdown representation.

- timestamp: 2026-09-22
  observation: `uniqueFrontmatterStatus()` rejects whenever `text.indexOf("\n---\n", end + 5)` finds any later delimiter, even though Markdown permits `---` as a horizontal rule in the document body.
  implication: The parser is inspecting beyond the opening frontmatter boundary and can reject structurally valid reports.

- timestamp: 2026-09-22
  observation: The Phase 10 verification has one opening frontmatter block and later body `---` lines; Phase 7 has only the opening block.
  implication: The observed failure is explained by document content, not by a conflicting authoritative status.

- timestamp: 2026-09-22
  observation: The affected parser is in `scripts/audit-live-evidence.mjs`; the certified source/certifier/image tuple is authenticated before synchronization and the Phase verification targets are planning documents outside that non-planning source identity.
  implication: A narrow parser correction does not rewrite or reinterpret the immutable 10-165 live artifacts, though the current certifier hash binding must be checked by the authority audit before recovery.

- timestamp: 2026-09-22
  observation: The focused regression failed exactly at the global second-delimiter condition in `uniqueFrontmatterStatus()`; the other 70 focused audit tests passed.
  implication: The symptom is reproducible offline and the hypothesis is confirmed before modifying production code.

- timestamp: 2026-09-22
  observation: After the minimal fix, all 71 live-evidence tests and all 17 proof-synchronization tests pass; `npm run build` also passes.
  implication: The parser now accepts ordinary Markdown separators while retaining the existing single-status and transactional synchronization regressions.

- timestamp: 2026-09-22
  observation: The sealed 10-165 proof binds `audit_live_evidence_sha256=62d56935...`, which equals the HEAD certifier before the fix; the corrected certifier is `0129782c...`.
  implication: Exact certifier authority intentionally rejects the corrected code against the old proof. Reusing that proof for passed-state synchronization would violate the immutable authority contract.

- timestamp: 2026-09-22
  observation: After commit `011beab`, the read-only `sync-authority-auto` audit nevertheless returned `status: passed` and `branch: preflight_authenticated` at the new full commit.
  implication: The authority audit validates the historical tuple but does not bind the current `auditLiveEvidence()` implementation that `sync-proof-state.mjs` executes. Recovery must not exploit this gap.

## Eliminated

- hypothesis: The paid Provider proof itself failed.
  evidence: Plan 10-165 passed with four fixtures, four findings, counters 1/1/1, and clean exit/close.

## Resolution

- **root_cause:** `uniqueFrontmatterStatus()` searched the entire Markdown body for another `---` delimiter after closing the opening YAML frontmatter and treated any later Markdown horizontal rule as a second authority block.
- **fix:** Restrict frontmatter parsing to the opening block and continue requiring exactly one accepted status inside that block; add a body-horizontal-rule regression. This resolves only the parser defect and does not authorize Phase 10 completion.
- **verification:** Parser RED/GREEN is complete with 88 focused tests and TypeScript build. Immutable hash comparison proves the corrected certifier cannot authenticate the already-sealed 10-165 proof; the current authority audit incorrectly still accepts that mismatch, so passed-state recovery remains blocked. Plan 10-166 must not run against the old proof. A new authority-chain plan and compatible recertification are required.
- **files_changed:** `scripts/audit-live-evidence.mjs`, `tests/scripts/audit-live-evidence.test.ts`
