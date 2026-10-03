# Phase 17: Retrospective Validation and Audit Closure — Context

**Gathered:** 2026-10-04
**Status:** Approved scope; detailed plans pending
**Source:** User confirmed the two-phase proposal after the v1.1 tech-debt audit.

## Boundary

Close TD-12 / VAL-03; TD-13 / VAL-04; TD-14 / VAL-05; TD-15 / VAL-06. Depends on Phase 16. Follow the phase goal, three task groups and success criteria in [ROADMAP](../../ROADMAP.md). The [audit](../../v1.1-MILESTONE-AUDIT.md) is the original debt snapshot; [requirements](../../REQUIREMENTS.md) separately track new validation obligations. Original CTX/POL/SKL/TPL/DIS/REV completion and phase assignments stay intact.

## Confirmed decisions

- D-01: Scope is the six named v1.1 verification debts only. No automatic Codex integration, publication, private coursework collection or reopening of accepted v1.0 debt.
- D-02: Prefer existing tools/tests and minimal isolated environment repair. Dependency installation or changes must address a diagnosed need; avoid production dependencies just to run a development validator. Exact environment strategy belongs to detailed planning.
- D-03: Separate successful automated checks, inline/manual language judgments, skipped checks and unresolved host limits. No fake classifier or document-heading test can establish semantic correctness. Do not mark Nyquist compliant just by creating a file.
- D-04: Preserve prior evidence and test failures; record fresh commands, source identity, outcomes and bounded runtime. Diagnose stalled reads before restarting expensive commands; no paid proof replay, live-provider call, remote CI or remote mutation.
- D-05: Plan each new phase's own validation artifact alongside its work. Reconcile status frontmatter and report bodies; original audit debt stays open until actual closure evidence exists.
- D-06: Planning keeps version 0.2.4. An actual later feature/fix follows DEVELOPMENT.md only when justified; documentation-only cleanup is not an automatic product-version bump. Existing remote-history hold and no auto-advance persist.

## Handoff

Reconstruct Phase 12-15 task maps from their actual plans, summaries, tests and semantic reports; create the four VALIDATION.md files with honest sign-off. A remaining manual-only item can remain PARTIAL and must stay visible at re-audit. Do not turn review of those files into new independent-model proof. Re-audit the expanded milestone after execution; archive/release/synchronization remain separate.
