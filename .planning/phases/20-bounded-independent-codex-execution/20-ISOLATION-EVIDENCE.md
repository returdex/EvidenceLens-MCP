# Phase 20 — Actual isolation/protocol evidence

Date: 2026-10-05 Australia/Melbourne. **Gate: FAILED; Plan 20-02 incomplete.**
Product stays 0.3.2. No production launcher or stage dispatch enabled. No live inference.

## Reproduction

`node --test tests/codex/isolation.mjs tests/codex/protocol-host.mjs`

Observed: 13 tests, 12 pass, 1 fail, zero skips, exit 1, 2.133 s. These include diagnostic assertions that deliberately preserve native-profile failure; the pass count is not compatibility certification.

Combined bounded run: `node --test tests/codex/isolation.mjs tests/codex/protocol-host.mjs tests/codex/preflight.mjs tests/codex/contract.mjs`, Python subprocess outer timeout 120 s. 40 tests, 39 pass, 1 fail, zero skips, exit 1, 2.558 s. Each fixture child has a 15 s deadline, owned process group and forced reap. Synthetic trees are removed in finally; no real auth or source content enters fixtures.

Pinned actual binary: Codex CLI 0.141.0, darwin/arm64, `/opt/homebrew/Caskroom/codex/0.141.0/codex-aarch64-apple-darwin`.
SHA-256: `51f848c212ee24e8da923a7175813a74c113d47e01f0d40f1fea46b12644c363`.
Fixture harness rechecks this digest before invoking the binary.

| Actual check | Result | Boundary of conclusion |
|---|---|---|
| Native `codex sandbox -P el20`, root deny/minimal read | inside read allowed, outside read allowed, write allowed | FAILED isolation; never use as production boundary |
| Direct Seatbelt deny-default, shell/cat/touch | approved read allowed; outside, symlink alias and write denied | OS filesystem mechanism works, not full CLI certification |
| Full candidate CLI with auth/installation metadata read-only | exit 1, zero model POST, app-server initialization permission error | BLOCKING: positive completion fails |
| Diagnostic exact `installation_id` file write exception in fresh synthetic home | exit 0, structured fixture final and turn.completed, one model POST | Protocol positive only; exception not approved production policy |
| Diagnostic HTTP 429 and 500 | each exit 1, turn.failed, exactly one model POST | Zero transport retries for these cases |
| Diagnostic disconnect, truncated SSE, explicit response.failed | each exit 1, turn.failed, exactly one model POST | Zero transport retries for these cases |
| Fixture tool inventory | update_plan, request_user_input, apply_patch, view_image only | Four native tools remain; no zero-tools claim |
| Fixture home/global AGENTS/config injection marker | absent in outgoing bodies | Tested marker excluded; no complete skill/memory audit claim |
| Forced view_image of fake auth; apply_patch delete of synthetic outside file | nested filesystem sandbox helper denied; content not returned; auth/outside unchanged | Tested disclosure/write negatives pass under this candidate; no weakened helper policy tested |
| Forced request_user_input | unavailable in Default mode | Tool returns error internally |
| Forced update_plan | todo_list event emitted | Tool exists and executes internally |
| All four forced tool cases, without supervisor | two model POSTs, exit 0 and turn.completed | Internal continuation is real; not transport retry, not a second logical launch |
| Actual existing-auth `login status` inside strict outer boundary | exit 1; config permission error; auth inode/size/mtime unchanged | Outer preflight FAILED; not evidence of logout or expired login |

## Startup conflict and bounded repair attempts

A deny-default candidate initially failed dyld initialization. Loading the installed Apple `dyld-support.sb` fixed loader startup without granting home/evidence access. This imported policy is host-specific and would need a digest in any future certification.

Codex then failed before inference while opening `$CODEX_HOME/installation_id`. Local kernel diagnostics identified `file-write-data`; granting only that operation in a synthetic-only probe advanced to a `file-write-mode` denial. A diagnostic exact-file `file-write*` exception allowed positive protocol completion. An existing valid UUID and mode 0600 did not avoid the writable open. No original installation metadata was changed.

The selected Plan 02 policy restricts runtime writes to owned scratch and Codex-owned auth to read-only access. Expanding it to original installation metadata is a design change requiring an explicit documented disposition; the synthetic exception is not silently promoted to production. Broad CODEX_HOME writes, credential copies, changed credentials, and another transport were not attempted.

The separate actual `login status` command encounters a denied config read. Unlike exec, its current help does not expose `--ignore-user-config`. This is a second unresolved preflight-policy issue. Plan 01's unsandboxed ChatGPT status remains its original evidence; it is not outer-boundary acceptance. EvidenceLens inspected only auth metadata, never credential contents. Network was limited to loopback and no model command ran with actual auth.

## Tool observation conflict

`view_image`, failed `apply_patch`, and `request_user_input` emitted no corresponding JSONL tool item in these probes. Their errors appeared in stderr with the tools-router category, followed by an internal continuation and successful-looking final output. `update_plan` emitted a todo_list item. Merely checking final JSONL/exit cannot establish that no tool was used.

A future supervisor must reject proven stderr/router paths as well as JSONL tool events, bound all unrecognized diagnostics, and validate forced-call aborts. This has not been implemented or certified. Denied nested `sandbox_apply` protected the tested file tools; never grant a broader sandbox exception just to make these tools work. Internal continuation can race with termination and remains uncertain. No promise of remote cancellation rollback or exactly one HTTP request for every tool scenario.

## Policy and evidence identities

Normalize the fixture's random root to `<fixture-root>` before hashing the profile:

- Strict candidate profile template SHA-256: `c7cdfa8a92509dd8e1eee5be0873a2f0da5d7a4d9e5557794172006b2e1d0393`.
- Diagnostic metadata-exception profile template SHA-256: `57268ead1881b7e605dd3a70ecfb082793b78d958207e48f4f2d1a83eb880949`.

Exact flags/config and fixture schema are reproducible in tests/codex/helpers.mjs. Their current hashes are listed below. Profile imports, runtime services, production network, scratch ownership/sealing, all ambient context categories and fresh launcher identity checks remain uncertified. These profile hashes are diagnostic identities, not a writable PASS receipt.

## Concrete next design decision

Preferred narrow revision to investigate: retain codex exec; explicitly decide whether a fixed existing noncredential `installation_id` may receive a narrowly scoped file operation allowance, use a separate bounded login-status policy for any required config metadata, and add stderr-aware tool rejection. Before enabling this, prove existing metadata content unchanged, no parent-directory/auth/config writes, no config-derived code or tools during preflight, and the full forced-tool/no-leak checks. Do not assume this revision passes.

Alternative: replan the transport around an interface with explicit tool events and different initialization behavior, such as app-server, after targeted research. This is not an automatic fallback and must preserve auth ownership, scope, no-retry and privacy requirements.

The gsd-execute-phase workflow's acceptance gate and execute-plan Rule 4 prevent advancing to dependent plans with these unresolved policy changes. Plan 20-02 has no SUMMARY.md so discovery cannot mistake it for completed work. Plans 03–06 remain unstarted; no CDX requirement is marked complete and no version/release is advanced.

## Reproducible artifact hashes

- `tests/codex/helpers.mjs`: `bc43ae1d99a599a9914759be879832fcf2e0f720ec247066d15c74d102558ddb`
- `tests/codex/isolation.mjs`: `5f8b724a5d4468aa855c9d2e78293d1b4fed2f4d9b34f87b59b6fd926350bced`
- `tests/codex/protocol-host.mjs`: `2505c920bfd157c348adbf58f69eada23c2949a8d9a736eace81a1ecbf157e47`
- `skills/assignment-review/scripts/codex-contract.mjs`: `9a79d64fa08f74bf998625f93ad2e262616d3f907d20a794eb69dd98d5b186e8`
- `/System/Library/Sandbox/Profiles/dyld-support.sb`: `06215a5d32689aefe395c29710e182eb54ba22162f50df8b4842290f8a19bf1c`
