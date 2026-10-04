# Phase 20 — Current host acceptance

Date: 2026-10-05 Australia/Melbourne. Inline verification; no subagent or real coursework. Product before accepted patch: 0.3.2.

| Evidence class | Result | Exact boundary |
|---|---|---|
| Installed helper invocation | PASS | Existing user-root assignment-review symlink, external owned temporary cwd; current CODEX CLI preflight |
| CLI identity | PASS | macOS arm64, codex-cli 0.141.0, canonical Homebrew Cask binary |
| Auth status | PASS | Codex-owned existing ChatGPT login; separate no-network outer status profile; no credentials read/copied by EvidenceLens |
| Whole-process isolation | PASS for pinned R1 | Actual Seatbelt positive and outside/symlink/write negatives; runtime/evidence overlap rejected |
| Protocol/tool boundary | PASS offline | Actual pinned CLI + fresh fake HOME/auth + loopback fixture; four native tools only; forced native/external/recursive calls rejected |
| Retry boundary | PASS in enumerated failures | HTTP 429, 500, disconnect, truncated SSE, explicit failure each one model request |
| Four stage flows | PASS synthetic | Installed symlink CLI begin/capture/export from external cwd; trusted library adapter runs a real Node child, validates terminal/binding, returns exact saved bytes |
| Current host Skill metadata | PASS | Official validator seven positive packages; missing-description negative control fails |
| Discovery/native slash GUI | Historical/UNVERIFIED | Phase 18 discovery evidence inherited, no new chat/GUI observation; arbitrary /el-* not claimed |
| Real ChatGPT model inference | NOT_RUN | Phase 21 authorization and acceptance; fake responses are not model quality evidence |
| Semantic review completeness | PARTIAL | Exact quotes/identity are enforced; semantic entailment and usefulness remain manual/Phase 21 |

## Current installed preflight receipt

Invoked `node <installed assignment-review>/scripts/codex-review.mjs preflight`, stdin `{}`, from a newly owned temporary directory outside repo cwd. Exit 0. Complete preflight elapsed 382 ms. auth=chatgpt, executionReady=true, inference=not_run, fixed model=gpt-5.4. This is local dispatch readiness, not a remote model-access guarantee.

Binary SHA-256: `51f848c212ee24e8da923a7175813a74c113d47e01f0d40f1fea46b12644c363`.
Contract SHA-256: `8d6dbef7b9edec3c7089a34c6b22f652dccb0894ff202b335f429df05c7f7009`.
Instance policy SHA-256: `efd735949305f8b542b0be44a5df7c69e478c9d3628279bfcc4d78567155f95f` (includes that run's private random paths; future instance hashes differ, contract identity remains fixed).

Only safe status/digests were recorded. Real auth inspected by Codex itself only; EvidenceLens verifies ownership/mode/metadata, never auth content. Installation_id is noncredential metadata under the explicit user-approved R1 allowance. No actual auth/config writes or inference request.

## Tests

- Bounded combined Node suites (codex/prompts/commands/source-boundary): 154/154 pass, zero skips, exit 0, 7.945 s.
- After changing four positive flows to exercise actual installed CLI begin/capture/export: acceptance 16/16 pass, 4.039 s. Their model/process adapter is explicitly synthetic.
- Added complete/mid-codepoint UTF-8 citation control: result suite 19/19 pass, 0.095 s.
- Official quick_validate.py: assignment-review, el-help, el-prepare, el-check, el-final, el-recheck, el-prompt all exit 0. Missing-description fixture exits 1. Existing Python prerequisite reused, nothing installed/updated.
- Plan 06 reruns complete final Node suites and fresh build/version-dependent regression.

## Inline code review and repairs

1. Preflight stages previously each had separate caps. One shared 10 s deadline now spans version/status and sealed launch probes; each owned subprocess receives remaining time.
2. A broad temporary evidence root could overlap newly allocated scratch. Reject that overlap before launch, with positive ordinary-root and negative runtime/temp-root tests.
3. A failed launcher cleanup could be mislabeled clean before a descriptor was returned. Propagate cleanup certainty and owned scratch journal; uncertain cleanup prevents deletion. Do not remove scratch while process cleanup is unconfirmed.
4. Existing 0644 installation_id is valid noncredential metadata; still reject group/world write, hardlinks and symlinks. Missing file-backed auth reports unsupported auth mode/storage; never read keychain or copy credentials.
5. Cancellation is checked at the store's locked terminal decision boundary, after result validation but before terminal publication; a signal there wins once. Unknown stderr and post-terminal output still reject.

No unresolved critical finding in the scoped implementation. Historical native sandbox and initial strict-profile failures remain in 20-ISOLATION-EVIDENCE.md; they were not relabeled as passing. Real inference, detailed usage and semantic/handoff evaluation remain Phase 21.
