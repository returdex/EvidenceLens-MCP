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

## post-tools-pre-fetch-ambiguous — Failed tools/call evidence sampled before asynchronous drain
- **Date:** 2026-09-14
- **Error patterns:** post_tools_pre_fetch, AUTOMATIC_TERMINAL_STATE, tools/call count 1, observed provider sends 0, null receipt, null lifecycle, stream_truncated, ambiguous diagnostic
- **Root cause:** After terminating a failed tools/call child, runReviewHarness sampled receipt, diagnostic, and lifecycle collectors before asynchronous stderr/end/exit/close delivery completed, sealing an incomplete tuple that strict auditors correctly rejected.
- **Fix:** Await the existing bounded lifecycle after SIGTERM before sampling collectors; preserve authenticated receipt/send invariants; add a provider-disabled production-path asynchronous-drain regression and fail-closed mutable-current registry coverage.
- **Files changed:** scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts, tests/scripts/audit-proof-chain.test.ts
---

## post-tools-prefetch-exit-130 — Parent cleanup preempted authenticated failure evidence
- **Date:** 2026-09-14
- **Error patterns:** tools/call count 1, provider sends 0, request_failed, pre_fetch, transport.fetch, exit 130, close 130, execution validation failed, proof validation failed, null request receipt
- **Root cause:** runReviewHarness immediately sent SIGTERM after tools/call failure, before stdin EOF could let the child complete its failure/finally path and emit the authenticated request receipt. The provider AbortController could not explain zero-send evidence because the request budget is acquired synchronously before transport.fetch.
- **Fix:** Close stdin and allow a bounded graceful lifecycle drain before sending fallback SIGTERM; after forced termination, await the existing authoritative bounded lifecycle before sampling authenticated receipt and terminal collectors.
- **Files changed:** scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts
---

## clean-exit-missing-receipt — Process terminal events preceded buffered stderr delivery
- **Date:** 2026-09-16
- **Error patterns:** tools/call count 1, provider sends 0, exit 0, close 0, null request receipt, stream_truncated, post_tools_pre_fetch, execution validation failed, proof validation failed
- **Root cause:** runReviewHarness marked authenticated diagnostic and receipt collectors terminal on child process exit/close, and captureChildLifecycle rejected data after that process pair, even though Node may deliver already-buffered stderr data before the stderr stream emits end/close.
- **Fix:** Bind collector terminality to stderr end/close and lifecycle late-output rejection to each stream's own completion; retain rejection of frames emitted after the actual stderr terminal boundary and cover both process-event orders with provider-disabled production-harness regressions.
- **Files changed:** scripts/docker-review-real.mjs, tests/scripts/docker-review-real.test.ts
---

## docker-compose-clean-exit-no-receipt — Pre-provider tools/call failure skipped the sole receipt producer
- **Date:** 2026-09-16
- **Error patterns:** AUTOMATIC_TERMINAL_STATE, tools/call count 1, provider sends 0, null request receipt, stream_truncated, clean exit 0, post_tools_pre_fetch
- **Root cause:** Provider receipt emission was owned solely by createDeepSeekProvider.review(). Any tools/call failure before provider invocation bypassed its finally block, leaving a valid reservation and completed tools call with no authenticated receipt.
- **Fix:** Coordinate receipt ownership at createServer: preserve adapter emission as primary, record successful emission, and invoke the same authenticated budget receipt sink at tool settlement only when the adapter never emitted; retain one-shot duplicate rejection.
- **Files changed:** src/server.ts, src/tools/review.ts, tests/contract/review-tool.test.ts
---

## post-fetch-transport-request-failure — Fetch failures lacked authenticated structural diagnostics
- **Date:** 2026-09-16
- **Error patterns:** post_fetch_non_pass, request_failed, transport.fetch, stream_truncated, ambiguous diagnostic, observed provider requests 1
- **Root cause:** fetchWithRetry owned terminal timeout, HTTP-status, and rejected-fetch classification but sanitized those outcomes into ProviderError before any DiagnosticSink emission, so the authenticated harness received zero diagnostic frames.
- **Fix:** Threaded the existing diagnostic sink through fetchWithRetry; emit one of nine closed structural terminal categories for strictly recognized outcomes; retain ambiguity for unknown, aggregate, accessor/proxy-like, and detail-bearing shapes; registered and tested authenticated stderr drain and proof-chain compatibility.
- **Files changed:** src/providers/retry.ts, src/providers/deepseek.ts, src/providers/diagnostics.ts, scripts/docker-review-real.mjs, tests/providers/deepseek.test.ts, tests/scripts/docker-review-real.test.ts
---

## post-fetch-ambiguous-multiple-diagnostics — Receipt initialization consumed the child diagnostic capability
- **Date:** 2026-09-17
- **Error patterns:** post_fetch_non_pass, one authenticated provider send, ambiguous diagnostic, stream_truncated, local and committed gaps_found audits pass
- **Root cause:** Request receipt and child diagnostic channels shared `EVIDENCELENS_DIAGNOSTIC_GENERATION/KEY`; request-proof initialization consumed and deleted the variables before diagnostic initialization, making the production diagnostic sink a no-op. The suspected duplicate diagnostic producers were not present.
- **Fix:** Assigned child diagnostics an independent `EVIDENCELENS_CHILD_DIAGNOSTIC_*` capability namespace, forwarded both capability pairs into the Docker child, and added coexistence plus exact server-to-retry offline regressions for all nine terminal fetch categories.
- **Files changed:** src/providers/diagnostics.ts, scripts/docker-review-real.mjs, tests/providers/diagnostics.test.ts, tests/contract/review-tool.test.ts, tests/scripts/docker-review-real.test.ts
---

## container-child-diagnostic-forwarding — Certified image identity was not enforced at Compose runtime
- **Date:** 2026-09-17
- **Error patterns:** authenticated send receipt, missing child diagnostic, stream_truncated, stale mutable Compose tag, certified image mismatch, Node system Error subclass
- **Root cause:** The live chain recorded the authenticated build image ID only as evidence while Docker Compose ran a stale mutable tag; after pinning the exact image, transport classification still rejected Node's genuine direct system `Error` subclass because it required exact prototype equality.
- **Fix:** Threaded authenticated `build.image_id` into the harness, required an immutable `sha256:` image reference, resolved the Compose review service to that exact image, and accepted only descriptor-constrained direct system-error subclasses while retaining keyset, code, MAC, receipt, and send-count allowlists.
- **Files changed:** compose.yaml, scripts/automatic-live-review.mjs, scripts/docker-review-real.mjs, src/providers/retry.ts, tests/providers/deepseek.test.ts, tests/scripts/automatic-live-review.test.ts, tests/scripts/docker-review-real.test.ts
---

## json-extraction-shape-diagnostic — JSON extraction discarded safe structural failure shape
- **Date:** 2026-09-17
- **Error patterns:** provider-json-object-extraction, bounded balanced parser, one provider send, repeated broad extraction diagnostic
- **Root cause:** The bounded scanner preserved only success versus undefined, discarding closed structural failure state before the authenticated diagnostic sink.
- **Fix:** Return a closed internal result union and register content-free features for no candidate, multiple candidates, unbalanced, wrong root, structural context, and malformed JSON while preserving existing acceptance and public errors.
- **Files changed:** src/providers/deepseek.ts, scripts/docker-review-real.mjs, tests/providers/deepseek.test.ts
---

## prose-bracket-structural-context — Inert prose brackets were classified as JSON structure
- **Date:** 2026-09-17
- **Error patterns:** provider-json-object-structural-context, unique findings object, prose wrapper, unmatched square bracket
- **Root cause:** The bounded object extractor treated every square bracket outside the candidate object as structural JSON, including unmatched prose punctuation that could not form a JSON value.
- **Fix:** Added bounded string-aware square-bracket classification that ignores only clearly inert unmatched prose punctuation while retaining rejection of balanced ambiguity, parseable external values, JSON-like truncation, multiple objects, wrong roots, and unsafe keys.
- **Files changed:** src/providers/deepseek.ts, tests/providers/deepseek.test.ts
---

## extraction-diagnostic-frame-cardinality — New extraction diagnostics were suppressed before stderr
- **Date:** 2026-09-17
- **Error patterns:** extraction failure, ambiguous, stream_truncated, provider content object, zero authenticated diagnostic frames
- **Root cause:** e213bda expanded the producer and host invariant map with six extraction-shape codes but did not expand the child diagnostic channel's independent closed allowlist, so every new frame was suppressed before stderr.
- **Fix:** Added exactly the six extraction tuples to the child allowlist, exported the existing host collector for direct regression coverage, and tested the complete offline production chain while preserving fail-closed duplicate and unknown handling.
- **Files changed:** src/providers/diagnostics.ts, scripts/docker-review-real.mjs, tests/providers/diagnostics.test.ts, tests/contract/review-tool.test.ts
---

## provider-finish-reason-contract — Provider completion state was ignored before content parsing
- **Date:** 2026-09-17
- **Error patterns:** provider-json-object-unbalanced, clean HTTP lifecycle, one authenticated provider send, potentially truncated content
- **Root cause:** The DeepSeek adapter parsed `choices[0].message.content` without first validating `choices[0].finish_reason`, so token-limited and other non-normal completions were misclassified as derivative JSON-shape failures.
- **Fix:** Accept only exact `stop` for success; reject missing, wrong-type, and unknown reasons and authenticate closed diagnostics for `length`, `content_filter`, `tool_calls`, and `insufficient_system_resource` before content parsing.
- **Files changed:** src/providers/deepseek.ts, src/providers/diagnostics.ts, scripts/docker-review-real.mjs, tests/providers/deepseek.test.ts, tests/providers/vision-provenance.test.ts, tests/contract/review-tool.test.ts
---
