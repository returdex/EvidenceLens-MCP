import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {superviseCodexProcess} from '../../skills/assignment-review/scripts/codex-runner.mjs';
const event=x=>JSON.stringify(x)+'\n';
const start=[{type:'thread.started',thread_id:'synthetic'},{type:'turn.started'}];
const final={type:'item.completed',item:{type:'agent_message',text:'{"synthetic":true}'}};
const end={type:'turn.completed',usage:{input_tokens:1,output_tokens:1}};
const launch=code=>({executable:process.execPath,args:['--input-type=module','-e',code],env:{PATH:'/usr/bin:/bin',CODEX_HOME:'/synthetic'},cwd:'/private/tmp'});
const emit=rows=>`process.stdout.write(${JSON.stringify(rows.map(event).join(''))});`;
const run=(code,opts={})=>superviseCodexProcess(launch(code),Buffer.from('  中文\r\n'),opts);
test('positive process sequence preserves exact stdin bytes and returns candidate only',async()=>{
 const bytes=Buffer.from('  中文\r\n');const code=`import {createHash} from 'node:crypto';let chunks=[];for await(const c of process.stdin)chunks.push(c);${emit(start)}process.stdout.write(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({hash:createHash('sha256').update(Buffer.concat(chunks)).digest('hex')})}})+'\\n');${emit([end])}`;
 const r=await run(code);assert.equal(r.status,'candidate');assert.equal(r.cleanupComplete,true);assert.equal(JSON.parse(r.candidate).hash,createHash('sha256').update(bytes).digest('hex'));
});
for(const [name,rows] of Object.entries({missingTerminal:[...start,final],doubleFinal:[...start,final,final,end],doubleTurn:[...start,{type:'turn.started'},final,end],failure:[...start,{type:'turn.failed',error:{message:'secret'}}],tool:[...start,{type:'item.started',item:{type:'todo_list'}}],trailing:[...start,final,end,final],badOrder:[final,end]}))test('reject '+name,async()=>{const r=await run(emit(rows));assert.notEqual(r.status,'candidate');assert.equal(r.candidate,null);assert.equal(r.cleanupComplete,true);});
test('nonzero exit and malformed/oversized/UTF-8 output cannot succeed',async()=>{
 for(const code of [emit([...start,final,end])+'process.exitCode=1;','process.stdout.write("invalid\\n");','process.stdout.write(Buffer.from([255,10]));','process.stdout.write("x".repeat(600000));',emit([...start,final,end])+'process.stderr.write("UNRECOGNIZED PRIVATE TEXT\\n");']){const r=await run(code);assert.notEqual(r.status,'candidate');assert.equal(r.candidate,null);assert.equal(r.cleanupComplete,true);}
});
test('stderr tool detection catches split chunks and aborts',async()=>{
 const r=await run(emit(start)+'process.stderr.write("codex_core::tools::");setTimeout(()=>process.stderr.write("router: SECRET\\n"),10);setInterval(()=>{},100);');assert.equal(r.status,'uncertain');assert.equal(r.cleanupComplete,true);assert.equal(r.candidate,null);
});
test('timeout and cancellation reap a stubborn process',async()=>{
 const code='process.on("SIGTERM",()=>{});setInterval(()=>{},100);';
 const r=await run(code,{timeoutMs:120});assert.equal(r.code,'timed_out');assert.equal(r.cleanupComplete,true);
 const c=new AbortController();setTimeout(()=>c.abort(),120);const x=await run(code,{signal:c.signal});assert.equal(x.status,'cancelled');assert.equal(x.cleanupComplete,true);
});
test('owned process-group descendant is killed and confirmed absent',async()=>{
 const code='import {spawn} from "node:child_process";process.on("SIGTERM",()=>{});spawn(process.execPath,["-e",\'process.on("SIGTERM",()=>{});setInterval(()=>{},100)\'],{stdio:"inherit"});setInterval(()=>{},100);';
 const r=await run(code,{timeoutMs:150});assert.equal(r.code,'timed_out');assert.equal(r.cleanupComplete,true);
});
test('pre-aborted signal sends no input or process request',async()=>{const c=new AbortController();c.abort();const r=await run('throw Error("must not execute")',{signal:c.signal});assert.equal(r.status,'cancelled');assert.equal(r.cleanupComplete,true);});

test('actual pinned CLI fixture passes production supervisor without model inference',async()=>{
 const {protocolFixture}=await import('./helpers.mjs');const r=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true});
 assert.equal(r.outcome.status,'candidate',JSON.stringify(r.outcome));assert.equal(r.outcome.cleanupComplete,true);assert.deepEqual(JSON.parse(r.outcome.candidate),r.result);assert.equal(r.requests.length,1);
});
test('actual pinned CLI hidden native tool call is rejected by production supervisor',async()=>{
 const {protocolFixture}=await import('./helpers.mjs');const r=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,tool:({auth})=>({type:'function_call',id:'fc',call_id:'call',name:'view_image',arguments:JSON.stringify({path:auth})})});
 assert.equal(r.outcome.status,'uncertain');assert.equal(r.outcome.cleanupComplete,true);assert.equal(r.outcome.candidate,null);assert.ok(!JSON.stringify(r.requests).includes(r.authSentinel));
});


test('only exact cache TTL miss is tolerated; model failures and changed cache diagnostics still stop',async()=>{
 const prefix='2026-10-05T00:00:00Z ERROR codex_models_manager::manager: ';
 const code=message=>emit(start)+`process.stderr.write(${JSON.stringify(prefix+message+'\n')});`+emit([final,end]);
 const allowed=await run(code('failed to renew cache TTL: cache not found'));
 assert.equal(allowed.status,'candidate');assert.equal(allowed.terminalObserved,true);assert.equal(allowed.cleanupComplete,true);
 for(const message of ['failed to renew cache TTL: unexpected private failure','failed to renew cache TTL: cache not found EXTRA','failed to renew cache TTL: Operation not permitted (os error 1)','model_not_found PRIVATE_SENTINEL']){
  const rejected=await run(code(message));assert.notEqual(rejected.status,'candidate');assert.equal(rejected.candidate,null);assert.equal(rejected.diagnostics.trigger,'unexpected_stderr');assert.equal(rejected.cleanupComplete,true);assert.ok(!JSON.stringify(rejected).includes('PRIVATE_SENTINEL'));
 }
});
