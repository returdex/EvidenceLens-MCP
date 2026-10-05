import { validateSnapshot,sha256,decode } from './prompt-contract.mjs';
import { parseEvidenceCapsule,validateCodexResultShape,validateCitationResultShape,validateReferenceResultShape,validateResultEnvelope,CODEX_LIMITS,codexFail } from './codex-contract.mjs';
function rejectBinding(trigger){const e=new Error('source_mismatch');e.code='source_mismatch';e.bindingTrigger=trigger;throw e;}
export function validateBoundCodexResult(snapshot,modelResponse){
 const s=validateSnapshot(snapshot),capsule=parseEvidenceCapsule(s);
 let input=modelResponse;
 if(typeof input==='string'){if(Buffer.byteLength(input)>CODEX_LIMITS.final)codexFail('result_invalid');try{input=JSON.parse(input);}catch{codexFail('result_invalid');}}
 const version=input&&Object.getOwnPropertyDescriptor(input,'schemaVersion')?.value;
 const citationOnly=version===2,referenceOnly=version===3;
 const r=referenceOnly?validateReferenceResultShape(input):citationOnly?validateCitationResultShape(input):validateCodexResultShape(input);
 if(citationOnly||referenceOnly)r.schemaVersion=1;
 if(['runId','taskId','stage','currentSourceId'].some(k=>r[k]!==s[k]))rejectBinding('binding_identity_mismatch');
 const sources=new Map(capsule.sources.map(x=>[x.sourceId,x])),coverage=new Map(r.coverage.map(x=>[x.sourceId,x]));
 if(coverage.size!==s.materials.length||s.materials.some(m=>!coverage.has(m.sourceId)))rejectBinding('binding_coverage_mismatch');
 const local=[...s.limitations,'Only captured excerpts were reviewed; matching quotes does not establish semantic correctness or assignment acceptance.'];
 for(const m of s.materials){
  const c=coverage.get(m.sourceId),source=sources.get(m.sourceId);
  if(m.status==='excluded'){if(c.status!=='excluded'||c.excerptIds.length)rejectBinding('binding_status_mismatch');continue;}
  if(m.status!=='inspected'||m.availability!=='inline_excerpt'||!source){
   if(c.status!=='unavailable'||c.excerptIds.length)rejectBinding('binding_status_mismatch');local.push(m.sourceId+': evidence unavailable in the captured prompt.');continue;
  }
  if(c.status==='excluded'||c.status==='unavailable'&&c.excerptIds.length)rejectBinding('binding_status_mismatch');
  if(c.excerptIds.some(id=>!source.excerpts.some(e=>e.excerptId===id))||c.status==='covered'&&c.excerptIds.length!==source.excerpts.length)rejectBinding('binding_excerpt_mismatch');
  if(c.status!=='covered')local.push(m.sourceId+': captured excerpt coverage is incomplete.');
 }
 for(const f of r.findings){
  if(['observation','conflict'].includes(f.kind)&&!f.evidence.length)rejectBinding('binding_missing_evidence');
  if(!f.evidence.length)local.push(f.findingId+': no supporting captured quote; treat as an unverified gap or unknown.');
  const refs=new Set();
  for(const e of f.evidence){
   const source=sources.get(e.sourceId),excerpt=source?.excerpts.find(x=>x.excerptId===e.excerptId),row=coverage.get(e.sourceId);
   if(!excerpt||!row||!['covered','partial'].includes(row.status)||!row.excerptIds.includes(e.excerptId))rejectBinding('binding_reference_mismatch');
   const bytes=Buffer.from(excerpt.text);
   if(referenceOnly){e.quote=excerpt.text;e.startByte=excerpt.startByte;e.endByte=excerpt.endByte;}
   if(citationOnly){
    const needle=Buffer.from(e.quote),offset=needle.length?bytes.indexOf(needle):-1;
    if(offset<0)rejectBinding('binding_quote_missing');
    if(bytes.indexOf(needle,offset+1)>=0)rejectBinding('binding_quote_ambiguous');
    e.startByte=excerpt.startByte+offset;e.endByte=e.startByte+needle.length;
   }
   if(e.startByte<excerpt.startByte||e.endByte>excerpt.endByte)rejectBinding('binding_span_mismatch');
   let quote;try{quote=decode(bytes.subarray(e.startByte-excerpt.startByte,e.endByte-excerpt.startByte));}catch{rejectBinding('binding_span_mismatch');}
   if(quote!==e.quote)rejectBinding('binding_quote_mismatch');const key=JSON.stringify(e);if(refs.has(key))rejectBinding('binding_duplicate_evidence');refs.add(key);
  }
 }
 if(s.currentSourceId===null)local.push('No current draft was captured; this is a bounded requirements/preparation review.');
 else if(coverage.get(s.currentSourceId)?.status!=='covered')local.push('Current draft evidence is incomplete; older drafts cannot establish its state.');
 const body={schemaVersion:1,runId:s.runId,taskId:s.taskId,conversationId:s.conversationId,promptSha256:s.promptSha256,modelResponse:validateCodexResultShape(r),limitations:[...new Set([...local,...r.limitations])]};
 return validateResultEnvelope({...body,resultSha256:sha256(JSON.stringify(body))});
}
