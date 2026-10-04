# Prompt capture synthetic acceptance

All fixture data are invented test inputs, never real course requirements. No live provider or independent Codex request. Existing stage/source/template/disclosure rules remain authoritative. Deterministic checks run `node --test tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs` from the checkout.

| Case | Check | Evidence |
|---|---|---|
| P19-01 | Concurrent first begins serialize; busy attempt never authorizes older fallback | lifecycle.mjs child IPC barrier |
| P19-02 | Owned child killed after state/head publication keeps dirty lock | lifecycle.mjs, actual SIGKILL/exit |
| P19-03 | Child killed between snapshot and lifecycle publication | lifecycle.mjs |
| P19-04 | Export racing a new head returns busy | lifecycle.mjs revision check |
| P19-05 | Parallel conversation sentinel isolation | lifecycle.mjs |
| P19-06 | Corrupt index/state/snapshot never yields older text | lifecycle.mjs |
| P19-07 | Source changes and excluded aliases/seed do not expand reads or alter saved prompt | actual collectBaselineSources, lifecycle.mjs |
| P19-08 | Task-directory symlink and nonsticky shared parent rejected | lifecycle.mjs; private sticky-temp fixture accepted |
| P19-09 | Current source exists as solution in manifest; successful status has no failure code | lifecycle.mjs |
| P19-10 | UTF-8/CRLF/hash, extras/accessors/limits/credentials, terminal transitions | contract.mjs |
| P19-11 | Begin order, failed latest before/after capture, lost receipt, no_record | store.mjs |
| P19-12 | Real CLI raw bytes, consumer at-most-once, no import output, identity mismatch | cli.mjs |
| P19-13 | Dry run, tombstone, interrupted deletion, unknown/link preservation, new generation | retention.mjs |
| P19-14 | Installed sibling symlink from external Unicode cwd, missing helper | commands/skill-contract.mjs |

## Actual current-host trial (manual semantics)

Use only a new private synthetic state root outside Git/evidence and task T19 in the current executing chat. Read installed el-prepare/check/final/recheck/prompt entries and shared routes. Confirm CODEX_THREAD_ID matches this known conversation; do not dump environment or read private histories. All helper invocation must use the installed path. Begin before collection/assembly; record returned identities and source read traces. The following are acceptance inputs, not expected-output mocks:

- Synthetic brief R19-1, line 1: `Choose A or B and give one reason.`
- current-v1, line 1: `I choose A.`
- current-v2, line 1: `I choose A because it uses less memory.`
- An excluded history document and its support alias must never be read; an older draft is never current. Teacher guidance, rubric and original template absent; mark unknown.

1. `$el-prepare T19`: no draft. begin, gate/collect brief, compose six sections, capture, dispatch exact stored text, manually perform preparation. Persist finish only after review, then el-prompt export twice; compare dispatch/export UTF-8 hashes.
2. `$el-check T19 current-v1`: same lifecycle, identify actual gap against R19-1 and establish F19-1/A19-1 with current text evidence. Capture before judgment. Export after finish.
3. `$el-final T19` with unreadable designated current: keep final, do not use old draft; report unknown and a bounded handoff. Finish describes host work, not assignment approval. Export after finish.
4. `$el-recheck T19 current-v2` explicitly in_progress: carry only allowed F19-1/A19-1 summary, examine current evidence and decide lifecycle. Export after finish. Change a synthetic source after capture and show exports stay unchanged.
5. Begin another latest run then finish failed before capture: export is explicitly unavailable, never the preceding success. Also exercise captured failed output via the library/CLI tests.
6. Save sanitized read lists, receipt IDs/hashes, actual stage outputs, state/export observations and manual judgments to the phase evaluation. Invoke forget-task dry run and apply for only this fixture; confirm export deleted. Keep storage payloads outside Git. Current-host trials are not fresh GUI discovery, another project/host proof or independent-model evaluation.
