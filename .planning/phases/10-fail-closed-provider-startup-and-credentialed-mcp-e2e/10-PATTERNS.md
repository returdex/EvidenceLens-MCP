# Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E - Pattern Map

**Mapped:** 2026-09-14
**Files analyzed:** 7 implementation/test files plus 2 terminal evidence artifacts
**Analogs found:** 9 / 9
**Scope:** Preserve the consumed 10-51 generation, implement the 10-53–10-60 branch-authenticated replacement chain, permit one guarded new live generation, and synchronize either strict live truth or strict preflight `gaps_found` truth without replay.

## Authoritative Failure Facts

The committed `.10-51-live-state.json` at commit `1b62227` is the immutable recovery input:

```json
{"build_count":0,"generation":"aa9559e40fb797ce19457fdbbecb5a59913befb124d6258b4ea506e7596ce19f","inner_status":"failed","kind":"live","max_provider_requests":1,"mcp_tools_call_count":0,"observed_provider_requests":0,"previous_sha256":"ba48bb767a5dc0648e58c062364e79865235056b4bcfaa1eb0d3ceadfca08a09","reservation_count":1,"schema":"evidencelens.live-proof-state.v1","sequence":4,"wrapper_status":"completed"}
```

This proves one consumed generation and one reservation, but zero MCP tools calls and zero observed provider requests. Recovery must consume these facts exactly. It must not call `runReviewHarness`, read a credential, spawn Docker, build, retry, or manufacture lifecycle/receipt fields that were not retained.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/automatic-live-review.mjs` | service/CLI | event-driven + file-I/O | `scripts/live-proof-state.mjs` | exact |
| `scripts/live-proof-state.mjs` | store/WAL | event-driven + file-I/O | its existing `recoverProofState` and durable transition machinery | exact |
| `scripts/docker-review-real.mjs` | service/harness | streaming + request-response | its existing `retainDiagnostic` / `retainRequestEvidence` callbacks | exact |
| `scripts/audit-proof-chain.mjs` | validator | transform + file-I/O | `auditLiveProof` non-pass branch plus current `auditExecution` passed branch | exact |
| `tests/scripts/automatic-live-review.test.ts` | unit test | event-driven | `tests/scripts/live-proof-state.test.ts` recovery tests | role-match |
| `tests/scripts/automatic-live-review-cli.test.ts` | integration test | request-response + file-I/O | existing PATH-stubbed fixed CLI tests | exact |
| `tests/scripts/docker-review-real.test.ts` | unit/integration test | streaming + event-driven | existing exit/close, bounded stream, and retained callback tests | exact |
| `tests/scripts/live-proof-state.test.ts` | unit test | event-driven + file-I/O | existing durable transition, recovery, and concurrent O_EXCL tests | exact |
| `tests/scripts/audit-proof-chain.test.ts` | unit test | transform | existing consumed pre-fetch and forged-success matrices | exact |
| `10-53-FORENSIC.json` | evidence/model | file-I/O | `scripts/evidence-envelope.mjs` canonical atomic JSON envelope | role-match |
| `10-59-TRANSITION.json`, `10-59-EXECUTION.json`, `10-59-PROOF.json` | evidence/model | file-I/O | `scripts/audit-proof-chain.mjs` strict reopen/hash validation | exact |
| `10-58-FINAL-BUILD.json` | evidence/model | file-I/O | existing immutable build envelope | exact |
| `10-60-SYNC-CLAIM.json`, `10-60-SYNC-JOURNAL.json` | synchronization/WAL | file-I/O | `scripts/sync-proof-state.mjs` branch-tagged recovery | exact |

## Pattern Assignments

### `scripts/automatic-live-review.mjs` (service/CLI, event-driven + file-I/O)

**Primary analog:** `scripts/live-proof-state.mjs`

**Durable side-effect ordering** (`scripts/automatic-live-review.mjs:97-131`):

```javascript
await createProofState(options.path, "live", options.generation);
await transitionProofState(options.path, "consumed");
let requestEvidence;
await recordProviderAttempt(options.path);
try {
  await runReviewHarness({
    retainRequestEvidence: (evidence) => { requestEvidence = evidence; },
  });
  status = "passed";
} catch { status = "failed"; }
if (requestEvidence === undefined) {
  requestEvidence = { mcp_tools_call_count: 0, reservation_count: 1, observed_provider_requests: 0 };
}
if (requestEvidence.mcp_tools_call_count === 1) {
  await recordRequestEvidence(options.path, requestEvidence);
}
await transitionProofState(options.path, status);
return completeWrapper(options.path);
```

Copy only the durable ordering into the fresh-generation terminal owner. The consumed 10-51 generation is immutable forensic input: recovery may read the exact existing committed `.10-51-live-state.json` bytes and derive only `10-53-FORENSIC.json`. It must not create, reconstruct, infer, repair, or seal any 10-51 `EXECUTION` or `PROOF`, and it must never enter `runFixedAutomaticLive` or `runReviewHarness`. Terminal `TRANSITION`, `EXECUTION`, and `PROOF` production belongs exclusively to the fresh 10-59 generation after its own outer owner has started.

**Fixed production dispatch boundary** (`scripts/automatic-live-review.mjs:256-268`):

```javascript
export async function runFixedAutomaticLive() {
  await runNodeScript("scripts/audit-proof-chain.mjs", ["build", fixedBuildPath, ...fixedReviewPaths]);
  const build = await readCanonicalJson(fixedBuildPath);
  return runStatefulAutomaticLive({
    authenticateReadyBuild: async () => runNodeScript("scripts/audit-proof-chain.mjs", ["build", fixedBuildPath, ...fixedReviewPaths]),
    generation: build.generation,
    path: fixedLiveStatePath,
    readCredential: async () => process.env.DEEPSEEK_API_KEY,
  });
}
```

Keep live dispatch and recovery as distinct literal modes. Recovery must reject extra argv and must not reference the credential callback. This preserves the one-shot boundary rather than silently turning recovery into a second live attempt.

### `scripts/live-proof-state.mjs` (store/WAL, event-driven + file-I/O)

**Primary analog:** existing state transition and recovery implementation.

**Hash-chained atomic replace** (`scripts/live-proof-state.mjs:53-66`):

```javascript
async function replaceDurably(path, previousBytes, value) {
  const temp = `${path}.tmp-${process.pid}-${randomBytes(12).toString("hex")}`;
  const next = validate({ ...value, previous_sha256: sha256Hex(previousBytes), sequence: value.sequence + 1 });
  let handle;
  try {
    handle = await open(temp, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(Buffer.from(canonicalJson(next)));
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temp, path);
    await syncDirectory(dirname(path));
    return next;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temp).catch(() => undefined);
    fail("PROOF_STATE_IO");
  }
}
```

Use the same canonical bytes, `O_EXCL|O_NOFOLLOW`, mode `0600`, file fsync, rename, directory fsync, and prior-byte hash chain for any new terminal evidence ledger. Do not overwrite the committed state with inferred facts.

**Side-effect-free recovery** (`scripts/live-proof-state.mjs:135-145`):

```javascript
export async function recoverProofState(path, _sideEffectHooks = undefined) {
  const current = await secureRead(path); const value = current.value;
  if (value.wrapper_status === "completed") return value;
  if ((value.kind === "build" ? terminalBuild : terminalLive).has(value.inner_status)) return completeWrapper(path);
  // Recovery is intentionally evidence-only. Once a generation is prepared or
  // consumed it is never rebuilt, re-read from credentials, or respawned.
  const terminal = value.kind === "build"
    ? (value.inner_status === "prepared" ? "preflight_failed" : "build_failed")
    : "failed";
  await replaceDurably(path, current.bytes, { ...value, inner_status: terminal });
  return completeWrapper(path).then(() => readProofState(path));
}
```

This is the definitive forensic input pattern for Plan 10-53. The committed state is already terminal/completed, so the forensic pass is idempotent and derives only `10-53-FORENSIC.json`; no 10-51 EXECUTION or PROOF exists or may be fabricated.

### `scripts/docker-review-real.mjs` (service/harness, streaming + request-response)

**Primary analog:** existing bounded retention seams.

**Authenticated request retention** (`scripts/docker-review-real.mjs:686-715`):

```javascript
const retainDiagnostic = options.retainDiagnostic ?? (() => undefined);
const retainRequestEvidence = options.retainRequestEvidence ?? (() => undefined);
let mcpToolsCallCount = 0;
let requestEvidenceRetained = false;
const retainAuthenticatedRequestEvidence = (receipt) => {
  if (requestEvidenceRetained) fail("protocol");
  const evidence = Object.freeze({
    mcp_tools_call_count: mcpToolsCallCount,
    reservation_count: 1,
    observed_provider_requests: receipt?.observed_provider_requests ?? 0,
  });
  retainRequestEvidence(evidence);
  requestEvidenceRetained = true;
  return evidence;
};
```

**Failure-boundary retention** (`scripts/docker-review-real.mjs:743-760`):

```javascript
try {
  const payload = await performMcpReview(client, isOffline, expectedModel, {
    onToolsCall: () => { mcpToolsCallCount += 1; },
  });
  await completeProofLifecycle(lifecycle, payload, isOffline, { write });
  // authenticate receipt on success
} catch (error) {
  const receipt = receiptCollector.receipt({ generation: diagnosticGeneration, key: diagnosticKey });
  try { if (!requestEvidenceRetained) retainAuthenticatedRequestEvidence(receipt); } catch { }
  const feature = diagnosticCollector.feature({ generation: diagnosticGeneration, key: diagnosticKey });
  const diagnostic = classify(feature === undefined ? [] : [feature]);
  try { retainDiagnostic(diagnostic); } catch { }
  throw error;
}
```

For future invocations, extend this callback seam with one bounded sanitized terminal snapshot (diagnostic, request evidence, separately observed exit/close, transcript/result digests or explicit nulls). The callback must fire exactly once before cleanup. For the already-finished generation, do not invent missing callback values: use explicit schema variants such as `not_retained`/`unavailable_from_committed_state`, constrained to `gaps_found` only.

### `scripts/audit-proof-chain.mjs` (validator, transform + file-I/O)

**Primary analog:** branch-specific validation already used by `auditLiveProof` and `auditExecution`.

**Current unconditional restriction to remove from the shared prefix** (`scripts/audit-proof-chain.mjs:125-150`):

```javascript
if (/* shared identity checks */
  || value.mcp_tools_call_count !== 1 || value.reservation_count !== 1
  || value.transcript.mcp_method !== "tools/call") fail("PROOF_CHAIN_EXECUTION");

if (value.outcome === "passed") {
  if (value.status !== "passed" || observed !== 1 || value.fixture_count !== 4 /* ... */) {
    fail("PROOF_CHAIN_EXECUTION");
  }
} else if (/* gaps_found checks */) {
  fail("PROOF_CHAIN_EXECUTION");
}
```

Move tools/transcript/receipt/lifecycle requirements into explicit outcome branches:

- `passed`: retain every existing predicate unchanged—tools=1, reservation=1, authenticated observed send=1, exact transcript, clean exit+close, four fixtures, positive findings, provider/model/provenance/public schema.
- post-tools/pre-fetch `gaps_found`: retain tools=1, reservation=1, observed=0, authenticated receipt, observed lifecycle, exact diagnostic.
- pre-tools/post-reservation recovered `gaps_found`: require tools=0, reservation=1, observed=0, committed consumed terminal state identity, explicit absent/unavailable receipt/transcript/result/lifecycle representation, and a closed diagnostic/outcome code. Never allow this branch to produce `passed`.

Do not relax the passed branch or permit arbitrary nulls. Schema discrimination and exact-key sets should make the three states mutually exclusive.

**Same-process reopen/hash authority** (`scripts/audit-proof-chain.mjs:235-253`):

```javascript
handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
const before = await handle.stat({ bigint: true });
const bytes = await handle.readFile();
const after = await handle.stat({ bigint: true });
if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
  || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) fail("PROOF_CHAIN_FILE");
const reopened = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
const second = await reopened.readFile();
if (sha256Hex(bytes) !== sha256Hex(second)) fail("PROOF_CHAIN_FILE");
```

Apply this unchanged after atomically sealing recovered EXECUTION and PROOF.

### `tests/scripts/docker-review-real.test.ts`

**Primary analog:** existing harness failure-boundary tests around retained diagnostics/request evidence, bounded stdout/stderr, and separately observed exit/close.

Plan 10-54 owns producer/lifecycle cases for exactly-once terminal snapshot retention, callback omission/duplication, stream truncation, signal/error cleanup, and late exit/close disagreement across all five terminal variants. These tests must use injected dependencies or sentinels and never invoke real Docker/provider/network behavior. FORENSIC-to-authority crossover assertions are not part of this analog and remain exclusively Plan 10-55.

### `tests/scripts/live-proof-state.test.ts` and `tests/scripts/automatic-live-review.test.ts`

**Primary analog:** recovery with explicit zero side effects (`tests/scripts/live-proof-state.test.ts:43-55`):

```typescript
const counters = { build: 0, credential: 0, provider: 0, spawn: 0 };
const recovered = await recoverProofState(path, counters);
expect(recovered).toMatchObject({ inner_status: terminal, wrapper_status: "completed" });
expect(counters).toEqual({ build: 0, credential: 0, provider: 0, spawn: 0 });
expect(await recoverProofState(path, counters)).toEqual(recovered);
```

Add the committed terminal case `failed/completed/reservation=1/tools=0/observed=0`. Assert repeated recovery produces byte-identical evidence and all Docker, credential, provider, build, spawn, and harness spies remain zero.

Keep the existing concurrency/replay assertion (`tests/scripts/automatic-live-review.test.ts:46-55`): exactly one `O_EXCL` claim succeeds and a second is rejected. Recovery must authenticate the existing claim/state, not create a replacement generation.

### `tests/scripts/automatic-live-review-cli.test.ts`

**Primary analog:** PATH-stubbed external-side-effect sentinels (`tests/scripts/automatic-live-review-cli.test.ts:21-34`).

```typescript
for (const command of ["git", "docker", "tar", "mkdir"]) {
  const path = join(root, command);
  await writeFile(path, `#!/bin/sh\nprintf called >> '${marker}'\nexit 99\n`);
  await chmod(path, 0o700);
}
const result = await invoke(script, hostileArgs, { PATH: `${root}:${process.env.PATH}` });
expect(result.code).toBe(50);
await expect(readFile(marker, "utf8")).rejects.toThrow();
```

Create a forensic CLI test with stubs for `docker`, `git`, and any provider-facing executable, plus a credential getter sentinel. Feed a fixture copy of the committed state and assert no marker exists, stable sanitized output only, canonical `10-53-FORENSIC.json` is written, and a second forensic read is idempotent. Assert that no 10-51 EXECUTION/PROOF is created.

### `tests/scripts/audit-proof-chain.test.ts`

**Primary analog:** the current consumed pre-fetch failure test (`tests/scripts/audit-proof-chain.test.ts:128-139`).

```typescript
const failed = {
  ...executionRecord,
  clean_exit: false,
  diagnostic: { code: "pre_fetch", path: "transport.fetch" },
  mcp_tools_call_count: 1,
  outcome: "request_failed",
  request_receipt: { ...receipt, observed_provider_requests: 0 },
  result: null,
  status: "gaps_found",
};
expect(auditModeRecords("execution", [failed, buildRecord, source, deep, asvs])).toMatchObject(identity);
```

Add a sibling fixture for pre-tools/post-reservation recovery with tools=0 and observed=0. Mutation tests must reject:

- recovered outcome changed to `passed`;
- tools/provider count raised above committed state;
- reservation changed from 1;
- generation, previous hash, sequence, wrapper status, or committed state digest changed;
- fabricated receipt, transcript, result, lifecycle, diagnostic, or provider observation;
- use of the zero-tools variant with any success predicate;
- use of the zero-tools variant when the authenticated state was not already consumed and terminal.

Retain the existing passed fixture and all its mutation tests unchanged to prove no weakening.

### `10-53-FORENSIC.json` and `10-59-TRANSITION/EXECUTION/PROOF/LOCAL-VALIDATION.json` (evidence/model, file-I/O)

**Atomic seal analog:** `scripts/evidence-envelope.mjs:24-38` and `scripts/live-proof-state.mjs:53-66`.

Use canonical JSON; bound size; owner-only regular file checks; `O_EXCL|O_NOFOLLOW`; mode `0600`; file fsync; atomic rename; directory fsync; reopen; byte hash; exact schema and exact keys. The forensic record binds the committed old state bytes/digest and prior `10-49`/`10-50` identities. The new terminal tuple binds committed `10-53` forensic and, for the live branch, committed `10-57` SOURCE/REVIEW/SECURITY plus `10-58-FINAL-BUILD.json`.

The FORENSIC record must explicitly state that no complete harness terminal snapshot was retained. It may authenticate only facts supported by `.10-51-live-state.json`. It is not an EXECUTION or PROOF and cannot authorize synchronization alone. No artifact may claim an MCP transcript, request receipt MAC, observed lifecycle, result, fixture success, findings, or provider model result that the failed CLI discarded.

## Shared Patterns

### Replay Safety

**Source:** `scripts/live-proof-state.mjs:113-125`

Reservation is monotonic and may be written only once. Request evidence can only move counts forward and cannot exceed the fixed budget. The existing state already has reservation=1, so every path that could invoke the harness again must fail before credential access or Docker spawn.

### Recovery Without Side Effects

**Sources:** `scripts/live-proof-state.mjs:135-145`, `scripts/sync-proof-state.mjs:150-173`

Authenticate the sealed authority, accept only original-or-already-replaced hashes, derive an idempotent terminal result, and complete pending local writes only. Recovery imports no Docker/provider module and takes no callback capable of external execution.

### Atomic Evidence Persistence

**Sources:** `scripts/evidence-envelope.mjs:24-38`, `scripts/sync-proof-state.mjs:33-46`

All authoritative JSON is canonical and bounded, written through exclusive no-follow temp files, fsynced, renamed, directory-fsynced, and reopened for exact hash/schema validation. Temporary-file cleanup must not mask the owning failure.

### Strict Outcome Separation

**Source:** `scripts/audit-proof-chain.mjs:125-150`

Shared identity and budget invariants apply to every execution. Success-only predicates remain in the passed branch. Failure variants use closed discriminators and exact key sets; absence of evidence is represented explicitly and accepted only for `gaps_found` when authenticated by the committed consumed state.

### Sanitization

**Sources:** `scripts/docker-review-real.mjs:751-760`, `tests/scripts/automatic-live-review-cli.test.ts:36-53`

Persist only closed diagnostic codes and digests. Never persist or print credentials, raw stderr/stdout, stack, cause, filesystem paths, diagnostic keys/MAC material beyond an authenticated public receipt, or provider response content.

## Planner Guardrails

- Do not schedule Docker build/run, provider access, credential reads, network probes, GitHub Actions, push, or dispatch for recovery.
- Do not delete or replace `.10-51-live-state.json`; authenticate its committed canonical bytes and generation.
- Do not reinterpret reservation as an observed request. Exact terminal counts remain reservation=1, tools=0, provider=0.
- Do not fabricate the discarded diagnostic/receipt/lifecycle/result. Encode their absence as a narrowly scoped recovered `gaps_found` variant.
- Do not weaken any `passed` predicate. Existing success tests must remain unchanged and pass.
- Prefer a dedicated recovery module/entrypoint that does not import `docker-review-real.mjs`; this makes the zero-side-effect guarantee structural and testable.
- For old-generation forensics, validate against exact `10-49`/`10-50` identities. For the replacement generation, validate through deterministic branch registries against exact `10-57` certification and `10-58` build identities when available, or exact closed unavailable representations in the preflight-gaps branch.

## Plans 10-53–10-60 New-Chain Architecture

### Ownership and dependency boundary

- Plan 10-53 owns both `evidencelens.consumed-generation-forensic.v1` and the dedicated read-only `forensic-consumed-generation` validator. Later plans consume that contract; no test may accept the schema before its implementation exists.
- Plan 10-54 owns the terminal producer, `build-auto` contract, and all five-variant interruption/callback/lifecycle/concurrency test implementation in `automatic-live-review.test.ts`, `automatic-live-review-cli.test.ts`, `docker-review-real.test.ts`, and `live-proof-state.test.ts`.
- Plan 10-55 owns execution/proof/sync auditors, the exact branch registry, and all hostile authority/registry test implementation.
- Plan 10-56 executes the already-owned hostile suites read-only and writes only `10-56-DISCONFIRMATION.json`; it never edits source or tests.
- Plan 10-57 certifies the exact SOURCE plus deep review and ASVS security record.
- Plan 10-58 performs the sole credential-free Docker build and writes `10-58-FINAL-BUILD.json`.
- Plan 10-59 is the only plan allowed at most one provider send and owns `.10-59-live-state.json` plus `10-59-TRANSITION/EXECUTION/PROOF/LOCAL-VALIDATION.json`.
- Plan 10-60 performs local-only branch-aware synchronization/final audit and owns `10-60-SYNC-CLAIM/JOURNAL.json`. GitHub Actions, push, and dispatch remain zero throughout.

### Exact terminal variants

The full-live branch has exactly five mutually exclusive variants: `passed`, `post_fetch_non_pass`, `post_tools_pre_fetch`, `pre_tools_post_reservation`, and `pre_reservation_preflight`. `audit-proof-chain.mjs` and `audit-live-evidence.mjs` must share the same exact discriminator/key/status definitions. Passed retains every existing success predicate. No zero-tools, zero-send, preflight, or non-pass record can satisfy passed.

### Outer terminal owner

**Analogs:** `scripts/live-proof-state.mjs` durable transition machinery; `scripts/evidence-envelope.mjs` canonical exclusive sealing; fixed CLI PATH-stub tests.

The Plan 10-59 outer owner starts before authenticating SOURCE/REVIEW/SECURITY/BUILD. It creates a fresh exclusive generation and `preflight_started` TRANSITION bound to the immutable FORENSIC predecessor and fixed attempted input paths. Any missing, malformed, non-ready, uncommitted, identity-mismatched, or drifted upstream input produces, before return:

1. exact `pre_reservation_preflight` EXECUTION with counters 0/0/0;
2. closed per-input validation-result discriminators and authenticated digests only where available;
3. exact `unavailable` representations elsewhere; and
4. branch-bound PROOF.

Only after all inputs authenticate may the same transition advance to `preflight_authenticated`, bind all input digests, reserve, read credentials, and invoke the harness. This ordering prevents an outer preflight failure from disappearing.

The terminal producer itself is the local authority. Before returning, `review:auto-live-once` atomically writes/fsyncs/renames/reopens/hashes TRANSITION, EXECUTION and PROOF, internally invokes internal-only `execution-auto` and `proof-auto` APIs with its unforgeable same-process owner capability, then atomically persists bounded non-secret `10-59-LOCAL-VALIDATION.json`. The exact-key receipt binds generation, branch, all three hashes, auditor versions/modes, capability identity, outcome, and both validation results. External or post-owner local-mode invocation rejects. Standalone verification uses PATH-stubbed/in-process tests plus a strict read-only receipt validator, never local modes. The receipt is required in later tuples but is never sufficient sync authority. After commit, Task 2 exclusively uses committed modes.

### Branch-specific authority tuples

Deterministic `*-auto` modes select the branch from authenticated TRANSITION/PROOF bytes, never from caller-provided status:

| Branch | Proof authority | Allowed project status |
|---|---|---|
| `live-sync-authority` | FORENSIC, SOURCE, REVIEW, SECURITY, BUILD, TRANSITION, EXECUTION, PROOF, LOCAL_VALIDATION (9) | strict passed or truthful gaps_found |
| `preflight-sync-authority` | FORENSIC, TRANSITION, EXECUTION, PROOF, LOCAL_VALIDATION (5) | gaps_found only |

Claim and journal schemas include the branch tag and exact tuple cardinality. A preflight tuple cannot contain or claim available live-only members, cannot map to passed/Complete, and cannot cross into the live registry. A live tuple cannot omit certified inputs. Final audit adds CLAIM and JOURNAL: exact live cardinality 11, preflight cardinality 7. In its own process it resolves every member's full commit, reads canonical bytes via `git show <full_commit>:<exact_path>`, and compares them byte-for-byte and by hash with O_NOFOLLOW-reopened paths; it reuses no earlier audit result or capability.

### Branch-aware commands

- `audit-proof-chain.mjs execution-auto` and `proof-auto` are exclusively same-process local-owner capabilities and derive the exact validator from TRANSITION.
- `audit-proof-chain.mjs execution-committed-auto` and `proof-committed-auto` are zero-argument fixed-location CLIs. They reject extra argv, derive the branch from the fixed authenticated TRANSITION/PROOF, construct the exact ordered 9/5-member registry internally, and independently authenticate every committed member via full-commit `git show`, reopened-byte/hash equality, and upstream committed identities, with zero external side effects.
- `audit-proof-chain.mjs sync-authority-auto` and `final-audit-auto` are also zero-argument fixed-location CLIs that reject extra argv. `sync-authority-auto` internally constructs the exact ordered 9/5-member authority tuple; `final-audit-auto` independently constructs the exact ordered 11/7-member final tuple. No caller can supply, omit, reorder, or append members.
- `audit-live-evidence.mjs auto` applies the same branch/status contract while preserving unique status/checklist/trace checks.
- `sync-proof-state.mjs recover` is a zero-argument fixed-location command that rejects extra argv, derives the branch from fixed authenticated TRANSITION/PROOF, requires the internally constructed exact 9/5-member authority tuple, creates fixed `10-60-SYNC-CLAIM.json` and `10-60-SYNC-JOURNAL.json`, and performs only local idempotent target writes.

### No-replay budgets

The old 10-51 generation is forensic-only: Docker 0, credential reads 0, provider sends 0. The replacement chain permits Plan 10-58 at most one Docker build and Plan 10-59 at most one provider send, with no retry, fallback, alternate build/image, or diagnostic second request. All remaining plans perform zero Docker/provider operations. GitHub Actions/push/dispatch are always zero.

## No Analog Found

None. All required mechanics already exist in the repository; the gap is composition and schema branching, not a missing architectural primitive.

## Metadata

**Analog search scope:** `scripts/`, `src/providers/`, `tests/scripts/`, `tests/providers/`, Phase 10 planning/evidence files, commit `1b62227`
**Files scanned:** 27 focused files plus Phase 10 references and the complete 10-53–10-60 plan set
**Pattern extraction date:** 2026-09-14
**External side effects during mapping:** Docker 0; credentials 0; provider/network requests 0; GitHub Actions/push/dispatch 0
