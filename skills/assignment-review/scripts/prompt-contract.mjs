import { createHash } from 'node:crypto';

export const CODES = Object.freeze(['identity_required','no_record','latest_mismatch','corrupt_record','busy','uncertain','deleted','store_limit','unsafe_path','storage_unavailable','unsupported']);
export const LIMITS = Object.freeze({prompt:256*1024,snapshot:1024*1024,stdin:2*1024*1024,tasks:100,runs:1000});
export const fail = code => { const e = new Error(code); e.code=code; throw e; };
export const safeError = e => ({code:CODES.includes(e?.code) ? e.code : 'storage_unavailable'});
export const sha256 = text => createHash('sha256').update(text).digest('hex');
export const uuid = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const CREDENTIAL = /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[A-Z0-9]{16}\b/;
export const id = value => typeof value==='string' && /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value) && !CREDENTIAL.test(value);
export const hash = value => typeof value==='string' && /^[0-9a-f]{64}$/.test(value);
export function fields(value, keys) {
  if (!value || typeof value!=='object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) fail('corrupt_record');
  const ds=Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(ds).length!==keys.length) fail('corrupt_record');
  const out={};
  for(const k of keys) { const d=ds[k]; if(!d || !Object.hasOwn(d,'value') || !d.enumerable) fail('corrupt_record'); out[k]=d.value; }
  return out;
}
export function text(value,max=8192) {
  if(typeof value!=='string' || Buffer.byteLength(value)>max || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) fail('corrupt_record');
  if(CREDENTIAL.test(value)) fail('corrupt_record');
  return value;
}
export function array(value,max,validate) {
  if(!Array.isArray(value)||value.length>max||Reflect.ownKeys(value).length!==value.length+1) fail('corrupt_record');
  const out=[]; for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value'))fail('corrupt_record');out.push(validate(d.value));} return out;
}
export function decode(bytes) { try { return new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { fail('corrupt_record'); } }
const timestamp = value => typeof value==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
function identity(v) { if(v.schemaVersion!==1||!uuid(v.runId)||!uuid(v.conversationId)||!id(v.taskId)||!Number.isSafeInteger(v.sequence)||v.sequence<1)fail('corrupt_record'); }
function material(input) {
 const m=fields(input,['sourceId','role','status','sourceReference','inspectedParts','observedAt','hashKind','contentHash','availability']);
 if(!id(m.sourceId)||!['requirements','rubric','teacher_guidance','template','solution','support','history'].includes(m.role)||!['inspected','unavailable','excluded','not_provided'].includes(m.status)||!['inline_excerpt','requires_reread','unavailable'].includes(m.availability))fail('corrupt_record');
 if(m.sourceReference!==null)text(m.sourceReference); m.inspectedParts=array(m.inspectedParts,100,v=>text(v,1024));
 if(m.observedAt!==null&&!timestamp(m.observedAt))fail('corrupt_record');
 if(m.status!=='inspected' && (m.contentHash!==null||m.hashKind!==null||m.inspectedParts.length||m.observedAt!==null||m.availability!=='unavailable'))fail('corrupt_record');
 if(m.status==='inspected' && (!hash(m.contentHash)||m.hashKind!=='sha256_utf8'||!timestamp(m.observedAt)||!m.inspectedParts.length||m.availability==='unavailable'))fail('corrupt_record');
 return m;
}
export function validateSnapshot(input) {
 const v=fields(input,['schemaVersion','runId','taskId','conversationId','sequence','stage','reviewMode','currentSourceId','promptText','promptSha256','capturedAt','materials','limitations']); identity(v);
 if(!['preparation','in_progress','final'].includes(v.stage)||!['artifact_only','process'].includes(v.reviewMode)||!(v.currentSourceId===null||id(v.currentSourceId))||!timestamp(v.capturedAt))fail('corrupt_record');
 text(v.promptText,LIMITS.prompt); if(!hash(v.promptSha256)||v.promptSha256!==sha256(v.promptText))fail('corrupt_record');
 v.materials=array(v.materials,100,material); if(new Set(v.materials.map(m=>m.sourceId)).size!==v.materials.length)fail('corrupt_record');
 if(v.currentSourceId!==null&&!v.materials.some(m=>m.sourceId===v.currentSourceId&&m.role==='solution'))fail('corrupt_record');
 v.limitations=array(v.limitations,100,x=>text(x));
 if(Buffer.byteLength(JSON.stringify(v))>LIMITS.snapshot)fail('store_limit');
 return v;
}
export const TERMINAL = ['succeeded','failed','cancelled','uncertain'];
export function validateLifecycle(input) {
 const v=fields(input,['schemaVersion','runId','taskId','conversationId','sequence','status','executionKind','createdAt','updatedAt','errorCode','promptSha256']); identity(v);
 if(!['preparing','captured','dispatched',...TERMINAL].includes(v.status)||v.executionKind!=='host_skill'||!timestamp(v.createdAt)||!timestamp(v.updatedAt)||!(v.errorCode===null||CODES.includes(v.errorCode))||!(v.promptSha256===null||hash(v.promptSha256)))fail('corrupt_record');
 if(['captured','dispatched','succeeded'].includes(v.status)&&v.promptSha256===null)fail('corrupt_record');
 if(v.status==='preparing'&&v.promptSha256!==null)fail('corrupt_record');
 if(['preparing','captured','dispatched','succeeded'].includes(v.status)&&v.errorCode!==null)fail('corrupt_record');
 return v;
}
export function transition(input,status,{errorCode=null,promptSha256=input.promptSha256}={}) {
 const v=validateLifecycle(input);
 if(TERMINAL.includes(v.status)) { if(status===v.status && errorCode===v.errorCode && promptSha256===v.promptSha256)return v; fail('uncertain'); }
 const allowed={preparing:['captured','failed','cancelled','uncertain'],captured:['dispatched','failed','cancelled','uncertain'],dispatched:TERMINAL};
 if(!allowed[v.status].includes(status))fail('uncertain');
 return validateLifecycle({...v,status,errorCode,promptSha256,updatedAt:new Date().toISOString()});
}
