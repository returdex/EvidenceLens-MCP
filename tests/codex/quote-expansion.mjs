import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,capturedFlow} from './helpers.mjs';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {renderEvidenceCapsule,validateReferenceResultShape,validateCodexResultShape,validateBoundResultShape,CODEX_LIMITS} from '../../skills/assignment-review/scripts/codex-contract.mjs';
import {validateBoundCodexResult} from '../../skills/assignment-review/scripts/codex-result.mjs';
import {executeCapturedWithAdapter} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import {readRunRecord} from '../../skills/assignment-review/scripts/prompt-store.mjs';
function longFixture(){const f=fixture();f.content='引用证据'.repeat(340);f.admitted[0].text=f.content;f.snapshot.materials[0].contentHash=f.capsule.sources[0].sourceHash=sha256(f.content);Object.assign(f.capsule.sources[0].excerpts[0],{text:f.content,excerptSha256:sha256(f.content),endByte:Buffer.byteLength(f.content)});f.snapshot.promptText=renderEvidenceCapsule(f.capsule,f.snapshot,f.admitted);f.snapshot.promptSha256=sha256(f.snapshot.promptText);f.result.schemaVersion=3;f.result.findings=Array.from({length:70},(_,i)=>({...f.result.findings[0],findingId:'F'+i,evidence:[{sourceId:'S1',excerptId:'E1'}]}));return f;}
test('small model reply expands above wire cap without losing quotes, findings or stored roundtrip',()=>{
 const f=longFixture();validateReferenceResultShape(f.result);const r=validateBoundCodexResult(f.snapshot,JSON.stringify(f.result));assert.ok(Buffer.byteLength(JSON.stringify(r.modelResponse))>CODEX_LIMITS.final);assert.equal(r.modelResponse.findings.length,70);assert.equal(r.modelResponse.findings[69].evidence[0].quote,f.content);assert.deepEqual(validateBoundCodexResult(f.snapshot,r.modelResponse),r);
 assert.throws(()=>validateCodexResultShape(r.modelResponse));
 const forged=structuredClone(r.modelResponse);forged.findings[0].evidence[0].quote='forged';assert.throws(()=>validateBoundCodexResult(f.snapshot,forged),{code:'source_mismatch'});
});
test('expanded cap and original compact claim/action budget remain bounded',()=>{
 const f=longFixture();f.result.findings=Array.from({length:100},(_,i)=>({...f.result.findings[0],findingId:'F'+i,claim:'x'.repeat(3000)}));assert.throws(()=>validateReferenceResultShape(f.result));
 const good=longFixture(),r=validateBoundCodexResult(good.snapshot,good.result).modelResponse;
 // Three distinct sources can safely express separate references, but quotes still have a bounded stored cap.
 for(const finding of r.findings)finding.evidence=[...finding.evidence,...Array.from({length:4},(_,i)=>({...finding.evidence[0],sourceId:'S'+(i+2)}))];assert.throws(()=>validateBoundResultShape(r));
});
test('actual runner/store accepts expanded local result and historical reader rebinds original bytes',async t=>{
 const x=await capturedFlow(t,{transform(f){const q='引文'.repeat(680);f.admitted[0].text=q;f.snapshot.materials[0].contentHash=f.capsule.sources[0].sourceHash=sha256(q);Object.assign(f.capsule.sources[0].excerpts[0],{text:q,excerptSha256:sha256(q),endByte:Buffer.byteLength(q)});f.result.schemaVersion=3;f.result.findings=Array.from({length:70},(_,i)=>({...f.result.findings[0],findingId:'F'+i,evidence:[{sourceId:'S1',excerptId:'E1'}]}));}});
 const run=await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter);assert.equal(run.status,'succeeded');const b=await readRunRecord(x.scope,{expectedRunId:x.receipt.runId});assert.equal(b.result.modelResponse.findings.length,70);assert.ok(Buffer.byteLength(JSON.stringify(b.result))>CODEX_LIMITS.final);assert.equal(b.result.modelResponse.findings[0].evidence[0].quote,'引文'.repeat(680));
});
