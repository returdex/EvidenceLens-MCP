import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,capturedFlow,protocolFixture} from './helpers.mjs';
import {prepareReferenceCapsule,renderEvidenceCapsule,boundModelReferenceSchema,validateReferenceResultShape,parseEvidenceCapsule} from '../../skills/assignment-review/scripts/codex-contract.mjs';
import {validateBoundCodexResult} from '../../skills/assignment-review/scripts/codex-result.mjs';
import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
function bound(text='重复 中文🙂\r\n重复\t"quoted" — café'){
 const f=fixture();f.admitted[0].text=text;f.snapshot.materials[0].contentHash=f.capsule.sources[0].sourceHash=sha256(text);
 Object.assign(f.capsule.sources[0].excerpts[0],{text,startByte:0,endByte:Buffer.byteLength(text),excerptSha256:sha256(text)});
 f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,f.admitted);f.snapshot.promptSha256=sha256(f.snapshot.promptText);
 f.result.schemaVersion=3;f.result.findings[0].evidence=[{sourceId:'S1',excerptId:'E1'}];return f;
}
test('v3 selects a captured excerpt; local code supplies exact Unicode/whitespace/duplicate text',()=>{
 const f=bound(),before=JSON.stringify(f.result),r=validateBoundCodexResult(f.snapshot,f.result),e=r.modelResponse.findings[0].evidence[0];
 assert.equal(e.quote,f.admitted[0].text);assert.equal(e.startByte,0);assert.equal(e.endByte,Buffer.byteLength(e.quote));assert.equal(r.modelResponse.schemaVersion,1);
 assert.equal(JSON.stringify(f.result),before);assert.deepEqual(validateBoundCodexResult(f.snapshot,r.modelResponse),r);
});
for(const [name,change,trigger] of [
 ['foreign source',f=>f.result.findings[0].evidence[0].sourceId='Foreign','binding_reference_mismatch'],
 ['foreign excerpt',f=>f.result.findings[0].evidence[0].excerptId='Foreign','binding_reference_mismatch'],
 ['missing coverage',f=>f.result.coverage=[],'binding_coverage_mismatch'],
 ['duplicate reference',f=>f.result.findings[0].evidence.push({...f.result.findings[0].evidence[0]}),'binding_duplicate_evidence'],
 ['missing observation evidence',f=>f.result.findings[0].evidence=[],'binding_missing_evidence'],
])test('reference rejection: '+name,()=>{const f=bound();change(f);assert.throws(()=>validateBoundCodexResult(f.snapshot,f.result),{code:'source_mismatch',bindingTrigger:trigger});});
test('v3 rejects model quote/byte overrides instead of repairing them',()=>{
 for(const delta of [{quote:'FORGED'},{startByte:0},{endByte:1}]){const f=bound();Object.assign(f.result.findings[0].evidence[0],delta);assert.throws(()=>validateReferenceResultShape(f.result),{code:'result_invalid'});}
});
test('split long Unicode excerpts preserves every original byte, range, locator and hash binding',()=>{
 const f=bound(('header 中文🙂\r\n'+'X'.repeat(400)+'\n').repeat(30));
 const prepared=prepareReferenceCapsule(f.capsule),pieces=prepared.sources[0].excerpts;
 assert.ok(pieces.length>1);assert.equal(pieces.map(e=>e.text).join(''),f.admitted[0].text);
 for(let i=0;i<pieces.length;i++){
  assert.ok(Buffer.byteLength(pieces[i].text)<=4096);assert.equal(pieces[i].excerptSha256,sha256(pieces[i].text));assert.equal(pieces[i].locator,f.capsule.sources[0].excerpts[0].locator);
  if(i)assert.equal(pieces[i].startByte,pieces[i-1].endByte);
 }
 f.snapshot.promptText=renderEvidenceCapsule(prepared,f.snapshot,f.admitted);f.snapshot.promptSha256=sha256(f.snapshot.promptText);
 assert.deepEqual(parseEvidenceCapsule(f.snapshot),prepared);
 f.result.coverage[0].excerptIds=pieces.map(e=>e.excerptId);f.result.findings[0].evidence[0].excerptId=pieces.at(-1).excerptId;
 assert.equal(validateBoundCodexResult(f.snapshot,f.result).modelResponse.findings[0].evidence[0].startByte,pieces.at(-1).startByte);
});
test('splitting fails before dispatch on ID collisions or excerpt budget overflow',()=>{
 const f=bound('X'.repeat(4097)),id='E'+sha256('S1\nE1').slice(0,16)+'_p1';
 f.capsule.sources[0].excerpts.push({...f.capsule.sources[0].excerpts[0],excerptId:id});assert.throws(()=>prepareReferenceCapsule(f.capsule),{code:'source_mismatch'});
 const long=bound(('X'.repeat(2048)+'\n'+'Y'.repeat(2048)+'\n').repeat(60));assert.throws(()=>prepareReferenceCapsule(long.capsule),{code:'source_mismatch'});
});
test('bound schema fixes identity and allows only captured source/excerpt pairs',()=>{
 const f=bound();f.snapshot.materials.push({...f.snapshot.materials[0],sourceId:'S2',role:'requirements'});f.capsule.sources.push({...f.capsule.sources[0],sourceId:'S2',excerpts:[{...f.capsule.sources[0].excerpts[0],excerptId:'E2'}]});f.admitted.push({sourceId:'S2',text:f.admitted[0].text});
 f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,f.admitted);f.snapshot.promptSha256=sha256(f.snapshot.promptText);
 const schema=boundModelReferenceSchema(f.snapshot),branches=schema.properties.findings.items.properties.evidence.items.anyOf;
 assert.deepEqual(schema.properties.runId.enum,[f.snapshot.runId]);assert.deepEqual(schema.properties.stage.enum,['in_progress']);assert.deepEqual(branches.map(b=>[b.properties.sourceId.enum,b.properties.excerptId.enum]),[[['S1'],['E1']],[['S2'],['E2']]]);
});
test('installed capture and terminal publication use reference-only output and compatible storage',async t=>{
 const x=await capturedFlow(t,{installed:true});x.f.result.schemaVersion=3;x.f.result.findings[0].evidence=[{sourceId:'S1',excerptId:'E1'}];
 assert.ok(x.exported.promptText.includes('<evidencelens-output-v3>'));
 const r=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(r.status,'succeeded');assert.equal(x.calls(),1);assert.equal(r.execution.cleanupComplete,true);assert.equal(r.result.modelResponse.findings[0].evidence[0].quote,x.f.content);
});
test('actual pinned CLI accepts per-run source/identity enums and reference-only candidate',async()=>{
 const f=bound(),schema=boundModelReferenceSchema(f.snapshot);
 const r=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,referenceOnly:true,outputSchema:schema,responseResult:f.result});
 assert.equal(r.outcome.status,'candidate',JSON.stringify(r.outcome));assert.equal(r.requests.length,1);assert.equal(JSON.parse(r.outcome.candidate).schemaVersion,3);
 const request=JSON.stringify(r.requests[0].body);assert.ok(request.includes(f.snapshot.runId));assert.ok(request.includes('"enum":[3]'));assert.equal(r.outcome.cleanupComplete,true);assert.ok(validateBoundCodexResult(f.snapshot,r.outcome.candidate));
});
