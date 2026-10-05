import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {capturedFlow,fixture,protocolFixture} from './helpers.mjs';
import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import * as store from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {collectBaselineSources} from '../../skills/assignment-review/scripts/baseline-sources.mjs';
import {validateBoundCodexResult} from '../../skills/assignment-review/scripts/codex-result.mjs';
import {renderEvidenceCapsule} from '../../skills/assignment-review/scripts/codex-contract.mjs';
for(const [name,options] of Object.entries({prepare:{stage:'preparation',current:false},check:{stage:'in_progress'},final:{stage:'final'},recheck:{stage:'in_progress',sourceId:'CurrentV2'}}))test(name+': positive owned adapter flow, exact export, scoped deletion and no raw retention',async t=>{
 const x=await capturedFlow(t,{...options,installed:true}),r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'succeeded',JSON.stringify(r));assert.equal(x.calls(),1);assert.equal(r.result.modelResponse.stage,options.stage);assert.equal(r.result.modelResponse.currentSourceId,options.current===false?null:options.sourceId??'S1');
 assert.equal((await x.exportPrompt()).promptText,x.exported.promptText);
 const dir=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId);const files=await fs.readdir(dir);for(const name of files){const text=await fs.readFile(dir+'/'+name,'utf8');assert.ok(!text.includes('PRIVATE_REASONING_SENTINEL'));assert.ok(!text.includes('codex_core::'));}
 await fs.writeFile(dir+'/foreign.txt','KEEP');const preview=await store.forgetTask(x.scope);assert.equal(preview.mode,'dry-run');assert.equal((await store.forgetTask(x.scope,{apply:true})).incomplete,false);assert.deepEqual(await fs.readdir(dir),['foreign.txt']);
});
test('competing runners send once; binding rejects forged quote without retry',async t=>{
 const x=await capturedFlow(t);x.f.result.findings[0].evidence[0].quote='FORGED';const r=await Promise.all([executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter),executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter)]);assert.equal(x.calls(),1);assert.ok(r.every(x=>x.status!=='succeeded'));assert.equal((await store.exportLatest(x.scope,{expectedRunId:x.receipt.runId})).metadata.status,'uncertain');
});
test('post-dispatch publication crash stays busy and preserves latest rather than success',async t=>{
 const x=await capturedFlow(t);const scope={...x.scope,onBoundary(n){if(n==='after_result')throw Error('synthetic crash');}};const r=await executeCapturedWithAdapter(scope,x.receipt.runId,{},x.adapter);assert.equal(r.ok,false);await assert.rejects(store.exportLatest(x.scope,{expectedRunId:x.receipt.runId}),{code:'busy'});assert.equal(x.calls(),1);
});
test('foreign execution symlink preserved after tombstone; no broad deletion',async t=>{
 const x=await capturedFlow(t);await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);const dir=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId),path=dir+'/'+x.receipt.runId+'.result.json';await fs.unlink(path);await fs.symlink('/dev/null',path);assert.equal((await store.forgetTask(x.scope,{apply:true})).incomplete,true);assert.ok((await fs.lstat(path)).isSymbolicLink());
});
test('excluded physical aliases are denied before read; unread current never selects accessible old draft',async t=>{
 const root=await fs.mkdtemp('/private/tmp/el20-alias-');t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(root+'/secret','EXCLUDED');await fs.link(root+'/secret',root+'/hard');await fs.symlink(root+'/secret',root+'/sym');
 const source=(id,documentId,kind,access='allowed')=>({id,documentId,kind,access,exclusion:'none'});
 const input={currentSourceId:'current',reviewMode:'artifact_only',sources:[source('brief','brief','requirements'),source('current','current','solution'),source('old','old','solution'),source('secret','denied','history','excluded'),source('hard','denied','support'),source('sym','denied','support')]};
 const reads=[];const r=await collectBaselineSources(input,async id=>{reads.push(id);if(id==='current')throw Error('unreadable');return id==='brief'?'Explain a reason':fs.readFile(root+'/'+id,'utf8');});assert.deepEqual(reads,['brief','current']);assert.equal(r.items.some(x=>x.id==='old'),false);
});
test('required runtime roots and temporary evidence overlap rejected before production dispatch',async()=>{
 const {createIsolatedLaunch}=await import('../../skills/assignment-review/scripts/codex-isolation.mjs');const {executableIdentity}=await import('../../skills/assignment-review/scripts/codex-preflight.mjs');const {randomUUID}=await import('node:crypto');const receipt={...await executableIdentity('/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex'),version:'0.160.0'};
 for(const root of ['/usr/lib','/private/tmp','/tmp'])await assert.rejects(createIsolatedLaunch({executableReceipt:receipt,runId:randomUUID(),evidenceRoots:[root]}),{code:'unsafe_path'});
});
for(const name of ['shell','mcp__synthetic__read','browser','spawn_agent','el-check'])test('actual CLI refuses unadvertised '+name+' before handler execution and recovers',async()=>{
 const r=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,tool:()=>({type:'function_call',id:'fc',call_id:'call',name,arguments:'{}'})});assert.equal(r.outcome.status,'candidate');assert.equal(r.outcome.diagnostics.refusedToolCalls,1);assert.equal(r.requests.length,2);assert.equal(r.outcome.cleanupComplete,true);assert.equal(r.authUnchanged,true);assert.equal(r.outsideUnchanged,true);assert.ok(!JSON.stringify(r.requests).includes(r.authSentinel));
});
test('unread current coverage cannot be repaired by an old source',()=>{
 const f=fixture();f.snapshot.materials[0]={...f.snapshot.materials[0],status:'unavailable',inspectedParts:[],observedAt:null,hashKind:null,contentHash:null,availability:'unavailable'};f.capsule.sources=[];f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,[]);f.snapshot.promptSha256=sha256(f.snapshot.promptText);assert.throws(()=>validateBoundCodexResult(f.snapshot,f.result));f.result.coverage[0]={sourceId:'S1',status:'unavailable',excerptIds:[]};f.result.findings=[];assert.ok(validateBoundCodexResult(f.snapshot,f.result).limitations.some(x=>x.includes('older drafts')));
});
test('launch cleanup failure remains uncertain and deletion busy with owned journal',async t=>{
 const x=await capturedFlow(t),root=await fs.mkdtemp('/private/tmp/evidencelens-codex-');t.after(()=>fs.rm(root,{recursive:true,force:true}));
 x.adapter.createLaunch=async()=>{const e=new Error('uncertain');Object.assign(e,{code:'uncertain',cleanupComplete:false,scratchRoot:root});throw e;};
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'uncertain');assert.equal(r.execution.cleanupComplete,false);assert.equal(x.calls(),0);await assert.rejects(store.forgetTask(x.scope,{apply:true}),{code:'busy'});
});

test('preflight cleanup uncertainty survives into terminal receipt and blocks deletion',async t=>{
 const x=await capturedFlow(t);x.adapter.preflight=async()=>({ok:false,code:'timed_out',cleanupComplete:false});
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'uncertain');assert.equal(r.execution.cleanupComplete,false);assert.equal(x.calls(),0);await assert.rejects(store.forgetTask(x.scope,{apply:true}),{code:'busy'});
});
