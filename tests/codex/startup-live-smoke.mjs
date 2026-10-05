// Manual, one-shot host acceptance. Dry-run by default, including test discovery.
import {pathToFileURL} from 'node:url';
import {realpath} from 'node:fs/promises';
import {beginRun,exportLatest} from '../../skills/assignment-review/scripts/prompt-store.mjs';
import {captureCodexPrompt} from '../../skills/assignment-review/scripts/codex-review.mjs';
import {runCapturedCodex} from '../../skills/assignment-review/scripts/codex-runner.mjs';
import {sha256,uuid} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
export const source='Synthetic requirement: preserve 中文🙂 and original whitespace exactly.';
export const prompt=`## 1. Task\nPerform a preparation review of this synthetic requirement. No draft exists.\n\n## 2. Sources\nUse only source R1 and excerpt E1 in the appended evidence capsule.\n\n## 3. Review\nDetermine whether the requirement is clear enough to start work. Do not invent rubric criteria.\n\n## 4. Output\nReturn only JSON matching the required output schema. Copy runId/taskId/stage/currentSourceId from the capsule. Cover source R1 with excerpt E1. Include one observation with the complete exact source text as its evidence quote so local Unicode binding is exercised. Evidence contains only sourceId, excerptId, quote; do not calculate byte offsets. The runtime guide supplies schemaVersion=2.\n\n## 5. Constraints\nDo not call tools, read files, run commands or access any external sources.\n\n## 6. Limitations\nThis is a synthetic startup smoke test, not a coursework assessment or submission.\n`;
export async function main(args){
 if(args.length===0){console.log(JSON.stringify({mode:'dry-run',model:'gpt-6.1-sol',maxRuns:1,source,sourceSha256:sha256(source),promptTemplate:prompt,promptTemplateSha256:sha256(prompt)}));return;}
 if(args.length!==1||args[0]!=='--execute-authorized-once')throw Error('unsupported');
 if(!uuid(process.env.CODEX_THREAD_ID))throw Error('identity_required');
 const scope={taskId:'T-codex-startup-smoke',conversationId:process.env.CODEX_THREAD_ID};
 const receipt=await beginRun(scope,{executionKind:'codex_exec'});
 const identity={runId:receipt.runId,taskId:receipt.taskId,conversationId:receipt.conversationId,stage:'preparation',currentSourceId:null};
 const snapshot={schemaVersion:1,...identity,sequence:receipt.sequence,reviewMode:'artifact_only',promptText:prompt,promptSha256:sha256(prompt),capturedAt:new Date().toISOString(),materials:[{sourceId:'R1',role:'requirements',status:'inspected',sourceReference:'synthetic-inline',inspectedParts:['full text'],observedAt:new Date().toISOString(),hashKind:'sha256_utf8',contentHash:sha256(source),availability:'inline_excerpt'}],limitations:['Synthetic startup test only; no assignment materials.']};
 const capsule={schemaVersion:1,...identity,sources:[{sourceId:'R1',sourceHash:sha256(source),excerpts:[{excerptId:'E1',startByte:0,endByte:Buffer.byteLength(source),text:source,excerptSha256:sha256(source),locator:'full synthetic text'}]}]};
 await captureCodexPrompt(scope,receipt.runId,{snapshot,capsule,admitted:[{sourceId:'R1',text:source}]});
 const before=await exportLatest(scope,{expectedRunId:receipt.runId});
 const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
 let result;try{result=await runCapturedCodex(scope,receipt.runId,{signal:controller.signal});}finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
 const after=await exportLatest(scope,{expectedRunId:receipt.runId});
 console.log(JSON.stringify({sourceSha256:sha256(source),promptTemplateSha256:sha256(prompt),exactExportUnchanged:before.promptText===after.promptText,...result}));
 if(result.status!=='succeeded')process.exitCode=1;
}
const entry=process.argv[1]?await realpath(process.argv[1]).catch(()=>null):null;
if(entry&&import.meta.url===pathToFileURL(entry).href)await main(process.argv.slice(2));
