import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './helpers.mjs';
import {beginRun,exportLatest,readHostProviderRun,forgetTask,readForDispatch} from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {captureDeepSeekPrompt,runCapturedDeepSeek} from '../../skills/assignment-review/scripts/deepseek-review.mjs';
import {validateBoundCodexResult} from '../../skills/assignment-review/scripts/codex-result.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {parseEvidenceCapsule} from '../../skills/assignment-review/scripts/codex-contract.mjs';
import {readBoundedJson} from '../../dist/providers/deepseek.js';
const script=fileURLToPath(new URL('../../skills/assignment-review/scripts/deepseek-review.mjs',import.meta.url));
async function setup(t,{preparation=false,onBoundary}={}){
 const root=await fs.mkdtemp('/private/tmp/el-deepseek-');await fs.chmod(root,0o700);t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const f=fixture(),scope={stateRoot:root+'/state',conversationId:f.snapshot.conversationId,taskId:'T20',onBoundary};
 if(preparation){for(const x of [f.snapshot,f.capsule,f.result]){x.stage='preparation';x.currentSourceId=null;}f.snapshot.materials[0].role='requirements';}
 const receipt=await beginRun(scope);for(const x of [f.snapshot,f.capsule,f.result])x.runId=receipt.runId;f.snapshot.sequence=receipt.sequence;
 await captureDeepSeekPrompt(scope,receipt.runId,{snapshot:f.snapshot,capsule:f.capsule,admitted:f.admitted});
 const saved=await exportLatest(scope,{expectedRunId:receipt.runId});
 const model={...f.result,schemaVersion:3,findings:Array.from({length:6},(_,i)=>({...f.result.findings[0],findingId:'F'+(i+1),claim:'完整分析 '+i+' '+('原因与具体核验步骤。'.repeat(65)),evidence:[{sourceId:'S1',excerptId:'E1'}]}))};
 let calls=0;
 const adapter={loadConfig:()=>({apiKey:'SYNTHETIC-NOT-REAL',baseUrl:'https://synthetic.invalid',model:'deepseek-v4-pro'}),readJson:readBoundedJson,fetch:async(url,init)=>{
  calls++;assert.equal(url,'https://synthetic.invalid/chat/completions');assert.equal(init.redirect,'error');
  const body=JSON.parse(init.body);assert.equal(body.messages[0].content,saved.promptText);assert.equal(body.response_format.type,'json_object');assert.equal(body.tools,undefined);
  return new Response(JSON.stringify({model:'deepseek-v4-pro',choices:[{finish_reason:'stop',message:{content:JSON.stringify(model),reasoning_content:'PRIVATE REASONING'}}]}),{status:200});
 }};
 return {root,scope,f,receipt,saved,model,adapter,calls:()=>calls};
}
test('requirements-only DeepSeek uses captured prompt, preserves >4 full findings and persists bound result',async t=>{
 const x=await setup(t,{preparation:true});x.f.admitted[0].text='changed after capture';
 const r=await runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);
 assert.equal(r.status,'succeeded');assert.equal(r.execution.provider,'deepseek');assert.equal(x.calls(),1);assert.equal(r.execution.observedRequests,1);assert.equal(r.result.modelResponse.findings.length,6);
 assert.equal(r.result.modelResponse.findings[0].claim,x.model.findings[0].claim);assert.equal(r.result.modelResponse.findings[0].evidence[0].quote,x.f.content);
 assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC-NOT-REAL|PRIVATE REASONING/);
 const prefix=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId)+'/'+x.receipt.runId;
 const stored=JSON.parse(await fs.readFile(prefix+'.result.json','utf8')),snap=JSON.parse(await fs.readFile(prefix+'.snapshot.json','utf8'));
 assert.deepEqual(validateBoundCodexResult(snap,stored.modelResponse),stored);assert.equal(stored.resultSha256,r.execution.resultSha256);
 assert.equal((await fs.stat(prefix+'.provider.json')).mode&0o777,0o600);
 assert.equal((await readHostProviderRun(x.scope,x.receipt.runId)).execution.status,'succeeded');
 assert.equal((await exportLatest(x.scope,{expectedRunId:x.receipt.runId})).promptText,x.saved.promptText);
 await assert.rejects(runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter));assert.equal(x.calls(),1);
 const deleted=await forgetTask(x.scope,{apply:true});assert.equal(deleted.incomplete,false);
});
test('two prepared reviewer identities retain identical raw task/evidence without peer feedback',async t=>{
 const x=await setup(t);const {captureCodexPrompt}=await import('../../skills/assignment-review/scripts/codex-review.mjs');
 const r=await beginRun(x.scope,{executionKind:'codex_exec'});
 const snapshot={...x.f.snapshot,runId:r.runId,sequence:r.sequence},capsule={...x.f.capsule,runId:r.runId};
 await captureCodexPrompt(x.scope,r.runId,{snapshot,capsule,admitted:x.f.admitted});
 const c=await exportLatest(x.scope,{expectedRunId:r.runId});assert.ok(c.promptText.startsWith(x.f.snapshot.promptText));
 assert.notEqual(r.runId,x.receipt.runId);assert.equal(parseEvidenceCapsule({...snapshot,promptText:c.promptText,promptSha256:sha256(c.promptText)}).sources[0].excerpts[0].text,x.f.content);
 const ds=await runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);assert.equal(ds.status,'succeeded');
 assert.equal((await exportLatest(x.scope,{expectedRunId:r.runId})).metadata.executionKind,'codex_exec');
});
test('bad citation or identity yields no published review result',async t=>{
 for(const change of [m=>m.findings[0].evidence[0].excerptId='FAKE',m=>m.runId='00000000-0000-4000-8000-000000000000']){
  const x=await setup(t);change(x.model);const r=await runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);
  assert.equal(r.status,'uncertain');assert.equal(r.execution.trigger,'result_rejected');assert.equal(r.result,undefined);assert.equal(r.execution.resultSha256,null);
  assert.equal((await readHostProviderRun(x.scope,x.receipt.runId)).execution.trigger,'result_rejected');
 }
});
test('truncated or tool finish is rejected even if the content contains complete JSON',async t=>{
 for(const finish of ['length','tool_calls']){
  const x=await setup(t);x.adapter.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:finish,message:{content:JSON.stringify(x.model)}}]}));
  const r=await runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.execution.trigger,'response_invalid');assert.equal(r.result,undefined);
 }
});
test('one HTTP error records safe status; no retry, raw error, or credential disclosure',async t=>{
 const x=await setup(t);let calls=0;x.adapter.fetch=async()=>{calls++;return new Response('PRIVATE TOKEN ERROR',{status:401});};
 const r=await runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);assert.equal(calls,1);assert.equal(r.execution.httpStatus,401);assert.equal(r.execution.trigger,'http_error');assert.doesNotMatch(JSON.stringify(r),/PRIVATE TOKEN|SYNTHETIC/);
 await assert.rejects(runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter));assert.equal(calls,1);
});
test('deadline includes response body reading and stops same request',async t=>{
 const x=await setup(t);x.adapter.timeoutMs=15;x.adapter.fetch=async(_url,init)=>new Response(new ReadableStream({start(c){init.signal.addEventListener('abort',()=>c.error(new Error('private')));}}));
 const r=await runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.execution.errorCode,'timed_out');assert.equal(r.execution.trigger,'deadline_exceeded');assert.equal(r.result,undefined);
});
test('preflight configuration failure and disabled provider send no request',async t=>{
 const x=await setup(t);x.adapter.loadConfig=()=>{throw new Error('SECRET CONFIG');};
 const r=await runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'failed');assert.equal(r.execution.observedRequests,0);assert.equal(r.execution.trigger,'configuration_unavailable');assert.equal(x.calls(),0);
 const call=spawnSync(process.execPath,[script,'preflight'],{input:'{}',encoding:'utf8',env:{...process.env,EVIDENCELENS_DISABLE_PROVIDER:'1'}});
 assert.equal(call.status,1);assert.equal(JSON.parse(call.stdout).trigger,'provider_disabled');
 for(const key of ['apiKey','endpoint','model','adapter']){const p=spawnSync(process.execPath,[script,'preflight'],{input:JSON.stringify({[key]:'PRIVATE'}),encoding:'utf8'});assert.equal(p.status,1);assert.doesNotMatch(p.stderr,/PRIVATE/);}
});
test('cancellation during publication removes candidate result and records cancelled',async t=>{
 const controller=new AbortController(),x=await setup(t,{onBoundary(name){if(name==='before_terminal_commit')controller.abort();}});
 const r=await runCapturedDeepSeek(x.scope,x.receipt.runId,{signal:controller.signal},x.adapter);assert.equal(r.status,'cancelled');assert.equal(r.result,undefined);assert.equal(r.execution.resultSha256,null);
});
test('dispatched host provider is protected against concurrent deletion',async t=>{
 const x=await setup(t);await readForDispatch(x.scope,x.receipt.runId);await assert.rejects(forgetTask(x.scope,{apply:true}),{code:'busy'});
});
test('a competing runner cannot dispatch twice or overwrite the owning runner result',async t=>{
 const x=await setup(t);let release,entered;
 const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),original=x.adapter.fetch;
 x.adapter.fetch=async(...args)=>{entered();await gate;return original(...args);};
 const first=runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter);await ready;
 await assert.rejects(runCapturedDeepSeek(x.scope,x.receipt.runId,{},x.adapter));release();
 assert.equal((await first).status,'succeeded');assert.equal(x.calls(),1);
});
