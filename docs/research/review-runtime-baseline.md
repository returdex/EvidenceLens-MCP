# Review runtime baseline

## Flow

Frozen source commit: `3462c30fd8e0db34e69f22cc6f02d7e957c914db`; product 0.3.17. Byte SHA-256 below is computed with git show, not from mutable working files.

| Source | SHA-256 |
|---|---|
| `package.json` | `a943539f6e2be8329d05378e27ef593586bbd023d1e95913cb9a8914c0461399` |
| `.planning/config.json` | `508f86b1443f17ba4964137ce0632a3d1539cbbf3b689833f9cb9651ded90ada` |
| `skills/assignment-review/references/stage-prompts.md` | `29e43441a25d2a6c26d3a394ca2d5fa773b5df63e88eb71aed5885c528856eaf` |
| `skills/assignment-review/scripts/codex-contract.mjs` | `051a473df52bae6ff2ca3edd1887c6a2e0674b7fd8fbcc527f4d8de7fc41876d` |
| `skills/assignment-review/scripts/codex-runner.mjs` | `0e54c3cedd63bfd9dcc0d34ed11275485352e3bc211fb3aace5d7bf7ceaedac9` |
| `skills/assignment-review/scripts/deepseek-review.mjs` | `35bd9a255baf3e5b2fb124e21c28b61400b79aa2b972ebc1c960c0c462427d45` |
| `skills/assignment-review/references/command-entrypoints.md` | `537370f6eeb306a6996bb3b7d0b79819ce21ce5312574dc5954a2d04e5edaef3` |

The four entry skills el-prepare/check/final/recheck route to preparation/in_progress/final; recheck uses the explicit or prior stage, otherwise in_progress. No separate recheck wire stage exists. Entry routing is host skill orchestration, not a central executable dispatcher. Current command-entrypoints defaults to DeepSeek plus Codex; the milestone's single Codex default is a future change. el-settings is not_implemented.

Source selection precedes content reads. codex-review.captureEvidencePrompt validates the source capsule, splits UTF-8 excerpts at 4096 bytes, appends renderCodexOutputGuide with the complete v3 schema, then captures exact hashed prompt bytes. Both providers reuse this guide. Codex: once-only claim → preflight → isolated dispatch → event supervision → shape → local source binding → transactional store → review-handoff. DeepSeek: once-only claim → frozen prompt HTTP JSON request → terminal/shape → local source binding → provider sidecar/store → handoff. Neither valid JSON nor process exit alone establishes success. Handoff defaults to all findings; explicit summary retains omitted IDs/full-record access; host semantic assessment is separate from binding. Grade assessment remains not_assessed.

Limits: 100 sources/excerpts/findings; final 240 KiB; envelope 256 KiB; event line 512 KiB; output 2 MiB; preflight 10 s; review 600 s; termination grace 2 s. Failures retain minimal receipts, without rejected raw responses. No automatic replay or fallback.

## Failure ledger

| caseId | Source | Observed status / code / terminal | Cause | Affected path / reproduction |
|---|---|---|---|---|
| legacy-0141 | docs/codex-diagnostics-repair.md | uncertain; terminal=false; cleanup=true; original exit/trigger unavailable | unknown: original receipt cannot explain the early failure | runner; preserve historical receipt |
| home-denial | docs/codex-startup-repair.md | startup read denial; inference not dispatched | confirmed historical HOME/CODEX_HOME leakage, subsequently sealed | isolation; existing tests/codex/isolation.mjs (not run here) |
| model-catalog | same startup repair | historical pinned model missing from catalog | confirmed for that recorded version, current applicability unknown | preflight; do not generalize |
| cache-ttl | same startup repair | nonfatal cache log caused supervised termination; model_unavailable misclassification | confirmed historical logger-prefix classifier error, fixed exact allowance | runner; no live replay here |
| v2-quote | docs/codex-reference-repair.md | source_mismatch / binding_quote_missing after terminal response | quote mismatch confirmed; whitespace cause hypothesis because raw rejected text unavailable | binding; v3 local-fill now avoids regenerated quotes |
| fenced-json | current codex-result.mjs | result_invalid / json_syntax; no runtime receipt | confirmed offline format rejection | tests/codex/result.mjs |
| display-field | current codex-contract.mjs | result_invalid / fields | confirmed offline strict shape rejection | same test |
| foreign-reference | current codex-result.mjs | source_mismatch with binding trigger | confirmed trust-boundary rejection | same test |
| wrong-identity | current codex-result.mjs | source_mismatch / binding_identity_mismatch | confirmed trust-boundary rejection | same test |
| false-coverage | current codex-result.mjs | source_mismatch with binding trigger | confirmed trust-boundary rejection | same test |

## Reproduction

Synthetic fixtures only. Run `node --test tests/codex/result.mjs`. The plan's duplicated filename is run once. The new combined v3 control/rejection test checks actual safe codes and diagnostics. Fences/display fields are compatibility candidates for Phase 23; foreign references, identity and coverage cannot be relaxed. No production behavior is changed by Phase 22.

## Unknowns

No current live provider, CLI, auth, billing or host isolation acceptance was run. Offline rejection does not establish any historical root cause. Semantic correctness, grade prediction, all-stage reliability and rejected-response contents remain unknown. Existing fixes do not prove every current feature works.
