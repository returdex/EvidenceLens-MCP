---
phase: 20-bounded-independent-codex-execution
status: clean
depth: standard
reviewer: inline-executing-agent
files_reviewed: 32
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
resolved_findings: 7
reviewed: 2026-10-05
---
# Phase 20 — Code review

Inline review under the Codex skill adapter; no independent subagent claim. Scope: 32 changed Skill/source/test files between planning baseline e949b92 and implementation 72b7c3f, including version-only expectations. Lock metadata separately checked without dependency changes. Counts above describe open findings after repair.

## Reviewed paths and interactions

- Six codex modules: contract, preflight, isolation, runner, result and installed CLI. Checked strict input limits, immutable captured stdin, fixed binary/policy capability, environment/auth authority, tool detection, terminal ordering, cancellation and local citation binding.
- prompt-contract/store/records: v1 compatibility, v2 ownership, concurrent claim, dirty publication, cancellation at the locked commit boundary, exact latest export and safe deletion.
- Shared Skill/entrypoint/protocol references and codex/prompts/command tests: no production test-adapter override, no host success fallback, help/export remain non-dispatching, actual installed helper paths exercised.
- src/server.ts, src/tools/review.ts and affected current fixtures/assertions: product version only; analyzerVersion and public shape preserved.

## Resolved findings

[Host acceptance](20-HOST-ACCEPTANCE.md) records five repairs made during Plan 05: shared deadline; evidence/runtime overlap; launcher cleanup uncertainty; noncredential metadata/auth diagnostics; cancellation decision ordering.

Final review reproduced two additional defects with failing tests (2/2 failed before repair):

1. **WR-20-01, resolved:** `/tmp` canonicalizes to `/private/tmp`, but the new scratch overlap check reused its lexical path. The launcher now keeps canonical protected roots for both checks. Actual alias and direct-root negatives pass before dispatch.
2. **WR-20-02, resolved:** a preflight result with cleanupComplete=false lost that value in the runner; probes also treated leader close as group disappearance. The runner preserves uncertainty, probes confirm owned group disappearance, and isolation retains its journal/scratch when cleanup is unconfirmed. A real orphan with closed stdio and a synthetic uncertain-preflight/deletion test pass.

Fix commit: 72b7c3f. Targeted repair controls 3/3 passed, then all 157 Node tests passed. The un-dispatched scratch produced by the intentionally failing alias control was identified by its exact newly created path/owned control files and removed; no broad cleanup was used.

## Remaining limits

No open actionable finding in the scoped review. Pinned macOS/CLI evidence is not universal isolation certification. The CLI owns auth, OS administrator/install ownership is trusted, semantic entailment is not proven by quote matching, and remote inference/model access/usage remain Phase 21 NOT_RUN. An unexpected internal tool continuation may already send another HTTP request before local termination; no remote rollback guarantee is made.
