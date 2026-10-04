import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { superviseCodexProcess,executeCapturedWithAdapter } from '../../skills/assignment-review/scripts/codex-runner.mjs';
import { newDiagnostics,validateDiagnostics,reportedErrorCategory } from '../../skills/assignment-review/scripts/codex-diagnostics.mjs';
import { validateExecutionRecord } from '../../skills/assignment-review/scripts/codex-contract.mjs';
import { sha256 } from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';
import { capturedFlow,protocolFixture } from './helpers.mjs';
const sentinel='PRIVATE_ERROR_SENTINEL /private/source.txt sk-private-do-not-retain';
const start=[{type:'thread.started',thread_id:sentinel},{type:'turn.started'}];
const final={type:'item.completed',item:{type:'agent_message',text:'{}'}};
const end={type:'turn.completed'};
const emit=rows=>`process.stdout.write(${JSON.stringify(rows.map(x=>JSON.stringify(x)).join('\n')+'\n')});`;
const launch=code=>({executable:process.execPath,args:['-e',code],env:{PATH:'/usr/bin:/bin',CODEX_HOME:'/synthetic'},cwd:'/private/tmp'});
const run=code=>superviseCodexProcess(launch(code),Buffer.from('synthetic'));
const privateDir=x=>x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId);
const assertPrivate=r=>{assert.ok(!JSON.stringify(r).includes('PRIVATE_ERROR'));assert.ok(!JSON.stringify(r).includes('/private/source'));assert.ok(!JSON.stringify(r).includes('sk-private'));validateDiagnostics(r.diagnostics);};
for(const [name,code,trigger,details] of [
 ['CLI failure',emit([...start,{type:'turn.failed',error:{message:'Invalid JSON schema: '+sentinel}}]),'cli_turn_failed',{eventType:'turn.failed',reportedErrorCategory:'invalid_schema'}],
 ['CLI error',emit([{type:'error',message:'Unauthorized '+sentinel}]),'cli_error',{eventType:'error',reportedErrorCategory:'authentication'}],
 ['unknown event',emit([...start,{type:sentinel,item:{type:sentinel,text:sentinel}}]),'unexpected_event',{eventType:'other',itemType:'other'}],
 ['known tool',emit([...start,{type:'item.started',item:{type:'command_execution',command:sentinel}}]),'unexpected_event',{eventType:'item.started',itemType:'command_execution'}],
 ['event order',emit([final]),'event_order',{eventType:'item.completed',itemType:'agent_message'}],
 ['final duplicate',emit([...start,final,final,end]),'result_shape',{eventType:'item.completed'}],
 ['malformed JSON',`process.stdout.write(${JSON.stringify(sentinel+'\n')});`,'invalid_json',{}],
 ['malformed UTF8','process.stdout.write(Buffer.from([255,10]));','invalid_utf8',{}],
 ['malformed event',emit([[]]),'invalid_event',{}],
 ['stderr',`process.stderr.write(${JSON.stringify('permission denied '+sentinel+'\n')});`,'unexpected_stderr',{reportedErrorCategory:'permission'}],
 ['missing thread','process.stdin.resume();','missing_thread',{}],
 ['missing turn',emit(start.slice(0,1)),'missing_turn',{}],
 ['missing terminal',emit([...start,final]),'missing_terminal',{}],
 ['nonzero',emit([...start,final,end])+'process.exitCode=7;','nonzero_exit',{exitCode:7,exitSignal:null,threadObserved:true,turnObserved:true}],
 ['signal',emit([...start,final,end])+'process.kill(process.pid,"SIGTERM");','signal_exit',{exitCode:null,exitSignal:'SIGTERM'}],
 ['output bound','process.stdout.write("x".repeat(600000));','output_limit',{}],
])test('safe diagnostic: '+name,async()=>{
 const r=await run(code);assert.notEqual(r.status,'candidate');assert.equal(r.candidate,null);assertPrivate(r);assert.equal(r.diagnostics.trigger,trigger,JSON.stringify(r));assert.equal(r.diagnostics.closeObserved,true);
 for(const [k,v] of Object.entries(details))assert.equal(r.diagnostics[k],v);
});
test('spawn ENOENT differs from permission denial; no false observed close',async()=>{
 for(const [executable,code,errno] of [['/nonexistent-synthetic-codex','codex_missing','ENOENT'],['/private/tmp','uncertain','EACCES']]){
  const r=await superviseCodexProcess({...launch(''),executable},Buffer.from('synthetic'));assert.equal(r.code,code);assert.equal(r.diagnostics.trigger,'spawn_failed');assert.equal(r.diagnostics.osErrorCode,errno);assert.equal(r.diagnostics.exitCode,null);assert.equal(r.diagnostics.closeObserved,false);assertPrivate(r);
 }
});
test('timeout and pre-cancel have explicit cause',async()=>{
 const r=await superviseCodexProcess(launch('setInterval(()=>{},100);'),Buffer.from('synthetic'),{timeoutMs:100});assert.equal(r.diagnostics.trigger,'deadline_exceeded');assert.equal(r.diagnostics.terminationRequested,true);assertPrivate(r);
 const c=new AbortController();c.abort();const x=await superviseCodexProcess(launch(''),Buffer.from('synthetic'),{signal:c.signal});assert.equal(x.diagnostics.trigger,'aborted');assert.equal(x.diagnostics.closeObserved,false);assert.equal(x.diagnostics.terminationRequested,false);
});
test('diagnostic schema rejects arbitrary text, added fields and accessors',()=>{
 for(const delta of [{eventType:sentinel},{itemType:sentinel},{reportedErrorCategory:sentinel},{osErrorCode:sentinel},{exitSignal:sentinel},{trigger:sentinel},{stage:sentinel},{stderr:sentinel},{exitCode:9},{closeObserved:true,exitCode:-1},{turnObserved:true}])assert.throws(()=>validateDiagnostics({...newDiagnostics(),...delta}));
 let read=false;const d=newDiagnostics();Object.defineProperty(d,'trigger',{enumerable:true,get(){read=true;return null;}});assert.throws(()=>validateDiagnostics(d));assert.equal(read,false);
 for(const [message,category] of [['HTTP 429 '+sentinel,'rate_limit'],['model_not_found '+sentinel,'model_unavailable'],['stream disconnected '+sentinel,'network'],[sentinel,'unknown']])assert.equal(reportedErrorCategory(message),category);
});
test('invalid source-bound result retains observed terminal/exit and exact prompt',async t=>{
 const x=await capturedFlow(t);x.f.result.findings[0].evidence[0].quote='FORGED';
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'uncertain');assert.equal(r.execution.errorCode,'source_mismatch');assert.equal(r.execution.terminalObserved,true);assert.equal(r.execution.diagnostics.trigger,'result_rejected');assert.equal(r.execution.diagnostics.stage,'result_validation');assert.equal(r.execution.diagnostics.exitCode,0);assert.equal(r.execution.cleanupComplete,true);assert.equal(r.execution.resultSha256,null);assert.equal((await x.exportPrompt()).promptText,x.exported.promptText);
 const d=await store.diagnoseCodexRun(x.scope,x.receipt.runId);assert.deepEqual(d.execution,r.execution);assert.equal(d.diagnosticAvailability,'recorded');assert.equal(x.calls(),1);
});
test('cleanup failure retains terminal and process exit facts',async t=>{
 const x=await capturedFlow(t),create=x.adapter.createLaunch;x.adapter.createLaunch=async()=>{const l=await create();const cleanup=l.cleanup;l.cleanup=async()=>{await cleanup();throw Error(sentinel);};return l;};
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'uncertain');assert.equal(r.execution.cleanupComplete,false);assert.equal(r.execution.terminalObserved,true);assert.equal(r.execution.diagnostics.trigger,'cleanup_failed');assert.equal(r.execution.diagnostics.exitCode,0);assert.equal(r.execution.resultSha256,null);
});
test('supervisor exception cannot claim unobserved cleanup',async t=>{
 const x=await capturedFlow(t),create=x.adapter.createLaunch;let l;x.adapter.createLaunch=async()=>l=await create();x.adapter.supervise=async()=>{throw Error(sentinel);};
 t.after(async()=>{await fs.rm(l.root,{recursive:true,force:true});});
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'uncertain');assert.equal(r.execution.cleanupComplete,false);assert.equal(r.execution.diagnostics.trigger,'supervisor_failed');await assert.rejects(store.forgetTask(x.scope,{apply:true}),{code:'busy'});assert.ok(!JSON.stringify(r).includes(sentinel));
});
test('preflight failure and publication failure expose correct local boundary',async t=>{
 const x=await capturedFlow(t);x.adapter.preflight=async()=>({ok:false,code:'login_required'});
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.execution.diagnostics.stage,'preflight');assert.equal(r.execution.diagnostics.trigger,'preflight_rejected');assert.equal(x.calls(),0);
 const y=await capturedFlow(t);const scope={...y.scope,onBoundary(n){if(n==='before_terminal_commit')throw Error(sentinel);}};
 const p=await executeCapturedWithAdapter(scope,y.receipt.runId,{},y.adapter);assert.equal(p.ok,false);assert.equal(p.diagnostics.trigger,'publication_failed');assert.equal(p.diagnostics.exitCode,0);assert.ok(!JSON.stringify(p).includes(sentinel));
});
test('late cancellation preserves terminal facts at publication',async t=>{
 const x=await capturedFlow(t),abort=new AbortController(),scope={...x.scope,onBoundary(n){if(n==='before_terminal_commit')abort.abort();}};
 const r=await executeCapturedWithAdapter(scope,x.receipt.runId,{signal:abort.signal},x.adapter);assert.equal(r.status,'cancelled');assert.equal(r.execution.terminalObserved,true);assert.equal(r.execution.diagnostics.trigger,'aborted');assert.equal(r.execution.diagnostics.stage,'publication');assert.equal(r.execution.diagnostics.exitCode,0);
});
test('legacy receipt inspection does not rewrite records, read prompt or permit replay',async t=>{
 const x=await capturedFlow(t);await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);
 const dir=privateDir(x),path=dir+'/'+x.receipt.runId+'.execution.json',original=JSON.parse(await fs.readFile(path,'utf8'));
 assert.equal(original.schemaVersion,2);const {diagnostics,...legacy}=original;legacy.schemaVersion=1;legacy.binaryVersion='0.141.0';validateExecutionRecord(legacy);assert.throws(()=>validateExecutionRecord({...legacy,binaryVersion:'0.999.0'}));
 assert.throws(()=>validateExecutionRecord({...legacy,diagnostics}));assert.throws(()=>validateExecutionRecord({...legacy,schemaVersion:2}));
 await fs.writeFile(path,JSON.stringify(legacy));await fs.unlink(dir+'/'+x.receipt.runId+'.snapshot.json');const before=await fs.readFile(path);
 const r=await store.diagnoseCodexRun(x.scope,x.receipt.runId);assert.equal(r.diagnosticAvailability,'not_recorded');assert.deepEqual(r.execution,legacy);assert.deepEqual(await fs.readFile(path),before);
 const repeated=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(repeated.ok,false);assert.equal(x.calls(),1);
 await assert.rejects(store.diagnoseCodexRun({...x.scope,taskId:'OtherTask'},x.receipt.runId));
 const cli=spawnSync(process.execPath,[x.root+'/installed/scripts/codex-review.mjs','diagnose'],{env:{PATH:'/usr/bin:/bin',HOME:x.root,CODEX_THREAD_ID:x.scope.conversationId,EVIDENCELENS_STATE_ROOT:x.scope.stateRoot},cwd:x.root+'/project',input:JSON.stringify({taskId:x.scope.taskId,runId:x.receipt.runId}),encoding:'utf8'});
 assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).diagnosticAvailability,'not_recorded');assert.ok(!cli.stdout.includes('promptText'));assert.deepEqual(await fs.readFile(path),before);
});
for(const mode of ['failed','429','500'])test('actual pinned CLI failure produces safe diagnostic with one synthetic request: '+mode,async()=>{
 const r=await protocolFixture(mode,{permitInstallationMetadata:true,useRunner:true});assert.notEqual(r.outcome.status,'candidate');assert.equal(r.requests.length,1);assert.ok(['cli_error','cli_turn_failed','unexpected_stderr'].includes(r.outcome.diagnostics.trigger),JSON.stringify(r.outcome));assertPrivate(r.outcome);assert.equal(r.authUnchanged,true);assert.equal(r.installationUnchanged,true);assert.equal(r.outsideUnchanged,true);
});

test('first CLI error survives later cancellation and is persisted without raw text',async t=>{
 const x=await capturedFlow(t),abort=new AbortController();
 x.adapter.supervise=async()=>{const r=await run(emit([...start,{type:'turn.failed',error:{message:'Invalid JSON schema '+sentinel}}]));abort.abort();return r;};
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{signal:abort.signal},x.adapter);assert.equal(r.status,'cancelled');assert.equal(r.execution.diagnostics.trigger,'cli_turn_failed');assert.equal(r.execution.diagnostics.reportedErrorCategory,'invalid_schema');
 for(const name of await fs.readdir(privateDir(x)))assert.ok(!(await fs.readFile(privateDir(x)+'/'+name,'utf8')).includes(sentinel));
 const d=await store.diagnoseCodexRun(x.scope,x.receipt.runId);assert.deepEqual(d.execution,r.execution);assert.equal(d.diagnosticAvailability,'recorded');
});
test('inspection distinguishes not-started/pending, rejects mixed terminal state and foreign CLI identity',async t=>{
 const x=await capturedFlow(t);assert.equal((await store.diagnoseCodexRun(x.scope,x.receipt.runId)).diagnosticAvailability,'not_started');await store.claimCodexRun(x.scope,x.receipt.runId);
 assert.equal((await store.diagnoseCodexRun(x.scope,x.receipt.runId)).diagnosticAvailability,'pending');
 const path=privateDir(x)+'/'+x.receipt.runId+'.execution.json',e=JSON.parse(await fs.readFile(path,'utf8'));e.status='failed';await fs.writeFile(path,JSON.stringify(e));await assert.rejects(store.diagnoseCodexRun(x.scope,x.receipt.runId),{code:'corrupt_record'});
 const r=spawnSync(process.execPath,[x.root+'/installed/scripts/codex-review.mjs','diagnose'],{env:{PATH:'/usr/bin:/bin',HOME:x.root,CODEX_THREAD_ID:x.scope.conversationId,EVIDENCELENS_STATE_ROOT:x.scope.stateRoot},cwd:x.root+'/project',input:JSON.stringify({taskId:x.scope.taskId,runId:x.receipt.runId,conversationId:'11111111-1111-1111-1111-111111111111'}),encoding:'utf8'});
 assert.equal(r.status,1);assert.equal(JSON.parse(r.stderr).code,'identity_required');assert.equal(r.stdout,'');
});
