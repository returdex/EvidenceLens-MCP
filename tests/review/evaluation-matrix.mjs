import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {admittedFromFreeze,matrixInputSignature} from '../../scripts/evaluation-matrix.mjs';
function fixture(){const body={readiness:'input_ready',caseId:'A2',stage:'final',items:['Solution','Brief','Rubric'].map(id=>({id,content:id+' original text',contentHash:sha256(id+' original text')}))};return {...body,freezeSha256:sha256(JSON.stringify(body))};}
test('only exact immutable reviewer allowlist enters matrix; altered bytes or evaluator IDs reject',()=>{
 const f=fixture();assert.equal(admittedFromFreeze(f).length,3);
 for(const mutate of [v=>v.items[0].content+='changed',v=>v.readiness='blocked',v=>v.items.push({id:'Feedback',content:'private',contentHash:sha256('private')}),v=>v.items[1].id='Solution']){
  const v=structuredClone(f);mutate(v);assert.throws(()=>admittedFromFreeze(v));
 }
 const denied=fixture();denied.items[2].id='Feedback';const {freezeSha256,...body}=denied;denied.freezeSha256=sha256(JSON.stringify(body));assert.throws(()=>admittedFromFreeze(denied),/invalid_allowlist/);
});
test('same source/task signature ignores run identity but changes for goal/task/stage/source changes',()=>{
 const a=admittedFromFreeze(fixture()),s={promptText:'Minimum P; planning D',stage:'final',reviewMode:'artifact_only',currentSourceId:'Solution',runId:'one'};
 const sig=matrixInputSignature(s,a);assert.equal(matrixInputSignature({...s,runId:'two'},a),sig);
 for(const next of [{...s,promptText:'Minimum D'}, {...s,stage:'in_progress'}, {...s,currentSourceId:null}])assert.notEqual(matrixInputSignature(next,a),sig);
 assert.notEqual(matrixInputSignature(s,a.map((x,i)=>i?x:{...x,text:x.text+' changed'})),sig);
});
