# Codex startup and model migration — 0.3.5 through 0.3.8

Date: 2026-10-05, Australia/Melbourne.

## Reproduction and cause

The reported new private execution receipt records process/unexpected_stderr, permission, exit 1, no thread/turn observed and complete cleanup. Inspecting that safe metadata did not read its coursework prompt.

A diagnostic launch using the real home and a synthetic string, with network removed from the OS allowlist, reproduced an immediate generic permission error before JSONL events. Only bounded/redacted startup diagnostics were inspected. Then the exact pinned CLI was tested with fabricated authentication and a local loopback server:

| Synthetic home | Original home selection | Sealed per-run home |
|---|---|---|
| Existing agents directory | Permission failure before thread.started; zero model requests | Completed response, exit 0; one synthetic request |
| Existing models_cache.json | Denied cache-read stderr rejected by supervisor | Completed response, exit 0; one synthetic request |

The CLI attempts ambient agent discovery despite `--ignore-user-config` and disabled multi_agent. Earlier fixtures created global config/skills/memory but omitted an agents directory and existing model cache. The actual production-launcher test only constructed the descriptor and did not start exec. Those test gaps let local positive results miss this real-home failure. The reproduced cause explains the new receipt; older receipts without diagnostics remain historical unknowns.

## Repair and safety (0.3.5; HOME completion below)

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

## Prepared one-shot real smoke — AUTHORIZED, FAILED ON 0.3.5

The user was asked for one synthetic run with the existing Codex ChatGPT login and fixed gpt-5.4, no coursework, no automatic retry and no model switch. The user subsequently replied “允许”; that approval was used for exactly one run on 2026-10-05 at 05:09:45–05:09:46 Australia/Melbourne. No retry was sent. The exact source is:

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


## Authorized result and follow-up HOME repair — 0.3.6

The one real run on 0.3.5 returned failed/protocol_invalid, process/unexpected_stderr, permission, elapsedMs=925, threadObserved=false, turnObserved=false, terminalObserved=false, cleanupComplete=true, resultSha256=null. The supervisor requested termination; the process closed on SIGTERM. Captured/exported prompt bytes were unchanged. Exact captured prompt SHA-256: `f3540ca0afe1342194e5b8d7fd47a283fb91940eb61311337acde919f5b6ce95`. The private authoritative receipt remains in the current chat's T-codex-startup-smoke task. No A4 input was sent. Remote model request completion/usage is unknown, not zero.

Further network-denied diagnostics inspected only bounded/redacted startup output and identified an attempted read of original HOME/.agents/skills. CODEX_HOME-only isolation did not close this ambient entry point. Existing synthetic HOME fixtures lacked that directory, and the prior actual-host test checked turn-start events but did not reject this stderr. This is a second concrete coverage gap, now addressed.

0.3.6 sets both HOME and CODEX_HOME to the sealed per-run directory; original environment is used only by status preflight. Fixtures now create HOME/.agents/skills with an injection sentinel and compare old-HOME failure with new-HOME success. The actual-host network-denied test also asserts there is no failed skills-directory read. No stderr allowlist relaxation, credential copying or expanded original-file access was added.

The isolation digest now includes createIsolatedLaunch itself, so production environment wiring is pinned along with the home constructor: `9f5a980e3514e194497acb08e2e456fdf3911f562e1115b6ccdd17865bcc92ff`. This supersedes the prior 0.3.5 contract hash. Auth/installation preservation and forced-tool controls remain verified.

The single live authorization is consumed. This local repair does not authorize a further real request, and post-0.3.6 real inference has not run. Phase 21's two-run acceptance remains separate and pending; next accepted feature patch is 0.3.7. Earlier 0.3.5 startup evidence remains historical, not an end-to-end success claim.

0.3.6 final validation: fresh build passed; Node Codex/prompt/command/source-boundary suites 195/195 with zero failures/skips (9.575 s); six affected Vitest files 118/118 (4.05 s). Scoped diff/secret/private-identity checks passed. No post-fix real dispatch occurred.


## Second authorized smoke on 0.3.6 — model catalog mismatch

On 2026-10-05 at 05:16:08–05:16:09 Australia/Melbourne, the user's next direct “允许” authorized one further run of the same reviewed synthetic source/template on 0.3.6. It was executed exactly once, without A4 content, automatic retry or model switch.

The private sequence-2 receipt records failed/protocol_invalid with process/unexpected_event, eventType=item.completed, itemType=error and reportedErrorCategory=model_unavailable. It observed thread.started, but no turn.started or completion. elapsedMs=1044, cleanupComplete=true, resultSha256=null; the supervisor requested termination and observed SIGTERM. Exact export remained unchanged. Captured prompt SHA-256: `5c1e62a1eb148c75b0117e5e93974d184cbe968f4c95693f5d20b2124af23fb7`. This is not a successful review; remote token consumption is unknown.

The earlier permission failure did not recur in this attempt. Afterward, read-only `codex debug models` was queried first normally and then in a newly created sealed production home, with no existing model cache and the original read-only auth alias. No exec/inference command was invoked by these catalog queries. Both outputs listed gpt-5.5 (visibility=list) and codex-auto-review (visibility=hide); neither listed the pinned gpt-5.4. This corroborates a pinned-model/catalog mismatch. A listed model is a candidate for a future test, not evidence of completed inference. Raw catalog instructions and credentials were not printed or persisted.

Current version remains 0.3.6; no runtime code or model pin changed in this turn. The proposed next step is an explicitly authorized change of the fixed model to listed gpt-5.5, revalidation of the isolation contract and one new same-source synthetic live test. The current one-run approval is consumed. No automatic fallback was performed. Phase 21 RUN-05 and the two-run handoff/recheck acceptance remain pending.


## User-directed GPT-6 migration — 0.3.7

The user explicitly requested a GPT-6 model instead of the proposed GPT-5.5 change. The selected model is `gpt-6.1-sol`, reasoning effort `low`, consistent with the installed desktop configuration. The runner now selects the desktop CLI 0.160.0 Mach-O executable directly (not its shell wrapper or the older Homebrew executable); binary SHA-256 `6b582e8813ce7e8ed4c52814ee5cf230dba647bf2292df747a4003f2657ef201`. The immutable executable/model profile is included in the isolation digest, now `f356ee3c6904eccd7f2d33454298ad53ecfd9077bb8bd7721c42b5baa6038050`. An application update changes this pin and requires recertification. Existing execution receipts from CLI 0.141.0 remain readable and immutable.

Local compatibility investigation found that CLI 0.160.0 synchronizes macOS managed preferences at startup. Denying its two CFPreferences read-only shared-memory channels reproduced the startup failure with zero loopback requests. The policy grants only read-data for `apple.cfprefs.daemonv1` and the current user's `apple.cfprefs.<uid>v1`, plus read-only access to preference domain `com.openai.codex`; no preference writes, shared-memory writes, broad application-directory reads or original-home reads were added. The [official loader implementation](https://github.com/openai/codex/blob/main/codex-rs/config/src/loader/macos.rs) documents the managed domain and synchronization; the actual binary tests establish compatibility. The stderr allowlist recognizes the exact new module names for already-tested denied system-skill/cache writes. Unknown stderr remains rejected.

Actual binary loopback observations: the schema-output request supplies model `gpt-6.1-sol` and reasoning `low`, and offers no tools. Injected tool calls are still rejected, and authentication/outside-file sentinels remain unchanged. CLI 0.160.0 also passes the native sandbox sibling-read/write negative control that historically failed on 0.141.0; production retains its explicit Seatbelt boundary. Production preflight reports executionReady=true with the new model, without inference.

### Real result — failed, not restored

The user's model-change instruction continued the prepared model-change-and-one-smoke workflow. Exactly one same-source synthetic run was dispatched on 2026-10-05 at 05:28:41–05:28:42 Australia/Melbourne. It reached both thread.started and turn.started, then failed with protocol_invalid, process/unexpected_stderr and reportedErrorCategory=model_unavailable. Elapsed 1767 ms; terminalObserved=false; resultSha256=null; cleanupComplete=true; termination requested and process closed on SIGTERM. Captured prompt SHA-256 `e2f2054e4db37b4e377138bd462586a900ec82a8b92490249f2972595b6957ed`; exact prompt export remained unchanged. No A4 coursework was replayed and no automatic resend/model switch occurred.

After failure, a read-only catalog query using the production isolated home and the same provider/feature configuration listed gpt-6.1-sol, gpt-6-astra, gpt-6-sol and gpt-6-luna. Bundled metadata also lists these models. Thus the earlier missing-catalog explanation alone does not establish the cause of this new failure. The receipt's category is a hint, not proof of account ineligibility or a provider rejection; raw stderr was not retained. Further diagnosis must distinguish model metadata warnings from actual remote errors. Remote usage remains unknown, not zero. The pin change is complete, but a successful real independent review is still unverified. Phase 21 stays 0/6 and RUN-01–05 pending; its next feature patch is 0.3.8.

### Validation

- Fresh `npm run build`: passed at 0.3.7.
- Node Codex/prompt/command/source-boundary regression: 196/196, no failures/skips, 11.251 s; live smoke is dry-run under test discovery.
- Six affected Vitest files: 118/118, 2.47 s.
- New coverage includes denied CFPreferences synchronization before dispatch, request model/reasoning identity, absent tool catalog, CLI 0.141.0 historical receipt inspection, and current native sandbox behavior.
- No release/tag; active milestone and non-blocking review-quality reminders are unchanged.


## Cache TTL rejection repair and real success — 0.3.8

The user requested continued diagnosis and repair. The final cause was a non-fatal model-cache message rejected by the supervisor, combined with a misleading classifier. This exact line is produced by CLI 0.160.0 when a model catalog response has an ETag and an inference response echoes that same `x-models-etag`, while the sealed per-run home has no persistent model cache:

```text
<timestamp> ERROR codex_models_manager::manager: failed to renew cache TTL: cache not found
```

The generic classifier searched the complete log line for `model.*not found`; the logger name `codex_models_manager` supplied “model” and the cache message supplied “not found”. It therefore reported model_unavailable, although the message did not identify an unavailable model. The supervisor terminated the otherwise active review on this unexpected stderr line. The [official cache implementation](https://github.com/openai/codex/blob/main/codex-rs/models-manager/src/cache.rs) describes cache failures as non-fatal and returns “cache not found” on missing TTL storage. Source inspection informs the explanation; the exact pinned binary reproduction establishes behavior for this host.

### Reproduction and bounded fix

The loopback fixture now supplies a catalog ETag and matching inference response header. Without supervision, the real binary emits the exact TTL message, produces the complete schema result and exits 0 after one inference request. With the repaired supervisor it produces a source-valid candidate after one request, with authentication, original installation metadata and outside files unchanged. This closes the gap in older fixtures, which omitted the server's catalog-version headers.

Only the exact timestamped ERROR / codex_models_manager::manager / cache-TTL-miss line is tolerated. Changed cache messages, cache permission errors, model_not_found, unknown stderr and tool activity remain rejected. The error classifier strips a conventional logger prefix before matching message content and provides separate bounded model_cache_missing and model_metadata_missing hints. No raw CLI text or model reasoning is retained; old execution receipts remain unchanged.

A candidate OpenAI protocol identity/version-header adjustment was tested during diagnosis and did not resolve the failure. It was reverted before the final test. The final fix preserves the existing bounded provider, fixed gpt-6.1-sol / low, no-retry flags, binary/isolation digest, sealed home and access policy. No preference/cache write permissions were added.

### Dispatch accounting

The continuation included three failed, explicitly dispatched same-source diagnostic runs before the final repair validation. They did not replay old execution records, change the approved synthetic source/template, or introduce automatic retry:

| Purpose | Australia/Melbourne time, 2026-10-05 | Elapsed | Outcome | Captured prompt SHA-256 |
| --- | --- | --- | --- | --- |
| Separate metadata diagnostics | 14:14:02–14:14:04 | 2599 ms | failed / unexpected_stderr / model_unavailable | 18d5622aeb34da63d071b305016d7885e7ab0018832c7e756ce7a35da20cc7a6 |
| Protocol compatibility candidate | 14:17:27–14:17:29 | 1833 ms | failed / unexpected_stderr / model_unavailable | 2daaf0ba850db32d1fac4c7218daf28308c57bf5689b77a4cb74e81274c9faf6 |
| Restricted diagnostic keyword probe | 14:18:44–14:18:46 | 1954 ms | failed / unexpected_stderr / model_unavailable | 2a182a2e4b4c3037a7ea0667fcdaf308406335983f241089023cc6c9ff3e9420 |
| Exact cache-TTL repair validation | 14:22:07–14:22:14 | 6699 ms | succeeded | e697a741ec2b453e903a5786a31e168c2f23bba0aca7b8adecdf17a5cf22c79d |

All four retained their immutable prompt exports and completed cleanup. The keyword probe emitted only a fixed-vocabulary subset, “model” and “not found”; its temporary instrumentation was removed. Each failed run remains a failure in private history. No A4 coursework was submitted to these probes.

### Real accepted result

The final production runner returned succeeded, observed thread/turn/terminal completion, exitCode=0, no exit signal, cleanupComplete=true and terminationRequested=false. Result SHA-256 `d2c32e8f5e2b5bc6bdefca3def04800399beef0679dfd043123e92f5a4dec0d0`. The model response covers R1 / E1, has no findings, and correctly limits its scope to the synthetic preparation check. The existing result validator verified identities, coverage and sources before publication.

A subsequent read-only result load confirmed the persisted envelope digest. Export through the installed assignment-review skill path returned status=succeeded and the same captured prompt digest. The installed skill resolves to this repository, so this repair is active there. The requested GPT-6 model configuration is preserved; the CLI terminal event does not separately expose a provider-attested effective-model field or account usage. The successful smoke demonstrates actual bounded review, validation, storage and export; A4 requirements and Phase 21's revised-source/two-run/usage acceptance have not been evaluated by this smoke.

### Final verification

Product 0.3.8: fresh build passed; Node Codex/prompt/command/source-boundary suites 199/199, zero failures/skips, 10.505 s; six affected Vitest files 118/118, 2.52 s. Focused cache/protocol/supervisor/diagnostics checks 62/62, 7.754 s. Inline review confirms the whitelist is exact, failure categories retain no free text, no policy/credential changes remain, and genuine failures still cannot publish success. No Release/tag. Phase 21 stays 0/6; its next accepted feature patch is 0.3.9.
