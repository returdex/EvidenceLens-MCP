#!/usr/bin/env node
import {realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {captureRun} from './prompt-store.mjs';
import {sha256,uuid,id,fields,array,text,decode,LIMITS,fail,safeError} from './prompt-contract.mjs';
import {renderEvidenceCapsule,parseEvidenceCapsule} from './codex-contract.mjs';
import {preflightCodex} from './codex-preflight.mjs';
import {createIsolatedLaunch} from './codex-isolation.mjs';
import {runCapturedCodex} from './codex-runner.mjs';
export async function captureCodexPrompt(scope,runId,input){
 const v=fields(input,['snapshot','capsule','admitted']);
 const block=renderEvidenceCapsule(v.capsule,v.snapshot,v.admitted);
 const promptText=v.snapshot.promptText+'\n\n'+block,snapshot={...v.snapshot,promptText,promptSha256:sha256(promptText)};
 parseEvidenceCapsule(snapshot);
 return captureRun(scope,runId,snapshot,{executionKind:'codex_exec'});
}
export async function isolatedPreflight(){
 const receipt=await preflightCodex();if(!receipt.ok)return receipt;
 const launch=await createIsolatedLaunch({executableReceipt:receipt,runId:randomUUID()});
 await launch.cleanup();return {...receipt,executionReady:true,policySha256:launch.policySha256,contractSha256:launch.contractSha256,model:'gpt-5.4',inference:'not_run'};
}
async function readInput(){const chunks=[];let n=0;for await(const c of process.stdin){n+=c.length;if(n>LIMITS.stdin)fail('store_limit');chunks.push(c);}try{return JSON.parse(decode(Buffer.concat(chunks)));}catch{fail('corrupt_record');}}
export async function main(args){
 const abort=new AbortController(),cancel=()=>abort.abort();let runId;
 try{
  const [action,...rest]=args;if(rest.length||!['preflight','capture','run'].includes(action))fail('unsupported');
  const raw=await readInput(),common=['taskId','conversationId','evidenceRoots'],specific={preflight:[],capture:['runId','snapshot','capsule','admitted'],run:['runId']};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>![...common,...specific[action]].includes(k)))fail('corrupt_record');
  const v=fields(raw,Object.keys(raw));runId=v.runId;
  let result;
  if(action==='preflight')result=await isolatedPreflight();
  else {
   const conversationId=process.env.CODEX_THREAD_ID;
   if(!uuid(conversationId)||v.conversationId!==undefined&&v.conversationId!==conversationId||!id(v.taskId)||!uuid(v.runId))fail('identity_required');
   const scope={conversationId,taskId:v.taskId,evidenceRoots:v.evidenceRoots===undefined?[]:array(v.evidenceRoots,100,x=>text(x))};
   if(action==='capture')result=await captureCodexPrompt(scope,v.runId,{snapshot:v.snapshot,capsule:v.capsule,admitted:v.admitted});
   else {process.on('SIGINT',cancel);process.on('SIGTERM',cancel);result=await runCapturedCodex(scope,v.runId,{signal:abort.signal});}
  }
  process.stdout.write(JSON.stringify(result)+'\n');if(result.ok===false||action==='run'&&result.status!=='succeeded')process.exitCode=1;
 }catch(e){process.stderr.write(JSON.stringify({...safeError(e),...(uuid(runId)?{runId}:{})})+'\n');process.exitCode=1;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
const entry=process.argv[1]?await realpath(process.argv[1]).catch(()=>null):null;
if(entry&&import.meta.url===pathToFileURL(entry).href)await main(process.argv.slice(2));
