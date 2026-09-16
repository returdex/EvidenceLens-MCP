# Roadmap: EvidenceLens MCP

## Overview

EvidenceLens will be built from the outside-in: lock the MCP contract first, then establish evidence normalization, enforce the security boundary, add review orchestration and provider integration, and finish with reproducible Docker deployment and end-to-end verification.

## Phases

- [x] **Phase 1: MCP Contract and Skeleton** - Establish a discoverable, schema-validated MCP server.
- [x] **Phase 2: Evidence Ingestion and Multimodal Context** - Normalize local evidence with references and hashes. (completed 2026-08-22)
- [x] **Phase 3: Read-Only Filesystem Boundary** - Enforce allowlisted, read-only evidence access. (completed 2026-08-22)
- [x] **Phase 4: Review Orchestration and Findings** - Compare role-labeled evidence and produce actionable findings. (completed 2026-08-22)
- [x] **Phase 5: Provider Adapter and DeepSeek Integration** - Connect DeepSeek through a replaceable provider boundary. (completed 2026-08-23)
- [x] **Phase 6: Docker Deployment and End-to-End Validation** - Run a reproducible, documented multimodal review. (completed 2026-08-23)
- [x] **Phase 7: DeepSeek Vision Provenance Closure** - Make credentialed vision findings satisfy the local provenance contract. (completed 2026-08-25)
- [x] **Phase 8: Docker Runtime Verification Closure** - Complete Docker-enabled image, mount, and stdio smoke verification. (completed 2026-08-25)
- [x] **Phase 9: Public Provider Attribution and Determinism Contract** - Expose safe analyzer attribution and define deterministic versus provider-backed response semantics. (completed 2026-09-05)
- [ ] **Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E** - Enforce consistent provider configuration failures and verify the complete DeepSeek MCP path. *(58 of 66 plans executed; the consumed 10-59 attempt is immutable gaps evidence, and Plans 10-62 through 10-66 rotate to a fresh certified build/live/sync namespace.)*
- [ ] **Phase 11: Linux Filesystem Traversal Hardening** - Restore the declared no-follow path invariant and synchronize milestone evidence.

## Phase Details

### Phase 1: MCP Contract and Skeleton
**Goal**: A client can discover and invoke a minimal, schema-validated EvidenceLens server.
**Depends on**: Nothing (first phase)
**Requirements**: [MCP-01, MCP-02, MCP-03]
**Success Criteria** (what must be TRUE):
  1. An MCP client can discover the server and invoke the review capability through documented inputs.
  2. Successful responses validate against a stable JSON findings schema and rejected requests return machine-readable errors.
  3. The repository contains a runnable local development command and contract-level tests.
**Plans**: 2 plans

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — MCP server skeleton and transport contract

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Findings schema, validation, errors, docs, and contract tests

### Phase 2: Evidence Ingestion and Multimodal Context
**Goal**: Text, PDF, image/screenshot, and table evidence are normalized with references and hashes while preserving visual context.
**Depends on**: Phase 1
**Requirements**: [EVID-01, EVID-02, EVID-03, EVID-04, EVID-05]
**Success Criteria** (what must be TRUE):
  1. Each supported evidence type produces a normalized representation with source identity and relevant page, line, cell, or sheet references.
  2. Visual evidence remains available for multimodal processing instead of being reduced to text only.
  3. Every artifact includes a reproducible content hash and extraction metadata.
**Plans**: 5 plans

Plans:
**Wave 1**
- [x] 02-01-PLAN.md — Normalized evidence contract, hashes, references, metadata, visual payload descriptors, and warnings

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md — Text and table normalizers with line and cell context

**Wave 3** *(blocked on Waves 1-2 completion)*
- [x] 02-03-PLAN.md — PDF and image/screenshot normalizers with visual context preservation

**Wave 4** *(blocked on Waves 1-3 completion)*
- [x] 02-04-PLAN.md — MCP review tool integration and Phase 2 contract documentation

### Phase 3: Read-Only Filesystem Boundary
**Goal**: Evidence access is confined to explicit roots and safe, auditable failure behavior.
**Depends on**: Phase 2
**Requirements**: [SAFE-01, SAFE-02, SAFE-03, SAFE-04]
**Success Criteria** (what must be TRUE):
  1. Requests outside configured allowlisted roots are rejected before file contents are read.
  2. The service exposes no default write, delete, or mutation operation.
  3. Findings and errors preserve provenance without leaking unintended filesystem details or secrets.
**Plans**: 3 plans

Plans:
**Wave 1**
- [x] 03-01-PLAN.md — Filesystem source contract, exact root grammar, and configured-root authorization policy

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md — Bounded read-only descriptor reader, deterministic TOCTOU checks, and sanitized filesystem errors

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 03-03-PLAN.md — MCP/server integration, exact configuration, 0.1.2 version alignment, provenance, docs, and safety gates

### Phase 4: Review Orchestration and Findings
**Goal**: The service compares role-labeled course evidence and a solution, producing actionable findings with uncertainty and visual citations.
**Depends on**: Phase 3
**Requirements**: [REVW-01, REVW-02, REVW-03, REVW-04]
**Success Criteria** (what must be TRUE):
  1. Callers can submit assignment brief, rubric, teacher instructions, and current solution as distinct evidence roles.
  2. Duplicate evidence ids fail deterministically as `INVALID_REQUEST` before normalization; reviews identify omissions, contradictions, and requirement conflicts with unique source citations and finding ids.
  3. Authorized normalization passes bounded request-scoped in-memory analysis payloads for inline and filesystem-backed text, tables, PDFs, and images without reopening paths or exposing raw bytes/content in responses.
  4. Findings distinguish observations, interpretations, uncertainty, and follow-up checks, and response metadata identifies the provider-independent analyzer while provider/model version fields remain deferred to Phase 5.
**Plans**: 3 plans

Plans:
**Wave 1**
- [x] 04-01-PLAN.md — Findings/citation contract, duplicate-id gate, analyzer metadata, required-role validation, and stable review errors

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 04-02-PLAN.md — Single-read transient analysis handoff, separate solution-claim extraction, deterministic comparison rules, and provenance citation resolution

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 04-03-PLAN.md — Authorized normalization/analyzer wiring, duplicate-id short-circuit, regression tests, and Phase 4 contract documentation

### Phase 5: Provider Adapter and DeepSeek Integration
**Goal**: DeepSeek Vision/Flash performs the review through a replaceable provider adapter without changing the MCP contract.
**Depends on**: Phase 4
**Requirements**: [PROV-01, PROV-02]
**Success Criteria** (what must be TRUE):
  1. DeepSeek credentials and model selection are configurable without changing MCP request or response schemas.
  2. A second compatible or local provider can be substituted behind the same adapter interface.
**Plans**: 3 plans

Plans:
**Wave 1**
- [x] 05-01-PLAN.md — Provider-neutral DTO/interface, provenance validation, fail-closed config, and provider errors

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 05-02-PLAN.md — DeepSeek multimodal adapter, JSON Output validation, bounded retries, and timeout handling

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 05-03-PLAN.md — MCP wiring, DeepSeek-only runtime registration, substitution/contract tests, and documentation

### Phase 6: Docker Deployment and End-to-End Validation
**Goal**: A fresh environment can run the server with read-only mounts and complete a documented multimodal review.
**Depends on**: Phase 5
**Requirements**: [DEPL-01, DEPL-02]
**Success Criteria** (what must be TRUE):
  1. Docker starts the MCP server with evidence mounted read-only and configured environment variables.
  2. Documentation demonstrates a fresh local setup and one complete multimodal review.
  3. Automated checks cover the documented end-to-end path and report failures clearly.
**Plans**: 2 plans

Plans:
**Wave 1**
- [x] 06-01-PLAN.md — Single-stage Docker image, read-only Compose profiles, and deployment configuration tests

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 06-02-PLAN.md — Offline stdio smoke, injected-provider multimodal E2E, and deployment runbook

### Phase 7: DeepSeek Vision Provenance Closure
**Goal**: Credentialed DeepSeek vision requests return findings that pass strict local provenance validation without weakening the public MCP contract.
**Depends on**: Phase 6
**Requirements**: [PROV-01]
**Gap Closure**: Closes the v1.0 milestone audit gap where the vision API request succeeds but model-generated findings fail citation/provenance validation.
**Success Criteria** (what must be TRUE):
  1. The configured DeepSeek vision model can process the official base64 `image_url` request format through the provider adapter.
  2. Vision output is constrained or normalized so every public finding has valid evidence IDs, hashes, typed locations, and sorted citations bound to local normalized evidence.
  3. A credential-free regression fixture covers malformed and representative vision responses without storing secrets or raw sensitive course content.
**Plans**: 1 plan

Plans:
**Wave 1**
- [x] 07-01-PLAN.md — Locally resolve DeepSeek vision citation references and add credential-free/live provenance regression coverage

### Phase 8: Docker Runtime Verification Closure
**Goal**: A Docker-enabled environment verifies the deployed image, Compose profiles, read-only evidence mount, stdio protocol, and sanitized provider preflight.
**Depends on**: Phase 7
**Requirements**: [DEPL-01]
**Gap Closure**: Closes the v1.0 milestone audit gap where Docker CLI/daemon was unavailable during Phase 6 verification.
**Success Criteria** (what must be TRUE):
  1. `npm run docker:smoke` builds and runs the offline profile successfully.
  2. The container completes MCP initialize/tools/list/tools/call and rejects writes to `/workspace`.
  3. Missing provider credentials fail closed with sanitized `PROVIDER_CONFIGURATION` output.
**Plans**: 1 plan

Plans:
**Wave 1**
- [x] 08-01-PLAN.md — Execute Docker offline runtime smoke and record auditable DEPL-01 verification

### Phase 9: Public Provider Attribution and Determinism Contract
**Goal**: Public review responses expose stable, non-secret analyzer/provider attribution and accurately distinguish deterministic offline behavior from variable provider-backed findings.
**Depends on**: Phase 8
**Requirements**: [MCP-02, SAFE-03]
**Gap Closure**: Closes the v1.0 audit gaps where provider/model attribution is discarded and credentialed responses conflict with the documented byte-for-byte deterministic promise.
**Success Criteria** (what must be TRUE):
  1. Public responses identify deterministic and provider-backed analyzers with stable provider/model version metadata without exposing keys, upstream envelopes, or internal fingerprints.
  2. Existing citation, hash, request identifier, and timestamp provenance remains schema-valid and backwards-compatible through an explicit contract evolution.
  3. Documentation and tests scope byte-for-byte determinism to deterministic/offline output and describe provider-backed variability accurately.
**Plans**: 9 plans

Plans:
**Wave 1**
- [x] 09-01-PLAN.md — Additive public provider/model attribution, scoped determinism contract, regression tests, and documentation

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 09-02-PLAN.md — Close provider attribution, fail-closed result/error, visual provenance, deterministic fixture, and documentation gaps

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 09-03-PLAN.md — Close PDF provenance, provider/analyzer exception-boundary, attribution grammar, and stable error-documentation gaps

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 09-04-PLAN.md — Close provider prose exfiltration, analyzer metadata/cleanup ownership, PDF branch coverage, and success-documentation gaps

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 09-05-PLAN.md — Close provider provenance false positives, analyzer identity/input isolation, fault-tolerant cleanup, and runtime-authentic success documentation

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 09-06-PLAN.md — Close runtime inference secret isolation, ownership-safe freezing, complete claim cleanup, analyzer snapshot races, setup error boundaries, and strict rejection documentation

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 09-07-PLAN.md — Close handler dependency snapshot/fail-open boundaries, hidden provider-result envelopes, cleanup fault coverage, and cleanup documentation

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 09-08-PLAN.md — Reject validation-time accessor mutation in provider-result envelopes before structural parsing

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 09-09-PLAN.md — Revalidate the provider-result envelope after nested structural parsing and lock nested Proxy mutation rejection

**Verification:** Passed 2026-09-05 (23/23 must-haves). Nested `modelFindings` / `deterministicFindings` Proxy mutation is revalidated after structural parsing before provider attribution can be projected.

### Phase 10: Fail-Closed Provider Startup and Credentialed MCP E2E
**Goal**: Invalid provider configuration fails consistently in every runtime, and an opt-in test proves DeepSeek vision through the complete MCP, filesystem, orchestration, and public-response boundary.
**Depends on**: Phase 9
**Requirements**: [SAFE-04, PROV-01]
**Gap Closure**: Closes the v1.0 audit gaps for silent local fallback, missing Phase 7 verification, and adapter-only credentialed test coverage; also corrects the DEPL-02 local-run documentation boundary.
**Success Criteria** (what must be TRUE):
  1. Missing, invalid, or conflicting provider settings fail closed with sanitized errors in local and Docker startup paths, while explicit offline disablement remains available.
  2. A credentialed, opt-in structural test exercises stdio `tools/call`, four evidence roles, allowlisted filesystem reads, provider DTO conversion, finding merge, and final public schema validation.
  3. Phase 7 receives independent verification evidence and routine tests remain credential-free and no-network.
**Plans**: 86 plans

Plans:
**Wave 1**
- [x] 10-01-PLAN.md — Fail-closed provider startup, Docker configuration matrix, and operational contract

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 10-02-PLAN.md — Credentialed Docker MCP E2E boundary, redacted failure contract, and explicit live checkpoint

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 10-03-PLAN.md — Environment-backed live-provider regression and independent Phase 7 verification evidence

**Wave 4** *(gap closure; blocked on Wave 3 completion)*
- [x] 10-04-PLAN.md — Eager executable provider validation and sanitized process-boundary failures
- [x] 10-05-PLAN.md — Precise adapter-live credential absence and invalid-configuration handling
- [x] 10-06-PLAN.md — Production-schema validation and resolved DeepSeek identity binding

**Wave 5** *(gap closure; blocked on Wave 4 completion)*
- [x] 10-07-PLAN.md — Single-attempt authorized credentialed Docker MCP proof and evidence audit

**Wave 6** *(gap closure; blocked on Wave 5 completion)*
- [x] 10-08-PLAN.md — Reject fractional integral provider configuration values
- [x] 10-09-PLAN.md — Require clean Docker child exit before live-proof success
- [x] 10-10-PLAN.md — Enforce exact fixture and positive finding evidence counts

**Wave 7** *(gap closure; blocked on Wave 6 completion)*
- [x] 10-11-PLAN.md — Freshly authorized single-attempt credentialed proof and audited state synchronization

**Wave 8** *(gap closure; blocked on Wave 7 completion)*
- [x] 10-12-PLAN.md — Bounded FIFO stdio event delivery and coalesced-message regressions

**Wave 9** *(gap closure; blocked on Wave 8 completion)*
- [x] 10-13-PLAN.md — Freshly authorized single-attempt credentialed proof after parser correction

**Wave 10** *(gap closure; blocked on Wave 9 completion)*
- [x] 10-14-PLAN.md — Absolute request deadlines, strict JSON-RPC 2.0 validation, and complete MCP initialization transcript

**Wave 11** *(gap closure; blocked on Wave 10 completion)*
- [x] 10-15-PLAN.md — Freshly authorized single-attempt credentialed proof after lifecycle hardening

**Wave 12** *(gap closure; blocked on Wave 11 completion)*
- [x] 10-16-PLAN.md — Exhaustive subprocess I/O state machine, bounded teardown, and adversarial race coverage

**Wave 13** *(gap closure; blocked on Wave 12 completion)*
- [x] 10-17-PLAN.md — Deterministic full MCP transcript simulation and provider-disabled Docker diagnosis

**Wave 14** *(gap closure; blocked on Wave 13 completion)*
- [x] 10-18-PLAN.md — Reviewed-commit archive as the sole immutable proof-image context

**Wave 15** *(gap closure; blocked on Wave 14 completion)*
- [x] 10-19-PLAN.md — Credential-free dual-sentinel Compose and exact proof runtime contracts

**Wave 16** *(gap closure; blocked on Wave 15 completion)*
- [x] 10-20-PLAN.md — Evidence schemas and irreversible single-generation proof-image boundary

**Wave 17** *(gap closure; blocked on Wave 16 completion)*
- [x] 10-21-PLAN.md — Evidence sealing, replay protection, durable challenge publication, and atomic authorization

**Wave 18** *(gap closure; blocked on Wave 17 completion)*
- [x] 10-22-PLAN.md — Committed build handoff, deep/security review, one build, and read-only validation

**Wave 19** *(gap closure; blocked on Wave 18 completion)*
- [x] 10-23-PLAN.md — Committed challenge handoff, exact stdin authorization, and at-most-once paid proof

**Wave 20** *(gap closure; blocked on Wave 19 completion)*
- [x] 10-24-PLAN.md — Non-secret protocol-stage diagnostics and exhaustive credential-free reproduction

**Wave 21** *(gap closure; blocked on Wave 20 completion)*
- [x] 10-25-PLAN.md — Complete automatic build/live, nested terminal-state, and crash-recovery machinery

**Wave 22** *(gap closure; blocked on Wave 21 completion)*
- [x] 10-26-PLAN.md — Certifying audit chain, four-input truth audit, and write-ahead synchronization

**Wave 23** *(gap closure; blocked on Wave 22 completion)*
- [x] 10-27-PLAN.md — Exact committed diagnostic-tooling deep and ASVS L1 security review

**Wave 24** *(gap closure; blocked on Wave 23 completion)*
- [x] 10-28-PLAN.md — Fresh reviewed diagnostic image with embedded instrumentation identity

**Wave 25** *(gap closure; blocked on Wave 24 completion)*
- [x] 10-29-PLAN.md — One automatic diagnostic request and exclusive sealed repair routing

**Wave 26** *(gap closure; blocked on Wave 25 completion)*
- [x] 10-30-PLAN.md — Conditional host-harness regression and correction

**Wave 27** *(gap closure; blocked on Wave 26 completion)*
- [x] 10-31-PLAN.md — Conditional DeepSeek provider-tier regression and correction

**Wave 28** *(gap closure; blocked on Wave 27 completion)*
- [x] 10-32-PLAN.md — Conditional provenance-tier regression and correction

**Wave 29** *(gap closure; blocked on Wave 28 completion)*
- [x] 10-33-PLAN.md — Conditional orchestration, contract, or fixture regression and correction

**Wave 30** *(gap closure; blocked on Wave 29 completion)*
- [x] 10-34-PLAN.md — Exact final committed-source deep and ASVS L1 security review

**Wave 31** *(gap closure; blocked on Wave 30 completion)*
- [x] 10-35-PLAN.md — Final certified immutable build with truthful terminal routing

**Wave 32** *(gap closure; blocked on Wave 31 completion)*
- [x] 10-36-PLAN.md — Conditional zero-or-one automatic final proof with sealed authority

**Wave 33** *(gap closure; blocked on Wave 32 completion)*
- [x] 10-37-PLAN.md — Write-ahead crash-recoverable three-artifact synchronization and final audit

**Wave 34** *(gap closure; blocked on Wave 33 completion)*
- [x] 10-38-PLAN.md — Require separately observed, consistent child exit and close events

**Wave 35** *(gap closure; blocked on Wave 34 completion)*
- [x] 10-39-PLAN.md — Define and inject authenticated child-side diagnostics at real production owners

**Wave 36** *(gap closure; blocked on Wave 35 completion)*
- [x] 10-40-PLAN.md — Authenticate/classify the host Docker diagnostic channel with injected-child E2E tests

**Wave 37** *(gap closure; blocked on Wave 36 completion)*
- [x] 10-41-PLAN.md — Enforce one request at actual DeepSeek transport.fetch with zero-retry proof policy

**Wave 38** *(gap closure; blocked on Wave 37 completion)*
- [x] 10-42-PLAN.md — Authenticate adapter HTTP receipts and persist distinct host request counters

**Wave 39** *(gap closure; blocked on Wave 38 completion)*
- [x] 10-43-PLAN.md — Enforce strict mode-specific proof schemas, tuples, and unique status authority

**Wave 40** *(gap closure; blocked on Wave 39 completion)*
- [x] 10-44-PLAN.md — Authenticate the complete Git/build/execution proof chain and synchronization authority

**Wave 41** *(gap closure; blocked on Wave 40 completion)*
- [x] 10-45-PLAN.md — Replace automatic CLI stubs with fixed production dispatch and subprocess E2E tests

**Wave 42** *(gap closure; blocked on Wave 41 completion)*
- [x] 10-46-PLAN.md — Disconfirm provider, child-channel, and adapter request-boundary defects
- [x] 10-47-PLAN.md — Disconfirm CLI, lifecycle, proof, and synchronization defects

**Wave 43** *(gap closure; blocked on both Wave 42 plans)*
- [x] 10-48-PLAN.md — Seal the combined eight-finding and source-coverage authority

**Wave 44** *(gap closure; blocked on Wave 43 completion)*
- [x] 10-49-PLAN.md — Deep- and ASVS-certify the exact repaired source by atomic hash-bound local validation

**Wave 45** *(gap closure; blocked on Wave 44 completion)*
- [x] 10-50-PLAN.md — Produce and same-process authenticate one exact-source immutable build

**Wave 46** *(historical gap attempt; consumed and immutable)*
- [ ] 10-51-PLAN.md — Historical consumed zero-request failure; retained only as immutable forensic input and unusable as execution, proof, or synchronization authority

**Wave 47** *(gap closure; blocked on Wave 46 completion)*
- [ ] 10-52-PLAN.md — Synchronize and independently audit final chain-certified truth

**Wave 48** *(gap closure; Plan 10-52 remains unexecuted/superseded)*
- [x] 10-53-PLAN.md — Forensically preserve the consumed old generation from committed bytes only

**Wave 49** *(gap closure; blocked on Wave 48 completion)*
- [x] 10-54-PLAN.md — Make every terminal live branch durable and validate exact build terminal schemas

**Wave 50** *(gap closure; blocked on Wave 49 completion)*
- [x] 10-55-PLAN.md — Enforce exact branch-specific audit and synchronization registries

**Wave 51** *(gap closure; blocked on Wave 50 completion)*
- [x] 10-56-PLAN.md — Disconfirm interruption, concurrency, tampering and false-sync paths offline

**Wave 52** *(gap closure; blocked on Wave 51 completion)*
- [x] 10-57-PLAN.md — Deep- and ASVS-certify the exact corrected source

**Wave 53** *(gap closure; blocked on Wave 52 completion)*
- [x] 10-58-PLAN.md — Produce at most one credential-free immutable corrected-source build

**Wave 54** *(replacement gap closure; blocked on Wave 52 recertification)*
- [x] 10-61-PLAN.md — Archive the stale build and perform exactly one authorized replacement credential-free build

**Wave 55** *(gap closure; blocked on replacement build completion)*
- [x] 10-59-PLAN.md — Consumed zero-send terminal-callback failure; immutable gaps evidence with no fabricated completion summary

**Wave 56** *(gap closure; blocked on Wave 55 completion)*
- [ ] 10-60-PLAN.md — Superseded; cannot synchronize the consumed failed 10-59 chain

**Wave 57** *(gap closure; preserves consumed evidence and rotates authority paths)*
- [x] 10-62-PLAN.md — Archive consumed 10-59 evidence and rotate all fixed registries to a fresh namespace

**Wave 58** *(gap closure; blocked on Wave 57 completion)*
- [x] 10-63-PLAN.md — Hostile-test and completely recertify the exact registry-rotated source

**Wave 59** *(gap closure; blocked on Wave 58 completion)*
- [x] 10-64-PLAN.md — Build and authenticate a fresh exact-source local Docker image

**Wave 60** *(gap closure; blocked on Wave 59 completion)*
- [ ] 10-65-PLAN.md — Run one fresh generation with at most one paid provider request and durable terminal evidence

**Wave 61** *(gap closure; blocked on Wave 60 completion)*
- [ ] 10-66-PLAN.md — Superseded; cannot synchronize the consumed failed 10-65 chain

**Wave 62** *(gap closure; preserve the consumed 10-65 attempt and rotate authority first)*
- [x] 10-67-PLAN.md — Archive 10-65 as authority:false and rotate fixed registries to a fresh namespace

**Wave 63** *(gap closure; blocked on Wave 62 completion)*
- [x] 10-68-PLAN.md — Hostile-test and fully recertify the exact corrected-lifecycle source

**Wave 64** *(gap closure; blocked on Wave 63 completion)*
- [x] 10-69-PLAN.md — Build and authenticate a fresh exact-source local Docker image

**Wave 65** *(gap closure; blocked on Wave 64 completion)*
- [ ] 10-70-PLAN.md — Run one fresh non-replay generation with at most one provider HTTP send

**Wave 66** *(gap closure; blocked on Wave 65 completion)*
- [ ] 10-71-PLAN.md — Superseded; cannot synchronize the consumed failed 10-70 chain

**Wave 67** *(gap closure; archive consumed 10-70 and rotate authority)*
- [x] 10-72-PLAN.md — Preserve 10-70 as authority:false and rotate registries to a post-Compose-fix namespace

**Wave 68** *(gap closure; blocked on Wave 67 completion)*
- [x] 10-73-PLAN.md — Hostile-test and exactly recertify the post-Compose-fix source

**Wave 69** *(gap closure; blocked on Wave 68 completion)*
- [x] 10-74-PLAN.md — Build and authenticate the exact post-Compose-fix local image

**Wave 70** *(historical gap attempt; consumed and immutable)*
- [ ] 10-75-PLAN.md — Consumed zero-send post-tools lifecycle-race evidence; immutable and non-replayable

**Wave 71** *(superseded; 10-75 did not produce synchronization authority)*
- [ ] 10-76-PLAN.md — Superseded; cannot synchronize the consumed failed 10-75 chain

**Wave 72** *(gap closure; archive consumed 10-75 and rotate authority)*
- [x] 10-77-PLAN.md — Preserve 10-75 as authority:false and rotate registries to the bounded-drain recovery namespace

**Wave 73** *(gap closure; blocked on Wave 72 completion)*
- [x] 10-78-PLAN.md — Hostile-test and exactly recertify the post-tools bounded-drain source

**Wave 74** *(gap closure; blocked on Wave 73 completion)*
- [x] 10-79-PLAN.md — Build and authenticate a fresh exact-source local Docker image

**Wave 75** *(gap closure; blocked on Wave 74 completion)*
- [ ] 10-80-PLAN.md — Historical consumed zero-send SIGTERM-preempted evidence; immutable and non-replayable

**Wave 76** *(superseded; 10-80 did not produce synchronization authority)*
- [ ] 10-81-PLAN.md — Superseded; cannot synchronize the consumed failed 10-80 chain

**Wave 77** *(gap closure; archive consumed 10-80 and rotate authority)*
- [x] 10-82-PLAN.md — Preserve 10-80 as authority:false and rotate registries to the graceful-drain recovery namespace

**Wave 78** *(gap closure; blocked on Wave 77 completion)*
- [ ] 10-83-PLAN.md — Hostile-test and exactly recertify the timeout-only SIGTERM source

**Wave 79** *(gap closure; blocked on Wave 78 completion)*
- [ ] 10-84-PLAN.md — Build and authenticate a fresh exact-source local Docker image

**Wave 80** *(gap closure; blocked on Wave 79 completion)*
- [ ] 10-85-PLAN.md — Run one fresh non-replay generation with at most one provider HTTP send

**Wave 81** *(gap closure; only reachable from a passed Wave 80 chain)*
- [ ] 10-86-PLAN.md — Synchronize and independently audit passed project truth; non-pass performs zero writes

Cross-cutting constraints:
- SAFE-04 and PROV-01 remain open until every gap plan passes verification.
- Future Phase 10 API/provider tests may run automatically without per-run human authorization; every plan must enforce a declared finite request cap, disabled retries and fallback, and truthful failure retention.
- Plans 10-51, 10-59, 10-65 and 10-70 are closed historical evidence: their committed consumed states cannot be replayed, overwritten, upgraded, or used as synchronization authority. Plan 10-72 preserves 10-70 and rotates fixed production authority to the 10-73/74/75/76 chain.
- Provider identity, final public schema, and retained verification evidence must be validated without exposing credentials or raw external diagnostics.
- Local evidence authority uses atomic write/rename, exact content hashes, immutable identities and same-process validation; Git commits preserve durable copies but are not local validation prerequisites.
- Plans 10-38 through 10-86 have GitHub Actions run budget 0: no push, workflow/repository dispatch, or retrigger loop is permitted.
- Local tests, builds, Docker builds and Docker runs are not quota-limited and may be repeated when implementation or recertification requires them. Only GitHub Actions executions consume the finite CI quota; provider/API calls retain their separate paid-request ceilings.
- Rebuilding is prohibited only inside a live-proof invocation when necessary to preserve its certified immutable-image identity. Stale local images may be replaced before live execution without a separate build-count authorization.
- Plans 10-52, 10-60, 10-66, 10-71, 10-76 and 10-81 are superseded and remain unexecuted. Only Plan 10-86 may synchronize, and only from an exact committed passed 10-82/10-83/10-84/10-85 authority chain; non-pass performs zero target writes.

### Phase 11: Linux Filesystem Traversal Hardening
**Goal**: Linux anchored filesystem traversal enforces the documented no-follow invariant for untrusted path components and the milestone planning record matches verified reality.
**Depends on**: Phase 10
**Requirements**: [SAFE-01]
**Gap Closure**: Closes the v1.0 audit warning about intermediate path-component symlink handling and removes stale roadmap/state evidence before re-audit.
**Success Criteria** (what must be TRUE):
  1. Every untrusted Linux evidence path component is opened or validated with an equivalent no-follow guarantee without breaking the trusted proc-descriptor hop.
  2. Deterministic Linux-focused regression tests reject intermediate symlink substitution and preserve valid read-only fixture access.
  3. ROADMAP, REQUIREMENTS, STATE, and verification artifacts consistently reflect completed and pending work before the next milestone audit.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. MCP Contract and Skeleton | 2/2 | Complete | 2026-08-21 |
| 2. Evidence Ingestion and Multimodal Context | 4/4 | Complete    | 2026-08-22 |
| 3. Read-Only Filesystem Boundary | 3/3 | Complete    | 2026-08-22 |
| 4. Review Orchestration and Findings | 3/3 | Complete    | 2026-08-22 |
| 5. Provider Adapter and DeepSeek Integration | 3/3 | Complete | 2026-08-23 |
| 6. Docker Deployment and End-to-End Validation | 2/2 | Complete   | 2026-08-23 |
| 7. DeepSeek Vision Provenance Closure | 1/1 | Complete | 2026-08-25 |
| 8. Docker Runtime Verification Closure | 1/1 | Complete | 2026-08-25 |
| 9. Public Provider Attribution and Determinism Contract | 9/9 | Complete | 2026-09-05 |
| 10. Fail-Closed Provider Startup and Credentialed MCP E2E | 70/86 | In Progress|  |
| 11. Linux Filesystem Traversal Hardening | 0/TBD | Not started | - |

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11

Security and provenance are introduced before external model calls so later phases inherit the safe boundary.

---
*Roadmap created: 2026-08-22*
*Last updated: 2026-09-13 after Phase 10 Plan 23 retained the sole authorized immutable-image protocol non-pass*
