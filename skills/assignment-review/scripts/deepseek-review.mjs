#!/usr/bin/env node
import { realpath } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureEvidencePrompt } from './codex-review.mjs';
import { parseEvidenceCapsule, CODEX_LIMITS } from './codex-contract.mjs';
import { validateBoundCodexResult } from './codex-result.mjs';
import { claimHostProviderRun, completeHostProviderRun, readHostProviderRun } from './prompt-store.mjs';
import { fields, array, text, uuid, id, decode, LIMITS, fail, safeError } from './prompt-contract.mjs';

// The installed symlink resolves here. Reuse the built provider config and bounded reader.
const runtimeUrl = new URL('../../../dist/providers/', import.meta.url);
const configPath = fileURLToPath(new URL('../../../.evidencelens.local.json', import.meta.url));
async function runtime() {
 try {
  const [config,provider] = await Promise.all([import(new URL('config.js',runtimeUrl).href),import(new URL('deepseek.js',runtimeUrl).href)]);
  return {loadConfig:()=>config.loadProviderConfig(configPath,config.hasProviderCredentialSource(configPath,{})?{}:process.env),readJson:provider.readBoundedJson};
 } catch { const e=new Error('unsupported');e.code='unsupported';e.trigger='runtime_unavailable';throw e; }
}
function configuration(loadConfig) {
 try { return loadConfig(); }
 catch { const e=new Error('unsupported');e.code='unsupported';e.trigger='configuration_unavailable';throw e; }
}
export async function preflightDeepSeek() {
 if(process.env.EVIDENCELENS_DISABLE_PROVIDER==='1')return {ok:false,code:'unsupported',trigger:'provider_disabled',inference:'not_run'};
 if(process.env.EVIDENCELENS_CHILD==='1')return {ok:false,code:'recursive_call',trigger:'recursive_call',inference:'not_run'};
 try {const rt=await runtime(),config=configuration(rt.loadConfig);return {ok:true,provider:'deepseek',model:config.model,inference:'not_run'};}
 catch(e){return {ok:false,...safeError(e),trigger:e.trigger??'configuration_unavailable',inference:'not_run'};}
}
export const captureDeepSeekPrompt=(scope,runId,input)=>captureEvidencePrompt(scope,runId,input,'host_skill');
// Trusted in-process seam only; CLI accepts no endpoint, model, credential, or adapter.
export async function runCapturedDeepSeek(scope,runId,{signal}={},adapter) {
 const snapshot=await claimHostProviderRun(scope,runId);
 const started=Date.now(),controller=new AbortController();
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
 let timeout,expired=false,result=null;
 const execution={schemaVersion:1,provider:'deepseek',runId,taskId:snapshot.taskId,conversationId:snapshot.conversationId,promptSha256:snapshot.promptSha256,status:'failed',errorCode:null,model:null,reportedModel:null,elapsedMs:0,observedRequests:0,httpStatus:null,trigger:null,resultSha256:null};
 let stage='preflight';
 try {
  if(process.env.EVIDENCELENS_DISABLE_PROVIDER==='1'){execution.trigger='provider_disabled';fail('unsupported');}
  if(process.env.EVIDENCELENS_CHILD==='1'){execution.trigger='recursive_call';fail('recursive_call');}
  if(signal?.aborted){controller.abort();throw new Error('aborted');}
  parseEvidenceCapsule(snapshot);
  const rt=adapter??await runtime(),config=configuration(rt.loadConfig);
  execution.model=config.model;
  const deadline=Math.max(1,Math.min(adapter?.timeoutMs??CODEX_LIMITS.reviewMs,CODEX_LIMITS.reviewMs));
  timeout=setTimeout(()=>{expired=true;controller.abort();},deadline);
  stage='request';execution.observedRequests=1;
  const response=await (rt.fetch??fetch)(config.baseUrl+'/chat/completions',{
   method:'POST',redirect:'error',signal:controller.signal,
   headers:{'content-type':'application/json',authorization:'Bearer '+config.apiKey},
   body:JSON.stringify({model:config.model,messages:[{role:'user',content:snapshot.promptText}],response_format:{type:'json_object'},stream:false,
    ...(config.model==='deepseek-v4-flash-vision-exp'?{}:{thinking:{type:'enabled'},reasoning_effort:'high'}),
    ...(config.maxTokens===undefined?{}:{max_tokens:config.maxTokens})})
  });
  execution.httpStatus=response.status;
  if(response.status!==200){await response.body?.cancel().catch(()=>{});execution.trigger='http_error';fail('uncertain');}
  stage='response';const body=await rt.readJson(response),choice=body?.choices?.[0];
  // Discard reasoning_content. Length/tool/error finishes never promote partial JSON.
  if(!Array.isArray(body?.choices)||body.choices.length!==1||choice.finish_reason!=='stop'||choice.message?.tool_calls||typeof choice.message?.content!=='string'||!choice.message.content.trim())fail('result_invalid');
  if(typeof body.model==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(body.model))execution.reportedModel=body.model;
  stage='validation';result=validateBoundCodexResult(snapshot,choice.message.content);
  if(controller.signal.aborted)throw new Error('aborted');
  execution.status='succeeded';execution.resultSha256=result.resultSha256;
 } catch(e) {
  result=null;
  execution.status=signal?.aborted?'cancelled':execution.observedRequests?'uncertain':'failed';
  execution.errorCode=signal?.aborted?null:expired?'timed_out':stage==='request'?'uncertain':stage==='response'?'result_invalid':safeError(e).code;
  execution.trigger=signal?.aborted?'aborted':expired?'deadline_exceeded':execution.trigger??e.trigger??({request:'network_error',response:'response_invalid',validation:'result_rejected'}[stage]??'configuration_unavailable');
 } finally {clearTimeout(timeout);signal?.removeEventListener('abort',abort);execution.elapsedMs=Date.now()-started;}
 // Store the validated result and safe provider receipt before advertising success.
 return completeHostProviderRun(scope,runId,{execution,result,signal});
}
async function readInput(){let n=0;const chunks=[];for await(const chunk of process.stdin){n+=chunk.length;if(n>LIMITS.stdin)fail('store_limit');chunks.push(chunk);}try{return JSON.parse(decode(Buffer.concat(chunks)));}catch{fail('corrupt_record');}}
export async function main(args){
 const controller=new AbortController(),cancel=()=>controller.abort();let runId;
 try {
  const [action,...rest]=args;if(rest.length||!['preflight','capture','run','diagnose'].includes(action))fail('unsupported');
  const raw=await readInput(),keys={preflight:[],capture:['taskId','runId','snapshot','capsule','admitted','evidenceRoots','conversationId'],run:['taskId','runId','evidenceRoots','conversationId'],diagnose:['taskId','runId','evidenceRoots','conversationId']};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys[action].includes(k)))fail('corrupt_record');
  const v=fields(raw,Object.keys(raw));runId=v.runId;let result;
  if(action==='preflight')result=await preflightDeepSeek();
  else {
   const conversationId=process.env.CODEX_THREAD_ID;
   if(!uuid(conversationId)||v.conversationId!==undefined&&v.conversationId!==conversationId||!id(v.taskId)||!uuid(runId))fail('identity_required');
   const scope={conversationId,taskId:v.taskId,evidenceRoots:v.evidenceRoots===undefined?[]:array(v.evidenceRoots,100,x=>text(x))};
   if(action==='capture')result=await captureDeepSeekPrompt(scope,runId,{snapshot:v.snapshot,capsule:v.capsule,admitted:v.admitted});
   else if(action==='diagnose')result=await readHostProviderRun(scope,runId);
   else {process.on('SIGINT',cancel);process.on('SIGTERM',cancel);result=await runCapturedDeepSeek(scope,runId,{signal:controller.signal});}
  }
  process.stdout.write(JSON.stringify(result)+'\n');if(result.ok===false||action==='run'&&result.status!=='succeeded')process.exitCode=1;
 } catch(e){process.stderr.write(JSON.stringify({...safeError(e),...(uuid(runId)?{runId}:{})})+'\n');process.exitCode=1;}
 finally {process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
const entry=process.argv[1]?await realpath(process.argv[1]).catch(()=>null):null;
if(entry&&import.meta.url===pathToFileURL(entry).href)await main(process.argv.slice(2));
