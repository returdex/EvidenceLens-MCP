#!/usr/bin/env node
import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { beginRun,captureRun,readForDispatch,finishRun,exportLatest,forgetTask,statusTask } from './prompt-store.mjs';
import { fail,safeError,uuid,id,decode,fields,array,text,LIMITS,TERMINAL } from './prompt-contract.mjs';

// Seam for a future runner. This module supplies no provider or model implementation.
export async function consumeCaptured(scope,runId,consumer){
 if(typeof consumer!=='function')fail('unsupported');
 const dispatched=await readForDispatch(scope,runId);
 let result;
 try{result=await consumer(Buffer.from(dispatched.promptText,'utf8'));}
 catch{await finishRun(scope,runId,{status:'failed',errorCode:'uncertain'}).catch(()=>{});fail('uncertain');}
 await finishRun(scope,runId,{status:'succeeded'});return result;
}
async function output(stream,bytes){await new Promise((resolve,reject)=>{const onError=e=>reject(e);stream.once('error',onError);stream.write(bytes,e=>{stream.removeListener('error',onError);if(e)reject(e);else resolve();});});}
async function input(){const chunks=[];let size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>LIMITS.stdin)fail('store_limit');chunks.push(chunk);}try{return JSON.parse(decode(Buffer.concat(chunks)));}catch{fail('corrupt_record');}}
export async function main(args){
 let scope,runId,dispatchStarted=false;
 try{
  const [action,...flags]=args;
  if(!['begin','capture','dispatch','finish','export','status','forget-task'].includes(action))fail('unsupported');
  let format='json',apply=false;
  for(const flag of flags){if(['--format=json','--format=raw'].includes(flag)&&['dispatch','export'].includes(action))format=flag.slice(9);else if(flag==='--apply'&&action==='forget-task'&&!apply)apply=true;else fail('unsupported');}
  const raw=await input();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('corrupt_record');
  const common=['taskId','conversationId','evidenceRoots'];
  const keys={begin:[],capture:['runId','snapshot'],dispatch:['runId'],finish:['runId','status','errorCode'],export:['expectedRunId'],status:[],'forget-task':[]};
  if(Object.keys(raw).some(k=>![...common,...keys[action]].includes(k)))fail('corrupt_record');
  const v=fields(raw,Object.keys(raw));
  const conversationId=process.env.CODEX_THREAD_ID;
  if(!uuid(conversationId)||v.conversationId!==undefined&&v.conversationId!==conversationId)fail('identity_required');
  if(v.taskId!==undefined&&!id(v.taskId))fail('identity_required');
  const evidenceRoots=v.evidenceRoots===undefined?[]:array(v.evidenceRoots,100,x=>text(x));
  scope={conversationId,taskId:v.taskId,evidenceRoots};
  if(v.runId!==undefined&&!uuid(v.runId)||v.expectedRunId!==undefined&&!uuid(v.expectedRunId))fail('identity_required');
  runId=v.runId??v.expectedRunId;
  let result;
  if(action==='begin')result=await beginRun(scope);
  else if(action==='capture')result=await captureRun(scope,runId,v.snapshot);
  else if(action==='dispatch'){result=await readForDispatch(scope,runId);dispatchStarted=true;}
  else if(action==='finish'){if(!TERMINAL.includes(v.status))fail('corrupt_record');result=await finishRun(scope,runId,{status:v.status,errorCode:v.errorCode??null});}
  else if(action==='export')result=await exportLatest(scope,{expectedRunId:v.expectedRunId});
  else if(action==='status')result=await statusTask(scope);
  else result=await forgetTask(scope,{apply});
  if(format==='raw'){
   await output(process.stderr,JSON.stringify(result.metadata)+'\n');
   await output(process.stdout,Buffer.from(result.promptText,'utf8'));
  }else await output(process.stdout,JSON.stringify(result)+'\n');
  if(result.ok===false)process.exitCode=1;
 }catch(e){
  if(dispatchStarted)await finishRun(scope,runId,{status:'uncertain',errorCode:'uncertain'}).catch(()=>{});
  await output(process.stderr,JSON.stringify({...safeError(e),...(uuid(runId)?{runId}:{}),...(['preparing','captured','dispatched',...TERMINAL].includes(e?.status)?{status:e.status}:{})})+'\n').catch(()=>{});process.exitCode=1;
 }
}
const entry=process.argv[1] ? await realpath(process.argv[1]).catch(()=>null) : null;
if(entry&&import.meta.url===pathToFileURL(entry).href)await main(process.argv.slice(2));
