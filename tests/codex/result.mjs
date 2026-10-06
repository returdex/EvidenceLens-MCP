import test from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './helpers.mjs';
import {renderEvidenceCapsule} from '../../skills/assignment-review/scripts/codex-contract.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {validateBoundCodexResult} from '../../skills/assignment-review/scripts/codex-result.mjs';
function boundFixture(){const f=fixture();f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,f.admitted);f.snapshot.promptSha256=sha256(f.snapshot.promptText);return f;}
test('valid result binds locally; preserves limits independently of model omission',()=>{const {snapshot,result}=boundFixture();const r=validateBoundCodexResult(snapshot,JSON.stringify(result));assert.equal(r.promptSha256,snapshot.promptSha256);assert.ok(r.limitations.includes(snapshot.limitations[0]));assert.ok(r.limitations.some(x=>x.includes('Only captured excerpts')));assert.match(r.resultSha256,/^[0-9a-f]{64}$/);});
for(const [name,mutate] of Object.entries({wrongRun:f=>f.result.runId='00000000-0000-0000-0000-000000000000',wrongTask:f=>f.result.taskId='other',wrongCurrent:f=>f.result.currentSourceId=null,wrongSource:f=>f.result.findings[0].evidence[0].sourceId='other',wrongExcerpt:f=>f.result.findings[0].evidence[0].excerptId='other',forgedQuote:f=>f.result.findings[0].evidence[0].quote='B',badSpan:f=>f.result.findings[0].evidence[0].endByte=999,noCoverage:f=>f.result.coverage=[],falseCoverage:f=>f.result.coverage[0].excerptIds=[],unsupportedObservation:f=>f.result.findings[0].evidence=[],extraField:f=>f.result.auth='secret',excluded:f=>{f.snapshot.materials[0]={...f.snapshot.materials[0],status:'excluded',contentHash:null,hashKind:null,inspectedParts:[],observedAt:null,availability:'unavailable'};},changedHash:f=>f.snapshot.materials[0].contentHash='0'.repeat(64),duplicateFinding:f=>f.result.findings.push({...f.result.findings[0]}),wrongStage:f=>f.result.stage='preparation'}))test('reject '+name,()=>{const f=boundFixture();mutate(f);assert.throws(()=>validateBoundCodexResult(f.snapshot,f.result));});
test('zero findings and preparation without draft remain bounded',()=>{const f=fixture();for(const obj of [f.snapshot,f.capsule,f.result]){obj.currentSourceId=null;obj.stage='preparation';}f.snapshot.materials=[];f.capsule.sources=[];f.result.coverage=[];f.result.findings=[];f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,[]);f.snapshot.promptSha256=sha256(f.snapshot.promptText);const r=validateBoundCodexResult(f.snapshot,f.result);assert.ok(r.limitations.some(x=>x.includes('No current draft')));});
test('unknown without quote gets locally required limitation; malformed JSON never binds',()=>{const f=boundFixture();f.result.findings[0].kind='unknown';f.result.findings[0].evidence=[];assert.ok(validateBoundCodexResult(f.snapshot,f.result).limitations.some(x=>x.includes('unverified gap')));assert.throws(()=>validateBoundCodexResult(f.snapshot,'{broken'));});
test('UTF-8 quote ranges require complete code points',()=>{const f=boundFixture(),e=f.result.findings[0].evidence[0];Object.assign(e,{startByte:2,endByte:5,quote:'中'});assert.ok(validateBoundCodexResult(f.snapshot,f.result));e.endByte=4;assert.throws(()=>validateBoundCodexResult(f.snapshot,f.result),{code:'source_mismatch'});});
test('diagnostic baseline: v3 control separates presentation and trust failures',()=>{
 const f=boundFixture();f.result.schemaVersion=3;
 for(const e of f.result.findings[0].evidence){delete e.quote;delete e.startByte;delete e.endByte;}
 assert.equal(validateBoundCodexResult(f.snapshot,f.result).modelResponse.schemaVersion,1);
 const cases=[
  ['fence',()=> '```json\n'+JSON.stringify(f.result)+'\n```','result_invalid','json_syntax'],
  ['display',()=>({...structuredClone(f.result),heading:'Review'}),'result_invalid','fields'],
  ['reference',()=>{const r=structuredClone(f.result);r.findings[0].evidence[0].excerptId='foreign';return r;},'source_mismatch'],
  ['identity',()=>({...structuredClone(f.result),taskId:'foreign'}),'source_mismatch'],
  ['coverage',()=>({...structuredClone(f.result),coverage:[]}),'source_mismatch']
 ];
 for(const [name,make,code,reason] of cases)assert.throws(()=>validateBoundCodexResult(f.snapshot,make()),e=>{
  assert.equal(e.code,code,name);if(reason)assert.equal(e.validationFailure.reason,reason,name);
  else assert.ok(e.bindingTrigger,name);return true;
 });
});
