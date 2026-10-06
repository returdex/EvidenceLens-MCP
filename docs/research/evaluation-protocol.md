# Evaluation protocol v1

## Baseline

Old source commit 3462c30fd8e0db34e69f22cc6f02d7e957c914db, product 0.3.17; exact code/prompt/config hashes in review-runtime-baseline.md. New means the verified milestone revision chosen in Phase 27, never today's unimplemented future behavior. Any protocol, case, extraction, code or configuration change requires a new freeze version before reviewing.

## Isolation

The manifest contains metadata only and stays outside Git. freezeEvaluationInputs validates historical cutoffs, ancestry and physical alias groups before bounded content reads. It reuses collectBaselineSources. Excluded files receive metadata checks only; original-content hashes for feedback are evaluator inventory work, never reviewer inputs. Unknown provenance rejects rather than silently entering the test. Returned ledger includes exact allowed UTF-8 text/hash plus original identity; binary ZIP/PDF bytes require an explicitly admitted deterministic extraction first, with original hash and extraction/version relationship preserved. Binary data cannot masquerade as UTF-8 text.

writeEvaluationLedger creates a new 0700 directory and exclusive 0600 file outside repository/evidence roots, no overwrite. The private ledger and registry are evaluator material and must never be wholesale sent to reviewers. Only allowed text becomes the existing admitted/capsule/snapshot capture inputs; validateEvidenceCapsule remains required before dispatch.

Future Codex execution uses the existing sealed HOME/CODEX_HOME and certified OS policy, stdin captured prompt and disabled ambient skills/memory/tools. DeepSeek receives the captured prompt only. Do not inherit this conversation, prior advice, feedback, registry or private directories. Current host acceptance is unknown: Phase 22 did not launch createIsolatedLaunch, runCapturedCodex, runCapturedDeepSeek, preflight or any paid smoke. A synthetic input gate is not live isolation proof.

## Matrix

For each proven case/stage, compare old/new × single Codex/selected Codex+DeepSeek. Equal frozen task/material bytes in each cell; run identity differs. Dual first inputs contain no peer answer; preserve original reports and adjudicate disagreements afterward. All cells now NOT_RUN. Missing stage is NOT_COVERED, never reconstructed from final artifacts. P minimum and optional D working target must be separately recorded; a target does not establish the achieved grade.

## Evaluator rubric

Predeclare: supported requirement/finding hits; tutor-feedback omissions; unsupported added claims; unjustified grade endorsement; concrete verifiable actions; finding retention and explicit disposition. Each judgment needs source evidence, category, uncertainty and rationale. Match meaning rather than exact phrasing. Tutor feedback is neither exhaustive truth nor reviewer training text. Seal outputs before feedback comparison. If held-out feedback is used to tune, relabel that case seen regression and obtain a different test case. Keep originals, agreements, unique findings, disagreements and unresolved issues visible.

## Freeze ledger

Git-external private inventories created with 0700/0600 and exclusive writes. Case manifest original byte hashes were computed using O_NOFOLLOW and same-handle stat checks. A2 feedback hash was rechecked against registered metadata; no feedback text entered Git. Both real manifests remain blocked: historical cutoffs and admitted text extraction unknown (A2 assessed version now user-confirmed). Offline gate therefore rejects both BEFORE content-reader invocation; no source capsule can honestly be certified ready. Private ledger records baseline file hashes, manifest/protocol hashes, createdAt, NOT_COVERED and authorizedRequests=0. No released runtime behavior changed.

## Budget

For K proven stages per case: old/new single each K, old/new dual each 2K; maximum 6K reviewer invocations. Codex may internally issue multiple remote requests, so 6K is not a billed-request guarantee. Tuning and held-out counted separately. Equivalent old valid records may be reused only with explicit version/task/material equivalence. authorizedRequests=0; inference=NOT_RUN; tokens/model-returned usage/cost=unknown.

## Coverage gaps

A1.3 known tuning case is partial; reconstructed blind fixture is not raw-code discovery input. A2 assessed ZIP is user-confirmed; remote submission receipt remains uninspected. Its 36-page report includes AI/prior-advice history; exact clean extraction boundaries remain uncertified. Alternate FIT5152 A1 has multiple draft names and no verified assessed-file identity. All four historical stages currently NOT_COVERED. Need exact assessed report/ZIP and credible stage availability before EVA-01/EVA-02 real-case acceptance; Phase 27 cannot start from these blocked inventories. No EVA-03/EVA-04 completion claimed.
