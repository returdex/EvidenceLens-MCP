import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateSnapshot, validateLifecycle, transition, sha256, decode, safeError } from '../../skills/assignment-review/scripts/prompt-contract.mjs';
const now = '2026-10-05T00:00:00.000Z';
const base = () => ({schemaVersion:1,runId:randomUUID(),taskId:'T-demo',conversationId:randomUUID(),sequence:1,stage:'final',reviewMode:'artifact_only',currentSourceId:null,promptText:'  中文\r\n```x```\n',promptSha256:sha256('  中文\r\n```x```\n'),capturedAt:now,materials:[],limitations:[]});
test('snapshot preserves exact UTF-8 and rejects changed hash',()=>{ const s=base(); assert.deepEqual(validateSnapshot(s),s); assert.throws(()=>validateSnapshot({...s,promptText:s.promptText+' '})); });
test('rejects extras, accessor without invoking, lone surrogate, limits and recognized credentials',()=>{
 const s=base(); let called=false;
 const accessor={...s}; Object.defineProperty(accessor,'promptText',{enumerable:true,get(){called=true;return 'x';}});
 for(const bad of [{...s,reasoning:'private'},accessor,{...s,promptText:'\ud800'},{...s,promptText:'x'.repeat(262145)},{...s,promptText:'-----BEGIN PRIVATE KEY-----'},{...s,promptText:'sk-'+ 'a'.repeat(35)},{...s,sequence:0}]) assert.throws(()=>validateSnapshot(bad));
 assert.equal(called,false);
 assert.throws(()=>decode(Buffer.from([0xc3,0x28])));
});
test('material status prevents excluded content/hash and duplicate IDs',()=>{
 const s=base(); const m={sourceId:'S1',role:'rubric',status:'excluded',sourceReference:null,inspectedParts:[],observedAt:null,hashKind:null,contentHash:null,availability:'unavailable'};
 assert.equal(validateSnapshot({...s,materials:[m]}).materials[0].status,'excluded');
 assert.throws(()=>validateSnapshot({...s,materials:[{...m,contentHash:sha256('hidden')}]}));
 assert.throws(()=>validateSnapshot({...s,materials:[m,m]}));
});
test('lifecycle transitions allow failure before dispatch, never terminal resurrection',()=>{
 const s=base(); const l={schemaVersion:1,runId:s.runId,taskId:s.taskId,conversationId:s.conversationId,sequence:1,status:'preparing',executionKind:'host_skill',createdAt:now,updatedAt:now,errorCode:null,promptSha256:null};
 assert.deepEqual(validateLifecycle(l),l);
 assert.equal(transition(l,'failed',{errorCode:'uncertain'}).status,'failed');
 assert.throws(()=>transition(l,'succeeded'));
 const captured=transition(l,'captured',{promptSha256:s.promptSha256}); const dispatched=transition(captured,'dispatched'); const done=transition(dispatched,'succeeded');
 assert.deepEqual(transition(done,'succeeded'),done); assert.throws(()=>transition(done,'dispatched'));
 assert.equal(safeError(new Error('secret payload')).code,'storage_unavailable');
});
test('recognized credential-shaped identifiers are rejected',()=>{const s=base();assert.throws(()=>validateSnapshot({...s,taskId:'sk-'+'a'.repeat(35)}));});
