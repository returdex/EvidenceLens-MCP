---
status: resolved
trigger: "Phase 10 Plan 10-59 production live entrypoint does not wire the certified terminal evidence owner"
created: 2026-09-14
updated: 2026-09-14T11:45:00+10:00
---

# Debug Session: Terminal Owner Unwired

## Symptoms

- expected_behavior: `npm run review:auto-live-once` must create a fresh generation and, before every terminal return, atomically seal and internally validate 10-59 TRANSITION, EXECUTION, PROOF, and LOCAL_VALIDATION evidence.
- actual_behavior: Read-only preflight shows `runFixedAutomaticLive()` only delegates to `runStatefulAutomaticLive()` and writes `.10-59-live-state.json` plus `.10-59-terminal-snapshot.json`; the certified production path never invokes the terminal-owner capability or local execution/proof audits.
- error_messages: Plan 10-59 checkpoint reports that running the command would irreversibly consume the only new generation while omitting four required canonical artifacts, repeating the Plan 10-51 evidence-loss failure.
- timeline: Discovered on 2026-09-14 after Plans 10-53 through 10-58 completed, exact-source review passed, and the unique 10-58 immutable image was built.
- reproduction: Read the production call graph rooted at `runFixedAutomaticLive()` or run only the provider-free preflight inspection; observe no production call to `createTerminalOwnerCapability`, `auditExecutionAuto`, or `auditProofAuto`. Do not invoke the live command.

## Current Focus

- hypothesis: The Plan 10-54 executor implemented only state and terminal-snapshot durability, while Plan 10-55 implemented only isolated auditor primitives; their completion checks tested each half independently and never enforced the plan's production call-graph contract, so exact-source certification preserved an already-unwired implementation.
- test: Compare the exact reviewed commit with the working tree and run a provider-disabled static reachability assertion for the owner capability, both local audits, and LOCAL_VALIDATION path.
- expecting: The reviewed commit and working tree are identical for the relevant source and both lack every production terminal-owner symbol/path, ruling out post-certification drift.
- next_action: Resolved and ready for owning workflow recertification; preserve the unused 10-59 live opportunity.
- reasoning_checkpoint:
    hypothesis: "Independent seam-only tests caused false completion: the producer never constructs canonical TRANSITION/EXECUTION/PROOF/LOCAL_VALIDATION or invokes owner-only audits, and certification reviewed those missing calls unchanged."
    confirming_evidence:
      - "The fixed production entrypoint and stateful runner contain none of createTerminalOwnerCapability, auditExecutionAuto, auditProofAuto, or the LOCAL_VALIDATION locator."
      - "The 10-57 reviewed commit 07c8cbc contains the same missing production wiring, while git diff shows no later relevant source change."
      - "A provider-disabled static reachability assertion fails with all four production dependencies missing."
    falsification_test: "Finding any reachable production call from runFixedAutomaticLive to all four canonical artifact writers and both local auditors, either in the reviewed commit or current tree, would disprove the hypothesis; none exists."
    fix_rationale: "Introduce one outer terminal-evidence owner around every return branch, enrich the authenticated snapshot/record conversion to satisfy exact execution and proof schemas, atomically reopen/hash all artifacts, run both capability audits, seal the receipt, and add an in-process fixed-entrypoint regression."
    blind_spots: "No live, Docker, credential, provider, or network path was executed; all five branches must be validated with injected/PATH-stubbed fixtures before recertification."
- tdd_checkpoint:

## Evidence

- timestamp: 2026-09-14T00:00:01+10:00
  checked: Knowledge base and project skill discovery
  found: The prior contract-drift entry matches evidence ownership and certification-scope terms; no project-defined `.codex/skills` or `.agents/skills` rules exist.
  implication: Treat duplicated/isolated authority as a candidate, not proof; normal repository conventions apply.
- timestamp: 2026-09-14T00:00:02+10:00
  checked: Production call graph and fixed paths
  found: `runFixedAutomaticLive` only supplies build authentication, generation, state, terminal snapshot, and credential reader to `runStatefulAutomaticLive`; the module does not import or call `createTerminalOwnerCapability`, `auditExecutionAuto`, `auditProofAuto`, or `closeTerminalOwnerCapability`, and `FIXED_AUTOMATIC_PATHS` omits localValidation.
  implication: The four-artifact terminal-owner contract is unreachable from production.
- timestamp: 2026-09-14T00:00:03+10:00
  checked: Existing tests
  found: `automatic-live-review.test.ts` asserts only dispatcher presence/source substrings while `audit-proof-chain.test.ts` exercises owner capabilities with hand-built records; no test drives the real stateful/fixed producer through terminal sealing and local audits.
  implication: Isolated seam coverage allowed certification to pass despite missing production wiring.
- timestamp: 2026-09-14T00:00:04+10:00
  checked: Provider-disabled static production reachability assertion
  found: The assertion exited 1 with `UNWIRED:createTerminalOwnerCapability,auditExecutionAuto,auditProofAuto,10-59-LOCAL-VALIDATION.json`.
  implication: The reported gap is reproducible without live, Docker, credentials, network, or canonical evidence mutation.
- timestamp: 2026-09-14T00:00:05+10:00
  checked: Certified source identity versus current working tree
  found: 10-57 SOURCE certifies commit `07c8cbc44e147bc3fc85d9c910fbe3f30b9f2f48`; `git show` of that commit contains `runFixedAutomaticLive` but none of the terminal-owner symbols, and relevant source diffs are empty.
  implication: Post-certification drift is ruled out; the faulty call graph itself was reviewed and certified.
- timestamp: 2026-09-14T00:00:06+10:00
  checked: Compatibility between retained terminal snapshots and strict execution schema
  found: Passed snapshots retain only result counts and abbreviated transcript, while `auditExecution` requires provider/model/provenance/public_schema plus transcript exit/close codes; several failure snapshots omit lifecycle required when tools=1. Credential absence also occurs after the authenticated transition but produces 0/0/0 evidence, conflicting with the authenticated-branch reservation requirement.
  implication: Importing and calling the auditor functions alone cannot fix the bug; producer payloads and branch ordering must be repaired together.
- timestamp: 2026-09-14T11:41:00+10:00
  checked: Fixed-entrypoint provider-disabled integration regression
  found: `runFixedAutomaticLive` now traverses the real stateful owner on an injected preflight failure, performs no credential read, and seals TRANSITION, EXECUTION, PROOF, and LOCAL_VALIDATION with both local audits passed before returning the stable preflight error.
  implication: Production reachability is now exercised rather than inferred from isolated exports or source substrings.
- timestamp: 2026-09-14T11:42:00+10:00
  checked: Harness terminal payload and failure lifecycle
  found: Passed snapshots now contain exact provider/model/provenance/public-schema result fields and transcript exit/close codes; failure cleanup records a separately observed consistent lifecycle when available without waiting indefinitely.
  implication: The terminal snapshot can supply strict execution records without inventing provider output or lifecycle facts.
- timestamp: 2026-09-14T11:43:00+10:00
  checked: Full provider-disabled regression and TypeScript build
  found: 600/600 tests passed, `npm run build` passed, and `git diff --check` passed. Docker builds/runs, credential reads, provider/network/paid requests, GitHub Actions, push, and dispatch were all zero.
  implication: The fix is self-verified offline and preserves the unused 10-59 opportunity.


## Eliminated

- hypothesis: A post-certification source edit removed otherwise-correct terminal-owner wiring.
  evidence: Relevant source has no working-tree diff, and the exact 10-57 reviewed commit itself lacks all terminal-owner calls and the LOCAL_VALIDATION locator.
  timestamp: 2026-09-14T00:00:05+10:00


## Resolution

- root_cause: Plan 10-54 stopped at authenticated terminal snapshot/state persistence and Plan 10-55 stopped at isolated capability/auditor APIs. Their tests asserted separate helpers and source substrings rather than exercising `runFixedAutomaticLive` through canonical terminal record production, so execution summaries and 10-57 certification incorrectly treated an incomplete plan contract as complete. The retained snapshot schema is also insufficient for the strict execution schema, proving the missing work is coordinated producer wiring rather than one omitted function call.
- fix: Wired `runFixedAutomaticLive` to a same-process terminal evidence owner; added canonical 10-59 LOCAL_VALIDATION path; atomically sealed/reopened/hashed transition, execution, proof and validation receipt; invoked and closed the unforgeable execution/proof auditor capability before return; enriched success snapshots with exact public result/transcript fields; captured observed failure lifecycle without hanging; corrected the contradictory preflight branch receipt predicate; added a real fixed-entrypoint preflight integration regression using temporary files and injected external boundaries.
- verification: Self-verification passed focused suites and full provider-disabled 600/600, TypeScript build, and git diff check. Human-independent verification confirmed focused production-entry 169/169, full provider-disabled 600/600, build and diff check; all four canonical 10-59 artifacts remained absent/untouched. No external side effect occurred. Source changes truthfully stale 10-57 certification and 10-58 build.
- files_changed:
  - scripts/automatic-live-review.mjs
  - scripts/docker-review-real.mjs
  - scripts/audit-proof-chain.mjs
  - tests/scripts/automatic-live-review.test.ts
