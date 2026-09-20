# Phase 10 Plan 153 Certified 8000-Token Contract Deep Review

Status: **READY**

Open findings: **0 Blocker, 0 Critical, 0 High, 0 Warning**

Reviewed blobs: **109/109**

```json evidencelens-evidence
{"certifier_sha256":{"audit_live_evidence_sha256":"62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500","audit_proof_chain_sha256":"d9f6ea4dda8fe1ff0cb6a968d012f98fecf15d5b19752069c4b7dcd054fbdabf"},"manifest_sha256":"6b34d456c6b8e8f9817f019b3ee971e5d7b8908c384b255bd832d7726ee0c91d","non_planning_tree":"488f1df09f7504d22d78957a27a326b3efb438597d788e32deed62011ab974c2","reviewed_commit":"1b2ce2617818d705f884e8f52e33605ddc9ec85d","schema":"evidencelens.deep-review.v2","status":"ready"}
```

## Exact authority

The complete 109-blob non-planning tree at hostile-disconfirmation commit `1b2ce2617818d705f884e8f52e33605ddc9ec85d` was reviewed. Production fix `ad16455`, consumed-generation seal `4df6e1d`, and Plan 10-152 registry rotation `794f24e` are ancestors of this identity. The canonical manifest, aggregate tree, certified Compose/runtime contract, and current certifier hashes form one indivisible authority tuple.

## Deep production review

| Boundary | Result |
|---|---|
| The product configuration default and review request default import the same exported `DEFAULT_PROVIDER_MAX_TOKENS` value of 8000 | PASS |
| Compose review and proof environments contain literal `DEEPSEEK_MAX_TOKENS: "8000"` values rather than host interpolation | PASS |
| Host values 4000, 20000, missing, and malformed produced byte-identical sanitized Compose expansions | PASS |
| The proof runtime parser requires exactly 8000 in both services and rejects missing, duplicate, lower, higher, crossed, and extra values | PASS |
| Immutable-image Docker argv is derived only after the same proof runtime contract validates maxTokens 8000 | PASS |
| Provider configuration accepts safe integers 1 through 20000 and rejects fractional, non-numeric, zero, negative, and overflow values | PASS |
| The request fingerprint binds the complete inference settings object, including maxTokens, before provider execution | PASS |
| Prompt v2 and post-decode validation cap output at four findings with bounded title, prose, follow-up, and citation collections | PASS |
| Certified proof execution fixes maxRetries at 0 and admits one provider request, with retry, fallback, alternate, replay, and diagnostic follow-up absent | PASS |
| Generation `86a962db` remains byte-exact `authority:false`, `replay_allowed:false` history and cannot authorize current execution | PASS |
| Current registries accept only 10-153 certification, 10-154 build, 10-155 live evidence, and 10-156 passed-only synchronization paths | PASS |
| Stale, altered, and mixed tuples reject before build, credential, daemon, provider, network, or synchronization effects | PASS |

## Finding closure

No unresolved warning-or-higher issue remains. The certified 8000-token value is fixed at product construction and both live runtime boundaries, is authenticated by the request fingerprint, and does not relax the independent four-finding/nested-field output limits. The later live proof retains a hard single-send, zero-retry contract.

## Verification and effects

- Plan-focused suite: 4 files / 234 tests passed (plan minimum 187).
- Complete provider-disabled suite: 43 files / 743 tests passed (plan minimum 742).
- Sanitized Compose review/proof expansion SHA-256: `76177b482f8b8fc642b4e0da81913e381d92fc41cd607069200ffb019ff7b996`; all hostile host-value expansions were byte-identical.
- Fixed source/review and SOURCE/REVIEW/SECURITY tuple audits, TypeScript build, and exact no-drift validation passed.
- Docker daemon/build/run, external network/provider/paid requests, GitHub Actions/dispatch/push, and synchronization target writes: all **0**.

This exact identity alone is approved for Plan 10-154 local immutable-image creation. Any later non-planning source or test edit invalidates certification and returns execution to Plan 10-153.
