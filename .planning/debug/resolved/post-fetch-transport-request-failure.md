---
status: resolved
trigger: "Plan 10-100 reached one authenticated provider send then failed post-fetch at request/transport.fetch"
updated: 2026-09-16T13:50:00+10:00
---

# Debug Session: post-fetch-transport-request-failure

## Symptoms

- Expected behavior: one provider request returns a structurally valid review response and complete provenance.
- Actual behavior: one authenticated send occurred, then request_failed/post_fetch_non_pass with sanitized request/transport.fetch; clean exit/close and local validators passed.
- Error messages: sanitized transport.fetch request failure only.
- Timeline: first generation to prove the complete Docker/MCP/request-receipt path and reach the provider network.
- Reproduction: consumed Plan 10-100 must not replay; use sealed diagnostic, offline transport fixtures and official provider contract only.

## Current Focus

- reasoning_checkpoint:
    hypothesis: "post-fetch diagnostics are missing because fetchWithRetry converts transport/status failures to sanitized ProviderError values without ever invoking DiagnosticSink; only later response/provenance failures emit authenticated features"
    confirming_evidence:
      - "src/providers/retry.ts has no DiagnosticSink input or emission on timeout, HTTP status, or rejected fetch"
      - "src/providers/deepseek.ts emits diagnostics only after a Response is returned, during response JSON/content/provenance validation"
      - "the harness collector received no frame and therefore set stream_truncated true and classified an empty feature list as ambiguous"
    falsification_test: "an injected terminal fetch rejection or non-ok Response produces an authenticated allowlisted transport feature before any code change"
    fix_rationale: "emit exactly one closed structural transport category at the production retry owner when the terminal outcome is known; the existing authenticated bounded sink and harness registry then carry it without changing public errors, request count, or retries"
    blind_spots: "native fetch cause shapes vary by Node/undici version; therefore only exact allowlisted cause codes with strict object shape may classify, and every unknown, aggregate, proxy/accessor, or detail-bearing shape must remain ambiguous"
- hypothesis: confirmed — terminal transport outcomes were sanitized in fetchWithRetry without a DiagnosticSink emission path.
- test: completed — production injected-fetch categories, authenticated stderr drain, ambiguity cases, proof-chain compatibility, focused/full offline tests, build, and diff checks all pass.
- expecting: achieved — recognized terminal outcomes retain one detail-free authenticated category; ambiguous shapes retain no category; public errors and one-send/retry0 behavior are unchanged.
- next_action: archive the resolved session and append the knowledge-base entry

## Evidence

- timestamp: 2026-09-16T12:10:00+10:00
  checked: immutable evidence commit a2d76d9 and production adapter/retry implementation
  found: sealed execution records exactly one reserved and observed provider request, max_retries 0, diagnostic request at transport.fetch, no result/model, and clean MCP process close/exit code 0; production acquires the send budget immediately before POSTing to `${baseUrl}/chat/completions`.
  implication: construction completed and fetch was invoked once; response parsing and provider-output validation were never reached, so offline tests must distinguish options/abort/error mapping from an external fetch rejection.

- timestamp: 2026-09-16T12:20:00+10:00
  checked: reviewed commit 71f7e79 versus current transport/config/tests and authenticated diagnostic mapping
  found: no diff exists in deepseek.ts, retry.ts, config.ts, or their focused tests; authenticated evidence maps every observed-send non-pass to request/transport.fetch, while the child diagnostic was absent/stream-truncated and therefore cannot distinguish DNS, TLS, socket, abort, HTTP status, or other fetch rejection.
  implication: the sealed diagnostic identifies the boundary but not a deterministic cause; status parsing cannot have run unless fetch returned a Response, and there is no evidence that it did.

- timestamp: 2026-09-16T12:30:00+10:00
  checked: focused provider/retry suites, TypeScript build, and full provider-disabled test suite
  found: 15/15 focused transport tests passed, build passed, and 634/634 offline tests passed, including injected success, one-send proof rejection, non-transient status, transient fetch rejection, timeout, and no-retry behavior. The generic docker:smoke command stopped at Compose interpolation because the sealed proof profile requires EVIDENCELENS_PROOF_DEEPSEEK_API_KEY even though the smoke script requested offline config.
  implication: no adapter construction, timeout, status, or error-mapping defect reproduced; the Docker result is a preflight invocation/config question and did not exercise transport.

- timestamp: 2026-09-16T12:45:00+10:00
  checked: provider-disabled Docker smoke using a synthetic parse-time proof-profile placeholder only
  found: image build, offline initialize/tools-list/tools-call, four-fixture review, read-only filesystem check, and missing-key fail-closed check all passed; the container reported zero provider calls/external requests. No live provider credential or provider send was used.
  implication: the complete local Docker/MCP path is healthy and does not reproduce the post-fetch failure.

- timestamp: 2026-09-16T13:15:00+10:00
  checked: retry-to-diagnostic-to-stderr-to-terminal/proof chain
  found: fetchWithRetry owns timeout/status/rejection classification but accepts no DiagnosticSink; deepseek emits only after a Response during decode/provenance failures. The authenticated collector and classifier already accept exactly one bounded allowlisted feature and reduce zero, duplicate, unknown, malformed, or detail-bearing frames to ambiguous.
  implication: diagnostic insufficiency is a deterministic local defect with a minimal owner: the retry layer must emit a single closed terminal transport feature, while the existing authenticated channel enforces bounded detail-free transport.

- timestamp: 2026-09-16T13:35:00+10:00
  checked: production adapter injected-fetch regressions and authenticated harness drain
  found: all nine permitted terminal categories (dns, tls, connection, network_timeout, timeout, http_error, rate_limited, server_error, retry_budget) now emit exactly one structural feature; unknown code, aggregate/multiple causes, and detail-bearing root/cause objects emit none. A post-fetch DNS frame and observed-send retry0 receipt authenticate and drain to a post_fetch_non_pass terminal snapshot with stream_truncated false.
  implication: the missing/truncated diagnostic is fixed without raw messages, URLs, hosts, bodies, stacks, errno values, or credentials entering the frame or retained diagnostic.

- timestamp: 2026-09-16T13:50:00+10:00
  checked: focused proof-chain suite, TypeScript build, full provider-disabled suite, and diff whitespace
  found: 239/239 focused tests passed, build passed, 648/648 full offline tests passed, and git diff --check passed. Public ProviderError serialization and generic execution proof diagnostic remain unchanged; proof mode still enforces maxRetries 0 and one observed send.
  implication: the fix is verified entirely offline and is compatible with the existing authenticated proof chain.


## Eliminated

- hypothesis: malformed deterministic request construction or incompatible fetch options cause the failure
  evidence: injected transport success validates the POST body, authorization/header placement, signal, endpoint construction, multimodal payload, and provider result path; focused and full suites pass.
  timestamp: 2026-09-16T12:45:00+10:00

- hypothesis: timeout, HTTP-status, or transport-error mapping has a deterministic defect
  evidence: injected non-transient status, transient TypeError, abort timeout, retry exhaustion, and explicit proof no-retry tests all pass, including exactly one proof send with max_retries 0.
  timestamp: 2026-09-16T12:45:00+10:00

- hypothesis: Docker/MCP orchestration corrupts or prevents the provider request locally
  evidence: provider-disabled Docker smoke completes initialize, tools/list, tools/call, four fixtures, clean process handling, and filesystem/preflight guards.
  timestamp: 2026-09-16T12:45:00+10:00


## Resolution

- root_cause: fetchWithRetry owned the terminal timeout/status/rejection decision but had no DiagnosticSink, so it converted every fetch-level failure into a public sanitized ProviderError before any authenticated structural feature could be emitted. The harness consequently received zero frames, marked stream_truncated true, and retained only ambiguous request/transport.fetch.
- fix: Threaded the existing DiagnosticSink into fetchWithRetry and added a closed allowlist of nine structural terminal categories. Native rejection classification accepts only exact TypeError/cause shapes and allowlisted cause codes/keysets; unknown, aggregate, accessor/proxy-like, or detail-bearing shapes emit nothing. Registered the categories in the authenticated child channel and invariant registry, with post-fetch stderr-drain coverage.
- verification: 239/239 focused transport/diagnostic/harness/proof-chain tests, TypeScript build, 648/648 full offline tests, and git diff --check passed. No live/provider request occurred; public error serialization, proof execution schema, one-send receipt, and retry0 remain unchanged.
- files_changed: [src/providers/retry.ts, src/providers/deepseek.ts, src/providers/diagnostics.ts, scripts/docker-review-real.mjs, tests/providers/deepseek.test.ts, tests/scripts/docker-review-real.test.ts]
