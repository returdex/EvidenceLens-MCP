#!/usr/bin/env node
import { realpath } from 'node:fs/promises';import { pathToFileURL } from 'node:url';
import { readRunRecord,annotateRun } from './prompt-store.mjs';
import { buildReviewHandoff,renderReviewHandoff,buildReviewPair,renderReviewPair } from './review-handoff.mjs';
import {buildReviewSynthesis,renderReviewSynthesis} from './review-synthesis.mjs';
import { fields,fail,safeError,uuid,id,decode,LIMITS } from './prompt-contract.mjs';
export async function main(args){
 try{
  const [action,...flags]=args;if(!['show','full','annotate','pair','synthesize'].includes(action)||flags.length)fail('unsupported');
  let size=0;const chunks=[];for await(const c of process.stdin){size+=c.length;if(size>LIMITS.stdin)fail('store_limit');chunks.push(c);}
  let raw;try{raw=JSON.parse(decode(Buffer.concat(chunks)));}catch{fail('corrupt_record');}
  const keys=action==='synthesize'?['taskId','runIds','assessment','view','maxSummaryFindings']:action==='pair'?['taskId','runIds','view','maxSummaryFindings']:action==='annotate'?['taskId','expectedRunId','admittedPriorSummaries','assessment']:['taskId','expectedRunId','historicalRunId',...(action==='show'?['view','maxSummaryFindings']:[])];
  const v=fields(raw,Object.keys(raw));if(Object.keys(v).some(k=>!keys.includes(k)))fail('corrupt_record');
  const conversationId=process.env.CODEX_THREAD_ID;if(!uuid(conversationId)||!id(v.taskId))fail('identity_required');const scope={taskId:v.taskId,conversationId};
  let result;
  if(action==='synthesize'){
   if(!Array.isArray(v.runIds)||v.runIds.length<1||v.runIds.length>2||!v.runIds.every(uuid))fail('identity_required');
   const bundles=[];for(const runId of v.runIds)bundles.push(await readRunRecord(scope,{historicalRunId:runId}));
   const synthesis=buildReviewSynthesis(bundles,v.assessment??null,{view:v.view??'full',maxSummaryFindings:v.maxSummaryFindings??5});result={synthesis,markdown:renderReviewSynthesis(synthesis)};
  }else if(action==='pair'){
   if(!Array.isArray(v.runIds)||v.runIds.length!==2||!v.runIds.every(uuid))fail('identity_required');
   const bundles=[];for(const runId of v.runIds)bundles.push(await readRunRecord(scope,{historicalRunId:runId}));
   const pair=buildReviewPair(...bundles,{view:v.view??'full',maxSummaryFindings:v.maxSummaryFindings??5});result={pair,markdown:renderReviewPair(pair)};
  }else if(action==='annotate'){
   if(!uuid(v.expectedRunId)||!Object.hasOwn(v,'assessment')||!Object.hasOwn(v,'admittedPriorSummaries'))fail('identity_required');
   result=await annotateRun(scope,v);
  }else{
   const bundle=await readRunRecord(scope,{expectedRunId:v.expectedRunId,historicalRunId:v.historicalRunId});
   if(action==='full')result=bundle;
   else {const handoff=buildReviewHandoff(bundle,{view:v.view??'full',maxSummaryFindings:v.maxSummaryFindings??5});result={handoff,markdown:renderReviewHandoff(handoff)};}
  }
  const output=JSON.stringify(result)+'\n';if(Buffer.byteLength(output)>16*1024*1024)fail('store_limit');
  await new Promise((resolve,reject)=>process.stdout.write(output,e=>e?reject(e):resolve()));
 }catch(e){process.stderr.write(JSON.stringify(safeError(e))+'\n');process.exitCode=1;}
}
const entry=process.argv[1]?await realpath(process.argv[1]).catch(()=>null):null;
if(entry&&import.meta.url===pathToFileURL(entry).href)await main(process.argv.slice(2));
