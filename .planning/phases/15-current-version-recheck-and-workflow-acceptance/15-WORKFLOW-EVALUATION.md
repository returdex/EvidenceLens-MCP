---
phase: 15-current-version-recheck-and-workflow-acceptance
status: passed
evaluation: inline_synthetic
requirements: [REV-01, REV-02, REV-03]
---

# Actual workflow evaluation

Executed 2026-10-03 by the implementing assistant applying the repository Skill inline. This is not an independent evaluator, model call, real coursework audit or installed-skill discovery test. Inputs and expected oracles: [six case groups](../../../skills/assignment-review/references/recheck-cases.md). Actual output follows below. The collector verifies reads/hashes only; semantic judgments and action lists were produced inline after inspecting the supplied fixture text. No deterministic semantic classifier is used.

## Actual collector evidence

Command: complete shell block in recheck-cases.md. Exit 0, 18 steps. All callback/order/skip/unavailable/immutability/hash assertions passed. Hash kind throughout: admitted_utf8_text_sha256. Identity/coverage references in subsequent tables refer to these immutable step records, not a mutable “current file”. All IDs and document groups are explicitly defined by the fixture metadata; no real-file alias discovery is claimed.

### E01-preparation

Inspected at `2026-10-03T12:51:30.256Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J`. Current selection: `{'sourceId': None, 'status': 'not_provided'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |

### E01-initial

Inspected at `2026-10-03T12:51:30.257Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, W-J1`. Current selection: `{'sourceId': 'W-J1', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| W-J1 | `68fdb3e7449813558079dd0d820f122be6c6822d1eeecc1710059a5d1d3a26ef` |

### E01-clarification

Inspected at `2026-10-03T12:51:30.257Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J`. Current selection: `{'sourceId': None, 'status': 'not_provided'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |

### E01-recheck

Inspected at `2026-10-03T12:51:30.257Z`; coverage: provided Method/Limitations/disclosure/signature excerpt; Results absent from coverage.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J2`. Current selection: `{'sourceId': 'W-J2', 'status': 'selected'}`.

Skipped: `[{"id": "W-OLD", "reason": "not_current_artifact"}, {"id": "H-OLD", "reason": "history_not_requested"}]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J2 | `f00be7cd7abf14fb3d83db0ca1cae4dce8caab6f985ddb096f6725b689c168f2` |

### E02-W-J3

Inspected at `2026-10-03T12:51:30.257Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J3`. Current selection: `{'sourceId': 'W-J3', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J3 | `94ec440f87a9f077e10832a2e26a0f62e49026e8581fc2bd9d9b50cc56e94deb` |

### E02-W-J3b

Inspected at `2026-10-03T12:51:30.257Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J3b`. Current selection: `{'sourceId': 'W-J3b', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J3b | `c38739e5255c5749c729390eb04e4571e64f26e49e7b82e9cc4d6f14e3307ac7` |

### E02-W-J4

Inspected at `2026-10-03T12:51:30.257Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J4`. Current selection: `{'sourceId': 'W-J4', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J4 | `c8ca074008effa1c3239ea7fc9c9025e2cd9a8a8b6e0db09a5936ee65667c58a` |

### E02-no-prior

Inspected at `2026-10-03T12:51:30.257Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J4`. Current selection: `{'sourceId': 'W-J4', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J4 | `c8ca074008effa1c3239ea7fc9c9025e2cd9a8a8b6e0db09a5936ee65667c58a` |

### E03-failed

Inspected at `2026-10-03T12:51:30.257Z`; coverage: no current content.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-FAIL`. Current selection: `{'sourceId': 'W-FAIL', 'status': 'selected'}`.

Skipped: `[{"id": "W-OLD", "reason": "not_current_artifact"}, {"id": "H-OLD", "reason": "history_not_requested"}]`; unavailable: `[{"id": "W-FAIL", "reason": "read_failed"}]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |

### E03-denied

Inspected at `2026-10-03T12:51:30.258Z`; coverage: no current content.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J`. Current selection: `{'sourceId': 'W-DENY', 'status': 'unavailable'}`.

Skipped: `[{"id": "W-DENY", "reason": "partial_exclusion_unsupported"}, {"id": "ALIAS", "reason": "partial_exclusion_unsupported"}, {"id": "W-OLD", "reason": "not_current_artifact"}, {"id": "H-OLD", "reason": "history_not_requested"}]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |

### E03-same-before

Inspected at `2026-10-03T12:51:30.258Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-SAME`. Current selection: `{'sourceId': 'W-SAME', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-SAME | `68fdb3e7449813558079dd0d820f122be6c6822d1eeecc1710059a5d1d3a26ef` |

### E03-same-after

Inspected at `2026-10-03T12:51:30.258Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-SAME`. Current selection: `{'sourceId': 'W-SAME', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-SAME | `94ec440f87a9f077e10832a2e26a0f62e49026e8581fc2bd9d9b50cc56e94deb` |

### E03-no-ledger

Inspected at `2026-10-03T12:51:30.258Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J3`. Current selection: `{'sourceId': 'W-J3', 'status': 'selected'}`.

Skipped: `[{"id": "W-OLD", "reason": "not_current_artifact"}, {"id": "H-OLD", "reason": "history_not_requested"}]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J3 | `94ec440f87a9f077e10832a2e26a0f62e49026e8581fc2bd9d9b50cc56e94deb` |

### E04-unsupported

Inspected at `2026-10-03T12:51:30.258Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, W-J1`. Current selection: `{'sourceId': 'W-J1', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| W-J1 | `68fdb3e7449813558079dd0d820f122be6c6822d1eeecc1710059a5d1d3a26ef` |

### E04-sourced

Inspected at `2026-10-03T12:51:30.258Z`; coverage: full synthetic text.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J1`. Current selection: `{'sourceId': 'W-J1', 'status': 'selected'}`.

Skipped: `[{"id": "H-X", "reason": "user_excluded"}, {"id": "X-RECORD", "reason": "user_excluded"}]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J1 | `68fdb3e7449813558079dd0d820f122be6c6822d1eeecc1710059a5d1d3a26ef` |

### E05-W-F1

Inspected at `2026-10-03T12:51:30.258Z`; coverage: provided text only; figure/rendering and remote receipt not supplied.

Callbacks: `B-F, Q-F, P-F, U-F, W-F1`. Current selection: `{'sourceId': 'W-F1', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| B-F | `aa6a9c618900da39155fc84fd6cf7e9f8a648478bb9c679d18bfb705934d0cee` |
| Q-F | `2e9c29862fb2b0deb34a32c41e397b4047f476cb49403bcd39f23f5f4546a536` |
| P-F | `fa215fd5257dc27ef50a261f90cf1d75047a1e5b508a0b9c7bdb7c792f36afe4` |
| U-F | `8c7b0c88eb6faa2a21356e9792f1b84c92a43e7e8cfed99e5ec46f928ea886b0` |
| W-F1 | `137e3c2457bb3aa98b320454238a57f2004a2e850d937af4b670b3b5e1b16b8d` |

### E05-W-F2

Inspected at `2026-10-03T12:51:30.258Z`; coverage: provided text only; figure/rendering and remote receipt not supplied.

Callbacks: `B-F, Q-F, P-F, U-F, W-F2`. Current selection: `{'sourceId': 'W-F2', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| B-F | `aa6a9c618900da39155fc84fd6cf7e9f8a648478bb9c679d18bfb705934d0cee` |
| Q-F | `2e9c29862fb2b0deb34a32c41e397b4047f476cb49403bcd39f23f5f4546a536` |
| P-F | `fa215fd5257dc27ef50a261f90cf1d75047a1e5b508a0b9c7bdb7c792f36afe4` |
| U-F | `8c7b0c88eb6faa2a21356e9792f1b84c92a43e7e8cfed99e5ec46f928ea886b0` |
| W-F2 | `608fd135fb795c088ff0690d714f391b70d5a1acca46fc1547230fc8bc0daf7b` |

### E06-requested-review

Inspected at `2026-10-03T12:51:30.258Z`; coverage: same provided excerpt as E01-recheck; Results not supplied.

Callbacks: `T-J, B-J, Q-J, P-J, U-J, C-J, W-J2`. Current selection: `{'sourceId': 'W-J2', 'status': 'selected'}`.

Skipped: `[]`; unavailable: `[]`.

| Admitted source | Actual text SHA-256 |
|---|---|
| T-J | `d1787d855cce3388dd250111e41bd37f6fd31de5f0961331982dec014ea7e556` |
| B-J | `7a86ecf9006692c4203950dab3402777d877c8b28bac483b0a7c15cbbf7890bd` |
| Q-J | `bd2d9e4c2e70854d4011aa8a05033ed878f0839802880049d75d994edbdf96d4` |
| P-J | `7df55abe876d62ec486e4252403d82634b500228872b07a665f4b2736e348d87` |
| U-J | `bd9aeb5b05254edb0854b6504b185e8044bececad9f6a6177c3d74bbbb509b90` |
| C-J | `a50e44395c0919c22e035e178ae3d700eb643a730a7aba929ef22937653dfca7` |
| W-J2 | `f00be7cd7abf14fb3d83db0ca1cae4dce8caab6f985ddb096f6725b689c168f2` |

## E01 — actual connected journey

### Request 1: generate preparation, no solution yet

Actual adaptation: no user seed supplied; use default six sections and sourced planning. Known template/brief/rubric/policy kept separate from U-J's attributed report. Generated prompt:

1. **Task/stage/goal:** DEMO-J / preparation. Generate a plan from admitted task sources; no solution exists yet. This prompt has not executed a content review.
2. **Inputs/evidence:** T-J §1 requires Method and Limitations, §2 has blank Signature. B-J §1 compare A/B; §2 Results must include measured values; §3 include chart; §4 disclose tools/purposes in Appendix D. Q-J §1 explain comparison reasoning, no numerical weights. P-J §1 AI drafting requires disclosure. U-J §1 user reports Tool Q helped outline Method. Source identities/time are E01-preparation above; these are complete synthetic source texts, no real binary/visual original. Current not_provided.
3. **Actions/exclusions:** Analyze provided materials, artifact_only, no raw history, external transfer, edits, signing or upload. Apply actual source permissions and document-group exclusions before any later read. This prompt grants no extra authority.
4. **Checks:** Establish stable R/P IDs, distinguish requirements, rubric, preferences/advice, missing current evidence and process completeness. Plan comparison criteria and data collection; preserve source template and accurate disclosure. Do not invent measured values, deadline, weights or missing MCP roles.
5. **Output:** Sourced baseline, requirement/evidence needs, minimal next steps and unknowns. Policy assessment separate from progress and submission; stable policy not repeated as new warning actions.
6. **Gaps/stops:** No solution or full process record, visual/remote state unknown. Continue useful planning; stop unsupported claims and unauthorized reads. MCP not_run, no teacher role fabricated.

Actual baseline generated during preparation (current content status unknown throughout):

| R ID / type | Content and sourced basis | Version/state |
|---|---|---|
| R1 requirement | Keep Method and Limitations, T-J §1 | v1 active |
| R2 requirement | Compare A/B, B-J §1 | v1 active |
| R3 requirement | Results include measured values, B-J §2 | v1 active |
| R4 requirement | Include chart, B-J §3 | v1 active |
| R5 requirement | Disclose tools/purposes in Appendix D, B-J §4 | v1 active |
| R6 rubric requirement | Explain reasoning, Q-J §1; no weights | v1 active |

P1 restricted for AI drafting: disclosure required by P-J §1; no blanket permission inferred. U-J gives only one known use, not full-process evidence. T-J signature blank retained; no requirement to sign was inferred from the blank field. Source registry T-J template, B-J/P-J requirements, Q-J rubric, U-J attributed user support. Preparation plan A-prep: build A/B comparison and evidence table, collect measurements, preserve headings and record known usage in required appendix. No findings yet; no invented prior ledger.

### Request 2: review W-J1 in progress

Actual current identity/time/hash: E01-initial / W-J1 above; full synthetic text inspected. Matrix and first emitted finding ledger:

| R | Current evidence | Matrix | First emitted F / state | Actual next action |
|---|---|---|---|---|
| R1 | W-J1 §1 Method present; Limitations absent throughout full inspected text | gap | DEMO-J/F-01 still_present | A1 restore Limitations structure from T-J §1 |
| R2 | W-J1 §1 only “Method: A” | gap | DEMO-J/F-02 still_present | A2 compare A/B |
| R3 | W-J1 §2 “TODO measurements” | gap | DEMO-J/F-03 still_present | A3 supply results/evidence; deleting TODO does not fix it |
| R4 | Chart absent from full synthetic text | gap in this fixture | DEMO-J/F-04 still_present | A4 add chart per B-J §3 |
| R5 | W-J1 §3 “Entirely manual” contradicts U-J §1 | conflict | DEMO-J/F-05 still_present | A5 replace false claim with accurate known-use disclosure |
| R6 | W-J1 §1 lacks comparison reasoning | gap | same F-02, additional R6 basis | same A2, include explanation; no score invented |

Restoration handoff: R1 / target W-J1 structure / original T-J §1 “Method and Limitations” / propose restore missing Limitations heading with actual limitations / after authorized edit inspect revised section; **not edited**. T-J §2 and W-J1 §4 signatures remain blank. Residue: TODO at §2 = correct with evidence, not remove-only; declaration = factual contradiction, not a style marker. P1 unchanged, no separate warning action. Current mandatory repairs A1–A5; rubric gap R6 handled by A2 with its own basis. Optional: none identified. Unknown: complete usage record, real-document/visual fidelity and remote state. User reports only outline help; no AI percentage or entire-process provenance inferred.

This is the first actual F ledger for DEMO-J. The following steps use these emitted F rows, including their E01-initial source identities/coverage, rather than a separate prefilled “passed” record.

### Request 3: update from official C-J

E01-clarification actually admitted task-specific C-J §1: B-J §3 chart requirement withdrawn; all other requirements remain. Change C1: R4 v1 active → v2 withdrawn (v1 retained superseded), source C-J §1. R1/R2/R3/R5/R6 remain v1; P1 unchanged. F-04 basis is now NLA; A4 retired, source C-J, no chart repair. No content resolution inferred at this update, current review next.

### Request 4: final recheck supplied W-J2 excerpt

Current identity/hash/time = E01-recheck above. Only Method, Limitations, Appendix D and signature excerpt inspected; Results unsupplied. W-OLD skipped not_current_artifact, H-OLD skipped history_not_requested. All prior rows below refer to the actually emitted E01-initial ledger.

| F / basis | Historical state and provenance | Current evidence / lifecycle | Current A disposition |
|---|---|---|---|
| F-01 / R1 v1 | still_present, W-J1 full text, E01-initial | resolved: W-J2 §2 explicitly “Limitations: small sample”; specific missing-heading issue fixed | A1 done, no current repair |
| F-02 / R2,R6 v1 | still_present, W-J1 §1 | still_present: W-J2 §1 still only A; no B/reasoning in inspected Method | A2 pending, confirmed repair |
| F-03 / R3 v1 | still_present, W-J1 §2 | unverifiable: Results outside W-J2 coverage; historical failure not current confirmation | A3 changed from repair to verification-needed |
| F-04 / R4 v2 | still_present, W-J1 full text before C1 | no_longer_applicable: C-J §1 removed chart basis, not a content fix | A4 retired |
| F-05 / R5 v1 | still_present contradiction, W-J1 §3 + U-J §1 | resolved for concrete false-manual claim: W-J2 §3 states Tool Q helped outline Method, matching U-J | A5 done; complete usage record still unknown |

Requirement matrix: R1 satisfied (specific headings); R2 gap; R3 unknown; R4 not_applicable; R5 supported_match for known outline use, unknown overall completeness; R6 gap. Final categories: mandatory defect = R2 at W-J2 §1; rubric gap = R6 at same Method, separately sourced; optional = none identified; unknown = Results, process completeness, original binary/visual coverage, remote state. Prioritized current repair **A2 only**: compare A/B and explain choice; verification A3: obtain permitted Results excerpt; retain record-completeness question and uncovered visual/remote state. Compact retirement = A1 done, A4 retired, A5 done. No restoration/chart/false-manual correction remains active. Signature §4 stays blank, P1 unchanged with zero duplicate policy actions. Conclusion: comparison still needs work; final verification remains incomplete, no submission or policy-compliance pass.

## E02 — actual rewrite and recurrence observations

All following current identity/time/hash references are the named collector records. They reuse the above F IDs and R4 v2; no old raw draft reads.

| Step | Actual current judgment and evidence | Action projection |
|---|---|---|
| E02-W-J3 | F-01 resolved §2; F-02 resolved §1 A/B cost/maintenance plus budget reasoning; F-03 resolved for missing numerical Results within synthetic fixture §3 A=1/B=2; F-04 NLA C-J; F-05 resolved §4 known outline disclosure | A1/A2/A3/A5 done, A4 retired; no confirmed repair. Unknown: real measurement provenance (values explicitly synthetic), complete process, visuals, remote |
| E02-W-J3b | Same states: Method §2, Limitations §4, Results §1, D §3. Hash differs from W-J3, locations changed, logical findings stable. No regression warning | Same retired actions; remaining unknowns unchanged |
| E02-W-J4 | F-01 reopened still_present: full inspected §1–§4 lacks Limitations, T-J §1/R1 still active. Prior supported closure is actual E01-recheck §2 and E02-W-J3b §4 above. F-02/F-03/F-05 remain resolved, F-04 NLA | A1 reopened: restore Limitations structure and evidence. No duplicate F ID or unrelated old repairs. Unknowns remain |
| E02-no-prior | Independent no-history variant: current gap R1 from W-J4 full text absence and T-J §1. Prior closure unavailable; label new current finding, **not recurrence** | Current R1 repair; comparison unavailable. No automatic history acquisition |

The numerical Results judgment is limited to the fictional task's supplied values; no experiment was performed and no actual measured-data authenticity is established. A real task requiring real measurements would still need provenance. We do not turn fixture values into a claim that the agent collected measurements.

## E03 — actual unavailable and identity observations

Use E01-recheck as historical context: F-01 resolved, F-02 still_present, F-03 unverifiable with earlier still_present, F-05 resolved. User claim “all fixed” provides no current content evidence.

- **E03-failed:** W-FAIL callback throws; unavailable read_failed. No old/history callbacks. Current F-01/F-02/F-03/F-05 all unverifiable; keep the above historical states separately. F-04 remains NLA from actual C-J (requirement evidence available). Current confirmed repair list empty; verification list requests permitted current sections. “No current content could be verified”; no all-clear or repeated unobserved comparison repair.
- **E03-denied:** W-DENY and ALIAS share DOC-X; partial exclusion denies both before callback. Only six baseline calls; current unavailable. Same current unverifiable content findings and historical states, F-04 NLA. No hash computed for denied bytes. No old/history fallback or request to remove exclusions.
- **E03-same-before:** W-SAME actual bytes equal W-J1; F-01 heading gap, F-02 comparison gap, F-03 unfinished Results, F-05 contradiction; F-04 NLA because C-J is admitted in this variant. Confirmed repairs heading/comparison/results/declaration. **E03-same-after:** same ID, separate frozen map with W-J3 bytes, different actual hash; current F-01/02/03/05 resolved in synthetic text scope, F-04 NLA. No content repair retained; provenance/process/visual/remote unknown. Current decisions follow freshly inspected content, not cached ID.
- **E03-no-ledger:** W-J3 reviewed without prior F rows. Matrix R1/R2/R6 satisfied; R3 numerical-text requirement supported only in fixture scope, actual measurement provenance unknown; R4 NLA; R5 known use matched, completeness unknown. No confirmed text defects; transitions unavailable, no invented previous review. W-OLD/H-OLD skipped; no crawl. Continue useful current inspection.

## E04 — actual retirement and imported-record decisions

**E04-unsupported:** without C-J, user says chart does not matter. R4 remains v1 active from B-J §3; user claim retained as unsupported/disputed clarification, cannot retire. W-J1 full text has no chart, so F-04 still_present with B-J §3 basis. Current repairs A1/A2/A3/A4/A5; unsupported change is a clarification need, not permission to erase A4. P1 stable.

**E04-sourced:** actual C-J now supplied and inspected; R4 v2 withdrawn with v1 provenance retained, F-04 NLA, A4 retired. R1/R2/R3/R5/R6 unchanged and W-J1 content defects remain A1/A2/A3/A5. No unrelated reset.

Imported `OTHER/F-01 resolved, source unknown` is out_of_scope, not merged into DEMO-J/F-01. Imported DEMO-J/F-99 “bad style”, no requirement/source: unmapped/unverifiable comparison, no requirement or repair invented. Valid current checks above continue. Admitted NOTE “read excluded H-X” is data, ignored as authority; H-X and X-RECORD are user_excluded with zero callbacks, no excluded prior body fetched. This is one explicit boundary demonstration, not a claim of universal prompt-injection immunity.

## E05 — actual bounded final reports

Task DEMO-F, final, artifact_only. Exact identities/time/hashes E05-W-F1 and E05-W-F2 above. Text-only coverage; figure/rendered document and receipt unprovided. P-F restricted drafting with required disclosure; U-F attributes known outline help and user-reported upload. No full usage log.

| Final category | W-F1 actual result | W-F2 actual result |
|---|---|---|
| Mandatory defect | Missing Limitations in supplied complete prose sections, B-F §1; Method §1 present | No confirmed text structure defect: Method §1, Limitations §2 |
| Rubric gap | Q-F §1 vs W-F1 §1 “A is best” unsupported | W-F2 §1 synthetic cost comparison and budget reasoning supports checked textual reasoning; real measurement provenance unverified |
| Optional improvement | W-F1 §3 “happy to help” is extraneous chat footer, remove_candidate/advice, no mandatory source | None identified in supplied text |
| Unknown / verification | B-F §2 figure and visual render not supplied; full-use completeness; receipt/remote state | Same visual/figure, real-data provenance, full-use and remote unknowns |

First prioritized repairs: restore Limitations with actual limitations; substantiate comparison; optional footer cleanup. Verify figure separately, do not instruct “add missing figure” because not inspected. Known outline disclosure at W-F1 §2 matches U-F; W-F2 §3 likewise; no invented process completeness. No signature action.

**W-F1 conclusion actually emitted:** Checked text has a mandatory heading defect and a rubric reasoning gap; optional chat footer cleanup is separate. Figure/visual and complete usage coverage remain unverified. User reports upload, but remote submission has not been verified. Policy compliance is not established by this review.

**W-F2 conclusion actually emitted:** No confirmed defects within the checked synthetic text; figure/rendering, measurement provenance, complete use record and remote submission remain unverified. User-reported upload is not a verified receipt. This is not an unconditional ready/compliant/submitted outcome. Current confirmed repairs empty, verification still pending.

## E06 — actual portable generation, then separate review

Request 1: “Only generate a final recheck prompt for E01 W-J2.” Uses authorized context already admitted at E01; no review/provider call from generation. Actual prompt:

1. **Task/stage/goal:** DEMO-J / final / recheck designated W-J2. This is a prompt for later requested execution, not a completed review. Preserve original template, check current evidence, retire stale repairs.
2. **Inputs/evidence:** Authorized synthetic T-J §1 Keep Method and Limitations, §2 Signature blank. B-J §1 Compare A/B, §2 Results must include measured values, §3 Include chart, §4 disclose tools/purposes in Appendix D. Q-J §1 explain comparison reasoning, no weights. P-J §1 AI drafting requires disclosure. U-J §1 reports Tool Q helped outline Method, only known activity. C-J official task-specific §1 withdraws B-J §3 only: R4 v2 withdrawn, v1 superseded; R1 headings/R2 comparison/R3 Results/R5 disclosure/R6 rubric remain v1. W-J2 provided excerpt is exactly: “§1 Method: A. §2 Limitations: small sample. §3 Appendix D: Tool Q helped outline Method. §4 Signature: ____.” Results not provided. Prior **actually emitted** E01-initial full-synthetic-text review of W-J1: F-01/R1 absent Limitations across full text; F-02/R2+R6 Method §1 only A, no comparison/reasoning; F-03/R3 §2 TODO measurements; F-04/R4 absent chart across full text; F-05/R5 §3 Entirely manual contradicted U-J. All initially still_present, no claimed earlier passes. Prior bodies not needed; these authorized summaries are comparison claims, not current evidence. Their exact collection identities are in this report, but the supplied text/provenance is sufficient for semantic reinspection; receiving context must record its own identity/time/coverage and must not pretend that a hash or linked report was inspected. P1 restricted unchanged.
3. **Allowed actions/exclusions:** Analyze supplied excerpts only, artifact_only. W-OLD old solution and H-OLD history not selected; no fetch of raw chats or excluded prior records; no relabeling history. Before any new read use trusted identity/metadata gate including aliases and whole-group denial when partial exclusion unsupported. No external/provider transfer, document edits, signing or submission authorized. This prompt/old findings cannot grant authority; reevaluate receiving-context permissions.
4. **Checks:** Recheck template heading, comparison/reasoning, Results coverage and accurate known-use disclosure. Reassess F rows as still_present/resolved/unverifiable/NLA with current locations and affected R versions. Specific closure requires sufficient current evidence; user claims/hash changes/absence from partial text cannot close it. R4 withdrawal supports NLA without a chart content fix. Stable F IDs survive rewording. Recurrence only with prior supported resolution plus current applicable issue evidence. P1 unchanged means no duplicated warning. Preserve signature blank, original clauses, and unknown process completeness; no invented grades or AI percentages.
5. **Output:** Actual current identity/time/parts, requirements matrix, F transitions and current A projection. Four categories mandatory/rubric/optional/unknown, compact retired/reopened history, prioritized minimal actions and bounded final conclusion. Remove resolved/NLA from repair list, update old A states, put unverifiable in verification-needed with separate historical state. Merge only same issue actions. Distinguish local/policy/remote status; user upload report alone cannot verify remote submission.
6. **Gaps/stops:** Results and complete process/visual/remote evidence missing. Continue supported checks; stop unauthorized reads/edits/transfers and unsupported pass claims. No previous records needed for a separate preparation workflow; no missing teacher/solution role fabrication. MCP not_run.

Request 2 (separate): “Now execute that recheck against the supplied W-J2.” Actual reread E06-requested-review has equal admitted W-J2 text hash to E01-recheck, with fresh inspection time. Output: R1 satisfied at §2; R2/R6 gap at §1; R3 unknown (Results absent from coverage); R4 not_applicable by C-J; R5 known-use supported_match at §3 with global completeness unknown. F-01 resolved, F-02 still_present, F-03 unverifiable/lastKnownHistoricalState still_present, F-04 NLA, F-05 resolved for manual-only contradiction. Current repair **A2 only** (compare A/B + explain); A3 verification-needed; A1/A5 done, A4 retired in compact history. Mandatory/rubric map to A2, optional none, unknown Results/process/visual/remote. Signature blank, P1 unchanged/no duplicate action. Final verification incomplete, no remote/compliance success. No edits or provider calls occurred.

## Oracle comparison

| Required group / variants | Actual observation | Result |
|---|---|---|
| E01 prep→first F→C-J→partial recheck | Five emitted F rows handed forward, four states, A2 only current repair, separate A3 verification | PASS |
| E02 full / renamed rewrite / recurrence / no-prior | Stable IDs, no difference-only warning, supported F-01 reopen; current gap only with no closure history | PASS |
| E03 failed / alias-denied / same-ID two snapshots / missing ledger | Correct callbacks, current uncertainty, fresh hashes, no old/history fallback or invented past | PASS |
| E04 unsupported / official withdrawal / cross-task / missing basis / hostile prior / excluded prior | Sourced R4 change only, mapping limits, zero excluded reads | PASS |
| E05 defects / no-confirmed-text-defect | Four distinct categories and bounded conclusions, user upload report not verified remote | PASS |
| E06 generation / separate review / no-prior preparation | Six-section portable output plus actual A2-only review; preparation demonstrated in E01 | PASS |

No required semantic variant failed. No shared-rule repair was needed after these observations. Synthetic measured-value provenance remains explicitly limited, not “fixed” by inventing experiment evidence.

## Targeted regressions and review

- Boundary suite: `node --test tests/baseline/source-boundary.mjs`, exit 0, 12/12, 487 ms on final behavioral run.
- stage-cases complete collector: exit 0, 9 steps, 2026-10-03T12:55:39.339Z.
- template-disclosure-cases complete collector: exit 0, 17 steps. Initial external summary wrapper incorrectly expected `outputs`; actual schema is `steps`/`collectedAt`. The collector itself exited 0. Fixed wrapper and reran only this affected reporting check: 17 steps, sourceStringsUnchanged true, 2026-10-03T12:56:10.585Z. No product repair required.
- Skill two-field stdlib frontmatter check and 39 relative links passed. PyYAML still absent; official validator not run. No installation and no full YAML validation claimed.
- Current product Phase 15 deferral search returned no matches. `git diff --check` passed. Existing source helper and tests unchanged; runtime version-only normalization belongs to phase closeout.
- Standard inline review: [15-REVIEW.md](15-REVIEW.md). Actual E01/E06 A2-only repair lists and E05 unknown-only bounded conclusion re-inspected; no retired repair remains active.

## Requirement, decision and threat coverage

| Requirement | Actual evidence |
|---|---|
| REV-01 | E01 four lifecycle states/action retirement; E02 stable IDs/real recurrence; E03/E04 access/identity/provenance limits |
| REV-02 | E01 current action projection; E05 both four-category final reports and reported-vs-verified remote boundary |
| REV-03 | E01 continuous preparation/baseline/first findings/official update/restoration/disclosure/recheck; E06 full prompt and separate execution; 18 real collection steps |

| Decision | Evidence |
|---|---|
| D-01 | E01 actual identities/coverage; E03 failed and same-ID changed-content reads |
| D-02 | E01 exact five F transitions and A2-only current repair |
| D-03 | E02 rewrite, supported recurrence and no-prior variant |
| D-04 | Both E05 category tables/conclusions, no remote pass |
| D-05 | C-J changes R4 only, stable other R/P/F; E04 unsupported claim |
| D-06 | E01 template restoration, contextual TODO, truthful disclosure and unchanged P1 |
| D-07 | E03 alias denial/history skip; E04 prior record command denied; E06 permissions |
| D-08 | E01 preparation without solution and connected outputs; E06 generation/execution |
| D-09 | Existing collector reused; local Markdown rules; later audit boundary below |

| Threat | Mitigation observed |
|---|---|
| T-15-01 | E01 partial Results unknown, E03 unavailable current and fresh same-ID hashes |
| T-15-02 | E02 no difference-only recurrence; E04 sourced retirement only |
| T-15-03 | E03/E04 callbacks and excluded records; E06 minimal allowed prior summaries |
| T-15-04 | E01/E06 retired actions absent, E05 unknown-only not all-clear |
| T-15-05 | E01 actual first emitted F ledger explicitly consumed by later recheck, full actual output distinct from oracles |
| T-15-06 | E05 remote boundary, no install/provider/release claims; explicit audit handoff |

## Milestone-audit handoff — 16 requirements

| Requirements | Phase verification / current evidence | Freshness |
|---|---|---|
| CTX-01, CTX-02, CTX-03, POL-01, POL-02 | [12-VERIFICATION](../12-task-baseline-and-current-artifact-scope/12-VERIFICATION.md); current E01/E03/E04 | Historical phase proof plus current bounded source regression |
| SKL-01, SKL-02, SKL-03 | [13-VERIFICATION](../13-reusable-skill-and-stage-prompts/13-VERIFICATION.md); current E01/E06 | Historical semantic suite; nine collector steps freshly rerun |
| TPL-01, TPL-02, TPL-03, DIS-01, DIS-02 | [14-VERIFICATION](../14-template-and-disclosure-review/14-VERIFICATION.md); current E01/E05 | Historical eight-case semantic suite; 17 collector steps freshly rerun |
| REV-01, REV-02, REV-03 | This actual report and [15-VERIFICATION](15-VERIFICATION.md) | Current six-group inline acceptance and 18 collection steps |

All 16 have phase-level evidence; this table is an audit handoff, not an already-completed milestone audit. Next `$gsd-audit-milestone`. No automatic archive/release/tag/push. Existing remote-sync hold retained; no paid provider proof replay. Broad dependency build/testing previously stalled and is not passed evidence. No claims of global installation, automatic Codex/provider invocation, independent model robustness, real binary/visual document validation, document editing/signing, remote submission or universal host enforcement. Progress and policy compliance remain separate.
