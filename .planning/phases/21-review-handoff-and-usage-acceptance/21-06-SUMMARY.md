---
phase: 21-review-handoff-and-usage-acceptance
plan: "06"
status: complete
requirements-completed: [RUN-01, RUN-02, RUN-03, RUN-04, RUN-05]
completed: 2026-10-05
---

# Plan 06 — Accepted patch and scoped verification

Task 01 updates current metadata consistently from 0.3.16 to 0.3.17; root lock metadata only, no dependency or public shape change. Task 02 updates current expectations and records fresh regression.

Build 0.3.17: exit 0 (0.763 s). Node: node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/*.mjs — 276/276, 19.795 s, no skips/failures. Offline Vitest with EVIDENCELENS_DISABLE_PROVIDER=1: seven Plan 06 files, 124/124, 2.99 s, exit 0. Existing PDF font/index warnings did not fail tests.

Inline trust-boundary review: exact task/conversation/run binding; trusted frozen bundles; closed-schema byte-bound evidence; admitted prior provenance; immutable source-result/host sidecar digests; private permissions/retention and symlink rejection; complete escaped finding output; inspection/annotation has no dispatch; requested/reported model and usage provenance remain distinct. No actionable high-severity finding remains. Field-order repair is at shared creation boundary, covered by reversed-key persisted roundtrip.

Plan 05 acceptance commit b02fc43; preparation commit 867ae41. Version and verification committed together after these gates. Self-check: six summaries, current metadata agreement, 4/4 goal criteria and RUN-01–05 evidence in 21-VERIFICATION.md. Milestone remains v1.2; no Release/tag or archival. RR/FM and A1.3 semantic work remain deferred.
