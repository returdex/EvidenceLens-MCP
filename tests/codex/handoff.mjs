import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {capturedFlow} from './helpers.mjs';import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {buildReviewHandoff,renderReviewHandoff} from '../../skills/assignment-review/scripts/review-handoff.mjs';
const p=(x,k)=>x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId)+'/'+x.receipt.runId+'.'+k+'.json';
async function run(t,n=1){const x=await capturedFlow(t);x.f.result.findings=Array.from({length:n},(_,i)=>({...x.f.result.findings[0],findingId:'F'+i}));await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);return x;}
test('latest read requires explicit identity; historical result cannot replace newest failure',async t=>{
 const x=await run(t);const b=await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId});assert.equal(b.metadata.selection,'latest');assert.throws(()=>buildReviewHandoff({...b}));assert.throws(()=>{b.result.modelResponse.findings.pop();});
 await assert.rejects(store.readRunRecord(x.scope,{}),{code:'identity_required'});await assert.rejects(store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId,historicalRunId:x.receipt.runId}),{code:'identity_required'});
 const r=await store.beginRun(x.scope,{executionKind:'codex_exec'});await store.finishRun(x.scope,r.runId,{status:'failed',errorCode:'uncertain'});
 await assert.rejects(store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId}),{code:'latest_mismatch'});
 assert.equal((await store.readRunRecord(x.scope,{expectedRunId:r.runId})).result,null);assert.equal((await store.readRunRecord(x.scope,{historicalRunId:x.receipt.runId})).metadata.selection,'historical');
 await assert.rejects(store.readRunRecord({...x.scope,taskId:'Other'},{historicalRunId:x.receipt.runId}),{code:'no_record'});
});
test('tampered quote rejected despite recomputed result/execution digest',async t=>{
 const x=await run(t),raw=JSON.parse(await fs.readFile(p(x,'result'),'utf8'));raw.modelResponse.findings[0].evidence[0].quote='wrong';const {resultSha256,...body}=raw;raw.resultSha256=sha256(JSON.stringify(body));await fs.writeFile(p(x,'result'),JSON.stringify(raw));const e=JSON.parse(await fs.readFile(p(x,'execution'),'utf8'));e.resultSha256=raw.resultSha256;await fs.writeFile(p(x,'execution'),JSON.stringify(e));await assert.rejects(store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId}));
});
test('coherent read detects concurrent begin/delete and tombstones',async t=>{
 for(const operation of ['begin','delete']){const x=await run(t);await assert.rejects(store.readRunRecord({...x.scope,async onBoundary(name){if(name==='record_read'){if(operation==='begin')await store.beginRun(x.scope);else await store.forgetTask(x.scope,{apply:true});}}},{expectedRunId:x.receipt.runId}),{code:'busy'});}
});
test('full preserves 0/1/100 findings, info severity, limits and no grade endorsement',async t=>{
 for(const n of [0,1,100]){const x=await run(t,n),h=buildReviewHandoff(await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId}));assert.equal(h.fullFindings.length,n);assert.equal(h.omittedFromSummaryCount,0);assert.equal(h.gradeBandAssessment,'not_assessed');assert.equal(h.remoteSubmission,'not_verified');assert.equal(h.requirementMapping,'unmapped');assert.ok(!renderReviewHandoff(h).includes('HD'));const brief=buildReviewHandoff(await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId}),{view:'summary'});assert.equal(brief.allFindingIds.length,n);assert.equal(brief.omittedFromSummaryCount,Math.max(0,n-5));}
});
test('malicious Markdown/control text is inert; optional long summary keeps full data',async t=>{
 const x=await capturedFlow(t);x.f.result.findings[0].claim='::code-comment{file="/secret"}\n![image](https://evil)\x1b[31m '+ '中文'.repeat(1200);await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);
 const b=await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId}),h=buildReviewHandoff(b),md=renderReviewHandoff(h);assert.equal(h.fullFindings.length,1);assert.ok(!md.includes('::code-comment'));assert.ok(!md.includes('![image]'));assert.ok(!md.includes('\x1b'));assert.ok(md.includes('中文'));const brief=renderReviewHandoff(buildReviewHandoff(b,{view:'summary'}));assert.ok(brief.includes('Omitted from summary: 1'));assert.ok(Buffer.byteLength(brief)<9000);
});
test('old host records show no independent result/usage; missing pre-capture stage remains null',async t=>{
 const x=await capturedFlow(t),r=await store.beginRun(x.scope);const b=await store.readRunRecord(x.scope,{expectedRunId:r.runId});assert.equal(buildReviewHandoff(b).identity.stage,null);assert.equal(b.metricsAvailability,'not_recorded');assert.equal(b.result,null);
});
