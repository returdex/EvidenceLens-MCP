---
status: resolved
trigger: "Plan 10-110 retained authenticated request receipt but no acceptable independent child diagnostic frame"
---

# Debug Session: container-child-diagnostic-forwarding

## Symptoms

- Expected behavior: independent child diagnostic capability yields one authenticated closed-category frame after a post-fetch failure.
- Actual behavior: one authenticated send and request receipt, but child diagnostic remains ambiguous with stream_truncated=true.
- Error messages: sanitized ambiguous.
- Timeline: persists after splitting request-receipt and child-diagnostic environment namespaces.
- Reproduction: consumed Plan 10-110 cannot replay; use network-none local Docker environment/diagnostic probes only.

## Current Focus

- hypothesis: confirmed compound root cause: evidence-only image identity plus exact-prototype rejection of Node's direct system Error subclass.
- test: completed with a locally layered current-dist candidate pinned by immutable sha256 under network-none.
- expecting: satisfied: one authenticated provider-transport-dns diagnostic, stream_truncated=false, one authenticated send receipt.
- next_action: await human confirmation, then archive session; phase execution must recertify source and build a fresh authoritative image before any new live generation

reasoning_checkpoint:
  hypothesis: "The authenticated build identity is only written into evidence and never controls Docker Compose runtime selection; additionally, Node fetch wraps DNS failures in a direct Error subclass that the exact-prototype classifier rejects, so neither stale nor exact images yield a diagnostic."
  confirming_evidence:
    - "Plan 10-109 certifies untagged sha256:850ead..., while evidencelens-mcp:plan06 currently resolves to sha256:848258...."
    - "Network-none Compose passes all four variables into the container, but the mutable-tag image reports old EVIDENCELENS_DIAGNOSTIC_* diagnostic constants and sink.emit returns false; the certified image reports the new CHILD_DIAGNOSTIC_* constants."
    - "The real network-none harness exactly reproduces Plan 10-110: observed send=1, valid receipt, ambiguous diagnostic, stream_truncated=true."
    - "When forced to certified sha256:850ead..., the sink works but the real network-none request still emits no frame; controlled inspection shows the fetch cause is instanceof Error yet its prototype is a one-level subclass of Error.prototype, which the classifier rejects."
  falsification_test: "If a fresh pinned image that accepts only a direct, descriptor-constrained system Error subclass still lacks an authenticated frame in the network-none harness, the compound hypothesis is false."
  fix_rationale: "Immutable pinning aligns runtime and attestation; bounded recognition of Node's actual system-error prototype shape lets the existing allowlisted code/keyset logic produce the closed diagnostic without admitting arbitrary causes or private data."
  blind_spots: "The historical certified image cannot contain the classifier fix; a fresh local candidate is needed for behavioral verification and is not itself promoted build authority."

## Evidence

- timestamp: 2026-09-17T00:00:00+10:00
  checked: host childEnv and docker compose argv at reviewed commit 51af544
  found: host supplies independent child diagnostic and request-proof generation/key pairs and names all four with compose run `-e`; server consumes request proof before diagnostic but each constructor copies its own key.
  implication: the prior shared-environment deletion defect is not present in Plan 10-110 source; the remaining boundary is actual Compose forwarding/container emission.

- timestamp: 2026-09-17T00:00:01+10:00
  checked: compose service definition and Docker entrypoint
  found: review service does not declare either capability namespace, relying entirely on compose run name-only `-e`; entrypoint validates provider config then execs `dist/server.js` without explicitly filtering environment.
  implication: a real network-none Compose regression is required because mocked spawn tests cannot prove the CLI-to-container boundary.

- timestamp: 2026-09-17T00:00:02+10:00
  checked: network-none Compose capability forwarding
  found: all four capability values arrive with length 64; Compose does not drop name-only `-e` variables.
  implication: the original forwarding hypothesis is eliminated at the CLI/container boundary.

- timestamp: 2026-09-17T00:00:03+10:00
  checked: actual Compose service image versus Plan 10-109 certified image
  found: mutable tag evidencelens-mcp:plan06 is sha256:848258... and exports old shared diagnostic env names; certified untagged sha256:850ead... exports the split CHILD_DIAGNOSTIC names.
  implication: live evidence claimed certified image sha256:850ead... without running it; stale runtime explains the selective diagnostic loss.

- timestamp: 2026-09-17T00:00:04+10:00
  checked: real network-none harness using mutable Compose tag
  found: exact Plan 10-110 symptom reproduced: one send receipt, diagnostic ambiguous, stream_truncated true, sanitized protocol failure.
  implication: root cause is directly reproduced without network/provider access.

- timestamp: 2026-09-17T00:00:05+10:00
  checked: exact certified image forced through Compose under network-none
  found: split sink can emit directly, but real fetch remains ambiguous; Node fetch cause is an Error instance whose prototype is a direct child of Error.prototype with only a constructor member.
  implication: exact-prototype equality in transportErrorFeature is a second real production mismatch hidden by unit fixtures built from plain Error.

- timestamp: 2026-09-17T00:00:06+10:00
  checked: fresh current-dist image pinned by immutable sha256 through real Compose/harness under network-none
  found: exactly one authenticated send receipt and one provider-transport-dns diagnostic; terminal snapshot has stream_truncated=false.
  implication: the compound fix directly resolves the original evidence contradiction without provider/network access.

- timestamp: 2026-09-17T00:00:07+10:00
  checked: focused, full offline, build and diff verification
  found: focused 156/156, full provider-disabled 665/665, TypeScript build and git diff check passed.
  implication: adjacent capability, request-budget, lifecycle and proof behavior remain green.


## Eliminated

- hypothesis: Docker Compose drops name-only child diagnostic `-e` variables.
  evidence: network-none container observed all four independent capability variables with exact expected lengths.
  timestamp: 2026-09-17T00:00:02+10:00

- hypothesis: immutable image selection alone restores the diagnostic.
  evidence: forcing certified sha256:850ead... restores the split sink but the real network-none fetch remains ambiguous because its system error uses a direct Error subclass.
  timestamp: 2026-09-17T00:00:05+10:00


## Resolution

- root_cause: authenticated image identity was evidence-only so Compose ran a stale mutable tag; even when forced to the exact split-capability image, transport classification rejected Node's genuine direct system Error subclass due to exact prototype equality.
- fix: thread authenticated build.image_id into runReviewHarness, require an immutable sha256 ID, resolve the Compose review service to it, and recognize only descriptor-constrained direct Error subclasses while retaining allowlisted keysets/codes.
- verification: network-none real Docker harness produced provider-transport-dns with stream_truncated=false and one authenticated send; focused 156, full offline 665, build and diff passed.
- files_changed: [compose.yaml, scripts/automatic-live-review.mjs, scripts/docker-review-real.mjs, src/providers/retry.ts, tests/providers/deepseek.test.ts, tests/scripts/automatic-live-review.test.ts, tests/scripts/docker-review-real.test.ts]
