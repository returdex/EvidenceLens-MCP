import { normalizeTerminalMetrics } from '../../skills/assignment-review/scripts/codex-metrics.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {captureCodexPrompt} from '../../skills/assignment-review/scripts/codex-review.mjs';import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import {admitPriorSummaries,createReviewAssessment,projectCurrentActions} from '../../skills/assignment-review/scripts/review-recheck.mjs';
import {buildReviewHandoff} from '../../skills/assignment-review/scripts/review-handoff.mjs';
import {makeLiveCapture,reviewedInputs} from './live-acceptance.mjs';import {protocolFixture,capturedFlow} from './helpers.mjs';
function fixtureResult(capture,index){const id=capture.snapshot;const ev=(sourceId,excerptId)=>({sourceId,excerptId});return {schemaVersion:3,runId:id.runId,taskId:id.taskId,stage:id.stage,currentSourceId:id.currentSourceId,coverage:capture.capsule.sources.map(s=>({sourceId:s.sourceId,status:'covered',excerptIds:s.excerpts.map(e=>e.excerptId)})),findings:[...(index?[]:[{findingId:'FREQ',kind:'gap',severity:'error',claim:'Mandatory evidence missing in synthetic draft',evidence:[ev('R1','E1'),ev('S1','E1')],action:'Add the required evidence line'}]),{findingId:'FSTYLE',kind:'observation',severity:'info',claim:'Optional descriptive heading improvement',evidence:[ev('R1','E2'),ev('S1','E2')],action:'Optionally improve the heading'}],limitations:['Synthetic fixture; no semantic model proof']};}
test('offline initial/full/export/current recheck closes corrected issue and retains info',async t=>{
 const root=await fs.mkdtemp('/private/tmp/el21-accept-');await fs.chmod(root,0o700);t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const scope={stateRoot:root+'/state',taskId:'T21',conversationId:randomUUID()};let prior=null;
 for(let index=0;index<2;index++){
  const receipt=await store.beginRun(scope,{executionKind:'codex_exec'}),capture=makeLiveCapture(receipt,index);await captureCodexPrompt(scope,receipt.runId,capture);const original=await store.exportLatest(scope,{expectedRunId:receipt.runId});
  const seam=await capturedFlow(t),adapter={...seam.adapter,createLaunch:async()=>{const launch=await seam.adapter.createLaunch();const rows=[{type:'thread.started',thread_id:'synthetic'},{type:'turn.started'},{type:'item.completed',item:{type:'agent_message',text:JSON.stringify(fixtureResult(capture,index))}},{type:'turn.completed'}];return {...launch,args:['--input-type=module','-e','process.stdout.write('+JSON.stringify(rows.map(x=>JSON.stringify(x)).join('\n')+'\n')+');']};}};
  // Real synthetic child protocol; no account or model inference.

  const r=await executeCapturedWithAdapter(scope,receipt.runId,{},adapter);assert.equal(r.status,'succeeded',JSON.stringify(r));assert.equal((await store.exportLatest(scope,{expectedRunId:receipt.runId})).promptText,original.promptText);
  const bundle=await store.readRunRecord(scope,{expectedRunId:receipt.runId});assert.equal(buildReviewHandoff(bundle).fullFindings.length,index?1:2);assert.equal(bundle.metrics.usage.input_tokens.state,'missing'); // trusted fixture omitted telemetry; no zero fabricated
  const capsule=capture.capsule,evidence=(sid,eid)=>{const ex=capsule.sources.find(s=>s.sourceId===sid).excerpts.find(e=>e.excerptId===eid);return {sourceId:sid,excerptId:eid,startByte:ex.startByte,endByte:ex.endByte,quote:ex.text};};
  const reqs=[{requirementId:'R_EVIDENCE',type:'mandatory',reference:evidence('R1','E1'),findingIds:index?[]:['FREQ'],evidence:[evidence('S1','E1')],status:index?'satisfied':'gap',rationale:'Host checks the exact synthetic evidence line'},{requirementId:'R_STYLE',type:'optional',reference:evidence('R1','E2'),findingIds:['FSTYLE'],evidence:[evidence('S1','E2')],status:'gap',rationale:'Heading remains optional and unchanged'}];
  const descriptor=prior?{kind:'local',runId:prior.metadata.runId,taskId:scope.taskId,reviewMode:'artifact_only',access:'allowed',exclusion:'none',resultSha256:prior.result.resultSha256}:null;
  const admitted=await admitPriorSummaries(scope,bundle,descriptor?[descriptor]:[]);
  const row=(name,modelId,state)=>({findingId:name,origin:prior?{runId:prior.metadata.runId,findingId:modelId}:null,findingIds:state==='resolved'?[]:[modelId],criterionIds:[name==='StableEvidence'?'R_EVIDENCE':'R_STYLE'],state,evidence:[evidence('S1',name==='StableEvidence'?'E1':'E2')],coverage:'sufficient',rationale:'Bound current synthetic excerpt checked by host',lastKnownHistoricalState:prior?'still_present':null,actionDisposition:state==='resolved'?'done':name==='StableStyle'?'deferred':'active',action:state==='resolved'?null:'Synthetic current action',reopened:false});
  const assessment=createReviewAssessment(bundle,admitted,{requirements:reqs,findings:[row('StableEvidence','FREQ',index?'resolved':'still_present'),row('StableStyle','FSTYLE','still_present')]});await store.annotateRun(scope,{expectedRunId:receipt.runId,admittedPriorSummaries:descriptor?[descriptor]:[],assessment});const actions=projectCurrentActions(assessment);assert.equal(actions.groups.mandatory.length,index?0:1);assert.equal(actions.groups.optional[0].disposition,'deferred');
  prior=await store.readRunRecord(scope,{expectedRunId:receipt.runId});
 }
 const failed=await store.beginRun(scope,{executionKind:'codex_exec'});await store.finishRun(scope,failed.runId,{status:'failed',errorCode:'uncertain'});assert.equal((await store.readRunRecord(scope,{expectedRunId:failed.runId})).result,null);
});
test('actual pinned CLI loopback metrics are observed through production supervisor only',async()=>{
 const x=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true});assert.equal(x.outcome.status,'candidate');for(const [name,value] of Object.entries({input_tokens:10,cached_input_tokens:0,output_tokens:10,reasoning_output_tokens:0})){assert.equal(x.outcome.metrics[name].value,value);assert.equal(x.outcome.metrics[name].state,'reported');}assert.equal(x.requests.length,1);assert.equal(x.authUnchanged,true);
});
test('all four stage variants preserve fixed evidence stage and inspection never sends a model request',async t=>{
 for(const stage of ['preparation','in_progress','final','in_progress']){const x=await capturedFlow(t,{stage,current:stage!=='preparation'});const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'succeeded');const b=await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId});assert.equal(buildReviewHandoff(b).identity.stage,stage);await x.exportPrompt();assert.equal(x.calls(),1);}
});
test('live command without explicit execution flag is dry and sends no inferred authorization',()=>{
 const helper=fileURLToPath(new URL('./live-acceptance.mjs',import.meta.url));const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const r=spawnSync(process.execPath,[helper],{env,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),reviewedInputs());
});
