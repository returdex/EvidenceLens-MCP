# Pitfalls Research — v1.2

**Date:** 2026-10-04
**Confidence:** High for observed interface distinctions; medium for unimplemented controls.

| Failure mode | Prevention and observable check | Phase |
|---|---|---|
| A command name exists only in a README | Install in a supported discovery location and verify selection from a separate project | 18 |
| Prompt export regenerates instructions from today's files | Compare captured prompt bytes across export, edited files and repeated exports | 19 |
| Export returns another task's last successful review | Scope by task/conversation, test concurrent and failed runs, show missing-record state | 19 |
| Stage generation silently runs a provider | Stage commands execute; export/help are deterministic local operations without model dispatch | 18–19 |
| Read-only is mistaken for evidence isolation | Try excluded-file and inherited-tool access; verify actual denial, not prompt obedience | 20 |
| Shared login credentials leak into snapshot/child output | Codex owns auth; validate logs/exports and limit inherited environment | 20 |
| Parent review recursively calls the same command/MCP | Explicit runner capability configuration and recursion detection | 20 |
| Timeout triggers a second billable attempt | No automatic rerun; record uncertain/interrupted state and require explicit fresh action | 20 |
| Successful process exit is mistaken for valid review | Require terminal success, valid final schema and locally valid source references | 20–21 |
| Missing usage becomes zero or quota deltas become cost | Nullable usage with source/scope; no inferred currency or cross-task totals | 21 |
| No actual independent evaluator is used in acceptance | Label synthetic checks separately and perform a bounded real Codex acceptance when authorized | 21 |

## Version and Historical-Proof Risks

Installed CLI 0.141.0 may differ from newer documentation; generated local protocol schemas are the compatibility reference. The public docs use `account/usage/read`; the local response schema is named `GetAccountTokenUsageResponse`, so generated type names and RPC names must not be conflated. JSONL includes more than final answers: retain approved fields only rather than persisting every event.

Changing the product version makes historical source fingerprints historical. Preserve prior evidence bytes, do not relabel paid proof as current and do not replay paid tests for a documentation/version update. The fresh initialization tests cover only the touched version/contract expectations.

## Recovery and Acceptance

Missing CLI/auth: show one actionable setup step and leave the review not run. Invalid result: preserve failure classification without adopting findings. Record corruption: export unavailable, not reconstructed. Expired authorization: require renewed scope before another run. Optional quota endpoints failing must not invalidate a completed review.

## Sources

- Local CLI help/status/generated schemas inspected 2026-10-04; no live inference.
- Existing source gate and v1.1 stage/recheck workflows.
- [Non-interactive events](https://learn.chatgpt.com/docs/non-interactive-mode), [app-server protocol](https://learn.chatgpt.com/docs/app-server).
