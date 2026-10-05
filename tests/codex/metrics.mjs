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
