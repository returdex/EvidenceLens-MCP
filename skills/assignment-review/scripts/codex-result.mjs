import { validateSnapshot,sha256,decode } from './prompt-contract.mjs';
import { parseEvidenceCapsule,validateCodexResultShape,validateResultEnvelope,CODEX_LIMITS,codexFail } from './codex-contract.mjs';
export function validateBoundCodexResult(snapshot,modelResponse){
 const s=validateSnapshot(snapshot),capsule=parseEvidenceCapsule(s);
 let input=modelResponse;
 if(typeof input==='string'){if(Buffer.byteLength(input)>CODEX_LIMITS.final)codexFail('result_invalid');try{input=JSON.parse(input);}catch{codexFail('result_invalid');}}
 const r=validateCodexResultShape(input);
 if(['runId','taskId','stage','currentSourceId'].some(k=>r[k]!==s[k]))codexFail('source_mismatch');
 const sources=new Map(capsule.sources.map(x=>[x.sourceId,x])),coverage=new Map(r.coverage.map(x=>[x.sourceId,x]));
 if(coverage.size!==s.materials.length||s.materials.some(m=>!coverage.has(m.sourceId)))codexFail('source_mismatch');
 const local=[...s.limitations,'Only captured excerpts were reviewed; matching quotes does not establish semantic correctness or assignment acceptance.'];
 for(const m of s.materials){
  const c=coverage.get(m.sourceId),source=sources.get(m.sourceId);
  if(m.status==='excluded'){if(c.status!=='excluded'||c.excerptIds.length)codexFail('source_mismatch');continue;}
  if(m.status!=='inspected'||m.availability!=='inline_excerpt'||!source){
   if(c.status!=='unavailable'||c.excerptIds.length)codexFail('source_mismatch');local.push(m.sourceId+': evidence unavailable in the captured prompt.');continue;
  }
  if(c.status==='excluded'||c.excerptIds.some(id=>!source.excerpts.some(e=>e.excerptId===id))||c.status==='unavailable'&&c.excerptIds.length)codexFail('source_mismatch');
  if(c.status==='covered'&&c.excerptIds.length!==source.excerpts.length)codexFail('source_mismatch');
  if(c.status!=='covered')local.push(m.sourceId+': captured excerpt coverage is incomplete.');
 }
 for(const f of r.findings){
  if(['observation','conflict'].includes(f.kind)&&!f.evidence.length)codexFail('source_mismatch');
  if(!f.evidence.length)local.push(f.findingId+': no supporting captured quote; treat as an unverified gap or unknown.');
  const refs=new Set();
  for(const e of f.evidence){
   const source=sources.get(e.sourceId),excerpt=source?.excerpts.find(x=>x.excerptId===e.excerptId),row=coverage.get(e.sourceId);
   if(!excerpt||!row||!['covered','partial'].includes(row.status)||!row.excerptIds.includes(e.excerptId)||e.startByte<excerpt.startByte||e.endByte>excerpt.endByte)codexFail('source_mismatch');
   let quote;try{quote=decode(Buffer.from(excerpt.text).subarray(e.startByte-excerpt.startByte,e.endByte-excerpt.startByte));}catch{codexFail('source_mismatch');}
   if(quote!==e.quote)codexFail('source_mismatch');const key=JSON.stringify(e);if(refs.has(key))codexFail('source_mismatch');refs.add(key);
  }
 }
 if(s.currentSourceId===null)local.push('No current draft was captured; this is a bounded requirements/preparation review.');
 else if(coverage.get(s.currentSourceId)?.status!=='covered')local.push('Current draft evidence is incomplete; older drafts cannot establish its state.');
 const body={schemaVersion:1,runId:s.runId,taskId:s.taskId,conversationId:s.conversationId,promptSha256:s.promptSha256,modelResponse:r,limitations:[...new Set([...local,...r.limitations])]};
 return validateResultEnvelope({...body,resultSha256:sha256(JSON.stringify(body))});
}
