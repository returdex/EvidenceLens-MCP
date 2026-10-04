---
phase: 20
slug: bounded-independent-codex-execution
status: verified
threats_open: 0
threats_total: 11
asvs_level: 1
created: 2026-10-05
---
# Phase 20 — Security

Inline verification of the 11 threats in the six plans. No new ASVS certification or independent evaluator is claimed. Source: 72b7c3f; [review](20-REVIEW.md), [host proof](20-HOST-ACCEPTANCE.md) and [runtime evidence](20-RUNTIME-EVIDENCE.md).

## Trust boundaries

Parent source admission precedes reads. Captured task evidence crosses into a fixed CLI under a whole-process OS policy. CLI manages its own authentication; EvidenceLens receives status only. Model bytes cross a bounded event parser and local source validator before private-store publication. Disk records never authorize arbitrary process cleanup or recursive deletion.

## Threat register

| Threat ID | Category | Component | Disposition | Mitigation/evidence | Status |
|---|---|---|---|---|---|
| T-20-01 | S/T/I | Captured capsule | mitigate | codex-contract + existing pre-read source selector; identity/hash/UTF-8/excluded/current tests | closed |
| T-20-02 | I/E | Auth/executable environment | mitigate | codex-preflight + isolation; trusted digest, small environment, status-only real login; no credential contents read by EvidenceLens | closed |
| T-20-03 | I/E | Automatic context/tools | mitigate | pinned deny-default Seatbelt, fixed argv, tool inventory/forced-tool negatives and ambient context markers | closed |
| T-20-04 | E/D | Recursion/retries | mitigate | child recursion marker, disabled external tools, request/stream retries zero; actual loopback HTTP/stream negative counts | closed |
| T-20-05 | R/T | Run/publication races | mitigate | prompt-store owner attempt claim, locked local revalidation, dirty publication tests; no host-forged success | closed |
| T-20-06 | D/E | Process/output lifetime | mitigate | codex-runner and boundedProbe quotas, TERM/KILL and confirmed group exit; closed-stdio descendant, timeout/cancel/flood tests | closed |
| T-20-07 | S/T | Result provenance | mitigate | codex-result strict coverage and source/excerpt/span/quote binding; unavailable-current, forged quote and UTF-8 negatives | closed |
| T-20-08 | E/I | Installed routing | mitigate | closed codex-review CLI fields; installed four-stage capture/export, no override/fallback; help/export no dispatch | closed |
| T-20-09 | R/I | Evidence overclaim | mitigate | separate host, synthetic and actual CLI protocol evidence; explicit real-inference NOT_RUN | closed |
| T-20-10 | D/E | Cleanup/deletion bypass | mitigate | adversarial crash/link/concurrency tests; canonical /tmp overlap rejection; uncertain preflight keeps deletion busy | closed |
| T-20-11 | T/R | Version/stale proof | mitigate | one product 0.3.3 patch, fresh build/118 affected tests/157 Node tests, unchanged dependency graph and historical proof | closed |

## Accepted risks log

| Risk ID | Threat Ref | Rationale | Accepted by | Date |
|---|---|---|---|---|
| R1 metadata/status allowance | T-20-02, T-20-03 | Exact existing noncredential installation_id data/mode operations, post-check unchanged content; separate no-network status config reads, absent in review policy | User explicit 可以; recorded approved R1 in CONTEXT | 2026-10-05 |

All other threats above have observed mitigation, rather than a new risk waiver. Same-user hostile processes and installation administrators remain the documented trusted-host boundary. Fixed runtime paths and the Codex-owned auth file are required capabilities; no universal filesystem/remote provider guarantee. The native sandbox failure and original strict-profile failure remain historical failures. Auth refresh incompatibility fails; no auth writes/fallback are introduced.

## Security audit trail

| Date | Total | Closed | Open | Run by |
|---|---|---|---|---|
| 2026-10-05 | 11 | 11 | 0 | Inline executing agent |

- [x] All planned threats have a disposition and implementation/test evidence.
- [x] Approved R1 exception recorded without broadening permission.
- [x] threats_open: 0 within the documented target-host scope.
- [x] status: verified; real inference/semantic/usage acceptance retained in Phase 21.

**Approval:** verified 2026-10-05 against local implementation and host controls.
