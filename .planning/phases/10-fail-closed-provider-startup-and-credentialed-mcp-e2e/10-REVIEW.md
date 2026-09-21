---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
reviewed: 2026-09-22T05:25:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/providers/deepseek.ts
  - src/providers/provenance.ts
  - src/providers/types.ts
  - scripts/audit-proof-chain.mjs
  - scripts/audit-live-evidence.mjs
  - scripts/sync-proof-state.mjs
  - tests/providers/deepseek.test.ts
  - tests/providers/deepseek-live.test.ts
  - tests/providers/vision-provenance.test.ts
  - tests/scripts/audit-proof-chain.test.ts
  - tests/scripts/audit-live-evidence.test.ts
  - tests/scripts/sync-proof-state.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-22T05:25:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** clean

## Summary

The two synchronization authority blockers identified in the prior review are fixed. Live and legacy completion routes now require an exact passed state, preflight remains the only gaps route, and recovery enforces matching claim schema and intended state. The synchronization parent derives tuple digests from the certifier-authenticated commit and compares every subsequently opened authority member before creating or recovering a claim. The executed certifier itself remains byte-identical to the real proof identity.

## Resolved Critical Issues

### CR-01 (BLOCKER): Live synchronization authority is not restricted to a passed proof

**File:** `scripts/sync-proof-state.mjs:158-167`

**Issue:** `synchronizeProofState` rejects a passed proof only for the five-member preflight branch. It imposes no equivalent requirement that a nine-member live authority have `status === "passed"` and `outcome === "passed"`. `registryFromRecords` in `scripts/audit-proof-chain.mjs:1395-1399` likewise accepts any internally consistent live execution/proof pair, including `gaps_found`. Consequently, a fresh live transaction can create a valid claim and rewrite Phase 7, Phase 10, and PROV-01 back to `gaps_found`, despite Phase 10's declared passed-only synchronization contract. The generic non-pass test at `tests/scripts/sync-proof-state.test.ts:86-91` exercises and normalizes this behavior instead of rejecting it.

**Fix:** Enforce the intended state before reading or writing synchronization targets. Keep the five-member preflight route separate if gap-state synchronization remains required, but require every live/legacy completion route to be passed (or remove legacy completion authority entirely):

```js
const authorityNames = tupleNamesFor(paths.authorityPaths.length);
if (authorityNames === preflightTupleNames) {
  if (sealed.value.status !== "gaps_found" || sealed.value.outcome === "passed") fail("PROOF_SYNC_AUTHORITY");
} else if (sealed.value.status !== "passed" || sealed.value.outcome !== "passed") {
  fail("PROOF_SYNC_AUTHORITY");
}
```

Add a test using a nine-member authenticated live tuple with a non-pass proof and assert that no claim, journal, or target write occurs.

**Resolution:** Fixed in `e2d92b7`. Both initial synchronization and recovery validate the route-specific terminal state before target mutation; non-pass live/legacy tests assert that claim and journal files are absent.

### CR-02 (BLOCKER): Authority bytes can change between certification and claim hashing

**File:** `scripts/sync-proof-state.mjs:121-135`

**Issue:** `authenticateAuthority` first awaits an external validator and only afterward opens and reads `paths.authorityPaths`. The default validator launches `audit-proof-chain.mjs`, which independently opens and validates the fixed files. There is no shared file descriptor, inode snapshot, or returned digest set tying the bytes validated by that child process to the bytes later read at lines 129-134. A concurrent replacement in that interval can therefore cause the parent to hash uncertified tuple bytes into `tuple_sha256`. Only the proof is subsequently parsed locally, and `loadProof` checks canonical encoding rather than re-running full proof-chain identity validation; the other authority members are not locally validated at all. This breaks the core guarantee that the synchronization claim binds the actually certified tuple.

**Fix:** Make certification return the ordered SHA-256 map (and branch) for the exact bytes it validated, then read the files and compare every digest before constructing authority. Prefer opening all authority files once in the parent, validating stable descriptor snapshots, and passing their verified digests to the certifier. At minimum:

```js
const certified = await validator(paths.authorityPaths); // { branch, tuple_sha256 }
const bytes = await Promise.all(paths.authorityPaths.map((path) => readStableBytes(path)));
const tupleNames = tupleNamesFor(paths.authorityPaths.length);
const observed = Object.fromEntries(tupleNames.map((name, index) => [name, sha256Hex(bytes[index])]));
if (tupleNames.some((name) => observed[name] !== certified.tuple_sha256[name])) {
  fail("PROOF_SYNC_AUTHORITY");
}
```

The validator contract must not be a success-only callback. Add a deterministic test validator that swaps one authority member after recording its certified digest and verify rejection before claim creation.

**Resolution:** Fixed across `e2d92b7`, `9acdbc7`, and `a6acc34`. The default validator converts the immutable authenticated commit into an ordered digest map, the parent compares all reopened members against that map, success-only callbacks fail closed, and a deterministic post-certification mutation test confirms rejection before writes.

## Verification

- Focused synchronization/proof/evidence suite: 172/172 passed.
- Full offline suite: 795/795 passed.
- TypeScript build: passed.
- Committed final proof-chain audit: passed with live authority, cardinality 11.
- Live evidence consistency audit: passed.
- External effects: no provider request, Docker daemon command, replay, or GitHub Action was executed during the fix or re-review.

---

_Reviewed: 2026-09-22T05:25:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
