---
phase: 11-linux-filesystem-traversal-hardening
status: reviewed
reviewed_commit: 189482e68db85580ab02a2110b5636e33d5a8796
unresolved_high_or_blocker: 0
---

# Phase 11 Security Review

| Boundary | Source and runtime evidence | Result |
|---|---|---|
| Trusted root and proc hop | `policy.ts:107-115` canonicalizes and opens the root read-only with `O_DIRECTORY` and `O_NOFOLLOW`; `read.ts:79` opens the kernel-managed `/proc/self/fd/<root descriptor>` link with `O_RDONLY | O_DIRECTORY`. The Linux fixture reads succeeded. | Pass |
| Untrusted components | `read.ts:68-69` denies missing constants; `read.ts:81` opens each intermediate directory with `O_RDONLY | O_DIRECTORY | O_NOFOLLOW`; `read.ts:89` opens the leaf with `O_NOFOLLOW`. No Linux `?? 0` downgrade remains. The post-authorization symlink swap returned `ACCESS_DENIED` in the Linux production image. | Pass |
| Canonical aliases and containment | `policy.ts:133-150` resolves the target and emits canonical relative provenance; Linux tests read an in-root alias and deny an escaping alias. | Pass |
| Descriptor lifecycle | `read.ts:80-104` closes each preceding directory, tracks the newly opened one for `finally`, closes a leaf if directory cleanup fails, and returns a leaf descriptor closed by `readFilesystemEvidence` at `read.ts:198-205`. The cleanup handoff fix is commit `4b3decb`. | Pass |
| Read-only, identity and bounds | `read.ts:142,148` passes only `O_RDONLY` into opens; `read.ts:163-188` checks file type, authorized identity, per-type byte limit, exact read count and post-read identity/size. Focused tests passed 14/14; default suite passed 795/795. | Pass |
| Rootless and macOS denial | An empty root map denies authorization; `read.ts:59-65` fails closed on macOS without a pathname fallback. Existing policy/reader tests passed. | Pass |
| Stable errors and offline proof | `read.ts:126-129,152-160` maps authorization/open failures to stable codes; `errors.ts` sanitizes public output. The Linux test checked `ACCESS_DENIED` without outside path exposure; Docker runner uses `--network none` and read-only root. Offline smoke passed with no provider request. | Pass |

No unresolved High or Blocker finding was identified in this Phase 11 boundary. The root descriptor is intentionally retained by the policy for its lifetime; lifecycle ownership beyond that policy is unchanged by this phase. The Linux swap test proves the deterministic checked interleaving, while the component-open flags provide the general no-follow control.
