import test from 'node:test';import assert from 'node:assert/strict';
import {protocolFixture} from './helpers.mjs';
// Candidate-only evidence. This never changes production executable capability or allowlist.
const candidateBinarySha256='cb4e4994627e770800a940b42969c77855a3fc09a6e60b02aa6319f670d6b6ab';
test('candidate binary: sealed loopback protocol and source-only final response',async()=>{
 const r=await protocolFixture('success',{candidateBinarySha256,permitInstallationMetadata:true,useRunner:true,referenceOnly:true});
 assert.equal(r.outcome.status,'candidate',JSON.stringify(r.outcome));assert.equal(r.requests.length,1);assert.equal(r.authUnchanged,true);assert.equal(r.installationUnchanged,true);
});
test('candidate binary: hidden native tool cannot expose synthetic auth',async()=>{
 const r=await protocolFixture('success',{candidateBinarySha256,permitInstallationMetadata:true,useRunner:true,tool:({auth})=>({type:'function_call',id:'call_hidden',call_id:'call_hidden',name:'view_image',arguments:JSON.stringify({path:auth})})});
 assert.notEqual(r.outcome.status,'candidate');assert.equal(r.authUnchanged,true);assert.equal(r.outsideUnchanged,true);assert.ok(!JSON.stringify(r.requests).includes(r.authSentinel));
});

for(const mode of ['500','429','disconnect','truncated','failed'])test('candidate failure '+mode+' never promotes result or retries',async()=>{
 const r=await protocolFixture(mode,{candidateBinarySha256,permitInstallationMetadata:true,useRunner:true});
 assert.notEqual(r.outcome.status,'candidate');assert.equal(r.outcome.cleanupComplete,true);assert.equal(r.requests.length,1);assert.equal(r.authUnchanged,true);
});
test('candidate sealed HOME excludes ambient skills/cache/agents and prior advice',async()=>{
 const r=await protocolFixture('success',{candidateBinarySha256,permitInstallationMetadata:true,useRunner:true,homeDirectories:['agents'],homeEntries:['models_cache.json'],referenceOnly:true});
 assert.equal(r.outcome.status,'candidate',JSON.stringify(r.outcome));assert.equal(r.requests.length,1);
 for(const marker of [r.ambient,r.authSentinel,'AGENT_PRIVATE_SENTINEL','SYNTHETIC_PRIVATE_STATE'])assert.ok(!JSON.stringify(r.requests).includes(marker));
 assert.equal(r.authUnchanged,true);assert.equal(r.installationUnchanged,true);assert.equal(r.outsideUnchanged,true);
});
test('candidate patch tool cannot delete outside file',async()=>{
 const r=await protocolFixture('success',{candidateBinarySha256,permitInstallationMetadata:true,useRunner:true,tool:({outside})=>({type:'custom_tool_call',id:'ct_1',call_id:'call_patch',name:'apply_patch',input:'*** Begin Patch\n*** Delete File: '+outside+'\n*** End Patch'})});
 assert.notEqual(r.outcome.status,'candidate');assert.equal(r.outcome.cleanupComplete,true);assert.equal(r.outsideUnchanged,true);assert.equal(r.authUnchanged,true);
});
