---
phase: 18-discoverable-stage-commands
status: help_retest_pending
installation: passed
discovery: passed_host_catalog
invocation: six_observed_help_examples_retest_pending
---
# Phase 18 — Installed host evidence

## Actual installation

Executed 2026-10-04 on this macOS host from commit ac95f69. Explicit execute-phase request authorizes the planned reversible user-root installation. Source checkout: `/Users/yifeng/Documents/EvidenceLens-MCP/skills`; selected destination: `/Users/yifeng/.agents/skills`. No collision existed. Seven scoped symlinks created; no Codex config or unrelated Skill changed. Inspection verifies seven unchanged links and installed shared-reference resolution.

| Step | UTC | Cap / elapsed seconds | Exit | Outcome |
|---|---|---|---|---|
| el18-host-dry: `node scripts/install-review-skills.mjs --target-root /Users/yifeng/.agents/skills` | 2026-10-04T11:19:59.153154+00:00 | 30.0 / 0.076 | 0 | no remaining owned group |
| el18-host-apply: `node scripts/install-review-skills.mjs --target-root /Users/yifeng/.agents/skills --apply` | 2026-10-04T11:20:19.068776+00:00 | 30.0 / 0.076 | 0 | no remaining owned group |
| el18-host-inspect: `node scripts/install-review-skills.mjs --target-root /Users/yifeng/.agents/skills` | 2026-10-04T11:20:19.167590+00:00 | 30.0 / 0.076 | 0 | no remaining owned group |

| Name | Relative source / destination suffix | Actual link status | SKILL SHA-256 |
|---|---|---|---|
| assignment-review | `assignment-review` under both roots above | unchanged | ec77462b83ab92dd062a64ff4df83f2ba55fba02e01fa114b59431a4cbc4236b |
| el-help | `el-help` under both roots above | unchanged | 3b5aa2c29dba8bce4daf96a32146754cc11bb755ba52915c70e1be8382f65658 |
| el-prepare | `el-prepare` under both roots above | unchanged | 893ab7572886e2b24eb175a2954d04439394113b9acbc982c76e620ee156bc78 |
| el-check | `el-check` under both roots above | unchanged | 7050014a28d2656004e1db7a6d9d5f5c40b38d7d96c3ffa064a9c1e8b449c9f7 |
| el-final | `el-final` under both roots above | unchanged | 46fcccbdba1690ea6cdf616fca9af2fddde462c1511cd8cf063247d692def557 |
| el-recheck | `el-recheck` under both roots above | unchanged | 0903c359807621a9bf803e358bf28cfa25f102abc7b92ebaa9042a6a0b30a2b5 |
| el-prompt | `el-prompt` under both roots above | unchanged | 03065042cc951bc4d50e37a40cd701d91d2167d4de19fb356918240350405797 |

## Actual-host gap

Current interface: Codex desktop, exact build unknown. `cua.getApp("Codex")` returned “Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons.” No screen or selector was inspected and no UI operation was attempted afterward. This tool restriction is not command failure evidence. Do not use alternative UI scripting to bypass it.

The user subsequently authorized the dedicated FIT5032 chat and six synthetic tests. Chat `01a106f9-f729-7af1-a6cf-cbb6b5840d0e` (local; title EvidenceLens 六命令合成验收) completed all six turns. Direct thread-tool receipts are in [18-HOST-RECEIPTS.json](18-HOST-RECEIPTS.json). Native selector GUI remains unobserved: discovery evidence is the actual host-provided available-Skills catalog, corroborated by this parent host's catalog, followed by loading those discovered entries. Exact desktop build is unknown; no native slash aliases or other platforms are claimed.

| Entry | Target-host catalog discovery | Actual synthetic invocation |
|---|---|---|
| el-help | observed | six actions/materials/support; missing examples found, rule corrected, retest pending |
| el-prepare | observed | preparation, no draft, R18-1 unknown and three planning actions |
| el-check | observed | in_progress, current-v1, missing reason F18-1 / pending A18-1 |
| el-final | observed | final retained, text-only gap, unknown rubric/visual/submission coverage |
| el-recheck | observed | explicit in_progress/current-v2, F18-1 resolved and A18-1 done/removed |
| el-prompt | observed | unavailable, no reconstructed prompt or review |

The six completed turns span UTC 2026-10-04T12:53:27Z–12:59:22Z. Inspecting all recorded tool commands confirms only `cat` reads under the installed Skill root. No course/project files, external chat history, provider requests or file mutations appear. Shared resources are reused within this synthetic conversation. The prepare turn's long shared-resource output was truncated in the read-thread receipt; command arguments and terminal exit remain visible. This is a bounded host trial, not an independent semantic evaluator or universal isolation proof.

Rule-1 repair: help had omitted invocation examples even though the source table contains them. Strengthened help routing to require all six rows and five columns. Node installation/link/boundary suite rerun: 21/21, exit 0, 0.563s, UTC 13:00:03Z. Extra host recheck requires separate authorization because original authorization was six tests only. Stage tests are accepted; final help completeness awaits that check.

## Ready-to-run synthetic host trial

In another assignment project's Codex chat, first inspect the Skill selector for all six exact names. Record project label, observed date and available host version; an unknown build stays unknown. Use only the following synthetic inline content; do not read/edit actual course files, old conversations or send MCP/provider requests. The six lines below are separate user turns; carry only this synthetic task's findings between them.

1. `$el-help` — list actions, materials, output, examples and actual support range. Do not read project files.
2. `$el-prepare 仅使用本消息合成材料，排除项目文件和历史：任务 T18；brief 第1行 R18-1: Explain your choice with one reason. 尚无当前稿。请规划。`
3. `$el-check 仅用上述合成 brief 和本消息，排除项目文件及旧对话：任务 T18；当前稿 current-v1 第1行 I choose A；重点是理由。给出 F18-1/A18-1 以便后续复查。`
4. `$el-final 仅用上述合成 brief 和本消息，排除项目文件及旧对话：任务 T18；当前稿 current-v1 第1行 I choose A；仅检查文字，保持 final。`
5. `$el-recheck 仅使用本合成任务的 brief、获准 F18-1/A18-1 摘要及本消息；排除项目文件和旧稿正文。当前稿 current-v2 第1行 I choose A because it reduces duplicate steps.；stage=in_progress；复核 F18-1，退役已解决行动。`
6. `$el-prompt 任务 T18；只取同一对话中实际捕获的原文，无记录就明确说不可用；不要重新生成、运行检查或读取项目文件。`

Expected observations: help lists six; prepare plans without solution; check/final find missing reason with correct stages; recheck resolves the actual prior finding and retires action; prompt says unavailable and starts no review. Capture actual output/failure per turn, not only an approved label. Record user-reported observation versus direct tool receipts separately. Only successful observed host/version rows may update shared help/documentation. No phase-complete claim yet.
