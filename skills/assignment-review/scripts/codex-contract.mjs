import { validateDiagnostics } from './codex-diagnostics.mjs';
import { fields,array,text,id,uuid,hash,sha256,decode,validateSnapshot } from './prompt-contract.mjs';

export const CODEX_LIMITS=Object.freeze({sources:100,excerpts:100,findings:100,final:240*1024,envelope:256*1024,line:512*1024,output:2*1024*1024,preflightMs:10000,reviewMs:120000,graceMs:2000});
export const CODEX_CODES=Object.freeze(['codex_missing','codex_incompatible','login_required','auth_mode_unsupported','isolation_unverified','recursive_call','protocol_invalid','output_limit','timed_out','result_invalid','source_mismatch','uncertain','unsafe_path','unsupported']);
export function codexFail(code){const error=new Error(code);error.code=code;throw error;}
export function codexError(error){return {code:CODEX_CODES.includes(error?.code)?error.code:'uncertain'};}
const OPEN='<evidencelens-evidence-v1>', CLOSE='</evidencelens-evidence-v1>';
const unique=(values)=>new Set(values).size===values.length;
const bytesRange=(start,end)=>Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&end>start;
const stage=v=>['preparation','in_progress','final'].includes(v);
const canonical=v=>JSON.stringify(v).replace(/[<>&]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));

// This function receives already-admitted text. It does not read files or grant admission.
export function validateEvidenceCapsule(input,snapshot,admitted) {
 try {
  const snap=validateSnapshot(snapshot);
  const c=fields(input,['schemaVersion','runId','taskId','conversationId','stage','currentSourceId','sources']);
  if(c.schemaVersion!==1||['runId','taskId','conversationId','stage','currentSourceId'].some(k=>c[k]!==snap[k]))codexFail('source_mismatch');
  const materials=new Map(snap.materials.map(m=>[m.sourceId,m]));
  const sourceIds=[];
  c.sources=array(c.sources,100,source=>{
   const s=fields(source,['sourceId','sourceHash','excerpts']);
   const m=materials.get(s.sourceId);
   if(!id(s.sourceId)||!hash(s.sourceHash)||!m||m.status!=='inspected'||m.availability!=='inline_excerpt'||m.contentHash!==s.sourceHash||m.role==='history'&&snap.reviewMode!=='process'||m.role==='solution'&&s.sourceId!==snap.currentSourceId)codexFail('source_mismatch');
   sourceIds.push(s.sourceId);
   s.excerpts=array(s.excerpts,100,excerpt=>{
    const e=fields(excerpt,['excerptId','startByte','endByte','text','excerptSha256','locator']);
    if(!id(e.excerptId)||!bytesRange(e.startByte,e.endByte)||!hash(e.excerptSha256))codexFail('source_mismatch');
    text(e.text,256*1024);text(e.locator,1024);
    if(!e.locator||Buffer.byteLength(e.text)!==e.endByte-e.startByte||sha256(e.text)!==e.excerptSha256)codexFail('source_mismatch');
    return e;
   });
   if(!s.excerpts.length||!unique(s.excerpts.map(e=>e.excerptId)))codexFail('source_mismatch');
   return s;
  });
  if(!unique(sourceIds)||Buffer.byteLength(canonical(c))>256*1024)codexFail('source_mismatch');
  if(admitted!==undefined){
   const seen=[];
   const buffers=new Map(array(admitted,100,source=>{
    const s=fields(source,['sourceId','text']);
    if(!id(s.sourceId)||!sourceIds.includes(s.sourceId))codexFail('source_mismatch');
    seen.push(s.sourceId);text(s.text,1000000);
    const b=Buffer.from(s.text,'utf8');
    if(sha256(b)!==materials.get(s.sourceId).contentHash)codexFail('source_mismatch');
    return [s.sourceId,b];
   }));
   if(!unique(seen)||seen.length!==sourceIds.length)codexFail('source_mismatch');
   for(const s of c.sources)for(const e of s.excerpts){
    const b=buffers.get(s.sourceId);
    if(e.endByte>b.length||decode(b.subarray(e.startByte,e.endByte))!==e.text)codexFail('source_mismatch');
   }
  }
  return c;
 }catch{codexFail('source_mismatch');}
}
export function renderEvidenceCapsule(input,snapshot,admitted){
 if(admitted===undefined)codexFail('source_mismatch');
 return OPEN+'\n'+canonical(validateEvidenceCapsule(input,snapshot,admitted))+'\n'+CLOSE;
}
export function parseEvidenceCapsule(snapshot){
 const s=validateSnapshot(snapshot),p=s.promptText;
 if(p.split(OPEN).length!==2||p.split(CLOSE).length!==2)codexFail('source_mismatch');
 const a=p.indexOf(OPEN)+OPEN.length,b=p.indexOf(CLOSE);
 if(b<a)codexFail('source_mismatch');
 try{
  const inner=p.slice(a,b),input=JSON.parse(inner);
  const c=validateEvidenceCapsule(input,s);
  if(inner!=='\n'+canonical(c)+'\n')codexFail('source_mismatch');
  return c;
 }catch{codexFail('source_mismatch');}
}
const str=(maxLength=8192)=>({type:'string',maxLength});
const ident={type:'string',pattern:'^[A-Za-z][A-Za-z0-9_-]{0,79}$',maxLength:80};
const enumeration=values=>({type:'string',enum:values});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,maxItems=100)=>({type:'array',items,maxItems});
const integer={type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER};
function freeze(value){for(const child of Object.values(value))if(child&&typeof child==='object')freeze(child);return Object.freeze(value);}
export const MODEL_RESULT_SCHEMA=freeze(object({
 schemaVersion:{type:'integer',enum:[1]},runId:{type:'string',pattern:'^[0-9a-fA-F-]{36}$'},taskId:ident,
 stage:enumeration(['preparation','in_progress','final']),currentSourceId:nullable(ident),
 coverage:list(object({sourceId:ident,status:enumeration(['covered','partial','unavailable','excluded']),excerptIds:list(ident)})),
 findings:list(object({findingId:ident,kind:enumeration(['observation','gap','conflict','unknown']),severity:enumeration(['info','warning','error']),claim:str(),evidence:list(object({sourceId:ident,excerptId:ident,startByte:integer,endByte:integer,quote:str()})),action:nullable(str())})),
 limitations:list(str())
}));
// Deliberately limited validator for this fixed schema, not a general JSON Schema engine.
function check(value,schema){
 if(schema.anyOf){for(const choice of schema.anyOf){try{return check(value,choice);}catch{}}codexFail('result_invalid');}
 if(schema.type==='null'){if(value!==null)codexFail('result_invalid');return null;}
 if(schema.type==='object'){const v=fields(value,schema.required);for(const k of schema.required)v[k]=check(v[k],schema.properties[k]);return v;}
 if(schema.type==='array')return array(value,schema.maxItems,v=>check(v,schema.items));
 if(schema.type==='string'){text(value,schema.maxLength??8192);if(schema.pattern&&!new RegExp(schema.pattern).test(value))codexFail('result_invalid');}
 else if(schema.type==='integer'){if(!Number.isSafeInteger(value)||value<(schema.minimum??0)||value>(schema.maximum??Number.MAX_SAFE_INTEGER))codexFail('result_invalid');}
 else codexFail('result_invalid');
 if(schema.enum&&!schema.enum.includes(value))codexFail('result_invalid');
 return value;
}
export function validateCodexResultShape(input){
 try{
  const r=check(input,MODEL_RESULT_SCHEMA);
  if(!uuid(r.runId)||!id(r.taskId)||!stage(r.stage)||Buffer.byteLength(JSON.stringify(r))>CODEX_LIMITS.final)codexFail('result_invalid');
  if(!unique(r.findings.map(f=>f.findingId))||!unique(r.coverage.map(c=>c.sourceId)))codexFail('result_invalid');
  for(const c of r.coverage)if(!unique(c.excerptIds))codexFail('result_invalid');
  for(const f of r.findings)for(const e of f.evidence)if(!bytesRange(e.startByte,e.endByte))codexFail('result_invalid');
  return r;
 }catch{codexFail('result_invalid');}
}

export function validateExecutionRecord(input){
 const version=input&&Object.getOwnPropertyDescriptor(input,'schemaVersion')?.value;
 const r=fields(input,['schemaVersion','runId','taskId','conversationId','attemptId','executionKind','promptSha256','binaryVersion','binarySha256','policySha256','status','errorCode','startedAt','finishedAt','elapsedMs','terminalObserved','cleanupComplete','resultSha256',...(version===2?['diagnostics']:[])]);
 if(![1,2].includes(r.schemaVersion)||!uuid(r.runId)||!uuid(r.conversationId)||!uuid(r.attemptId)||!id(r.taskId)||r.executionKind!=='codex_exec'||!hash(r.promptSha256))codexFail('result_invalid');
 if(!['preparing','succeeded','failed','cancelled','uncertain'].includes(r.status)||!(r.errorCode===null||CODEX_CODES.includes(r.errorCode)))codexFail('result_invalid');
 for(const k of ['binarySha256','policySha256','resultSha256'])if(r[k]!==null&&!hash(r[k]))codexFail('result_invalid');
 if(r.binaryVersion!==null&&!['0.141.0','0.160.0'].includes(r.binaryVersion))codexFail('result_invalid');
 for(const k of ['startedAt','finishedAt'])if(r[k]!==null&&(typeof r[k]!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(r[k])||!Number.isFinite(Date.parse(r[k]))))codexFail('result_invalid');
 if(r.elapsedMs!==null&&(!Number.isSafeInteger(r.elapsedMs)||r.elapsedMs<0)||typeof r.terminalObserved!=='boolean'||typeof r.cleanupComplete!=='boolean')codexFail('result_invalid');
 if(r.status==='succeeded'&&(!r.terminalObserved||!r.cleanupComplete||r.resultSha256===null||r.errorCode!==null||r.binarySha256===null||r.policySha256===null))codexFail('result_invalid');
 if(r.status!=='succeeded'&&r.resultSha256!==null)codexFail('result_invalid');
 if(r.schemaVersion===2)r.diagnostics=validateDiagnostics(r.diagnostics);else if('diagnostics' in r)codexFail('result_invalid');
 return r;
}
export function validateResultEnvelope(input){
 const r=fields(input,['schemaVersion','runId','taskId','conversationId','promptSha256','modelResponse','limitations','resultSha256']);
 if(r.schemaVersion!==1||!uuid(r.runId)||!uuid(r.conversationId)||!id(r.taskId)||!hash(r.promptSha256)||!hash(r.resultSha256))codexFail('result_invalid');
 r.modelResponse=validateCodexResultShape(r.modelResponse);r.limitations=array(r.limitations,300,x=>text(x));
 const {resultSha256,...body}=r;
 if(sha256(JSON.stringify(body))!==resultSha256||r.modelResponse.runId!==r.runId||r.modelResponse.taskId!==r.taskId||Buffer.byteLength(JSON.stringify(r))>CODEX_LIMITS.envelope)codexFail('result_invalid');return r;
}
