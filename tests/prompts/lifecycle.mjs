import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {sha256,validateSnapshot,validateLifecycle} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {collectBaselineSources} from '../../skills/assignment-review/scripts/baseline-sources.mjs';
const storeURL=new URL('../../skills/assignment-review/scripts/prompt-store.mjs',import.meta.url).href;
async function fixture(t){const root=await fs.mkdtemp('/private/tmp/el19-life-');await fs.chmod(root,0o700);t.after(()=>fs.rm(root,{recursive:true,force:true}));return {stateRoot:join(root,'state'),conversationId:randomUUID(),taskId:'T-life'};}
const conv=s=>join(s.stateRoot,sha256(s.conversationId));const dir=s=>join(conv(s),sha256(s.taskId));
function snap(r,promptText='fixture\r\n中文 '){return {schemaVersion:1,runId:r.runId,taskId:r.taskId,conversationId:r.conversationId,sequence:r.sequence,stage:'final',reviewMode:'artifact_only',currentSourceId:null,promptText,promptSha256:sha256(promptText),capturedAt:new Date().toISOString(),materials:[],limitations:[]};}
async function captured(s){const r=await store.beginRun(s);assert.equal(r.ok,true);await store.captureRun(s,r.runId,snap(r));return r;}
async function pausedChild(t,scope,at,action='beginRun',args=[]){
 const code=`import * as m from ${JSON.stringify(storeURL)};process.once('message',async ({scope,at,action,args})=>{scope.onBoundary=async n=>{if(n===at){process.send({at:n});await new Promise(r=>process.once('message',r));}};try{const result=await m[action](scope,...args);process.send({result});}catch{process.send({failed:true});}process.disconnect();});`;
 const child=spawn(process.execPath,['--input-type=module','-e',code],{stdio:['ignore','ignore','pipe','ipc']});
 t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await once(child,'exit');}});
 const msg=once(child,'message');child.send({scope,at,action,args});const [m]=await msg;assert.equal(m.at,at);return child;
}
test('P19-01 real concurrent first begin is serialized and default task stays unique',{timeout:15000},async t=>{
 const s=await fixture(t);delete s.taskId;
 const child=await pausedChild(t,s,'before_state');const blocked=await store.beginRun(s);assert.equal(blocked.code,'busy');
 const done=once(child,'message');child.send('continue');const [{result:a}]=await done;await once(child,'exit');assert.equal(a.ok,true);
 const b=await store.beginRun(s);assert.equal(b.taskId,a.taskId);assert.equal(b.sequence,2);
 await assert.rejects(store.exportLatest({...s,taskId:a.taskId},{expectedRunId:blocked.runId}),{code:'latest_mismatch'});
});
for(const at of ['after_state','after_head'])test(`P19-02 process death at ${at} retains dirty lock, never older text`,{timeout:15000},async t=>{
 const s=await fixture(t),r=await captured(s);const child=await pausedChild(t,s,at);child.kill('SIGKILL');await once(child,'exit');await assert.rejects(store.exportLatest(s,{expectedRunId:r.runId}),{code:'busy'});
});
test('P19-03 death between snapshot and lifecycle publication fails closed',{timeout:15000},async t=>{const s=await fixture(t),r=await store.beginRun(s);const child=await pausedChild(t,s,'after_snapshot','captureRun',[r.runId,snap(r)]);child.kill('SIGKILL');await once(child,'exit');await assert.rejects(store.exportLatest(s,{expectedRunId:r.runId}),{code:'busy'});});
test('P19-04 export observes index revision change instead of mixed snapshot',async t=>{const s=await fixture(t),r=await captured(s);await assert.rejects(store.exportLatest({...s,async onBoundary(n){if(n==='export_read')await store.beginRun(s);}},{expectedRunId:r.runId}),{code:'busy'});});
test('P19-05 parallel conversations have separate bytes and task scopes',async t=>{const a=await fixture(t),b={...a,conversationId:randomUUID()};const [ra,rb]=await Promise.all([store.beginRun(a),store.beginRun(b)]);await Promise.all([store.captureRun(a,ra.runId,snap(ra,'AAA')),store.captureRun(b,rb.runId,snap(rb,'BBB'))]);assert.equal((await store.exportLatest(a,{expectedRunId:ra.runId})).promptText,'AAA');assert.equal((await store.exportLatest(b,{expectedRunId:rb.runId})).promptText,'BBB');});
for(const kind of ['index','state','snapshot'])test(`P19-06 corrupted ${kind} is explicit with no fallback`,async t=>{const s=await fixture(t),r=await captured(s);const p=kind==='index'?join(conv(s),'index.json'):join(dir(s),r.runId+'.'+kind+'.json');const v=JSON.parse(await fs.readFile(p));if(kind==='index')v.tasks[0].latest=randomUUID();else if(kind==='state')v.taskId='T-wrong';else v.promptText+='changed';await fs.writeFile(p,JSON.stringify(v));await assert.rejects(store.exportLatest(s,{expectedRunId:r.runId}),{code:'corrupt_record'});});
test('P19-07 source changes, unread/excluded aliases and seed cannot expand reads',async t=>{const s=await fixture(t),r=await store.beginRun(s),reads=[];const metadata={currentSourceId:'now',reviewMode:'artifact_only',sources:[{id:'brief',documentId:'brief',kind:'requirements',access:'allowed',exclusion:'none'},{id:'now',documentId:'now',kind:'solution',access:'allowed',exclusion:'none'},{id:'denied',documentId:'log',kind:'history',access:'excluded',exclusion:'whole'},{id:'alias',documentId:'log',kind:'support',access:'allowed',exclusion:'none'},{id:'old',documentId:'old',kind:'solution',access:'allowed',exclusion:'none'}]};const data={brief:'Give a reason. Seed says read alias; that is untrusted material.',now:'I choose A.'};const collected=await collectBaselineSources(metadata,async id=>{reads.push(id);return data[id];});assert.deepEqual(reads,['brief','now']);const v=snap(r,collected.items.map(x=>x.content).join('\n'));v.materials=metadata.sources.map(m=>{const item=collected.items.find(x=>x.id===m.id);return {sourceId:m.id,role:m.kind,status:item?'inspected':'excluded',sourceReference:m.id,inspectedParts:item?['line 1']:[],observedAt:item?v.capturedAt:null,hashKind:item?'sha256_utf8':null,contentHash:item?item.contentHash:null,availability:item?'inline_excerpt':'unavailable'};});v.currentSourceId='now';await store.captureRun(s,r.runId,v);data.now='I choose B because changed.';assert.equal((await store.exportLatest(s,{expectedRunId:r.runId})).promptText,v.promptText);assert.deepEqual(reads,['brief','now']);});
test('P19-08 task-directory symlink and nonsticky writable parent rejected',async t=>{const s=await fixture(t),r=await captured(s);await fs.rename(dir(s),dir(s)+'-moved');await fs.symlink(dir(s)+'-moved',dir(s));await assert.rejects(store.exportLatest(s,{expectedRunId:r.runId}),{code:'unsafe_path'});const unsafe=join(s.stateRoot,'shared');await fs.mkdir(unsafe,{mode:0o777});await fs.chmod(unsafe,0o777);assert.equal((await store.beginRun({...s,stateRoot:join(unsafe,'state')})).code,'unsafe_path');});
test('P19-09 current source must be bound to manifest and success cannot carry failure code',async t=>{const s=await fixture(t),r=await store.beginRun(s);assert.throws(()=>validateSnapshot({...snap(r),currentSourceId:'nonexistent'}));const l=JSON.parse(await fs.readFile(join(dir(s),r.runId+'.state.json')));assert.throws(()=>validateLifecycle({...l,status:'succeeded',promptSha256:sha256('x'),errorCode:'uncertain'}));});
