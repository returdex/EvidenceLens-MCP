# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## phase10-plan-contract-drift — Repeated cross-plan evidence protocol contradictions
- **Date:** 2026-09-14
- **Error patterns:** plan contract blockers, evidence ownership, tuple cardinality, LOCAL-VALIDATION omission, undeclared test ownership, ROADMAP authority drift, certification scope
- **Root cause:** The evolving evidence protocol was duplicated across prose, task ownership manifests, caller-supplied command arguments, and ROADMAP lifecycle declarations instead of being consumed through one canonical fixed registry and explicit single-owner boundaries.
- **Fix:** Centralized exact branch tuples in fixed-location zero-argument registry commands; assigned forensic, producer/lifecycle, authority-crossover, and read-only disconfirmation tests to Plans 10-53, 10-54, 10-55, and 10-56 respectively; bound Plan 10-57 certification through 10-56; made later plans read-only test consumers; and synchronized ROADMAP counts and historical/active authority states.
- **Files changed:** .planning/ROADMAP.md, 10-PATTERNS.md, 10-53-PLAN.md, 10-54-PLAN.md, 10-55-PLAN.md, 10-56-PLAN.md, 10-57-PLAN.md, 10-59-PLAN.md, 10-60-PLAN.md
---

## terminal-owner-unwired — Certified fixed live entrypoint omitted terminal evidence ownership
- **Date:** 2026-09-14
- **Error patterns:** terminal owner unwired, canonical artifacts absent, LOCAL_VALIDATION omission, production call graph, isolated seam tests, certified source gap
- **Root cause:** Plan 10-54 stopped at authenticated terminal snapshot/state persistence and Plan 10-55 stopped at isolated capability/auditor APIs; tests never exercised the complete fixed production call graph, so certification preserved the missing integration and an insufficient snapshot schema.
- **Fix:** Wired the fixed live entrypoint to same-process canonical artifact sealing and owner-only audits, enriched terminal payload and lifecycle evidence, corrected the preflight receipt predicate, and added a temporary-path provider-disabled production-entry integration regression.
- **Files changed:** scripts/automatic-live-review.mjs, scripts/docker-review-real.mjs, scripts/audit-proof-chain.mjs, tests/scripts/automatic-live-review.test.ts
---

## automatic-terminal-missing-before-tools — Post-reservation preflight escaped terminal ownership
- **Date:** 2026-09-14
- **Error patterns:** AUTOMATIC_TERMINAL_MISSING, terminal_callback_missing, reservation_count 1, mcp_tools_call_count 0, observed_provider_requests 0
- **Root cause:** runReviewHarness awaited its fallible live-proof Docker Compose preflight after the automatic wrapper consumed the one-shot reservation, but before terminal and request-evidence ownership was initialized and outside its guarded lifecycle, so rejection returned no terminal callback.
- **Fix:** Initialized retention ownership before resolveLiveProof and retained an authenticated pre_tools_post_reservation 0/1/0 terminal and request evidence on preflight failure; added a real production-owner regression and stable isolated current-authority lifecycle coverage.
- **Files changed:** scripts/docker-review-real.mjs, tests/scripts/automatic-live-review.test.ts, tests/scripts/audit-proof-chain.test.ts
---

## pre-fetch-before-tools-call — Inactive proof profile blocked review Compose preflight
- **Date:** 2026-09-14
- **Error patterns:** pre_fetch, transport.fetch, preflight, tools/call count 0, missing EVIDENCELENS_PROOF_DEEPSEEK_API_KEY, mutable current namespace
- **Root cause:** Docker Compose interpolated the inactive proof service before profile filtering; the review-only preflight omitted the proof-only required variable and aborted before child spawn, while the outer evidence layer mislabeled the zero-send preflight as transport.fetch. A separate mutable-current regression also hardcoded one lifecycle error for a namespace that can legitimately become READY.
- **Fix:** Resolve Compose config with fixed non-secret review/proof sentinels while keeping the real review credential only in the review child environment; make the mutable-current audit assert either structured READY success or a finite sanitized rejection family, always with zero watched writes and zero external effects.
- **Files changed:** scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts, tests/scripts/audit-proof-chain.test.ts
---
