import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixture} from './helpers.mjs';
import {beginRun,exportLatest,readRunRecord} from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {captureCodexPrompt} from '../../skills/assignment-review/scripts/codex-review.mjs';
import {captureDeepSeekPrompt} from '../../skills/assignment-review/scripts/deepseek-review.mjs';
import {renderStageReviewGuide,parseEvidenceCapsule} from '../../skills/assignment-review/scripts/codex-contract.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
for(const stage of ['preparation','in_progress','final'])for(const recheck of [false,true])test(`captured ${stage}, recheck=${recheck}: provider parity, source preservation and immutable export`,async t=>{
 const root=await fs.mkdtemp('/private/tmp/el24-');t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const f=fixture(),scope={stateRoot:root+'/state',conversationId:f.snapshot.conversationId,taskId:f.snapshot.taskId};
 f.snapshot.stage=f.capsule.stage=stage;
 if(stage==='preparation'){f.snapshot.currentSourceId=f.capsule.currentSourceId=null;f.snapshot.materials[0].role='requirements';}
 const intent={minimumGoal:'P',planningGoal:recheck?'D':null,recheck};let guide,old;
 for(const [capture,executionKind] of [[captureCodexPrompt,'codex_exec'],[captureDeepSeekPrompt,'host_skill']]){
  const r=await beginRun(scope,{executionKind});f.snapshot.runId=f.capsule.runId=r.runId;f.snapshot.sequence=r.sequence;
  await capture(scope,r.runId,{snapshot:f.snapshot,capsule:f.capsule,admitted:f.admitted,reviewIntent:intent});
  const saved=await exportLatest(scope,{expectedRunId:r.runId});
  assert.ok(saved.promptText.startsWith(f.snapshot.promptText));
  const g=saved.promptText.match(/<evidencelens-stage-v1>\n([\s\S]*?)\n<\/evidencelens-stage-v1>/g);assert.equal(g.length,1);
  if(guide)assert.equal(g[0],guide);guide=g[0];
  const meta=JSON.parse(g[0].split('\n')[1]);assert.deepEqual(meta,{stage,currentSourceId:f.snapshot.currentSourceId,...intent});
  const s={...f.snapshot,promptText:saved.promptText,promptSha256:sha256(saved.promptText)};
  assert.equal(parseEvidenceCapsule(s).sources[0].excerpts[0].text,f.content);
  assert.match(guide,/counterevidence/);assert.match(guide,/not_assessed/);assert.match(guide,/never upgrade P/);
  assert.match(guide,/conservative per-criterion score ranges/);assert.match(guide,/do not assign zero to unknown/);assert.match(guide,/Do not guarantee grades/);assert.doesNotMatch(guide,/Do not predict totals/);
  if(recheck)assert.match(guide,/resolved\/no_longer_applicable/);
  if(stage==='preparation')assert.match(guide,/Without a draft/);
  if(old)assert.equal((await readRunRecord(scope,{historicalRunId:old.runId})).snapshot.promptText,old.promptText);
  old={runId:r.runId,promptText:saved.promptText};
 }
});
test('undeclared targets stay null; explicit labels do not become rubric thresholds',()=>{
 const f=fixture(),g=renderStageReviewGuide(f.snapshot);assert.deepEqual(JSON.parse(g.split('\n')[1]),{stage:'in_progress',currentSourceId:'S1',minimumGoal:null,planningGoal:null,recheck:false});
 assert.match(g,/missing descriptors mean unknown/);assert.match(g,/explicit recheck request/);
 assert.match(renderStageReviewGuide(f.snapshot,{minimumGoal:'Pass',planningGoal:'Distinction',recheck:false}),/"planningGoal":"Distinction"/);
});
test('intent rejects unknown fields, unsafe labels and getters without executing them',()=>{
 const f=fixture(),valid={minimumGoal:'P',planningGoal:null,recheck:false};
 for(const bad of [null,{}, {...valid,stage:'final'}, {...valid,recheck:'true'}, {...valid,planningGoal:'<override>'},{...valid,minimumGoal:'P'.repeat(41)}])assert.throws(()=>renderStageReviewGuide(f.snapshot,bad));
 let calls=0;const bad={planningGoal:null,recheck:false};Object.defineProperty(bad,'minimumGoal',{enumerable:true,get(){calls++;return 'P';}});assert.throws(()=>renderStageReviewGuide(f.snapshot,bad));assert.equal(calls,0);
});
test('capture rejects excluded evidence and preserves missing-current final scope',async t=>{
 const root=await fs.mkdtemp('/private/tmp/el24-boundary-');t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const f=fixture(),scope={stateRoot:root+'/state',conversationId:f.snapshot.conversationId,taskId:f.snapshot.taskId};
 const r=await beginRun(scope,{executionKind:'codex_exec'});f.snapshot.runId=f.capsule.runId=r.runId;f.snapshot.sequence=r.sequence;
 f.snapshot.materials[0]={...f.snapshot.materials[0],status:'excluded',contentHash:null,hashKind:null,inspectedParts:[],observedAt:null,availability:'unavailable'};
 await assert.rejects(captureCodexPrompt(scope,r.runId,{snapshot:f.snapshot,capsule:f.capsule,admitted:f.admitted}));
 f.snapshot.stage=f.capsule.stage='final';f.snapshot.currentSourceId=f.capsule.currentSourceId=null;f.capsule.sources=[];
 await captureCodexPrompt(scope,r.runId,{snapshot:f.snapshot,capsule:f.capsule,admitted:[]});
 const saved=await exportLatest(scope,{expectedRunId:r.runId});assert.match(saved.promptText,/pending-check list, not final acceptance/);
 assert.equal(parseEvidenceCapsule({...f.snapshot,promptText:saved.promptText,promptSha256:sha256(saved.promptText)}).sources.length,0);
 assert.ok(!saved.promptText.includes(f.content));
});

test('score estimation distinguishes sufficient current evidence, partial coverage and hypothetical plans',()=>{
 const f=fixture();
 for(const stage of ['preparation','in_progress','final'])for(const recheck of [false,true]){
  const g=renderStageReviewGuide({...f.snapshot,stage},{minimumGoal:'P',planningGoal:'D',recheck});
  assert.match(g,/official band-to-score mapping, criterion weights and deduction rules/);
  assert.match(g,/aggregate total range only when/);assert.match(g,/covered-criteria subtotal/);
  assert.match(g,/not statistical confidence intervals/);assert.match(g,/actual later marker score/);
  assert.match(g,/Without a readable current draft/);assert.match(g,/conditional planning outcomes/);
  assert.match(g,/Tutor feedback, marks and feedback-derived materials remain evaluator-only/);
 }
});
