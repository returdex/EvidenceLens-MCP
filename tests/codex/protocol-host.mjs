import test from 'node:test';
import assert from 'node:assert/strict';
import { protocolFixture } from './helpers.mjs';
const diagnostic={permitInstallationMetadata:true};
const events=r=>r.stdout.trim().split('\n').filter(Boolean).map(JSON.parse);
const usable=r=>{assert.equal(r.timedOut,false);assert.equal(r.overflow,false);assert.equal(r.authUnchanged,true);assert.equal(r.outsideUnchanged,true);};

test('diagnostic metadata exception: actual binary completes synthetic schema output with fixed tools and no ambient context',async t=>{
 const r=await protocolFixture('success',diagnostic);usable(r);assert.equal(r.exitCode,0);assert.equal(r.requests.length,1);
 assert.deepEqual(r.requests[0].body.tools.map(x=>x.name??x.type).sort(),['apply_patch','request_user_input','update_plan','view_image']);
 assert.ok(!JSON.stringify(r.requests).includes(r.ambient));assert.ok(!JSON.stringify(r.requests).includes(r.authSentinel));
 assert.deepEqual(JSON.parse(events(r).find(x=>x.item?.type==='agent_message').item.text),r.result);
 assert.equal(events(r).at(-1).type,'turn.completed');
 t.diagnostic('Diagnostic only; metadata writes allowed. Policy template SHA256 '+r.policySha256);
});
for(const mode of ['429','500','disconnect','truncated','failed'])test('diagnostic '+mode+': one model request, terminal failure, no retry',async()=>{
 const r=await protocolFixture(mode,diagnostic);usable(r);assert.equal(r.requests.length,1);assert.equal(r.exitCode,1);assert.equal(events(r).at(-1).type,'turn.failed');
});
for(const name of ['view_image','apply_patch','request_user_input','update_plan'])test('forced '+name+': observe actual tool boundary and internal continuation',async t=>{
 const r=await protocolFixture('success',{...diagnostic,tool:({auth,outside})=>name==='apply_patch'?{type:'custom_tool_call',id:'ct_1',call_id:'call_fixture',name,input:'*** Begin Patch\n*** Delete File: '+outside+'\n*** End Patch'}:{type:'function_call',id:'fc_1',call_id:'call_fixture',name,arguments:JSON.stringify(name==='view_image'?{path:auth}:name==='update_plan'?{plan:[{step:'synthetic',status:'in_progress'}]}:{questions:[{id:'q',header:'Test',question:'synthetic?',options:[{label:'A',description:'A'},{label:'B',description:'B'}]}]})}});
 usable(r);assert.equal(r.requests.length,2);assert.equal(r.exitCode,0);
 const outputs=r.requests[1].body.input.filter(x=>x.type.endsWith('_output'));assert.equal(outputs.length,1);
 assert.ok(!JSON.stringify(outputs).includes(r.authSentinel));assert.ok(!JSON.stringify(outputs).includes('OUTSIDE_SYNTHETIC_SENTINEL_20'));
 if(name==='update_plan')assert.ok(events(r).some(x=>x.item?.type==='todo_list'));
 else {assert.ok(r.stderr.includes('codex_core::tools::router'));assert.ok(!events(r).some(x=>['tool_call','file_change','command_execution'].includes(x.item?.type)));}
 t.diagnostic('No supervisor used: two internal requests; '+name+' JSONL visibility '+(name==='update_plan'?'todo_list':'absent; stderr error only')+'. This does not pass runtime abort acceptance.');
});
