# Codex actual-home startup repair — 0.3.5

Date: 2026-10-05, Australia/Melbourne.

## Reproduction and cause

The reported new private execution receipt records process/unexpected_stderr, permission, exit 1, no thread/turn observed and complete cleanup. Inspecting that safe metadata did not read its coursework prompt.

A diagnostic launch using the real home and a synthetic string, with network removed from the OS allowlist, reproduced an immediate generic permission error before JSONL events. Only bounded/redacted startup diagnostics were inspected. Then the exact pinned CLI was tested with fabricated authentication and a local loopback server:

| Synthetic home | Original home selection | Sealed per-run home |
|---|---|---|
| Existing agents directory | Permission failure before thread.started; zero model requests | Completed response, exit 0; one synthetic request |
| Existing models_cache.json | Denied cache-read stderr rejected by supervisor | Completed response, exit 0; one synthetic request |

The CLI attempts ambient agent discovery despite `--ignore-user-config` and disabled multi_agent. Earlier fixtures created global config/skills/memory but omitted an agents directory and existing model cache. The actual production-launcher test only constructed the descriptor and did not start exec. Those test gaps let local positive results miss this real-home failure. The reproduced cause explains the new receipt; older receipts without diagnostics remain historical unknowns.

## Repair and safety

- Each run gets a `control/codex-home` directory, sealed 0500 under the read-only control boundary. Review CODEX_HOME points there; HOME and status-only preflight stay as before.
- Its auth.json is a symlink to Codex's validated original auth file. EvidenceLens never reads, copies or prints credential bytes. The OS allows the same original auth read as before and forbids original writes, alias replacement, directory writes and auth refresh writes.
- Its installation_id is a private copy of the existing noncredential value. Only this temporary copy gets required data/mode write permission. The original installation_id no longer has runtime write permission; original value/auth inode-size-mtime invariants are still checked at cleanup.
- No ambient agent/config/cache/skill/memory files are copied or granted review access. The original stderr allowlist, tool rejection, fixed model, once-only dispatch, source binding and no-retry rules are unchanged.
- Cleanup removes the owned temporary alias and metadata, preserving the original login files. The isolation contract digest now covers the home constructor: `4d3c2134f857f156471d9b408815d7c13ab525f2c84a09f49d3094ecb4ee766a`. Binary and dyld pins are unchanged.

The local CLI help specifies that ignore-user-config concerns CODEX_HOME/config.toml. Official [configuration guidance](https://learn.chatgpt.com/docs/config-file/config-basic) describes configuration locations; it does not establish this version-specific agents discovery behavior. The cause and repair above are grounded in the actual pinned CLI experiments.

## Verified

- Fresh `npm run build`, product 0.3.5: passed.
- `node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs`: 194/194, zero failures/skips, 10.481 s. Manual live-smoke script uses dry-run under this glob and performs no inference.
- Six affected Vitest files: 118/118, 3.48 s. Existing synthetic PDF font/index warnings remain; no failures.
- Focused startup/isolation/protocol/supervisor batch: 39/39, 7.650 s.
- New tests preserve old failure controls and prove successful synthetic completion, no ambient marker exposure, denied alias/original-auth writes and deletes, rejected forced tools targeting the alias, unchanged synthetic authentication/installation/outside files, and actual-host startup with network denied.
- The actual-host network-denied process now emits thread.started, turn.started and then the expected network failure. It cannot make a real inference request under that policy; this is startup evidence, not successful model feedback.
- Inline review checked that no credential bytes are copied, the private auth alias cannot be replaced by the child, the original auth/installation paths have no runtime write allowance, cleanup owns its temporary files, and original isolation negative controls remain effective.

## Prepared one-shot real smoke — PENDING AUTHORIZATION

The user was asked for one synthetic run with the existing Codex ChatGPT login and fixed gpt-5.4, no coursework, no automatic retry and no model switch. No answer has been received as of this record; elapsed time is not approval. The exact source is:

> Submit one text file containing exactly READY.

Source SHA-256: `7f37bd36198b5af7960f82412de74c3a42819fe903d75e00d57d4c0ffad3ff44`.

The six-section prompt asks only whether this requirement is clear enough to start, requires capsule identities and source-bound JSON, forbids tools and notes that this is synthetic. Prompt template SHA-256: `738e65ae4b9b352072a3b93270821d9a558ccd5b497b59eaa7883d8f39a7bf59`. See [the complete prepared script](../tests/codex/startup-live-smoke.mjs). Generated local run identity/capsule produce the final immutable prompt hash at capture.

```sh
# Read-only preparation, safe to run without approval:
node tests/codex/startup-live-smoke.mjs
# Only after applicable explicit user authorization, exactly once:
node tests/codex/startup-live-smoke.mjs --execute-authorized-once
```

The run uses the production capture/runner/source validation and preserves a private receipt under task T-codex-startup-smoke in this chat. It compares exact prompt exports before/after and reports only the validated result or safe failure. It does not replay either A4 attempt. Stop after any failed/uncertain outcome; another real attempt requires applicable authorization. This single smoke does not replace Phase 21's two-run handoff/recheck/usage acceptance. Phase 21 stays 0/6; next accepted feature patch is 0.3.6. No Release/tag is part of this repair.
