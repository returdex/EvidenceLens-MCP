import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {capturedFlow} from './helpers.mjs';
import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import {beginRun,readRunRecord} from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {captureDeepSeekPrompt,runCapturedDeepSeek} from '../../skills/assignment-review/scripts/deepseek-review.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {readBoundedJson} from '../../dist/providers/deepseek.js';
import {buildReviewSynthesis,renderReviewSynthesis} from '../../skills/assignment-review/scripts/review-synthesis.mjs';
import {buildReviewPair} from '../../skills/assignment-review/scripts/review-handoff.mjs';
async function setup(t,{failure=false,different=false,count=3,longAction=false}={}){
 const x=await capturedFlow(t,{transform(f){f.snapshot.promptText='Task\n<evidencelens-output-v3>\nOriginal user task';f.snapshot.promptSha256=sha256(f.snapshot.promptText);f.result.findings=Array.from({length:count},(_,i)=>({...f.result.findings[0],findingId:'F'+i,claim:'Original info '+i+' ::code-comment{file="/secret"}',action:'Action '+i+(longAction?'x'.repeat(1800):'')}));}});
 const r=await beginRun(x.scope);const snapshot={...x.f.snapshot,runId:r.runId,sequence:r.sequence},capsule={...x.f.capsule,runId:r.runId};
 if(different){snapshot.promptText='Task\n<evidencelens-output-v3>\nDifferent user task';snapshot.promptSha256=sha256(snapshot.promptText);}
 await captureDeepSeekPrompt(x.scope,r.runId,{snapshot,capsule,admitted:x.f.admitted});
 await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);
 const model={...x.f.result,runId:r.runId,schemaVersion:3,findings:x.f.result.findings.map(f=>({...f,evidence:f.evidence.map(e=>({sourceId:e.sourceId,excerptId:e.excerptId}))}))};
 await runCapturedDeepSeek(x.scope,r.runId,{}, {loadConfig:()=>({apiKey:'synthetic',baseUrl:'https://synthetic.invalid',model:'deepseek-v4-pro'}),readJson:readBoundedJson,fetch:async()=>failure?new Response('failed',{status:500}):new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(model)}}]}))});
 const bundles=await Promise.all([x.receipt.runId,r.runId].map(runId=>readRunRecord(x.scope,{historicalRunId:runId})));
 return {...x,bundles};
}
function ledger(bundles){
 return {judgment:'Host comparison needs semantic verification.',groups:bundles[0].result.modelResponse.findings.map((f,i)=>({groupId:'G'+i,category:'agreement',decision:'merged',references:bundles.map(b=>({runId:b.metadata.runId,findingId:f.findingId})),rationale:'Same sourced issue judged by host; no vote.',evidence:[{runId:bundles[0].metadata.runId,sourceId:'S1',excerptId:'E1'}],action:'Inspect and repair '+i}))};
}
test('full default preserves every info finding, original reports and unresolved references',async t=>{
 const x=await setup(t),s=buildReviewSynthesis(x.bundles);assert.equal(s.groups.length,6);assert.equal(s.reports[0].fullFindings.length,3);assert.equal(s.reports[1].fullFindings.length,3);assert.equal(s.comparison,'same_task_and_materials_semantics_unverified');assert.equal(s.gradeBandAssessment,'not_assessed');assert.equal(s.firstReviewIndependence,'not_verified');
 assert.ok(s.groups.every(g=>g.category==='unresolved'));const md=renderReviewSynthesis(s);assert.ok(md.includes('Original info 2'));assert.ok(!md.includes('::code-comment'));assert.match(md,/Action 2/);
 assert.throws(()=>buildReviewSynthesis([{...x.bundles[0]}]));
});
test('complete host ledger shows every decision and bound source bytes with original finding attribution',async t=>{
 const x=await setup(t),a=ledger(x.bundles);a.groups[1].category='disagreement';a.groups[1].decision='deferred';a.groups[2].decision='rejected';a.groups[2].action=null;
 const s=buildReviewSynthesis(x.bundles,a);assert.deepEqual(s.groups.map(g=>g.decision),['merged','deferred','rejected']);assert.equal(s.groups[0].evidence[0].quote,x.f.content);assert.equal(s.reports.reduce((n,r)=>n+r.fullFindings.length,0),6);assert.match(renderReviewSynthesis(s),/rejected/);
});
test('reject incomplete/duplicate ledger, foreign finding, forged evidence, empty rationale and unsupported closure/reopen',async t=>{
 const x=await setup(t);
 for(const mutate of [a=>a.groups.pop(),a=>a.groups[1].references[0]=a.groups[0].references[0],a=>a.groups[0].references[0].findingId='foreign',a=>a.groups[0].evidence[0].excerptId='foreign',a=>a.groups[0].rationale=' ',a=>{a.groups[0].decision='closed';a.groups[0].action=null;},a=>a.groups[0].decision='reopened',a=>a.groups[0].category='unique',a=>a.groups[0].extra=true]){
  const a=ledger(x.bundles);mutate(a);assert.throws(()=>buildReviewSynthesis(x.bundles,a));
 }
});
test('one failed reviewer preserves peer feedback and blocks consensus or unique inference',async t=>{
 const x=await setup(t,{failure:true}),s=buildReviewSynthesis(x.bundles);assert.equal(s.status,'partial');assert.equal(s.groups.length,3);assert.equal(s.reports[1].reviewExecution,'uncertain');assert.match(renderReviewSynthesis(s),/Original info 2/);
 const a={judgment:'Partial review',groups:s.groups.map(g=>({groupId:g.groupId,category:'unique',decision:g.decision,references:g.references,rationale:g.rationale,evidence:[],action:g.action}))};assert.throws(()=>buildReviewSynthesis(x.bundles,a));
});
test('different captured task blocks semantic merge despite same material hashes',async t=>{
 const x=await setup(t,{different:true});assert.equal(buildReviewPair(...x.bundles).comparison,'not_comparable');assert.equal(buildReviewSynthesis(x.bundles).comparison,'not_comparable');assert.throws(()=>buildReviewSynthesis(x.bundles,ledger(x.bundles)));
});
test('single review and explicit summary preserve full record pointers; zero findings needs no invented group',async t=>{
 const x=await setup(t,{count:0}),s=buildReviewSynthesis([x.bundles[0]],{judgment:'No findings in this bounded review.',groups:[]});assert.equal(s.groups.length,0);assert.equal(s.comparison,'single_review');
 const y=await setup(t),brief=buildReviewSynthesis([y.bundles[0]],null,{view:'summary',maxSummaryFindings:1});assert.equal(brief.reports[0].fullFindings.length,3);assert.equal(brief.reports[0].omittedFromSummaryCount,2);assert.match(renderReviewSynthesis(brief),/Complete same-run record/);
});
test('installed synthesize CLI renders host ledger, refuses incomplete input and leaves saved records unchanged',async t=>{
 const x=await setup(t),script=x.root+'/installed/scripts/review-records.mjs',env={PATH:'/usr/bin:/bin',HOME:x.root,CODEX_THREAD_ID:x.scope.conversationId,EVIDENCELENS_STATE_ROOT:x.scope.stateRoot};
 const dir=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId);
 const files=await fs.readdir(dir),before=await Promise.all(files.map(f=>fs.readFile(dir+'/'+f)));
 const call=assessment=>spawnSync(process.execPath,[script,'synthesize'],{env,cwd:x.root+'/project',input:JSON.stringify({taskId:x.scope.taskId,runIds:x.bundles.map(b=>b.metadata.runId),assessment}),encoding:'utf8',timeout:15000});
 const r=call(ledger(x.bundles));assert.equal(r.status,0,r.stderr);const parsed=JSON.parse(r.stdout);assert.equal(parsed.synthesis.groups.length,3);assert.equal(parsed.synthesis.reports[0].fullFindings.length,3);assert.match(parsed.markdown,/Host judgment/);
 const bad=ledger(x.bundles);bad.groups.pop();assert.notEqual(call(bad).status,0);
 assert.deepEqual(await fs.readdir(dir),files);assert.deepEqual(await Promise.all(files.map(f=>fs.readFile(dir+'/'+f))),before);
});
test('closed and reopened decisions reuse validated immutable current-evidence transitions',async t=>{
 const {assessmentFlow}=await import('./helpers.mjs');const {createReviewAssessment,admitPriorSummaries}=await import('../../skills/assignment-review/scripts/review-recheck.mjs');const {annotateRun}=await import('../../skills/assignment-review/scripts/prompt-store.mjs');
 const x=await assessmentFlow(t),close=createReviewAssessment(x.bundle,[],{requirements:[{...x.requirement,status:'satisfied'}],findings:[{...x.finding,state:'resolved',actionDisposition:'done',action:null}]});await annotateRun(x.scope,{expectedRunId:x.receipt.runId,assessment:close});
 const closed=await readRunRecord(x.scope,{expectedRunId:x.receipt.runId});
 const row=b=>({groupId:'G1',category:'unresolved',decision:'closed',references:[{runId:b.metadata.runId,findingId:'F1'}],rationale:'Validated current-evidence host transition.',evidence:[{runId:b.metadata.runId,sourceId:'S1',excerptId:'E1'}],action:null});
 assert.equal(buildReviewSynthesis([closed],{judgment:'Closed under current host assessment.',groups:[row(closed)]}).groups[0].decision,'closed');
 const y=await assessmentFlow(t,x.scope),priorInput=[{kind:'local',runId:x.receipt.runId,taskId:x.scope.taskId,reviewMode:'artifact_only',access:'allowed',exclusion:'none',resultSha256:x.bundle.result.resultSha256}],prior=await admitPriorSummaries(y.scope,y.bundle,priorInput);
 const reopen=createReviewAssessment(y.bundle,prior,{requirements:[y.requirement],findings:[{...y.finding,origin:{runId:x.receipt.runId,findingId:'F1'},lastKnownHistoricalState:'resolved',reopened:true}]});await annotateRun(y.scope,{expectedRunId:y.receipt.runId,admittedPriorSummaries:priorInput,assessment:reopen});
 const opened=await readRunRecord(y.scope,{expectedRunId:y.receipt.runId}),g={...row(opened),decision:'reopened',action:'Repair under current evidence'};assert.equal(buildReviewSynthesis([opened],{judgment:'Reopened with source-bound current evidence.',groups:[g]}).groups[0].decision,'reopened');
});

test('full synthesis retains 200 findings and long actions within existing per-run limits',async t=>{
 const x=await setup(t,{count:100,longAction:true}),s=buildReviewSynthesis(x.bundles);assert.equal(s.groups.length,200);assert.equal(s.reports.reduce((n,r)=>n+r.fullFindings.length,0),200);assert.equal(s.groups[199].action.length,1809);assert.equal(s.reports[1].omittedFromSummaryCount,0);
});
