# Complete feedback and bounded multi-reviewer experiment — 0.3.12

## User correction

The user rejected unsolicited shortening after the successful preparation review. The prior independent result contained 16 findings with 2534 claim characters and 731 action characters. The displayed response was 1681 characters including metadata and receipt, and did not present per-finding source text, location or a full report link. Its 38 reference associations reused eight excerpts; they were not 38 independent sources. Runtime and binding success did not establish review quality.

## Narrow correction

Shared Skill, stage templates and capture guidance now request complete substantive feedback. Applicable requirements receive sourced interpretation, evidence/unknowns, checkable assessment basis, applicable high-band obstacles or common errors, validation methods and actions. Every finding, including info/Low, remains visible with its evidence and limitations. Only an explicit user request selects a brief summary; the same-run full report must remain accessible. Long output is segmented or supplied as a private complete artifact rather than silently dropped. Explanations are auditable rationale, not hidden reasoning.

No result schema, authentication, isolation permissions, requested model or reasoning effort changed. Phase 21 D-01 and pending handoff/CLI plans are amended to full-by-default; this prompt/Skill correction does not implement or close those programmatic plans. Product 0.3.12; next accepted phase patch 0.3.13.

## Test design

The user explicitly authorized testing multi-agent decisions on the A4 case. Three separate isolated Codex reviewer processes use the same frozen official material and complete review task, each with its own new begin/capture/run identity. All three captures are prepared before the first inference; no peer conclusions appear in their input. Root verification confirmed identical task bodies, admitted text, excerpts and material metadata across captures. Requested configuration stays GPT-6/low; effective model metadata is independently unavailable. Processes run serially to avoid shared-store transaction contention. Internal CLI multi_agent remains disabled.

The first new full report is the single-reviewer comparator for the union of all three. Host source-backed adjudication preserves reviewer/run/finding provenance, minority findings, disputed interpretations and unresolved issues. Majority agreement and longer output are not accuracy proof. Comparison with the earlier short response changes prompt requirements as well as reviewer count and cannot isolate the effect of agent count. The experiment is one case with three reviewers, not a repeated statistical evaluation or a general multi-agent runtime. All three actual preparation reviews succeeded: 18, 13 and 17 findings; elapsed 243281, 256748 and 253774 ms (total 753803 ms). Claim/action character totals were 8497, 9294 and 8826; finding count and length alone do not establish quality. Independent root checks revalidated each stored v1 result against its immutable capture and execution hash, confirmed all three inputs were captured before the first inference, and verified every finding/claim/action/evidence quote/limitation appears in its private full Markdown report. All terminal events, exit codes (0) and cleanup checks passed. The original conversation completed and delivered three full reports, a full source-backed host comparison and a frozen-source evidence index. Core interpretations agreed; one additional retained reminder was to observe source-table versus copied-table constraints separately. Intermediate rubric time-band boundaries remained unverified from mixed-column text. No decision accuracy gain was measured, and semantic accuracy is not established by structural checks.

## Regression

Fresh build passed. Node Codex/prompt/command/source-boundary checks: 231/231 in 12.381 seconds; six affected Vitest files: 118/118 in 3.74 seconds. No failures or skips. Existing non-fatal PDF/font warnings remain. The optional skill-creator Python validator could not start because PyYAML is absent; installed-link/reference checks passed in the Node suite. No dependency installation or upgrade was needed.


## Composite-report verification

Root corrected the composite table's cross-topic reference omissions: combined findings must not be treated as missing coverage because they lack a separate row. The original host comparison was retained privately; all independent model reports and persisted results stayed unchanged. Root also clarified that a gap/unknown mapping adjustment is not evidence the reviewers invented a confirmed assignment defect: their claims already stated missing current materials. One review already warned against deriving time bands from mixed text, so restricting that text is not proof the reviewer had actually assigned an incorrect band. Synthesis must preserve qualifications before claiming a correction. These are exploratory observations for future semantic/handoff work, not completion of a general adjudication engine.


## User-selected default — 0.3.13

The user subsequently selected multi-review as the normal default. All four stage review commands now coordinate three independent Codex reviewers and source-backed host comparison; an explicit single-reviewer request selects one. Full feedback is retained in both modes. Help/export/prompt-only generation do not start reviews. This is a shared Skill selection policy reusing the already validated workflow, not a new internal CLI agent system. The A4 experiment contained zero DeepSeek requests; the existing DeepSeek MCP provider remains a separate path and is not part of this composition. No additional model call, credential access or provider switch occurred for this default update. Next Phase 21 feature patch is 0.3.14.


The current Skill's optional MCP path requires genuine nonempty assignment_brief, rubric, solution and teacher_instructions inputs plus verified provider/transport authorization. The A4 preparation corpus contained requirements and a marking guide, without a current solution or independent teacher instructions; the workflow correctly recorded MCP not_run rather than manufacturing role inputs. Connecting DeepSeek to requirements-only independent review needs its own honest input/result adaptation. This policy edit does not make that connection. Fresh build, installed links, Node 231/231 and six Vitest files 118/118 passed.


2026-10-05 cross-provider default amendment: user replaces the three-Codex default with exactly one DeepSeek and one Codex independent reviewer plus source-backed host comparison. Full feedback and explicit single-provider choice remain. Stage DeepSeek API uses genuine captured excerpts, including requirements-only preparation, with existing provider config/bounded reading and shared v3 local binding; does not relax the four-role MCP contract or inherit its four-short-finding limit. Both captures precede inference, no peer findings, no automatic substitute/retry. Host-skill lifecycle includes safe DeepSeek receipt and validated saved result. Product baseline 0.3.14; next accepted Phase 21 patch 0.3.15. Offline integration and read-only configuration checks are distinct from new live inference; historical A4 used only Codex. Phase 21 stays 0/6, RUN-01–05 pending.
