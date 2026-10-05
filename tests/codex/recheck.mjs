import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {assessmentFlow} from './helpers.mjs';import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {admitPriorSummaries,createReviewAssessment,projectCurrentActions} from '../../skills/assignment-review/scripts/review-recheck.mjs';import {buildReviewHandoff,renderReviewHandoff} from '../../skills/assignment-review/scripts/review-handoff.mjs';

const local=x=>({kind:'local',runId:x.receipt.runId,taskId:x.scope.taskId,reviewMode:'artifact_only',access:'allowed',exclusion:'none',resultSha256:x.bundle.result.resultSha256});
test('immutable host sidecar preserves raw finding IDs; deferred never resolved',async t=>{
 const x=await assessmentFlow(t),a=createReviewAssessment(x.bundle,[],{requirements:[x.requirement],findings:[{...x.finding,actionDisposition:'deferred'}]});
 await store.annotateRun(x.scope,{expectedRunId:x.receipt.runId,assessment:a});await store.annotateRun(x.scope,{expectedRunId:x.receipt.runId,assessment:a});
 const b=await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId});assert.equal(b.assessmentAvailability,'recorded');assert.equal(b.assessment.findings[0].state,'still_present');assert.equal(projectCurrentActions(a).groups.mandatory[0].disposition,'deferred');assert.equal(b.result.resultSha256,x.bundle.result.resultSha256);
 const different=createReviewAssessment(x.bundle,[],{requirements:[x.requirement],findings:[x.finding]});await assert.rejects(store.annotateRun(x.scope,{expectedRunId:x.receipt.runId,assessment:different}),{code:'uncertain'});
});
test('current source proof closes issue; prior supported close permits same-ID reopen',async t=>{
 const x=await assessmentFlow(t),close=createReviewAssessment(x.bundle,[],{requirements:[{...x.requirement,status:'satisfied'}],findings:[{...x.finding,state:'resolved',actionDisposition:'done',action:null}]});await store.annotateRun(x.scope,{expectedRunId:x.receipt.runId,assessment:close});
 assert.equal(projectCurrentActions(close).groups.mandatory.length,0);assert.equal(projectCurrentActions(close).history.length,1);
 const y=await assessmentFlow(t,x.scope),prior=await admitPriorSummaries(y.scope,y.bundle,[local(x)]);const f={...y.finding,origin:{runId:x.receipt.runId,findingId:'F1'},lastKnownHistoricalState:'resolved',reopened:true};
 const a=createReviewAssessment(y.bundle,prior,{requirements:[y.requirement],findings:[f]});await store.annotateRun(y.scope,{expectedRunId:y.receipt.runId,admittedPriorSummaries:[local(x)],assessment:a});assert.equal((await store.readRunRecord(y.scope,{expectedRunId:y.receipt.runId})).assessment.findings[0].reopened,true);
});
test('no proof, excluded sources, missing criterion, user reassurance and deferral cannot close',async t=>{
 const x=await assessmentFlow(t);for(const patch of [{evidence:[]},{coverage:'partial'},{criterionIds:[]},{evidence:[{...x.evidence,sourceId:'excluded'}]},{actionDisposition:'deferred'},{action:'old fix'}])assert.throws(()=>createReviewAssessment(x.bundle,[],{requirements:[x.requirement],findings:[{...x.finding,state:'resolved',actionDisposition:'done',action:null,...patch}]}));
 const unknown=createReviewAssessment(x.bundle,[],{requirements:[{...x.requirement,type:'unknown',status:'unknown'}],findings:[{...x.finding,state:'unverifiable',evidence:[],coverage:'unavailable',actionDisposition:'verify'}]});assert.equal(projectCurrentActions(unknown).groups.unknown[0].disposition,'verify');
});
test('admission rejects foreign task, denied scope, changed digest and unsupported reopening',async t=>{
 const x=await assessmentFlow(t),y=await assessmentFlow(t,x.scope);for(const patch of [{taskId:'Other'},{access:'denied'},{exclusion:'whole'},{reviewMode:'process'},{resultSha256:'0'.repeat(64)}])await assert.rejects(admitPriorSummaries(y.scope,y.bundle,[{...local(x),...patch}]));
 const prior=await admitPriorSummaries(y.scope,y.bundle,[local(x)]);assert.throws(()=>createReviewAssessment(y.bundle,prior,{requirements:[y.requirement],findings:[{...y.finding,origin:{runId:x.receipt.runId,findingId:'F1'},lastKnownHistoricalState:'resolved',reopened:true}]}));
 const a=createReviewAssessment(y.bundle,prior,{requirements:[y.requirement],findings:[{...y.finding,origin:{runId:x.receipt.runId,findingId:'F1'}}]});assert.equal(a.findings[0].reopened,false);
});
test('changed applicability retires action; external history cannot assert reopening',async t=>{
 const x=await assessmentFlow(t);const a=createReviewAssessment(x.bundle,[],{requirements:[{...x.requirement,status:'not_applicable'}],findings:[{...x.finding,state:'no_longer_applicable',actionDisposition:'retired',action:null}]});assert.equal(projectCurrentActions(a).groups.mandatory.length,0);
 const external=await admitPriorSummaries(x.scope,x.bundle,[{kind:'external',taskId:x.scope.taskId,reviewMode:'artifact_only',access:'allowed',exclusion:'none',summary:'Previously reported resolved, unverifiable origin'}]);assert.equal(external[0].verification,'limited_external_history');assert.throws(()=>createReviewAssessment(x.bundle,external,{requirements:[x.requirement],findings:[{...x.finding,reopened:true,lastKnownHistoricalState:'resolved'}]}));
});
test('corrupt annotation stays visible while valid full result survives; retention preserves unknown files',async t=>{
 const x=await assessmentFlow(t),a=createReviewAssessment(x.bundle,[],{requirements:[x.requirement],findings:[x.finding]});await store.annotateRun(x.scope,{expectedRunId:x.receipt.runId,assessment:a});const dir=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId),p=dir+'/'+x.receipt.runId+'.handoff.json';await fs.writeFile(p,'{}');
 const b=await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId});assert.equal(b.assessmentAvailability,'record_error');assert.equal(buildReviewHandoff(b).fullFindings.length,1);assert.ok(renderReviewHandoff(buildReviewHandoff(b)).includes('record&#95;error'));
 const deleted=await store.forgetTask(x.scope,{apply:true});assert.equal(deleted.incomplete,true);assert.ok(await fs.stat(p));
});
test('ordinary name changes and shared F names never supply task history or reopen proof',async t=>{
 const x=await assessmentFlow(t);x.finding.rationale='Demo name changed; policy remains unknown';const a=createReviewAssessment(x.bundle,[],{requirements:[{...x.requirement,type:'unknown',status:'unknown'}],findings:[{...x.finding,actionDisposition:'deferred'}]});assert.equal(a.findings[0].reopened,false);assert.equal(projectCurrentActions(a).groups.unknown.length,1);assert.throws(()=>createReviewAssessment(x.bundle,[],{requirements:[x.requirement],findings:[{...x.finding,reopened:true}]}));
 const other=await assessmentFlow(t);await assert.rejects(admitPriorSummaries(other.scope,other.bundle,[local(x)]));
});
