# Evaluation case registry (metadata only)

No coursework, feedback text or private locators are stored here. Private manifests carry actual byte sha256; extracted text gets a separate sha256. A2 assessedVersion is user-confirmed on 2026-10-07; input readiness remains blocked pending chronological/extraction evidence. assessedVersion is not inferred from directory names.

| Case | Role | Version evidence | assessedVersion | feedback | Readiness gap |
|---|---|---|---|---|---|
| FIT5032 A1.3 | tuning | Existing failure study identifies submitted ZIP and byte-identical report; blind-input fixture is a reconstructed summary | historical submitted candidate; remote submission unverified | user-provided marking screenshot, previously exposed | raw stage cutoffs and complete original material manifest unavailable |
| FIT5046 A2 | held_out_candidate | 2026-09-11 source verification identifies source ZIP hash and commit; explicitly says no Moodle submission made | user-confirmed deliverables-v0.4.1 outer ZIP; remote receipt not inspected | registered A4/references feedback PDF is evaluator_only; hash recheck matches registered identity | chronological cutoffs and separation of report AI history still unresolved |
| FIT5152 A1 | alternate candidate | metadata inventory finds brief/rubric and feedback PDF, multiple revised drafts | unknown | evaluator_only | no exact assessed report identity; cannot substitute a convenient draft |

A2 source package verification proves local packaging/build only. It does not prove which outer ZIP was submitted or marked. No school login or submission performed. Existing author host already knows feedback; fresh reviewer contexts are mandatory.

## Stage coverage

For both principal cases: preparation, in_progress, final and recheck are NOT_COVERED until historical availability and current artifact identity can be established. File mtime is insufficient evidence. A final candidate cannot reconstruct earlier drafts. recheck maps to an existing wire stage and needs both current and historical identity.

## Private manifest contract

manifestVersion=1, caseId, role=tuning|held_out_candidate, readiness=blocked|verified, assessedVersion, stages keyed by preparation/in_progress/final/recheck. Each stage: cutoff (ISO UTC), cutoffEvidence, currentSourceId (nullable), coverage. entries: sourceId, documentId, path (canonical private allowlist locator), sha256 (original bytes), role (existing baseline kind), partition=reviewer|evaluator_only, availableAt, availableAtEvidence, stages, derivedFrom (source IDs), aliases (source IDs), versionIdentity, coverage. Exclusion includes feedback, marks, postmortems, prior advice, feedback-derived plans and later edits. Unknown partition/time/parent or cycles never enter reviewer inputs. Byte identity, known aliases, canonical path and dev/inode join whole exclusion groups. Mixed documents are excluded whole.

The A1.3 blind-input.json is paraphrased and already describes code behavior; it cannot serve as a production source excerpt or complete raw-code discovery benchmark. No private run-directory scan is needed. Raw feedback stays evaluator_only even if a future human confirms version correspondence.

## Current verification

User confirmed the A2 candidate is the assessed submission (2026-10-07 reply “是这个”). Outer ZIP CRC check passed; it contains report PDF, task-allocation PDF and inner source ZIP. Inner source byte hash matches the 2026-09-11 packaging verification. Feedback PDF byte hash matches its existing registration. This establishes user-confirmed correspondence, not school-system acceptance. The report has 36 pages; a text marker check identifies AI/prior-advice content starting at page 19, but no page-boundary semantic/visual exclusion was certified. Do not feed the whole report to a blind reviewer. Two manifests and immutable v2 metadata revisions exist outside Git, 0700 directory/0600 files; no earlier manifest was overwritten. Private inventories retain original byte hashes but no admitted PDF extraction yet. Alternate candidate remains unnecessary after the A2 confirmation, and unverified.
