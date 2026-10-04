import { validateBoundCodexResult } from './codex-result.mjs';
import { spawn } from 'node:child_process';
import { CODEX_LIMITS,codexFail,codexError,parseEvidenceCapsule } from './codex-contract.mjs';
import { decode } from './prompt-contract.mjs';
import { claimCodexRun,recordCodexScratch,readForDispatch,completeCodexRun } from './prompt-store.mjs';
import { preflightCodex } from './codex-preflight.mjs';
import { createIsolatedLaunch,assertCertifiedLaunch,toolAttempt } from './codex-isolation.mjs';

// Internal library seam for deterministic process fixtures; never exposed as CLI arguments.
export function superviseCodexProcess(launch,input,{signal,timeoutMs=CODEX_LIMITS.reviewMs}={}){
 return new Promise(resolve=>{
  let child,settled=false,closed=false,reason=null,bytes=0,thread=false,turn=false,terminal=false,final=null,stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),termTimer,hardTimer;
  const started=Date.now(),groupSignal=s=>{try{if(child?.pid)process.kill(-child.pid,s);}catch(e){if(e.code!=='ESRCH')reason='uncertain';}};
  const done=(exitCode,cleanupComplete)=>{
   if(settled)return;settled=true;clearTimeout(deadline);clearTimeout(termTimer);clearTimeout(hardTimer);signal?.removeEventListener('abort',abort);
   const code=reason??(!thread||!turn||!terminal||final===null||exitCode!==0?'uncertain':null);
   resolve({status:code==='cancelled'?'cancelled':code==='uncertain'||!cleanupComplete?'uncertain':code?'failed':'candidate',code:code==='cancelled'?null:code,terminalObserved:terminal,cleanupComplete,elapsedMs:Date.now()-started,candidate:code?null:final});
   stdout=stderr=Buffer.alloc(0);final=null;
  };
  const stop=code=>{
   if(settled)return;if(code==='cancelled'||!reason)reason=code;
   groupSignal('SIGTERM');
   if(!termTimer)termTimer=setTimeout(()=>groupSignal('SIGKILL'),CODEX_LIMITS.graceMs);
   if(!hardTimer)hardTimer=setTimeout(()=>{groupSignal('SIGKILL');child?.stdout.destroy();child?.stderr.destroy();done(null,false);},CODEX_LIMITS.graceMs*2);
  };
  const abort=()=>stop('cancelled');
  const deadline=setTimeout(()=>stop('timed_out'),Math.max(1,Math.min(timeoutMs,CODEX_LIMITS.reviewMs)));
  function line(raw,isError){
   const text=decode(raw);if(!text.trim())return;
   if(isError){
    if(toolAttempt('',text))return stop('uncertain');
    // These startup diagnostics are proven consequences of denied global context/cache writes.
    if(/^WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted \(os error 1\)$/.test(text))return;
    if(/^\S+ ERROR codex_core_skills::manager: failed to install system skills: io error while create (?:skills root|system skills) dir: Operation not permitted \(os error 1\)$/.test(text))return;
    if(/^\S+ ERROR codex_models_manager::cache: failed to write models cache: Operation not permitted \(os error 1\)$/.test(text))return;
    if(text.endsWith(' ERROR codex_core_skills::loader: failed to read skills dir '+launch.env.CODEX_HOME+'/skills: Operation not permitted (os error 1)')&&/^\S+ ERROR /.test(text))return;
    return stop('protocol_invalid');
   }
   let e;try{e=JSON.parse(text);}catch{return stop('protocol_invalid');}
   if(!e||typeof e!=='object')return stop('protocol_invalid');
   if(e.type==='thread.started'){if(thread||turn||terminal||typeof e.thread_id!=='string')return stop('protocol_invalid');thread=true;return;}
   if(e.type==='turn.started'){if(!thread||turn||terminal)return stop('protocol_invalid');turn=true;return;}
   if(e.type==='turn.completed'){if(!turn||terminal||final===null)return stop('protocol_invalid');terminal=true;return;}
   if(['turn.failed','error'].includes(e.type))return stop('uncertain');
   if(e.type==='item.completed'&&e.item?.type==='error'&&!turn&&thread){
    const expected='Failed to read global AGENTS.md instructions from `'+launch.env.CODEX_HOME+'/AGENTS.md`: Operation not permitted (os error 1)';
    if(e.item.message===expected)return;return stop('protocol_invalid');
   }
   if(!turn||terminal)return stop('protocol_invalid');
   if(e.type==='item.completed'&&e.item?.type==='agent_message'){
    if(final!==null||typeof e.item.text!=='string'||Buffer.byteLength(e.item.text)>CODEX_LIMITS.final)return stop('result_invalid');final=e.item.text;return;
   }
   if(['item.started','item.updated','item.completed'].includes(e.type)&&e.item?.type==='reasoning')return; // discard immediately
   return stop('uncertain');
  }
  const data=(chunk,isError)=>{
   if(settled||reason)return;bytes+=chunk.length;if(bytes>CODEX_LIMITS.output)return stop('output_limit');
   let pending=Buffer.concat([isError?stderr:stdout,chunk]);
   for(let end;(end=pending.indexOf(10))>=0;){if(end>CODEX_LIMITS.line)return stop('output_limit');const raw=pending.subarray(0,end);pending=pending.subarray(end+1);try{line(raw,isError);}catch{return stop('protocol_invalid');}if(reason)return;}
   if(pending.length>CODEX_LIMITS.line)return stop('output_limit');if(isError)stderr=pending;else stdout=pending;
  };
  if(signal?.aborted){reason='cancelled';done(null,true);return;}
  signal?.addEventListener('abort',abort,{once:true});
  try {
   child=spawn(launch.executable,launch.args,{env:launch.env,cwd:launch.cwd,shell:false,detached:true,stdio:['pipe','pipe','pipe']});
   child.stdout.on('data',b=>data(b,false));child.stderr.on('data',b=>data(b,true));child.stdin.on('error',()=>stop('uncertain'));
   child.once('error',()=>{reason='codex_missing';done(null,true);});
   child.once('close',async exitCode=>{
    closed=true;groupSignal('SIGKILL');
    if(!reason){try{if(stdout.length)line(stdout,false);if(stderr.length)line(stderr,true);}catch{reason='protocol_invalid';}}
    let gone=false;const until=Date.now()+CODEX_LIMITS.graceMs;
    do{try{process.kill(-child.pid,0);}catch(e){if(e.code==='ESRCH'){gone=true;break;}}await new Promise(r=>setTimeout(r,25));}while(Date.now()<until);
    done(exitCode,gone);
   });child.stdin.end(input);
  }catch{reason='codex_missing';done(null,true);}
 });
}
const productionAdapter=Object.freeze({preflight:preflightCodex,createLaunch:createIsolatedLaunch,assertLaunch:assertCertifiedLaunch,supervise:superviseCodexProcess});
export const runCapturedCodex=(scope,runId,options={})=>executeCapturedWithAdapter(scope,runId,options,productionAdapter);
// Trusted in-process test seam. Production CLI never accepts adapters or launch overrides.
export async function executeCapturedWithAdapter(scope,runId,{signal}={},adapter=productionAdapter){
 let owned,launch,execution,result=null,outcome,dispatch=false;
 const started=Date.now();
 try {
  owned=await claimCodexRun(scope,runId);execution=owned.execution;
  if(signal?.aborted){outcome={status:'cancelled',code:null,terminalObserved:false,cleanupComplete:true};}
  else {
   parseEvidenceCapsule(owned.snapshot);
   const preflight=await adapter.preflight();if(!preflight.ok)codexFail(preflight.code);
   launch=await adapter.createLaunch({executableReceipt:preflight,runId,deadline:started+CODEX_LIMITS.preflightMs,evidenceRoots:scope.evidenceRoots??[],stateRoot:scope.stateRoot??process.env.EVIDENCELENS_STATE_ROOT});adapter.assertLaunch(launch);
   await recordCodexScratch(scope,runId,execution.attemptId,launch.root);
   if(signal?.aborted)outcome={status:'cancelled',code:null,terminalObserved:false,cleanupComplete:true};
   else {
    const saved=await readForDispatch(scope,runId,{attemptId:execution.attemptId});dispatch=true;
    outcome=await adapter.supervise(launch,Buffer.from(saved.promptText,'utf8'),{signal});
    if(outcome.status==='candidate'){result=validateBoundCodexResult(owned.snapshot,outcome.candidate);outcome={...outcome,status:'succeeded',candidate:null};}
   }
  }
 }catch(e){if(!owned)return {ok:false,runId,...codexError(e)};if(e.scratchRoot)await recordCodexScratch(scope,runId,execution.attemptId,e.scratchRoot).catch(()=>{});outcome={status:dispatch||e.cleanupComplete===false?'uncertain':'failed',code:codexError(e).code,terminalObserved:false,cleanupComplete:e.cleanupComplete!==false};}
 if(launch&&outcome.cleanupComplete){try{await launch.cleanup();}catch{outcome={...outcome,status:'uncertain',code:'uncertain',cleanupComplete:false};}}
 if(signal?.aborted&&outcome.cleanupComplete){outcome={...outcome,status:'cancelled',code:null};result=null;}
 if(outcome.status!=='succeeded')result=null;
 const receipt={...execution,...(launch?{binaryVersion:launch.binaryVersion,binarySha256:launch.binarySha256,policySha256:launch.policySha256}:{}),status:outcome.status,errorCode:outcome.code,finishedAt:new Date().toISOString(),elapsedMs:Date.now()-started,terminalObserved:outcome.terminalObserved,cleanupComplete:outcome.cleanupComplete,resultSha256:result?.resultSha256??null};
 try{return await completeCodexRun(scope,runId,{execution:receipt,result,signal});}catch(e){return {ok:false,runId,code:codexError(e).code};}
}
