---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-13T09:01:55Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - package.json
  - scripts/audit-live-evidence.mjs
  - scripts/audit-proof-chain.mjs
  - scripts/automatic-live-review.mjs
  - scripts/docker-review-real.mjs
  - scripts/live-proof-state.mjs
  - scripts/sync-proof-state.mjs
  - tests/scripts/audit-live-evidence.test.ts
  - tests/scripts/audit-proof-chain.test.ts
  - tests/scripts/automatic-live-review.test.ts
  - tests/scripts/docker-review-real.test.ts
  - tests/scripts/live-proof-state.test.ts
  - tests/scripts/sync-proof-state.test.ts
findings:
  blocker: 6
  warning: 2
  info: 0
  total: 8
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-13T09:01:55Z
**Depth:** deep
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The Phase 10 gap implementation is not shippable. The automatic commands are stubs, invariant diagnostics are disconnected from the live harness, proof-chain modes accept wrong artifact types, the final proof is not authenticated against Git/execution state, request limits are advisory, and shutdown can report success without observing `close`. The focused suite passes (192/192), but a direct check confirmed `review:auto-build` always exits 50 and a SOURCE record incorrectly passes `build` audit mode.

## Blockers

### BL-01: Advertised automatic commands are unconditional stubs

**File:** `scripts/automatic-live-review.mjs:123-127` (`package.json:19-20`)
**Issue:** `main()` validates `auto-build` or `auto-live-once` and then always throws `AUTOMATIC_PREFLIGHT`. It never authenticates artifacts, creates durable state, builds, verifies, or invokes the live harness. Plans 10-28 and 10-35 stopped before Docker for this exact reason, so the planned route cannot close PROV-01.

**Fix:** Implement fixed repository-relative dispatch. Wire `auto-build` to canonical SOURCE/review authentication, exclusive build state, one-build production, and immutable verification; wire `auto-live-once` to ready-build authentication, durable consumption, and exactly one pinned harness execution. Add subprocess tests for both package commands.

### BL-02: Diagnostic taxonomy is dead code

**File:** `scripts/docker-review-real.mjs:92-123,539-577`
**Issue:** The invariant map/classifier is called only by tests. No parsing, validation, lifecycle, or outer error path creates a feature vector or calls `classifyDiagnostic`; real failures remain only `[docker-review:protocol] failed`. Therefore the promised invariant/fingerprint cannot route an actual repair.

**Fix:** Produce typed canonical `{path,code}` failures at allowlisted throw sites, classify once at the outer boundary, and persist only the allowlisted diagnostic separately from the public error. Add a `runReviewHarness` transcript test that verifies the retained diagnostic rather than directly unit-testing the classifier.

### BL-03: Proof-chain modes accept wrong schemas and counts

**File:** `scripts/audit-proof-chain.mjs:149-154`
**Issue:** `build`, `diagnostic`, `repair`, `proof`, and `proof-preflight` accept any number of individually valid records sharing identity. They do not enforce mode-specific schema, order, or cardinality. Demonstrably, `node scripts/audit-proof-chain.mjs build 10-34-SOURCE.json` passes.

**Fix:** Define an exact schema/path sequence and cardinality for every mode, authenticate committed authority inputs, and add subprocess rejection tests for wrong, missing, extra, reordered, and duplicate records.

### BL-04: A self-asserted JSON proof can close PROV-01

**File:** `scripts/audit-proof-chain.mjs:58-67,149-154`; `scripts/audit-live-evidence.mjs:18-34`; `scripts/sync-proof-state.mjs:109-117`
**Issue:** Final validators check only key shapes, hex formatting, outcome, and counts. They never call `auditGitIdentity`, bind to diagnostic/build/repair artifacts, or prove a consumed live generation produced the result. The synchronizer then treats any owner-only canonical proof file as sole authority. A fabricated ten-key passed object can therefore switch both phase reports and REQUIREMENTS to passed.

**Fix:** Certify proof against exact committed SOURCE/reviews, final build, diagnostic, repair set, immutable generation, and durable consumed result/request record. Require synchronization to consume that committed chain-certified proof, not merely a mode-0600 JSON file.

### BL-05: Request limits are delegated to an untrusted callback

**File:** `scripts/automatic-live-review.mjs:81-93,96-120`
**Issue:** The live functions only pass a controls object to `spawnOnce`; they do not constrain the actual process, count tool/provider calls, disable retry themselves, or bind the callback to `runReviewHarness`. A callback can ignore the object and make multiple requests while durable state records at most one. Mock tests voluntarily comply and do not prove enforcement.

**Fix:** Construct the pinned Docker child and bounded MCP operation inside the reviewed executor, or expose a capability that atomically consumes the sole request token. Reject a second attempted call before it occurs and test with a deliberately noncompliant adapter.

### BL-06: Success can be emitted without a child `close` event

**File:** `scripts/docker-review-real.mjs:476-522`; `tests/scripts/docker-review-real.test.ts:473-482`
**Issue:** If listeners attach after `exitCode`/`signalCode` becomes non-null, `waitForChildClose` immediately settles using those properties and never observes `close`. The test blesses this by setting only `exitCode=0`. Success may therefore be printed before stdio teardown or a later stream failure, violating the clean-close invariant.

**Fix:** Capture `close` evidence from child creation onward and require actual consistent exit/close metadata. Never infer close from `exitCode`. Test exit-before-listener/close-later, missing-close timeout, mismatched metadata, and late stream errors.

## Warnings

### WR-01: Provider request count records intent, not observation

**File:** `scripts/automatic-live-review.mjs:108-115`
**Issue:** The count becomes one before spawn and is hard-coded to one at terminal transition even when spawn fails before sending a request. This is conservative for replay safety but inaccurate as cost evidence.

**Fix:** Store separate monotonic reservation and observed-request fields. Reserve before spawn, update observation only at the guarded request boundary, and never let uncertainty authorize another attempt.

### WR-02: Final status audit is not scoped to unique frontmatter

**File:** `scripts/audit-live-evidence.mjs:28-33`
**Issue:** Phase status uses the first `^status:` anywhere, not exactly one YAML-frontmatter field. Duplicate checklist/trace rows are also accepted. Body-only or contradictory status text can satisfy the audit.

**Fix:** Parse one frontmatter block with one status key and require exactly one PROV-01 checklist and trace row. Add duplicate, missing-frontmatter, body-only, and conflicting-state tests.

---

_Reviewed: 2026-09-13T09:01:55Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
