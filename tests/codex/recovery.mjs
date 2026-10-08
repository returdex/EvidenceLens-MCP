import {spawnSync} from 'node:child_process';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {fixture,capturedFlow} from './helpers.mjs';
import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {captureDeepSeekPrompt,runCapturedDeepSeek} from '../../skills/assignment-review/scripts/deepseek-review.mjs';
import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import {captureCodexPrompt} from '../../skills/assignment-review/scripts/codex-review.mjs';
import {buildReviewHandoff,renderReviewHandoff,buildReviewPair} from '../../skills/assignment-review/scripts/review-handoff.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
async function run(t,{invalid=false,fence=false,cancel=false,unreferenced=null}={}){
 const root=await fs.mkdtemp('/private/tmp/el23-');await fs.chmod(root,0o700);t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const f=fixture(),scope={stateRoot:root+'/state',conversationId:f.snapshot.conversationId,taskId:f.snapshot.taskId};
 const receipt=await store.beginRun(scope);for(const x of [f.snapshot,f.capsule,f.result])x.runId=receipt.runId;f.snapshot.sequence=receipt.sequence;
 await captureDeepSeekPrompt(scope,receipt.runId,{snapshot:f.snapshot,capsule:f.capsule,admitted:f.admitted});
 const value={...f.result,schemaVersion:3,findings:f.result.findings.map(x=>({...x,evidence:x.evidence.map(({sourceId,excerptId})=>({sourceId,excerptId}))}))};
 if(unreferenced)value.findings.push({...value.findings[0],findingId:'F2',kind:unreferenced.kind,severity:unreferenced.severity,evidence:[]});
 if(invalid)value.taskId='foreign';if(fence)value.heading='完整审阅';
 const raw=fence?'```json\n'+JSON.stringify(value)+'\n```':JSON.stringify(value);let calls=0;const c=new AbortController();
 const adapter={loadConfig:()=>({apiKey:'SYNTHETIC',baseUrl:'https://synthetic.invalid',model:'synthetic'}),readJson:async r=>r.json(),fetch:async()=>{calls++;if(cancel)c.abort();return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:raw}}]}),{status:200});}};
 const result=await runCapturedDeepSeek(scope,receipt.runId,{signal:c.signal},adapter);
 const bundle=await store.readRunRecord(scope,{expectedRunId:receipt.runId});
 return {root,scope,f,receipt,raw,calls:()=>calls,result,bundle};
}
test('terminal reply is private, exact, same-run and conversions roundtrip',async t=>{
 const x=await run(t,{fence:true});assert.equal(x.result.status,'succeeded');assert.equal(x.bundle.reply.text,x.raw);assert.ok(x.bundle.conversions.length===2);
 assert.match(renderReviewHandoff(buildReviewHandoff(x.bundle)),/Original model reply/);assert.equal(x.calls(),1);
 const path=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId)+'/'+x.receipt.runId+'.reply.json';
 assert.equal((await fs.stat(path)).mode&0o777,0o600);
 const original=await fs.readFile(path,'utf8'),v=JSON.parse(original);v.text+='tampered';await fs.writeFile(path,JSON.stringify(v));
 await assert.rejects(store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId}));await fs.writeFile(path,original);
 const dry=await store.forgetTask(x.scope);assert.equal(dry.mode,'dry-run');assert.equal(dry.preservedUnknownCount,0);const deleted=await store.forgetTask(x.scope,{apply:true});assert.equal(deleted.incomplete,false);
});
test('binding rejection keeps original diagnostic without validated findings or retry',async t=>{
 const x=await run(t,{invalid:true});assert.equal(x.result.status,'uncertain');assert.equal(x.bundle.result,null);assert.equal(x.bundle.reply.text,x.raw);
 const h=buildReviewHandoff(x.bundle);assert.equal(h.fullFindings.length,0);assert.match(renderReviewHandoff(h),/UNVERIFIED DIAGNOSTIC/);assert.equal(x.calls(),1);
});
test('explicit dual pair preserves valid full report and failed peer in both orders',async t=>{
 const x=await run(t);const r=await store.beginRun(x.scope,{executionKind:'codex_exec'});
 const snapshot={...x.f.snapshot,runId:r.runId,sequence:r.sequence},capsule={...x.f.capsule,runId:r.runId};
 await captureCodexPrompt(x.scope,r.runId,{snapshot,capsule,admitted:x.f.admitted});await store.finishRun(x.scope,r.runId,{status:'failed',errorCode:'uncertain'});
 const peer=await store.readRunRecord(x.scope,{expectedRunId:r.runId});
 for(const args of [[x.bundle,peer],[peer,x.bundle]]){const pair=buildReviewPair(...args);assert.equal(pair.status,'one_validated');assert.equal(pair.comparison,'same_materials_semantics_unverified');assert.equal(pair.reports.flatMap(x=>x.fullFindings).length,x.bundle.result.modelResponse.findings.length);}
 const cli=spawnSync(process.execPath,['skills/assignment-review/scripts/review-records.mjs','pair'],{env:{...process.env,CODEX_THREAD_ID:x.scope.conversationId,EVIDENCELENS_STATE_ROOT:x.scope.stateRoot},input:JSON.stringify({taskId:x.scope.taskId,runIds:[x.receipt.runId,r.runId]}),encoding:'utf8',timeout:10000});assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).pair.status,'one_validated');
 assert.equal(x.calls(),1);assert.throws(()=>buildReviewPair(x.bundle,{...peer}),{code:'corrupt_record'});
});

test('cancelled terminal reply stays diagnostic; old absence and unsafe links remain explicit',async t=>{
 const x=await run(t,{cancel:true});assert.equal(x.result.status,'cancelled');assert.equal(x.bundle.result,null);assert.equal(x.bundle.reply.text,x.raw);
 const path=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId)+'/'+x.receipt.runId+'.reply.json';
 const saved=await fs.readFile(path);await fs.unlink(path);assert.equal((await store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId})).replyAvailability,'not_recorded');
 await fs.writeFile(path+'.foreign',saved,{mode:0o600});await fs.symlink(path+'.foreign',path);
 await assert.rejects(store.readRunRecord(x.scope,{expectedRunId:x.receipt.runId}));
 const deletion=await store.forgetTask(x.scope,{apply:true});assert.equal(deletion.incomplete,true);assert.ok((await fs.lstat(path)).isSymbolicLink());
});

test('Codex raw reply, two valid results, different materials and two failures stay distinct',async t=>{
 const x=await run(t),peer=await capturedFlow(t,{scope:x.scope});
 await executeCapturedWithAdapter(peer.scope,peer.receipt.runId,{},peer.adapter);
 const b=await store.readRunRecord(peer.scope,{expectedRunId:peer.receipt.runId});assert.ok(b.reply);assert.equal(b.reply.text,JSON.stringify(peer.f.result));
 assert.equal(buildReviewPair(x.bundle,b).status,'both_validated');assert.equal(peer.calls(),1);
 const other=await capturedFlow(t,{scope:x.scope,sourceId:'Different'});await executeCapturedWithAdapter(other.scope,other.receipt.runId,{},other.adapter);
 assert.equal(buildReviewPair(x.bundle,await store.readRunRecord(other.scope,{expectedRunId:other.receipt.runId})).comparison,'not_comparable');
 const bad=await run(t,{invalid:true}),failed=await capturedFlow(t,{scope:bad.scope});await store.finishRun(failed.scope,failed.receipt.runId,{status:'failed',errorCode:'uncertain'});
 assert.equal(buildReviewPair(bad.bundle,await store.readRunRecord(failed.scope,{expectedRunId:failed.receipt.runId})).status,'none_validated');
});

test('DeepSeek unreferenced info remains visible as unknown with exact original reply',async t=>{
 const x=await run(t,{unreferenced:{kind:'observation',severity:'info'}});
 assert.equal(x.result.status,'succeeded');assert.equal(x.bundle.reply.text,x.raw);
 const findings=x.bundle.result.modelResponse.findings;assert.equal(findings.length,2);assert.equal(findings[0].kind,'observation');assert.equal(findings[1].kind,'unknown');
 assert.equal(findings[1].claim,JSON.parse(x.raw).findings[1].claim);assert.deepEqual(findings[1].evidence,[]);assert.ok(x.bundle.conversions.some(v=>v.includes('unverified unknown')));assert.equal(x.calls(),1);
});
test('missing references on conflicts and warning observations still reject the whole reply',async t=>{
 for(const unreferenced of [{kind:'conflict',severity:'info'},{kind:'observation',severity:'warning'},{kind:'observation',severity:'error'}]){
 const x=await run(t,{unreferenced});assert.equal(x.result.status,'uncertain');assert.equal(x.bundle.result,null);assert.equal(x.bundle.reply.text,x.raw);assert.equal(x.calls(),1);
 }
});
