import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,capturedFlow,protocolFixture} from './helpers.mjs';
import {renderEvidenceCapsule,renderCodexOutputGuide,validateCitationResultShape,validateResultEnvelope} from '../../skills/assignment-review/scripts/codex-contract.mjs';
import {validateBoundCodexResult} from '../../skills/assignment-review/scripts/codex-result.mjs';
import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {diagnosticBindingTrigger} from '../../skills/assignment-review/scripts/codex-diagnostics.mjs';

function bound(content='Before 中文🙂 café\r\nAfter'){
 const f=fixture(),source=f.capsule.sources[0],excerpt=source.excerpts[0];
 f.admitted[0].text=content;f.snapshot.materials[0].contentHash=source.sourceHash=sha256(content);
 Object.assign(excerpt,{text:content,startByte:0,endByte:Buffer.byteLength(content),excerptSha256:sha256(content)});
 f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,f.admitted);f.snapshot.promptSha256=sha256(f.snapshot.promptText);
 f.result.schemaVersion=2;f.result.findings[0].evidence=[{sourceId:'S1',excerptId:'E1',quote:'中文🙂 café\r\n'}];return f;
}
test('quote-only Unicode citation resolves exact bytes and persists a compatible v1 envelope',()=>{
 const f=bound(),input=JSON.stringify(f.result),r=validateBoundCodexResult(f.snapshot,input),e=r.modelResponse.findings[0].evidence[0];
 assert.equal(e.startByte,Buffer.byteLength('Before '));assert.equal(e.endByte,e.startByte+Buffer.byteLength(e.quote));
 assert.equal(r.modelResponse.schemaVersion,1);assert.deepEqual(validateResultEnvelope(r),r);assert.equal(JSON.stringify(f.result),input);
 assert.deepEqual(validateBoundCodexResult(f.snapshot,r.modelResponse),r);
});
test('quote resolution uses source-relative excerpt offsets and the specified excerpt only',()=>{
 const f=bound('prefix\nBefore 中文🙂 café\r\nAfter'),source=f.capsule.sources[0],excerpt=source.excerpts[0];
 excerpt.startByte=7;excerpt.text=excerpt.text.slice(7);excerpt.endByte=7+Buffer.byteLength(excerpt.text);excerpt.excerptSha256=sha256(excerpt.text);
 f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,f.admitted);f.snapshot.promptSha256=sha256(f.snapshot.promptText);
 const e=validateBoundCodexResult(f.snapshot,f.result).modelResponse.findings[0].evidence[0];assert.equal(e.startByte,14);
 f.result.findings[0].evidence[0].quote='prefix';assert.throws(()=>validateBoundCodexResult(f.snapshot,f.result),{code:'source_mismatch',bindingTrigger:'binding_quote_missing'});
});
for(const [name,mutate,trigger] of [
 ['changed quote',f=>f.result.findings[0].evidence[0].quote='中文🙂 CAFE','binding_quote_missing'],
 ['changed whitespace',f=>f.result.findings[0].evidence[0].quote='中文🙂 café\n','binding_quote_missing'],
 ['empty quote',f=>f.result.findings[0].evidence[0].quote='','binding_quote_missing'],
 ['foreign source',f=>f.result.findings[0].evidence[0].sourceId='Foreign','binding_reference_mismatch'],
 ['foreign excerpt',f=>f.result.findings[0].evidence[0].excerptId='Foreign','binding_reference_mismatch'],
 ['wrong identity',f=>f.result.taskId='Foreign','binding_identity_mismatch'],
 ['missing coverage',f=>f.result.coverage=[],'binding_coverage_mismatch'],
 ['wrong covered excerpts',f=>f.result.coverage[0].excerptIds=[],'binding_excerpt_mismatch'],
 ['unavailable evidence',f=>{f.result.coverage[0].status='unavailable';f.result.coverage[0].excerptIds=[];},'binding_reference_mismatch'],
 ['empty observation',f=>f.result.findings[0].evidence=[],'binding_missing_evidence'],
 ['duplicate evidence',f=>f.result.findings[0].evidence.push({...f.result.findings[0].evidence[0]}),'binding_duplicate_evidence'],
])test('quote-only rejection: '+name,()=>{const f=bound();mutate(f);assert.throws(()=>validateBoundCodexResult(f.snapshot,f.result),{code:'source_mismatch',bindingTrigger:trigger});});
test('ambiguous and overlapping quotes cannot bind; a longer unique quote can',()=>{
 for(const [content,quote] of [['repeat repeat','repeat'],['aaa','aa']]){
  const f=bound(content);f.result.findings[0].evidence[0].quote=quote;
  assert.throws(()=>validateBoundCodexResult(f.snapshot,f.result),{code:'source_mismatch',bindingTrigger:'binding_quote_ambiguous'});
  f.result.findings[0].evidence[0].quote=content;assert.ok(validateBoundCodexResult(f.snapshot,f.result));
 }
});
test('numeric overrides and mixed evidence shapes in v2 are rejected; legacy v1 stays strict',()=>{
 const f=bound();f.result.findings[0].evidence[0].startByte=0;assert.throws(()=>validateCitationResultShape(f.result),{code:'result_invalid'});
 const old=fixture();old.snapshot.promptText=renderEvidenceCapsule(old.capsule,old.snapshot,old.admitted);old.snapshot.promptSha256=sha256(old.snapshot.promptText);
 old.result.findings[0].evidence[0].startByte=1;old.result.findings[0].evidence[0].endByte=2;
 assert.throws(()=>validateBoundCodexResult(old.snapshot,old.result),{code:'source_mismatch',bindingTrigger:'binding_quote_mismatch'});
});
test('capture generates actual identity and complete source mapping; export preserves it exactly',async t=>{
 const x=await capturedFlow(t,{installed:true}),p=x.exported.promptText;
 const open='<evidencelens-output-v2>',close='</evidencelens-output-v2>',guide=p.slice(p.indexOf(open)+open.length,p.indexOf(close));
 const data=JSON.parse(guide.trim().split('\n').at(-1));
 assert.equal(data.runId,x.receipt.runId);assert.equal(data.taskId,x.scope.taskId);assert.equal(data.currentSourceId,'S1');assert.deepEqual(data.coverage,x.f.result.coverage);
 assert.equal((await x.exportPrompt()).promptText,p);
 const unavailable=fixture();unavailable.snapshot.materials[0]={...unavailable.snapshot.materials[0],status:'unavailable',inspectedParts:[],observedAt:null,hashKind:null,contentHash:null,availability:'unavailable'};unavailable.capsule.sources=[];
 assert.ok(renderCodexOutputGuide(unavailable.snapshot,unavailable.capsule).includes('"status":"unavailable","excerptIds":[]'));
});
test('v2 production flow stores calculated spans; rejected quotes preserve specific safe diagnostics',async t=>{
 for(const forged of [false,true]){
  const x=await capturedFlow(t,{installed:true});x.f.result.schemaVersion=2;
  for(const e of x.f.result.findings[0].evidence){delete e.startByte;delete e.endByte;if(forged)e.quote='PRIVATE_UNTRUSTED_SENTINEL';}
  const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(x.calls(),1);assert.equal(r.execution.cleanupComplete,true);assert.equal(r.execution.terminalObserved,true);assert.equal(r.execution.diagnostics.exitCode,0);
  if(forged){assert.equal(r.status,'uncertain');assert.equal(r.execution.diagnostics.trigger,'binding_quote_missing');assert.equal(r.execution.resultSha256,null);assert.ok(!JSON.stringify(r).includes('PRIVATE_UNTRUSTED_SENTINEL'));}
  else {assert.equal(r.status,'succeeded');assert.equal(r.result.modelResponse.schemaVersion,1);assert.equal(r.result.modelResponse.findings[0].evidence[0].startByte,0);}
 }
 assert.equal(diagnosticBindingTrigger('PRIVATE_UNTRUSTED_SENTINEL'),'result_rejected');
});
test('actual pinned CLI accepts quote-only output schema and returns a supervised terminal candidate',async()=>{
 const r=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,citationOnly:true});
 assert.equal(r.outcome.status,'candidate',JSON.stringify(r.outcome));assert.equal(r.outcome.cleanupComplete,true);assert.equal(r.requests.length,1);
 assert.deepEqual(JSON.parse(r.outcome.candidate),r.result);assert.equal(r.result.schemaVersion,2);
 const request=JSON.stringify(r.requests[0].body);assert.ok(request.includes('"schemaVersion"'));assert.ok(request.includes('"enum":[2]'));
});
