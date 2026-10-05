import { projectCurrentActions } from './review-recheck.mjs';
import { isTrustedRunBundle } from './prompt-store.mjs';
import { fail } from './prompt-contract.mjs';
export function buildReviewHandoff(bundle,{view='full',maxSummaryFindings=5}={}){
 if(!isTrustedRunBundle(bundle)||!['full','summary'].includes(view)||!Number.isSafeInteger(maxSummaryFindings)||maxSummaryFindings<0||maxSummaryFindings>100)fail('corrupt_record');
 const {metadata,snapshot,execution,provider,metrics,result}=bundle;
 const fullFindings=result?.modelResponse.findings??[],ordered=[...fullFindings].sort((a,b)=>['error','warning','info'].indexOf(a.severity)-['error','warning','info'].indexOf(b.severity));
 const shown=view==='full'?fullFindings:ordered.slice(0,maxSummaryFindings);
 return {assessment:bundle.assessment,assessmentAvailability:bundle.assessmentAvailability,currentActions:bundle.assessment?projectCurrentActions(bundle.assessment):null,identity:{...metadata,stage:snapshot?.stage??null,currentSourceId:snapshot?.currentSourceId??null},view,reviewExecution:execution?.status??provider?.status??'not_recorded',gradeBandAssessment:'not_assessed',remoteSubmission:'not_verified',elapsedMs:execution?.elapsedMs??provider?.elapsedMs??null,metrics,metricsAvailability:bundle.metricsAvailability,resultAvailability:result?'validated':metadata.status==='succeeded'?'not_recorded':'unavailable',coverage:result?.modelResponse.coverage??[],fullFindings,summaryFindingIds:shown.map(f=>f.findingId),allFindingIds:fullFindings.map(f=>f.findingId),omittedFromSummaryCount:fullFindings.length-shown.length,limitations:result?.limitations??snapshot?.limitations??[],requirementMapping:'unmapped',fullRecord:{action:'full',taskId:metadata.taskId,[metadata.selection==='historical'?'historicalRunId':'expectedRunId']:metadata.runId}};
}
// Escape untrusted text as inert Markdown data, including app directives and ANSI/control bytes.
export const escapeReviewText=value=>String(value).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'�').replace(/[&<>\\`*_{}\[\]()!#|:]/g,c=>'&#'+c.codePointAt(0)+';');
export function renderReviewHandoff(handoff){
 const esc=escapeReviewText,h=handoff;
 const lines=[`Run ${esc(h.identity.runId)} (${esc(h.identity.selection)})`, `Task ${esc(h.identity.taskId)} / stage ${esc(h.identity.stage)} / current ${esc(h.identity.currentSourceId)}`,`Execution ${esc(h.reviewExecution)}; elapsed ${h.elapsedMs??'unavailable'} ms; grade ${h.gradeBandAssessment}; submission ${h.remoteSubmission}`,`Result ${h.resultAvailability}; usage ${h.metricsAvailability}`];
 if(h.metrics){lines.push(`Requested model ${esc(h.metrics.requestedModel?.value??'unavailable')} (local launch args); reported model unavailable`);for(const [name,v] of Object.entries(h.metrics.usage))if(v&&typeof v==='object')lines.push(`${esc(name)}: ${v.value??'unavailable'} (${esc(v.state)}, ${esc(v.sourcePath??'not observed')})`);lines.push(...h.metrics.limitations.map(esc));}
 lines.push('Source coverage',...h.coverage.map(c=>`${esc(c.sourceId)}: ${esc(c.status)}; excerpts ${c.excerptIds.map(esc).join(', ')}`));
 if(h.allFindingIds.length===0)lines.push(h.resultAvailability==='validated'?'No confirmed findings within supplied coverage.':'No validated result available.');
 const selected=new Set(h.summaryFindingIds);let summaryBytes=0,omitted=h.omittedFromSummaryCount;
 for(const f of h.fullFindings){if(!selected.has(f.findingId))continue;const block=[`Finding ${esc(f.findingId)} / ${esc(f.severity)} / ${esc(f.kind)}`,esc(f.claim),...f.evidence.map(e=>`${esc(e.sourceId)}/${esc(e.excerptId)} bytes ${e.startByte}–${e.endByte}: ${esc(e.quote)}`),`Action: ${esc(f.action??'none')}`].join('\n');if(h.view==='summary'&&summaryBytes+Buffer.byteLength(block)>6000){omitted++;continue;}summaryBytes+=Buffer.byteLength(block);lines.push(block);}
 if(h.view==='summary')lines.push(`Omitted from summary: ${omitted}. Complete same-run record: ${esc(JSON.stringify(h.fullRecord))}`);
 lines.push(`Comparison ${esc(h.assessmentAvailability??'not_recorded')}; host judgment, semantic verification required`);
 if(h.assessment){lines.push('Host requirement-to-evidence matrix',...h.assessment.requirements.map(r=>`${esc(r.requirementId)} | ${esc(r.status)} | ${esc(r.rationale)} | ${esc(JSON.stringify(r.evidence))}`),'Host finding transitions',...h.assessment.findings.map(f=>`${esc(f.findingId)} | ${esc(f.state)} | ${esc(f.actionDisposition)} | ${esc(f.rationale)} | ${esc(JSON.stringify(f.evidence))}`),'Current actions',esc(JSON.stringify(h.currentActions)));}
 lines.push('Limits',...h.limitations.map(esc));return lines.join('\n\n')+'\n';
}
