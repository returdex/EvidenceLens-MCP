---
phase: 19
status: passed
threats_total: 11
threats_open: 0
auditor: inline-executing-agent
---
# Phase 19 — Planned threat mitigations

| Threat | Implemented mitigation | Evidence |
|---|---|---|
| T-19-01 identity/path | Strict host IDs, hashed paths, original IDs checked, private owner/no-follow ancestors and files | contract/store; lifecycle P19-05/06/08 |
| T-19-02 crash/latest race | Begin reservation, short lock, head revision, expectedRunId, dirty-lock preservation | store, lifecycle P19-01–04; owned SIGKILL tests |
| T-19-03 content/limits | Strict allowlists, bounded UTF-8/JSON/arrays/registry, recognized credentials rejected, safe errors | contract and CLI negative tests |
| T-19-04 export reconstruction | Same validated saved bytes; raw byte assertions; export never invokes consumer | CLI/store tests; four actual host hashes |
| T-19-05 cleanup scope | Exact task, tombstone first, fixed validated files, foreign/unknown preservation | retention tests and actual T19 deletion |
| T-19-06 ambiguous identity | CODEX_THREAD_ID checked, task ambiguity explicit, no global/history fallback | CLI tests and current-host identity assertion |
| T-19-07 source/seed | Existing gate before source reads, alias exclusion, current binding, six-section host instructions | lifecycle P19-07 and source-boundary suite; manual host traces |
| T-19-08 proof attribution | executionKind=host_skill, host-reported outcomes, independent runner deferred | contract, route and evaluation |
| T-19-09 mock versus host evidence | Separate subprocess assertions and actual dispatch-before-review/finish-after-review receipts | 19-PROMPT-EVALUATION.md |
| T-19-10 fixture/process scope | Synthetic private temp roots, explicit child ownership and cleanup | Node tests; runtime wrapper group_remaining=false |
| T-19-11 version/history | Version-only expectation edits, exact dependency equality and fresh build | 19-RUNTIME-EVIDENCE.md; historical phase diff empty |

No open planned threat; this verifies scoped mitigations rather than proving universal isolation or exhaustive secret detection. Host composition is trusted, hostile same-user processes and backups are outside scope. No authorization to read unrelated history or replay provider proof was exercised. UI and database gates are not applicable.
