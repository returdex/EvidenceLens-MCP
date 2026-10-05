// Manual acceptance: no inference in test discovery or the default dry-run.
import {homedir} from 'node:os';
import {realpath} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
import {sha256,uuid} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
export const requirements='R-EVIDENCE (mandatory): The draft must contain the exact line "Evidence: supplied".\nR-STYLE (optional): A descriptive heading is preferred; "Heading: Demo" may be retained as an info-level improvement, never a mandatory defect.\n';
export const drafts=['Evidence: missing\nHeading: Demo\n','Evidence: supplied\nHeading: Demo\n'];
export const templates=drafts.map((_,i)=>`## 1. Task\n${i?'Recheck the revised current draft':'Check the initial current draft'} for this synthetic task only. Stage in_progress.\n\n## 2. Sources\nUse only the appended R1 requirement and S1 current-draft excerpts. No files, external sources, old drafts or private coursework.\n\n## 3. Review\nCheck R-EVIDENCE and R-STYLE separately. The optional heading is an info-level suggestion, not a mandatory defect. ${i?'Use the admitted source-bound prior summary below as comparison input, not current evidence. Recheck current S1; a corrected mandatory defect must not remain a current fix, while the optional heading improvement remains applicable.\n{{ADMITTED_PRIOR_SUMMARY}}':'Identify the missing mandatory evidence line and preserve the optional heading suggestion.'}\n\n## 4. Output\nReturn the complete source-bound JSON using the runtime v3 schema. Use FREQ for a confirmed missing mandatory line if present, and FSTYLE for the optional suggestion. Explain each conclusion with captured references, concrete action and coverage limits. Do not claim HD, submission, universal correctness or hidden reasoning.\n\n## 5. Constraints\nNo tools, commands, network lookup or source reread. No invented requirements, grading weights, retries or model switches.\n\n## 6. Limitations\nFabricated tiny acceptance task only. Structural/reference validity is distinct from semantic correctness. Host annotation will separately evaluate current-proof closure and the retained optional action.\n`);
export const reviewedInputs=()=>({mode:'dry-run',requestedModel:'gpt-6.1-sol',provider:'Codex ChatGPT login',maxLogicalRuns:2,noAutomaticRetry:true,requirements,requirementSha256:sha256(requirements),drafts:drafts.map((text,i)=>({text,sourceSha256:sha256(text),template:templates[i],templateSha256:sha256(templates[i])})),oracle:{initial:['FREQ error for missing mandatory line','FSTYLE info for optional heading'],recheck:['FREQ closed by current Evidence: supplied','FSTYLE retained info'],notProven:'No coursework/grade/DeepSeek paired-default acceptance'}});
export function makeLiveCapture(receipt,index,priorSummary=null){
 const prompt=templates[index].replace('{{ADMITTED_PRIOR_SUMMARY}}',priorSummary===null?'Comparison history unavailable; review current evidence only.':JSON.stringify(priorSummary));
 const identity={runId:receipt.runId,taskId:receipt.taskId,conversationId:receipt.conversationId,stage:'in_progress',currentSourceId:'S1'},texts=[['R1',requirements],['S1',drafts[index]]],time=new Date().toISOString();
 const sources=texts.map(([sourceId,content])=>{let start=0;return {sourceId,sourceHash:sha256(content),excerpts:content.trimEnd().split('\n').map((line,i)=>{const e={excerptId:'E'+(i+1),startByte:start,endByte:start+Buffer.byteLength(line),text:line,excerptSha256:sha256(line),locator:'line '+(i+1)};start=e.endByte+1;return e;})};});
 return {snapshot:{schemaVersion:1,...identity,sequence:receipt.sequence,reviewMode:'artifact_only',promptText:prompt,promptSha256:sha256(prompt),capturedAt:time,materials:texts.map(([sourceId,content])=>({sourceId,role:sourceId==='R1'?'requirements':'solution',status:'inspected',sourceReference:'synthetic-phase21-inline',inspectedParts:['full synthetic text'],observedAt:time,hashKind:'sha256_utf8',contentHash:sha256(content),availability:'inline_excerpt'})),limitations:['Synthetic two-source text only; no coursework or grade acceptance.']},capsule:{schemaVersion:1,...identity,sources},admitted:texts.map(([sourceId,text])=>({sourceId,text}))};
}
export async function main(args){
 if(args.length===0){console.log(JSON.stringify(reviewedInputs()));return;}
 if(args.length!==1||args[0]!=='--execute-authorized-pair'||!uuid(process.env.CODEX_THREAD_ID))throw Error('unsupported');
 const installed=name=>pathToFileURL(homedir()+'/.agents/skills/assignment-review/scripts/'+name+'.mjs').href;
 const {beginRun,exportLatest,readRunRecord}=await import(installed('prompt-store'));
 const {captureCodexPrompt}=await import(installed('codex-review'));const {runCapturedCodex}=await import(installed('codex-runner'));
 const scope={taskId:'T-phase21-live-pair',conversationId:process.env.CODEX_THREAD_ID};
 const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
 try{
  let priorSummary=null;
  for(let i=0;i<2;i++){
   const receipt=await beginRun(scope,{executionKind:'codex_exec'});if(!receipt.ok)throw Error('begin_failed');
   await captureCodexPrompt(scope,receipt.runId,makeLiveCapture(receipt,i,priorSummary));const before=await exportLatest(scope,{expectedRunId:receipt.runId});
   const outcome=await runCapturedCodex(scope,receipt.runId,{signal:controller.signal});const after=await exportLatest(scope,{expectedRunId:receipt.runId});
   const bundle=await readRunRecord(scope,{expectedRunId:receipt.runId});console.log(JSON.stringify({index:i,sourceSha256:sha256(drafts[i]),templateSha256:sha256(templates[i]),exactExportUnchanged:before.promptText===after.promptText,bundle}));
   if(outcome.status!=='succeeded'||before.promptText!==after.promptText){process.exitCode=1;break;}
   priorSummary={taskId:bundle.metadata.taskId,runId:bundle.metadata.runId,resultSha256:bundle.result.resultSha256,sourceScope:'synthetic Phase 21 only',findings:bundle.result.modelResponse.findings};
   // The reviewed procedure injects only the preceding validated synthetic summary; no resend.
  }
 }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.env.NODE_TEST_CONTEXT){
 const {default:test}=await import('node:test'),{default:assert}=await import('node:assert/strict');
 test('reviewable live pair is synthetic, bounded and dry by default',async()=>{const inputs=reviewedInputs();assert.equal(inputs.maxLogicalRuns,2);assert.equal(inputs.noAutomaticRetry,true);assert.notEqual(inputs.drafts[0].sourceSha256,inputs.drafts[1].sourceSha256);assert.equal(inputs.requirementSha256,sha256(requirements));assert.ok(templates.every(x=>(x.match(/^## /gm)??[]).length===6));assert.equal(drafts[0].split('\n')[1],drafts[1].split('\n')[1]);});
}
const entry=process.argv[1]?await realpath(process.argv[1]).catch(()=>null):null;
if(entry&&import.meta.url===pathToFileURL(entry).href&&!process.env.NODE_TEST_CONTEXT)await main(process.argv.slice(2));
