import { fields,fail,id,uuid,hash,sha256,array,text,LIMITS } from './prompt-contract.mjs';
import { parseEvidenceCapsule } from './codex-contract.mjs';
import { isTrustedRunBundle,readRunRecord } from './prompt-store.mjs';
const states=['still_present','resolved','unverifiable','no_longer_applicable'];
const unique=xs=>{if(new Set(xs).size!==xs.length)fail('corrupt_record');return xs;};
const ids=xs=>unique(array(xs,100,x=>{if(!id(x))fail('corrupt_record');return x;}));
export async function admitPriorSummaries(scope,bundle,input=[]){
 if(!isTrustedRunBundle(bundle)||!bundle.snapshot)fail('corrupt_record');
 return Promise.all(array(input,20,raw=>{
  const v=fields(raw,raw?.kind==='local'?['kind','runId','taskId','reviewMode','access','exclusion','resultSha256']:['kind','taskId','reviewMode','access','exclusion','summary']);
  if(!['local','external'].includes(v.kind)||v.taskId!==bundle.metadata.taskId||v.reviewMode!==bundle.snapshot.reviewMode||v.access!=='allowed'||v.exclusion!=='none')fail('corrupt_record');
  if(v.kind==='local'){if(!uuid(v.runId)||v.runId===bundle.metadata.runId||!hash(v.resultSha256))fail('corrupt_record');}
  else text(v.summary);return v;
 }).map(async v=>{
  if(v.kind==='external')return {...v,verification:'limited_external_history',bundle:null};
  const prior=await readRunRecord(scope,{historicalRunId:v.runId});
  if(!prior.result||prior.result.resultSha256!==v.resultSha256||prior.snapshot.reviewMode!==v.reviewMode||prior.metadata.sequence>=bundle.metadata.sequence)fail('corrupt_record');
  return {...v,verification:'bound_local_history',bundle:prior};
 }));
}
function evidenceValidator(bundle){
 const capsule=parseEvidenceCapsule(bundle.snapshot),coverage=bundle.result.modelResponse.coverage;
 return raw=>{const e=fields(raw,['sourceId','excerptId','startByte','endByte','quote']);
  const src=capsule.sources.find(s=>s.sourceId===e.sourceId),ex=src?.excerpts.find(x=>x.excerptId===e.excerptId),c=coverage.find(x=>x.sourceId===e.sourceId);
  if(!ex||!c||!['covered','partial'].includes(c.status)||!c.excerptIds.includes(e.excerptId)||!Number.isSafeInteger(e.startByte)||!Number.isSafeInteger(e.endByte)||e.startByte<ex.startByte||e.endByte>ex.endByte||e.endByte<=e.startByte||typeof e.quote!=='string')fail('corrupt_record');
  const bytes=Buffer.from(ex.text).subarray(e.startByte-ex.startByte,e.endByte-ex.startByte);if(!bytes.equals(Buffer.from(e.quote)))fail('corrupt_record');return e;
 };
}
export function validateReviewAssessment(bundle,admittedPriorSummaries,input){
 if(!isTrustedRunBundle(bundle)||!bundle.result)fail('corrupt_record');
 const v=fields(input,['schemaVersion','runId','taskId','conversationId','promptSha256','resultSha256','assessor','requirements','findings','admittedPrior','semanticVerification','assessmentSha256']);
 if(v.schemaVersion!==1||v.assessor!=='host_review'||v.semanticVerification!=='host_judgment_not_independently_verified'||['runId','taskId','conversationId','promptSha256'].some(k=>v[k]!==bundle.metadata[k])||v.resultSha256!==bundle.result.resultSha256)fail('corrupt_record');
 const ev=evidenceValidator(bundle),refs=xs=>array(xs,100,ev),modelIds=new Set(bundle.result.modelResponse.findings.map(f=>f.findingId));
 const expectedPrior=admittedPriorSummaries.map(p=>p.kind==='local'?{kind:'local',runId:p.runId,resultSha256:p.resultSha256}:{kind:'external',summarySha256:p.summarySha256??sha256(p.summary)});
 if(JSON.stringify(v.admittedPrior)!==JSON.stringify(expectedPrior))fail('corrupt_record');
 v.requirements=array(v.requirements,100,raw=>{
  const r=fields(raw,['requirementId','type','reference','findingIds','evidence','status','rationale']);
  if(!id(r.requirementId)||!['mandatory','rubric','optional','unknown'].includes(r.type)||!['satisfied','gap','conflict','unknown','not_applicable'].includes(r.status))fail('corrupt_record');
  r.reference=ev(r.reference);const material=bundle.snapshot.materials.find(m=>m.sourceId===r.reference.sourceId);if(!['requirements','rubric','teacher_guidance'].includes(material?.role))fail('corrupt_record');
  r.findingIds=ids(r.findingIds);if(r.findingIds.some(x=>!modelIds.has(x)))fail('corrupt_record');r.evidence=refs(r.evidence);text(r.rationale);if(!r.rationale.trim())fail('corrupt_record');
  if(['satisfied','not_applicable'].includes(r.status)&&!r.evidence.length)fail('corrupt_record');return r;
 });unique(v.requirements.map(r=>r.requirementId));const requirements=new Map(v.requirements.map(r=>[r.requirementId,r]));
 v.findings=array(v.findings,100,raw=>{
  const f=fields(raw,['findingId','origin','findingIds','criterionIds','state','evidence','coverage','rationale','lastKnownHistoricalState','actionDisposition','action','reopened']);
  if(!id(f.findingId)||!states.includes(f.state)||!['sufficient','partial','unavailable'].includes(f.coverage)||!['active','deferred','done','retired','verify'].includes(f.actionDisposition)||typeof f.reopened!=='boolean'||!(f.lastKnownHistoricalState===null||states.includes(f.lastKnownHistoricalState)))fail('corrupt_record');
  f.findingIds=ids(f.findingIds);if(f.findingIds.some(x=>!modelIds.has(x)))fail('corrupt_record');f.criterionIds=ids(f.criterionIds);if(f.criterionIds.some(x=>!requirements.has(x)))fail('corrupt_record');f.evidence=refs(f.evidence);text(f.rationale);if(!f.rationale.trim())fail('corrupt_record');if(f.action!==null)text(f.action);
  let priorState=null;
  if(f.origin!==null){const origin=fields(f.origin,['runId','findingId']);if(!uuid(origin.runId)||!id(origin.findingId))fail('corrupt_record');const prior=admittedPriorSummaries.find(p=>p.kind==='local'&&p.runId===origin.runId)?.bundle;
   if(!isTrustedRunBundle(prior)||!prior.result.modelResponse.findings.some(p=>p.findingId===origin.findingId))fail('corrupt_record');
   const old=prior.assessment?.findings.find(p=>p.findingId===f.findingId);if(old&&old.findingIds.includes(origin.findingId))priorState=old.state;
  }
  if(f.lastKnownHistoricalState!==priorState)fail('corrupt_record');
  const currentSolution=f.evidence.some(e=>e.sourceId===bundle.snapshot.currentSourceId);
  if(['resolved','no_longer_applicable'].includes(f.state)){
   if(f.coverage!=='sufficient'||!f.evidence.length||!f.criterionIds.length||f.state==='resolved'&&!currentSolution||f.state==='no_longer_applicable'&&!f.criterionIds.some(k=>requirements.get(k).status==='not_applicable')||f.action!==null)fail('corrupt_record');
  }
  if(f.state==='still_present'&&(!f.evidence.length||!f.findingIds.length))fail('corrupt_record');
  const allowed={still_present:['active','deferred'],resolved:['done'],unverifiable:['verify'],no_longer_applicable:['retired']};if(!allowed[f.state].includes(f.actionDisposition))fail('corrupt_record');
  if(f.reopened&&(!['resolved','no_longer_applicable'].includes(priorState)||f.state!=='still_present'||!currentSolution||!f.criterionIds.length||f.criterionIds.some(k=>requirements.get(k).status==='not_applicable')))fail('corrupt_record');
  return f;
 });unique(v.findings.map(f=>f.findingId));
 const {assessmentSha256,...body}=v;if(assessmentSha256!==sha256(JSON.stringify(body))||Buffer.byteLength(JSON.stringify(v))>LIMITS.snapshot)fail('corrupt_record');return v;
}
export function createReviewAssessment(bundle,prior,{requirements=[],findings=[]}={}){
 const body={schemaVersion:1,runId:bundle.metadata.runId,taskId:bundle.metadata.taskId,conversationId:bundle.metadata.conversationId,promptSha256:bundle.metadata.promptSha256,resultSha256:bundle.result?.resultSha256,assessor:'host_review',requirements,findings,admittedPrior:prior.map(p=>p.kind==='local'?{kind:'local',runId:p.runId,resultSha256:p.resultSha256}:{kind:'external',summarySha256:p.summarySha256??sha256(p.summary)}),semanticVerification:'host_judgment_not_independently_verified'};
 return validateReviewAssessment(bundle,prior,{...body,assessmentSha256:sha256(JSON.stringify(body))});
}
export function projectCurrentActions(assessment){
 const groups={mandatory:[],rubric:[],optional:[],unknown:[]},history=[];
 const requirements=new Map(assessment.requirements.map(r=>[r.requirementId,r]));
 for(const f of assessment.findings){if(['resolved','no_longer_applicable'].includes(f.state)){history.push({findingId:f.findingId,state:f.state,rationale:f.rationale});continue;}
  const types=f.criterionIds.map(k=>requirements.get(k)?.type??'unknown'),type=['mandatory','rubric','optional','unknown'].find(t=>types.includes(t))??'unknown';
  groups[f.state==='unverifiable'?'unknown':type].push({findingId:f.findingId,state:f.state,disposition:f.actionDisposition,action:f.state==='unverifiable'?'Verify current evidence: '+f.rationale:f.action,reopened:f.reopened});
 }
 return {groups,history};
}
