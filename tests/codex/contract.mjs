import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { validateEvidenceCapsule,renderEvidenceCapsule,parseEvidenceCapsule,validateCodexResultShape,MODEL_RESULT_SCHEMA } from '../../skills/assignment-review/scripts/codex-contract.mjs';
import { sha256 } from '../../skills/assignment-review/scripts/prompt-contract.mjs';
const valid=f=>validateEvidenceCapsule(f.capsule,f.snapshot,f.admitted);
test('Unicode byte-exact source capsule round trip and deterministic escaping',()=>{
 const f=fixture();assert.deepEqual(valid(f),f.capsule);
 const rendered=renderEvidenceCapsule(f.capsule,f.snapshot,f.admitted);
 f.snapshot.promptText='Review\n'+rendered;f.snapshot.promptSha256=sha256(f.snapshot.promptText);
 assert.deepEqual(parseEvidenceCapsule(f.snapshot),f.capsule);
 f.snapshot.promptText+='\n'+rendered;f.snapshot.promptSha256=sha256(f.snapshot.promptText);assert.throws(()=>parseEvidenceCapsule(f.snapshot));
});
for(const [name,mutate] of Object.entries({
 forged_source:f=>f.capsule.sources[0].sourceId='S2',
 hash_mismatch:f=>f.admitted[0].text+='changed',
 invalid_utf8_range:f=>{f.capsule.sources[0].excerpts[0].startByte=3;},
 duplicate_source:f=>f.capsule.sources.push(structuredClone(f.capsule.sources[0])),
 excluded:f=>{Object.assign(f.snapshot.materials[0],{status:'excluded',contentHash:null,hashKind:null,inspectedParts:[],observedAt:null,availability:'unavailable'});},
 history_scope:f=>{f.snapshot.currentSourceId=null;f.capsule.currentSourceId=null;f.snapshot.materials[0].role='history';},
 unknown_field:f=>f.capsule.hidden='no',
 too_many_sources:f=>f.capsule.sources=Array(101).fill(f.capsule.sources[0]),
 bad_surrogate:f=>f.capsule.sources[0].excerpts[0].text='\ud800',
 bad_excerpt_hash:f=>f.capsule.sources[0].excerpts[0].excerptSha256='0'.repeat(64),
 extra_admission:f=>f.admitted.push({sourceId:'not_allowed',text:'not allowed'}),
 empty_excerpt:f=>f.capsule.sources[0].excerpts=[]
}))test('reject '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>valid(f));});
test('accessors are rejected without reading content',()=>{const f=fixture();let read=false;Object.defineProperty(f.capsule.sources[0].excerpts[0],'text',{get(){read=true;throw Error();},enumerable:true});assert.throws(()=>valid(f));assert.equal(read,false);});
test('legacy prompt has no capsule; preparation without a draft remains valid',()=>{const f=fixture();assert.throws(()=>parseEvidenceCapsule(f.snapshot));f.snapshot.currentSourceId=null;f.snapshot.stage='preparation';f.snapshot.materials=[];Object.assign(f.capsule,{currentSourceId:null,stage:'preparation',sources:[]});f.admitted=[];assert.deepEqual(valid(f),f.capsule);});
test('model schema has exact fields and no self-referential prompt hash',()=>{const f=fixture();assert.deepEqual(validateCodexResultShape(f.result),f.result);assert.equal(MODEL_RESULT_SCHEMA.additionalProperties,false);assert.equal('promptSha256' in MODEL_RESULT_SCHEMA.properties,false);for(const mutate of [r=>r.promptSha256='a'.repeat(64),r=>r.coverage[0].status='passed',r=>r.findings[0].evidence[0].extra=1,r=>r.findings[0].claim='x'.repeat(300000),r=>r.findings[0].action=12]){const r=structuredClone(f.result);mutate(r);assert.throws(()=>validateCodexResultShape(r));}});
