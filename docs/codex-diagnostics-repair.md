# Codex failure diagnostics repair — 0.3.4

Date: 2026-10-05 (Australia/Melbourne). User requested repair of the A4 independent-review diagnostic shown in a screenshot.

## Confirmed problem and boundary

Read the existing private execution receipt only: pinned CLI 0.141.0, approximately 0.5 seconds, uncertain, terminalObserved=false, cleanupComplete=true and resultSha256=null. It contains no error event, exit code or trigger branch. The original cause cannot be reconstructed from that receipt. No coursework prompt was replayed and no actual provider inference was requested during this repair. No private receipt, assignment text or identifiers are copied into this repository.

The observed code defects were loss of failure context, loss of observed terminal facts when local result binding throws, and an unproven cleanupComplete=true default if the supervisor itself throws after dispatch.

## Implemented

- New executions use strict execution v2 with bounded diagnostics: stage/trigger, allowlisted event/item types, CLI error category, errno, observed exit code/signal, close/thread/turn observations and whether local termination was requested. No free-form error text, paths, tool arguments, reasoning or credentials are retained.
- Legacy execution v1 reads remain supported without rewriting old receipts. Snapshots, lifecycle, model result schema, binary pin, launch args and OS isolation policy are unchanged.
- Result binding failures preserve actual terminal/exit/cleanup observations while denying publication of an unvalidated result. Supervisor exceptions after dispatch retain uncertain cleanup and block unsafe deletion.
- First rejection survives subsequent cancellation/cleanup; final status and cleanupComplete retain final-state meaning. Publication failures return a bounded publication diagnostic without claiming a persisted terminal result.
- `codex-review.mjs diagnose` reads an explicit task/run in the current conversation, checks record identity and lifecycle coherence, and reports not_started/pending/not_recorded/recorded. It neither reads the captured prompt/result nor dispatches any process. The installed assignment-review symlink points to this checkout, so the repair is available from installed stage commands.
- Shared instructions explain safe diagnostics and recovery. No automatic resend, model switching, isolation relaxation or host fallback was added.

## Verification

All commands below exited 0. Tests are synthetic/offline, including actual pinned Codex against a loopback fixture using fabricated authentication. They do not establish remote inference or coursework review success.

| Check | Result |
|---|---|
| `npm run build` | PASS, fresh 0.3.4 build |
| `node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs` | 173/173, 12.699 seconds, before final two extra diagnostic cases |
| Final changed-boundary rerun: diagnostics, runner, acceptance, prompt lifecycle and retention | 80/80, 8.367 seconds, includes all 30 diagnostic cases |
| `node --test tests/baseline/source-boundary.mjs` | 12/12, 0.476 seconds |
| Six affected Vitest files listed below | 118/118, 3.08 seconds |
| Scoped `git diff --check` | PASS |

```sh
node --test tests/codex/diagnostics.mjs tests/codex/runner.mjs tests/codex/acceptance.mjs tests/prompts/lifecycle.mjs tests/prompts/retention.mjs
npm test -- tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts
```

The diagnostic cases cover first-error preservation, unknown-type redaction, malformed output, missing terminal, nonzero/signal exits, ENOENT versus permission denial, timeout/cancellation, cleanup uncertainty, result binding failure, publication failure, strict schema/accessor rejection, legacy read-only inspection, identity mismatch and actual CLI failed/429/500 fixture responses. Fixture failure requests occur once; synthetic auth/installation/outside-file contents remain unchanged. Existing success, at-most-once dispatch, exact export, deletion and source-boundary controls pass. Vitest emitted existing fixture PDF font/index warnings without failures.

Inline review checked closed diagnostic fields, no free-form error persistence, diagnostic reader authority/locking, process cleanup and no-replay boundaries. The original startup failure remains an unknown historical cause; future failed runs now supply safe observations for further diagnosis. Phase 21 remains ready with 0/6 plans complete; its context and version target were reconciled to baseline 0.3.4 and next accepted feature patch 0.3.5. No Release/tag is part of this repair.
