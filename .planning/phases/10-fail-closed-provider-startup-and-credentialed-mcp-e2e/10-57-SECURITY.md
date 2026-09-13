---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
plan: 57
standard: OWASP ASVS 4.0.3 Level 1
reviewed_commit: 0aa6bf37eeefa97731d962966783e6775f291170
status: blocked
open_blocker_critical_high: 1
open_warning: 0
---

# Phase 10 Plan 57 Exact-Source ASVS Level 1 Review

Status: **BLOCKED**. No READY evidence block is present and this document grants no build authority.

## Assessment

| Area | Result | Evidence |
|---|---|---|
| V1 Architecture | BLOCKED | The new automatic build producer terminates through the legacy registry after its unique build, breaking the authenticated source-to-build boundary (BL-57-01). |
| V2 Authentication | PASS | Generation-bound HMAC authenticates terminal snapshots and provider receipts. |
| V3 Session Management | PASS | Exclusive monotonic generation state provides replay protection for the relevant non-user session. |
| V4 Access Control | PASS | Fixed argv/path registries, no-follow access and process-local owner capabilities constrain authority. |
| V5 Validation | PASS | Exact keys, mutually discriminated branches, canonical JSON and bounded values reject ambiguous input. |
| V6 Cryptography | PASS | SHA-256 binds blobs/artifacts and HMAC authenticates per-generation terminal evidence. |
| V7 Error Handling | PASS | Stable error categories exclude credentials, raw provider output, paths and stacks. |
| V8 Data Protection | PASS | Credentials are neither persisted nor read during this review; live access remains downstream of preflight. |
| V9 Communications | PASS | Provider transport remains HTTPS and one-shot; this review made no network request. |
| V10 Malicious Code | PASS | The full 109-blob manifest and exact certifier hashes bind the reviewed identity. |
| V11 Business Logic | BLOCKED | The one-build budget can be consumed before an impossible final registry check. |
| V12 Files and Resources | PASS | Exclusive/no-follow writes, fsync/rename and reopened hashes protect evidence files. |
| V13 API and Web Service | PASS | MCP surface and provider result/provenance schemas remain strict and bounded. |
| V14 Configuration | BLOCKED | Production selects the wrong fixed audit mode for the new build artifact tuple. |

## Required closure

Change the post-build verification in `runFixedAutomaticBuild()` to the exact `build-auto` registry, add a hermetic post-build reachability regression, rerun Plan 10-56, and perform a complete new Plan 10-57 certification. Partial review addenda are not sufficient.

## Side-effect accounting

Docker builds/runs: **0/0**. Credential reads: **0**. Network/provider/paid requests: **0/0/0**. GitHub Actions and Git pushes: **0/0**.
