# Phase 10 Plan 57 Exact-Source Deep Review

Status: **BLOCKED**

Open findings: **1 Blocker, 0 Critical, 0 High, 0 Warning**

Reviewed blobs: **109/109**

No READY evidence block is present. Current exact identity: commit `6fe14a3d799e9ac021f40b8dfabc059b21112e8b`, manifest `2838bcafffc950f05686dbefc1af2f31c66fa03be40a47f26cd185667f260037`, tree `f1fe4547da6afd6c5d5be586591e25fa3a3ad1a70b5dc1a905a543d0a653e59b`, proof certifier `0ae4c2ef14ee4b7516c02fb50f5271a8cbfd385c8a69bb504f56efb72a910826`.

## BL-57-04 — historical failed-attempt regression depends on current workspace tuple

Severity: **Blocker**

Owner: Plan 10-55 test owner (`tests/scripts/audit-proof-chain.test.ts`)

The two tests for `proof-committed-auto` and `sync-authority-auto` claim to verify immutable failed LOCAL_VALIDATION attempt `585fd01`, but execute the CLIs against the current repository and merely expect `PROOF_CHAIN_LOCAL_VALIDATION`. During required 10-57 artifact replacement, the correct first refusal is `PROOF_CHAIN_COMMITTED`; after committing the new source identity, the historical 10-58/10-59 tuple is necessarily identity-stale and can fail before local-validation inspection.

Mandatory suite result: **42/43 files, 610/612 tests**. Both failures received `PROOF_CHAIN_COMMITTED` instead of the state-dependent expected category.

Required correction: materialize the exact `585fd01` tuple in an isolated temporary Git repository (including the exact commit and working bytes), or test the committed-authority function with an injected immutable tuple. Assert LOCAL_VALIDATION rejection there. Separately assert that current tuple drift is rejected, without requiring one specific downstream category. Rerun Plan 10-56 and fully recertify.

The pre-tools null receipt change itself is correct: tools=0/reservation=1 requires null receipt/digest; post-tools and passed variants require an authenticated receipt; committed authority rejects a reached failed local validation.

Docker builds/runs **0/0**; credentials **0**; provider/network/paid **0/0/0**; GitHub Actions/dispatch/push **0/0/0**. Current build and failed 10-59 evidence remain stale history and grant no authority.
