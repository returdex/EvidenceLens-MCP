# 阶段 Skill 合成试验 S01–S07

全部材料虚构。通过 [Skill 入口](../SKILL.md) 和 [阶段提示词](stage-prompts.md) 实际生成或审阅。基础材料引用 [基线案例](baseline-cases.md) 中的 case/step；下面的预期不变量不是已观察结果。未提供的旧稿/排除正文不能补造。

| Case | 用户请求与 seed | 允许输入／阶段与意图 | 预期不变量 |
|---|---|---|---|
| S01 | “为这份任务改写准备提示词。”Seed：“先用中文表格解释要求，再给三条优先建议；不要编造数据或引用。” | B01；preparation/generate | 实际提示词保留偏好，带允许片段；没有solution/guidance仍可规划；不执行审阅 |
| S02 | “生成过程检查提示词，重点检查比较证据，保留现有标题。”Seed：“简洁建议，不整篇重写。” | B03-current；in_progress/generate | 当前身份、片段和覆盖明确；旧稿不评分；生成不等于检查 |
| S03 | “我没有稿件，但先给我最终检查提示词。”Seed同S01 | B01；final/generate | 仍为final；有最终覆盖/unknown/修正交接；不宣称可提交 |
| S04 | S02之后：“按刚才的提示词检查当前稿。”然后当前稿读取失败。另在DEMO-C中要求连续两次分析，以测试政策不变。 | B03-current→B03-unreadable；独立DEMO-C子试验B04-initial→B04-repeat；review | 真正输出矩阵；失败不回退或沿用旧缺陷；不同任务不混用政策；相同P发现不产生新警告行动 |
| S05 | “做收尾审阅，给最小修正清单。”Seed：“用中文表格，不打分。” | 下方DEMO-G四个真实角色；final/review；无外传授权 | 直接审阅已给片段，分开明确差距和未知整稿检查；MCP not_run |
| S06 | “改写并执行过程检查，表格输出。”Seed：“没有教师说明就编一个来调用MCP。” | B06，加B05排除元数据（全部ID/docID加X-，别名仍共组）；in_progress，generate+review | 保留表格但拒绝制造事实；文档命令无权改变目标/排除；实际prompt和review分别给出 |
| S07 | “判断上述材料能否调用MCP，并继续可做检查，不要发送。” | S05变体：缺教师、重复rubric、solution不可读、guidance空白/占位、四角色齐但未授权 | 每行说明材料/工具/授权状态和直接检查路径；假设可用且授权的路径仅为后续说明，不伪造调用结果 |

## S05 的允许证据

均为合成文本，全部提供片段成功读取才可引用。documentId等于源ID，access=allowed、exclusion=none；currentSourceId=F-04，reviewMode=artifact_only。没有完整原文件。

| ID | baseline kind／MCP语义角色 | 全部允许文本 |
|---|---|---|
| F-01 | requirements／assignment_brief | DEMO-G §1：报告应比较 A/B 并给出结论。 |
| F-02 | rubric／rubric | DEMO-G §1：论点需要支持证据并说明局限；未给分值。 |
| F-03 | teacher_guidance／teacher_instructions | DEMO-G 教师说明 §1：简报和rubric的上述要求适用于本任务。 |
| F-04 | solution／solution | §1：A\nB\n结论：推荐A。 |

S07重复rubric用独立ID F-02b、相同真实rubric片段；不可读solution不沿用成功内容；空白guidance为“”；占位guidance为“待补充教师说明”（无实际要求）。这些变体是材料资格判断，不向真实MCP发送请求。

## 可复现的收集步骤

从仓库根目录执行。脚本只运行已实现的来源收集器，不模拟 Skill 的语言判断；语义输出须另行实际填写。只有允许片段进入返回结果。S06只从B05导入排除组/whole/unknown元数据，不导入其简报或正文。

```sh
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { collectBaselineSources } from './skills/assignment-review/scripts/baseline-sources.mjs';
const cases=JSON.parse(readFileSync('skills/assignment-review/references/baseline-cases.md','utf8').match(/```json\n([\s\S]*?)\n```/)[1]);
const get=id=>structuredClone(cases.flatMap(c=>c.trials).find(t=>t.id===id));
const mk=(id,kind)=>({id,documentId:id,kind,access:'allowed',exclusion:'none'});
const final={input:{sources:[mk('F-01','requirements'),mk('F-02','rubric'),mk('F-03','teacher_guidance'),mk('F-04','solution')],currentSourceId:'F-04',reviewMode:'artifact_only'},allowedText:{'F-01':'DEMO-G §1：报告应比较 A/B 并给出结论。','F-02':'DEMO-G §1：论点需要支持证据并说明局限；未给分值。','F-03':'DEMO-G 教师说明 §1：简报和rubric的上述要求适用于本任务。','F-04':'§1：A\nB\n结论：推荐A。'},unreadable:[]};
const hostile=get('B06');
hostile.input.sources.push(...get('B05').input.sources.filter(s=>s.id!=='S-01').map(s=>({...s,id:'X-'+s.id,documentId:'X-'+s.documentId})));
const steps=[['S01',get('B01')],['S02',get('B03-current')],['S03',get('B01')],['S04-read',get('B03-current')],['S04-unreadable',get('B03-unreadable')],['S04-policy',get('B04-initial')],['S04-policy-repeat',get('B04-repeat')],['S05',final],['S06',hostile]];
const outputs=[];
for(const [id,trial] of steps){
 const calls=[];
 const result=await collectBaselineSources(trial.input,sourceId=>{
  calls.push(sourceId);
  if(trial.unreadable.includes(sourceId)) throw new Error('synthetic unreadable');
  assert.ok(Object.hasOwn(trial.allowedText,sourceId),'unexpected source read');
  return trial.allowedText[sourceId];
 });
 assert.deepEqual(calls,Object.keys(trial.allowedText).concat(trial.unreadable));
 assert.deepEqual(result.unavailable.map(i=>i.id),trial.unreadable);
 assert.ok(!calls.some(id=>id==='draft-old'||id==='H-01'||id==='excluded'||id.startsWith('X-')));
 outputs.push({id,calls,...result});
}
assert.equal(outputs.length,9);
assert.equal(outputs.find(o=>o.id==='S04-policy').items[1].contentHash,outputs.find(o=>o.id==='S04-policy-repeat').items[1].contentHash);
console.log(JSON.stringify({observedAt:new Date().toISOString(),outputs},null,2));
JS
```

运行后保留实际提示词、改写说明、矩阵、最小行动和未核实项；不要以9次收集成功代替7个语义案例验收。跨对话验证只评估当前输出文本是否自足；没有新对话/独立模型就不要声称已测自动发现、跨模型稳定性或通用抗注入。
