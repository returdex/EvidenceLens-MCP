---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
standard: OWASP ASVS 4.0.3 Level 1
reviewed: 2026-09-13T04:13:00+10:00
status: passed
open_high_findings: 0
---

# Phase 10: Security Review

## Outcome

PASS. The reviewed immutable source archive and proof image satisfy the applicable OWASP ASVS Level 1 controls for this local stdio MCP service. No credential was read, no provider was contacted, and no network request was made while producing this evidence.

## ASVS Level 1 Evidence

| Area | Result | Evidence |
| --- | --- | --- |
| V1 Architecture | PASS | Trust boundaries separate caller input, filesystem policy, provider adapter, proof generation, evidence sealing, and one-shot authorization. |
| V2 Authentication | N/A | No user-account surface; provider authority is process-local and live execution requires a sealed one-use challenge. |
| V3 Session Management | N/A | No application session; replay state is durably consumed before child creation. |
| V4 Access Control | PASS | Canonical containment, no-follow access, fixed argv, owner-only evidence, and immutable image identity enforce least privilege. |
| V5 Validation | PASS | Strict schemas, bounded decoding, canonical JSON, and exact keys reject malformed input. |
| V6 Cryptography | PASS | SHA-256 binds source/archive/handoff/image facts; timing-safe comparison protects authorization. |
| V7 Error Handling | PASS | Public errors and subprocess I/O are sanitized, finite, bounded, and terminally ordered. |
| V8 Data Protection | PASS | Secrets are excluded from archives/evidence and passed only to the final authorized child. |
| V9 Communications | PASS | Provider URLs require HTTPS; this proof build made no provider or network request. |
| V10 Malicious Code | PASS | Exact committed blobs, restricted archive types/modes, no shell evaluation, and immutable image IDs prevent substitution. |
| V11 Business Logic | PASS | Exactly-once generation claims and replay consumption prevent duplicate build and paid execution. |
| V12 Files and Resources | PASS | Byte, entry, path, event, timeout, retry, and finding caps are enforced. |
| V13 API and Web Service | PASS | MCP lifecycle, tool annotations, IDs, attribution, namespaces, and schemas are verified. |
| V14 Configuration | PASS | Defective provider configuration fails closed; Docker is read-only with dropped capabilities and no-new-privileges. |

## Threat Register Closure

- T-10-22-01: exact-commit archive and immutable-ID verification passed.
- T-10-22-02: final reports were written only after immutable evidence completed and will share one report commit.
- T-10-22-03: the exclusive claim and started transition preceded the sole build.
- T-10-22-04: one producer completed; every later verifier has build count zero.
- T-10-22-05: the handoff blob and publication commit authenticated before Docker.

```json evidencelens-evidence
{"daemon_identity_sha256":"5542558255037050166419659740b313dbd3530f29496e48015da5c202637083","fixture_sha256":["795c2aac2ab197a9b341adc84b93c4e57bba2b8a5f71f8553114fb864a6980ba","4b3eb79160512270df9c64612930efd19bf7194b7a638e63bed9d2c796eea4cf","1c4134df8bcfc08872dc61d0dbd20a764d90d38104f1c1349536f069d1bca927","4a9750c56157eae0ff3e66320fe406bfa1333bb918018a1ba2e6df056fa30503"],"image_config_sha256":"ad453e5db85b863299e92c7c1aa5b021e36250e6421b24bdcfd81eca12c5b7b3","image_content_sha256":"a4899adbd1023afd85516bec05aa436062e26b3c0870efc1a49f38a18ea56588","runtime_sha256":"95660965c81678d23045e5e8d8d6c52d2c5b0f0ab6ba9fd45f792afedeae3382","schema":"evidencelens.image-bound.v1","sentinels":{"proof":"normalized","review":"normalized"},"source_review":{"fixture_sha256":["795c2aac2ab197a9b341adc84b93c4e57bba2b8a5f71f8553114fb864a6980ba","4b3eb79160512270df9c64612930efd19bf7194b7a638e63bed9d2c796eea4cf","1c4134df8bcfc08872dc61d0dbd20a764d90d38104f1c1349536f069d1bca927","4a9750c56157eae0ff3e66320fe406bfa1333bb918018a1ba2e6df056fa30503"],"manifest_sha256":"69a9dcc33555a9058b902a3f0cfc7bd1f981776576d92bc87cc8eb14ddeaf23c","non_planning_tree":"17977344a6af3b7919542f73320a310cf562e304982f086e9eb12bf5be4863d1","reviewed_commit":"ebd056645d6b422db1b4c7b23051febe411914e9","schema":"evidencelens.source-review.v1"}}
```

## Residual Risk

The paid provider proof remains a separately authorized operation. This report establishes readiness and does not claim PROV-01 passed before that live operation succeeds.
