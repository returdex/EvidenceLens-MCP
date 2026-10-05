import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import { normalizeTerminalMetrics,createRunMetrics,validateRunMetrics } from '../../skills/assignment-review/scripts/codex-metrics.mjs';
import { executeCapturedWithAdapter,superviseCodexProcess } from '../../skills/assignment-review/scripts/codex-runner.mjs';
import { capturedFlow } from './helpers.mjs';
import { sha256 } from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';
const path=(x,kind='metrics')=>x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId)+'/'+x.receipt.runId+'.'+kind+'.json';
test('terminal telemetry distinguishes missing, zero, invalid, contradictory and private values',()=>{
 const usage=normalizeTerminalMetrics({type:'turn.completed',usage:{input_tokens:0,cached_input_tokens:1,output_tokens:'secret',reasoning_output_tokens:-1,secret:'PRIVATE'}});
 assert.equal(usage.input_tokens.value,0);assert.equal(usage.cached_input_tokens.reason,'inconsistent_breakdown');assert.equal(usage.output_tokens.state,'invalid');assert.ok(!JSON.stringify(usage).includes('PRIVATE'));
 for(const v of [-1,0.1,Number.MAX_SAFE_INTEGER+1,'12',null])assert.equal(normalizeTerminalMetrics({type:'turn.completed',usage:{input_tokens:v}}).input_tokens.state,'invalid');
 assert.equal(normalizeTerminalMetrics(null).eventType,null);assert.equal(normalizeTerminalMetrics({type:'turn.completed'}).input_tokens.state,'missing');
});
test('supervisor records only first accepted terminal and keeps it on later protocol failure',async()=>{
 const rows=[{type:'thread.started',thread_id:'synthetic'},{type:'turn.started'},{type:'item.completed',item:{type:'agent_message',text:'{}'}},{type:'turn.completed',usage:{input_tokens:3,output_tokens:2}},{type:'turn.completed',usage:{input_tokens:999}}];
 const r=await superviseCodexProcess({executable:process.execPath,args:['-e','process.stdout.write('+JSON.stringify(rows.map(JSON.stringify).join('\n')+'\n')+')'],env:{PATH:'/usr/bin:/bin'},cwd:'/private/tmp'},Buffer.from(''));
 assert.equal(r.status,'failed');assert.equal(r.metrics.input_tokens.value,3);assert.equal(r.terminalObserved,true);
});
test('actual metrics schema binds model request without asserting effective model',async t=>{
 const x=await capturedFlow(t);const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);
 const v=createRunMetrics(r.execution,{args:['-m','gpt-6.1-sol']});assert.equal(v.requestedModel.source,'local_launch_args');assert.equal(v.reportedModel,null);
 assert.throws(()=>validateRunMetrics({...v,reportedModel:'gpt-6.1-sol'}));assert.throws(()=>validateRunMetrics({...v,attemptId:x.receipt.runId}));
});
test('private metrics roundtrip preserves exports; failed result retains terminal observation',async t=>{
 for(const invalid of [false,true]){
  const x=await capturedFlow(t);if(invalid)x.f.result.findings[0].evidence[0].quote='wrong';
  const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);
  assert.equal(r.status,invalid?'uncertain':'succeeded');const saved=await store.readCodexMetrics(x.scope,x.receipt.runId);
  assert.equal(saved.availability,'recorded');assert.equal(saved.metrics.usage.eventType,'turn.completed');assert.equal(saved.metrics.input_tokens,undefined);
  assert.equal((await x.exportPrompt()).promptText,x.exported.promptText);
  assert.ok(!JSON.stringify(saved).includes('PRIVATE_REASONING'));
 }
});
test('old absent sidecar is unavailable; corrupt/foreign/link sidecars rejected',async t=>{
 const x=await capturedFlow(t);await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);
 const p=path(x),raw=JSON.parse(await fs.readFile(p,'utf8'));await fs.unlink(p);assert.equal((await store.readCodexMetrics(x.scope,x.receipt.runId)).availability,'not_recorded');
 for(const v of [{...raw,taskId:'other'},{...raw,metricsSha256:'0'.repeat(64)}]){await fs.writeFile(p,JSON.stringify(v),{mode:0o600});await assert.rejects(store.readCodexMetrics(x.scope,x.receipt.runId),{code:'corrupt_record'});await fs.unlink(p);}
 await fs.symlink('/dev/null',p);await assert.rejects(store.readCodexMetrics(x.scope,x.receipt.runId),{code:'unsafe_path'});
 const deleted=await store.forgetTask(x.scope,{apply:true});assert.equal(deleted.incomplete,true);assert.ok((await fs.lstat(p)).isSymbolicLink());
});
test('publication interruption remains busy; cancellation keeps observed usage',async t=>{
 const x=await capturedFlow(t);const r=await executeCapturedWithAdapter({...x.scope,onBoundary(n){if(n==='after_metrics')throw Error('crash');}},x.receipt.runId,{},x.adapter);
 assert.equal(r.ok,false);await assert.rejects(store.readCodexMetrics(x.scope,x.receipt.runId),{code:'busy'});
 const y=await capturedFlow(t),c=new AbortController();const cancelled=await executeCapturedWithAdapter({...y.scope,onBoundary(n){if(n==='before_terminal_commit')c.abort();}},y.receipt.runId,{signal:c.signal},y.adapter);
 assert.equal(cancelled.status,'cancelled');assert.equal((await store.readCodexMetrics(y.scope,y.receipt.runId)).metrics.usage.eventType,'turn.completed');
});
test('metrics retention includes failed run and preserves unknown files and other tasks',async t=>{
 const x=await capturedFlow(t);x.f.result.findings[0].evidence[0].quote='wrong';await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);
 const p=path(x),unknown=p+'.unrecognized';await fs.writeFile(unknown,'keep',{mode:0o600});assert.equal((await store.forgetTask(x.scope)).preservedUnknownCount,1);
 const r=await store.forgetTask(x.scope,{apply:true});assert.equal(r.incomplete,false);await assert.rejects(fs.stat(p),{code:'ENOENT'});assert.equal(await fs.readFile(unknown,'utf8'),'keep');
});
test('attempt/hash mismatch cannot be persisted and corrupt sidecar cannot be forgotten',async t=>{
 const x=await capturedFlow(t);await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);const p=path(x),raw=JSON.parse(await fs.readFile(p,'utf8'));
 for(const key of ['attemptId','binarySha256','promptSha256']){const {metricsSha256,...body}=raw;body[key]=key==='attemptId'?x.receipt.runId:'0'.repeat(64);await fs.writeFile(p,JSON.stringify({...body,metricsSha256:sha256(JSON.stringify(body))}),{mode:0o600});await assert.rejects(store.readCodexMetrics(x.scope,x.receipt.runId),{code:'corrupt_record'});}
 const r=await store.forgetTask(x.scope,{apply:true});assert.equal(r.incomplete,true);assert.ok(await fs.stat(path(x,'execution')));
});
