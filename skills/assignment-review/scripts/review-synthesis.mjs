import {isTrustedRunBundle} from './prompt-store.mjs';
import {buildReviewHandoff,renderReviewHandoff,reviewInputSignature,escapeReviewText} from './review-handoff.mjs';
import {parseEvidenceCapsule} from './codex-contract.mjs';
import {fields,array,text,id,uuid,fail,sha256,LIMITS} from './prompt-contract.mjs';
const key=r=>r.runId+'/'+r.findingId;
const nonempty=v=>{text(v);if(!v.trim())fail('corrupt_record');return v;};
export function buildReviewSynthesis(input,assessment=null,options={}){
 const bundles=array(input,2,b=>{if(!isTrustedRunBundle(b))fail('corrupt_record');return b;});
 if(!bundles.length||new Set(bundles.map(b=>b.metadata.runId)).size!==bundles.length)fail('identity_required');
 const first=bundles[0].metadata;
 if(bundles.some(b=>b.metadata.taskId!==first.taskId||b.metadata.conversationId!==first.conversationId)||bundles.length===2&&bundles[0].metadata.executionKind===bundles[1].metadata.executionKind)fail('identity_required');
 const reports=bundles.map(b=>buildReviewHandoff(b,options));
 const signatures=bundles.map(reviewInputSignature),comparable=signatures.every(s=>s!==null&&s===signatures[0]);
 const both=bundles.length===2&&bundles.every(b=>b.result),originals=new Map();
 for(const b of bundles)for(const f of b.result?.modelResponse.findings??[])originals.set(key({runId:b.metadata.runId,findingId:f.findingId}),{bundle:b,finding:f});
 const reference=raw=>{const r=fields(raw,['runId','findingId']);if(!uuid(r.runId)||!id(r.findingId)||!originals.has(key(r)))fail('corrupt_record');return r;};
 const evidence=raw=>{
  const r=fields(raw,['runId','sourceId','excerptId']),b=bundles.find(b=>b.metadata.runId===r.runId);
  const e=b?.snapshot&&parseEvidenceCapsule(b.snapshot).sources.find(s=>s.sourceId===r.sourceId)?.excerpts.find(e=>e.excerptId===r.excerptId);
  const c=b?.result?.modelResponse.coverage.find(c=>c.sourceId===r.sourceId);
  if(!e||!c||!['covered','partial'].includes(c.status)||!c.excerptIds.includes(r.excerptId))fail('source_mismatch');
  return {...r,startByte:e.startByte,endByte:e.endByte,quote:e.text};
 };
 let judgment='No host synthesis supplied; all findings remain unresolved for semantic comparison.',groups;
 if(assessment===null){groups=[...originals].map(([_,{bundle:b,finding:f}],i)=>({groupId:'G'+(i+1),category:'unresolved',decision:'retained',references:[{runId:b.metadata.runId,findingId:f.findingId}],rationale:'Original finding retained; no semantic merge or rejection inferred.',evidence:f.evidence.map(e=>({runId:b.metadata.runId,...e})),action:f.action}));}
 else{
  const v=fields(assessment,['judgment','groups']);judgment=nonempty(v.judgment);
  groups=array(v.groups,200,raw=>{
   const g=fields(raw,['groupId','category','decision','references','rationale','evidence','action']);
   if(!id(g.groupId)||!['agreement','unique','disagreement','unresolved'].includes(g.category)||!['retained','merged','rejected','deferred','closed','reopened'].includes(g.decision))fail('corrupt_record');
   g.references=array(g.references,200,reference);if(!g.references.length)fail('corrupt_record');
   const runs=new Set(g.references.map(r=>r.runId));
   if(g.category!=='unresolved'&&(!both||!comparable)||['agreement','disagreement'].includes(g.category)&&runs.size!==2||g.category==='unique'&&runs.size!==1||g.decision==='merged'&&(g.category!=='agreement'||g.references.length<2))fail('corrupt_record');
   g.rationale=nonempty(g.rationale);g.evidence=array(g.evidence,100,evidence);
   if(g.action!==null)g.action=nonempty(g.action);
   if(['merged','rejected','closed','reopened'].includes(g.decision)&&!g.evidence.length)fail('source_mismatch');
   if(['closed','rejected'].includes(g.decision)&&g.action!==null||['reopened','deferred'].includes(g.decision)&&g.action===null)fail('corrupt_record');
   if(['closed','reopened'].includes(g.decision))for(const r of g.references){
    const b=originals.get(key(r)).bundle;
    const supported=b.assessment?.findings.some(f=>f.findingIds.includes(r.findingId)&&(g.decision==='closed'?['resolved','no_longer_applicable'].includes(f.state):f.reopened&&f.state==='still_present'));
    if(!supported)fail('source_mismatch');
   }
   return g;
  });
 }
 const refs=groups.flatMap(g=>g.references.map(key));
 if(new Set(groups.map(g=>g.groupId)).size!==groups.length||refs.length!==originals.size||new Set(refs).size!==refs.length||refs.some(r=>!originals.has(r)))fail('corrupt_record');
 const body={schemaVersion:1,taskId:first.taskId,conversationId:first.conversationId,assessor:'host_review',semanticVerification:'host_judgment_not_independently_verified',gradeBandAssessment:'not_assessed',remoteSubmission:'not_verified',comparison:bundles.length===1?'single_review':comparable?'same_task_and_materials_semantics_unverified':'not_comparable',firstReviewIndependence:'not_verified',status:reports.every(r=>r.resultAvailability==='validated')?'all_validated':reports.some(r=>r.resultAvailability==='validated')?'partial':'none_validated',origins:bundles.map(b=>({runId:b.metadata.runId,promptSha256:b.metadata.promptSha256,resultSha256:b.result?.resultSha256??null})),reports,groups,judgment,limitations:['Host categories and decisions need semantic review; agreement is not proof of correctness.',...(!both&&bundles.length===2?['A missing reviewer result cannot establish unique findings or consensus.']:[]),...(bundles.length===2?['Independent pre-dispatch capture ordering is not certified by these records; matching inputs do not prove independence.']:[])]};
 if(Buffer.byteLength(JSON.stringify({judgment,groups}))>LIMITS.snapshot)fail('store_limit');
 return {...body,synthesisSha256:sha256(JSON.stringify(body))};
}
export function renderReviewSynthesis(s){
 const esc=escapeReviewText;
 return [s.status,s.comparison,'Host judgment; semantics '+s.semanticVerification,'First-review capture '+s.firstReviewIndependence,esc(s.judgment),'All original findings are retained in the same-run reports below.',...s.groups.map(g=>[`Group ${esc(g.groupId)} / ${esc(g.category)} / ${esc(g.decision)}`,esc(JSON.stringify(g.references)),esc(g.rationale),...g.evidence.map(e=>`${esc(e.runId)} ${esc(e.sourceId)}/${esc(e.excerptId)} bytes ${e.startByte}–${e.endByte}: ${esc(e.quote)}`),`Action: ${esc(g.action??'none')}`].join('\n')), ...s.limitations.map(esc),...s.reports.map(renderReviewHandoff)].join('\n\n')+'\n';
}
