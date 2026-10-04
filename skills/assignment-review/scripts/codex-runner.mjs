import { validateBoundCodexResult } from './codex-result.mjs';
import { spawn } from 'node:child_process';
import { CODEX_LIMITS,codexError,parseEvidenceCapsule } from './codex-contract.mjs';
import { newDiagnostics,diagnosticEvent,diagnosticItem,diagnosticErrno,diagnosticSignal,reportedErrorCategory } from './codex-diagnostics.mjs';
import { decode } from './prompt-contract.mjs';
import { claimCodexRun,recordCodexScratch,readForDispatch,completeCodexRun } from './prompt-store.mjs';
import { preflightCodex } from './codex-preflight.mjs';
import { createIsolatedLaunch,assertCertifiedLaunch,toolAttempt } from './codex-isolation.mjs';

// Internal library seam for deterministic process fixtures; never exposed as CLI arguments.
export function superviseCodexProcess(launch,input,{signal,timeoutMs=CODEX_LIMITS.reviewMs}={}){
 return new Promise(resolve=>{
  let child,settled=false,reason=null,bytes=0,thread=false,turn=false,terminal=false,final=null,stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),termTimer,hardTimer;
  const diagnostics=newDiagnostics('process'),started=Date.now();
  // Preserve the first rejection; cancellation/cleanup must not erase its evidence.
  const note=(trigger,details={})=>{if(!diagnostics.trigger)Object.assign(diagnostics,{trigger},details);};
  const groupSignal=s=>{try{if(child?.pid){diagnostics.terminationRequested=true;process.kill(-child.pid,s);}}catch(e){if(e.code!=='ESRCH'){reason??='uncertain';note('cleanup_unconfirmed');}}};
  const done=(exitCode,cleanupComplete)=>{
   if(settled)return;settled=true;clearTimeout(deadline);clearTimeout(termTimer);clearTimeout(hardTimer);signal?.removeEventListener('abort',abort);
   if(!reason){
    const trigger=!cleanupComplete?'cleanup_unconfirmed':diagnostics.exitSignal?'signal_exit':exitCode!==0?'nonzero_exit':!thread?'missing_thread':!turn?'missing_turn':!terminal?'missing_terminal':final===null?'missing_final':null;
    if(trigger){reason='uncertain';note(trigger);}
   }
   Object.assign(diagnostics,{threadObserved:thread,turnObserved:turn});
   const code=reason,status=code==='cancelled'?'cancelled':code==='uncertain'||!cleanupComplete?'uncertain':code?'failed':'candidate';
   resolve({status,code:code==='cancelled'?null:code,terminalObserved:terminal,cleanupComplete,elapsedMs:Date.now()-started,diagnostics,candidate:status==='candidate'?final:null});
   stdout=stderr=Buffer.alloc(0);final=null;
  };
  const stop=(code,trigger,details={})=>{
   if(settled)return;note(trigger,details);if(code==='cancelled'||!reason)reason=code;
   groupSignal('SIGTERM');
   if(!termTimer)termTimer=setTimeout(()=>groupSignal('SIGKILL'),CODEX_LIMITS.graceMs);
   if(!hardTimer)hardTimer=setTimeout(()=>{groupSignal('SIGKILL');child?.stdout.destroy();child?.stderr.destroy();done(null,false);},CODEX_LIMITS.graceMs*2);
  };
  const abort=()=>stop('cancelled','aborted');
  const deadline=setTimeout(()=>stop('timed_out','deadline_exceeded'),Math.max(1,Math.min(timeoutMs,CODEX_LIMITS.reviewMs)));
  function line(raw,isError){
   let text;try{text=decode(raw);}catch{return stop('protocol_invalid','invalid_utf8');}if(!text.trim())return;
   if(isError){
    if(toolAttempt('',text))return stop('uncertain','tool_activity');
    // These startup diagnostics are proven consequences of denied global context/cache writes.
    if(/^WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted \(os error 1\)$/.test(text))return;
    if(/^\S+ ERROR (?:codex_core_skills::manager|codex_skills_extension::host_service): failed to install system skills: io error while create (?:skills root|system skills) dir: Operation not permitted \(os error 1\)$/.test(text))return;
    if(/^\S+ ERROR codex_models_manager::(?:cache|manager): failed to write models cache: Operation not permitted \(os error 1\)$/.test(text))return;
    if(text.endsWith(' ERROR codex_core_skills::loader: failed to read skills dir '+launch.env.CODEX_HOME+'/skills: Operation not permitted (os error 1)')&&/^\S+ ERROR /.test(text))return;
    return stop('protocol_invalid','unexpected_stderr',{reportedErrorCategory:reportedErrorCategory(text)});
   }
   let e;try{e=JSON.parse(text);}catch{return stop('protocol_invalid','invalid_json');}
   if(!e||typeof e!=='object'||Array.isArray(e)||typeof e.type!=='string')return stop('protocol_invalid','invalid_event');
   const details={eventType:diagnosticEvent(e.type),itemType:diagnosticItem(e.item?.type)};
   if(e.type==='thread.started'){if(thread||turn||terminal||typeof e.thread_id!=='string')return stop('protocol_invalid','event_order',details);thread=true;return;}
   if(e.type==='turn.started'){if(!thread||turn||terminal)return stop('protocol_invalid','event_order',details);turn=true;return;}
   if(e.type==='turn.completed'){if(!turn||terminal||final===null)return stop('protocol_invalid','event_order',details);terminal=true;return;}
   if(['turn.failed','error'].includes(e.type))return stop('uncertain',e.type==='error'?'cli_error':'cli_turn_failed',{...details,reportedErrorCategory:reportedErrorCategory(e.error?.message??e.message)});
   if(e.type==='item.completed'&&e.item?.type==='error'&&!turn&&thread){
    const expected='Failed to read global AGENTS.md instructions from `'+launch.env.CODEX_HOME+'/AGENTS.md`: Operation not permitted (os error 1)';
    if(e.item.message===expected)return;return stop('protocol_invalid','unexpected_event',{...details,reportedErrorCategory:reportedErrorCategory(e.item.message)});
   }
   if(!turn||terminal)return stop('protocol_invalid','event_order',details);
   if(e.type==='item.completed'&&e.item?.type==='agent_message'){
    if(final!==null||typeof e.item.text!=='string'||Buffer.byteLength(e.item.text)>CODEX_LIMITS.final)return stop('result_invalid','result_shape',details);final=e.item.text;return;
   }
   if(['item.started','item.updated','item.completed'].includes(e.type)&&e.item?.type==='reasoning')return; // discard immediately
   return stop('uncertain','unexpected_event',details);
  }
  const data=(chunk,isError)=>{
   if(settled||reason)return;bytes+=chunk.length;if(bytes>CODEX_LIMITS.output)return stop('output_limit','output_limit');
   let pending=Buffer.concat([isError?stderr:stdout,chunk]);
   for(let end;(end=pending.indexOf(10))>=0;){if(end>CODEX_LIMITS.line)return stop('output_limit','output_limit');const raw=pending.subarray(0,end);pending=pending.subarray(end+1);line(raw,isError);if(reason)return;}
   if(pending.length>CODEX_LIMITS.line)return stop('output_limit','output_limit');if(isError)stderr=pending;else stdout=pending;
  };
  const spawnFailed=e=>{reason=['ENOENT','ENOTDIR'].includes(e.code)?'codex_missing':'uncertain';note('spawn_failed',{osErrorCode:diagnosticErrno(e.code)});done(null,true);};
  if(signal?.aborted){reason='cancelled';note('aborted');done(null,true);return;}
  signal?.addEventListener('abort',abort,{once:true});
  try {
   child=spawn(launch.executable,launch.args,{env:launch.env,cwd:launch.cwd,shell:false,detached:true,stdio:['pipe','pipe','pipe']});
   child.stdout.on('data',b=>data(b,false));child.stderr.on('data',b=>data(b,true));child.stdin.on('error',e=>stop('uncertain','stdin_failed',{osErrorCode:diagnosticErrno(e.code)}));
   child.once('error',spawnFailed);
   child.once('close',async (exitCode,exitSignal)=>{
    if(settled)return;
    Object.assign(diagnostics,{closeObserved:true,exitCode:Number.isSafeInteger(exitCode)&&exitCode>=0&&exitCode<=255?exitCode:null,exitSignal:diagnosticSignal(exitSignal)});
    if(!reason){if(stdout.length)line(stdout,false);if(!reason&&stderr.length)line(stderr,true);}
    // Reap descendants, but do not mark a clean, already absent group as terminated.
    let gone=false;const until=Date.now()+CODEX_LIMITS.graceMs;
    do{try{process.kill(-child.pid,0);}catch(e){if(e.code==='ESRCH'){gone=true;break;}}groupSignal('SIGKILL');await new Promise(r=>setTimeout(r,25));}while(Date.now()<until);
    done(exitCode,gone);
   });child.stdin.end(input);
  }catch(e){if(child?.pid)stop('uncertain','stdin_failed',{osErrorCode:diagnosticErrno(e.code)});else spawnFailed(e);}
 });
}
const productionAdapter=Object.freeze({preflight:preflightCodex,createLaunch:createIsolatedLaunch,assertLaunch:assertCertifiedLaunch,supervise:superviseCodexProcess});
export const runCapturedCodex=(scope,runId,options={})=>executeCapturedWithAdapter(scope,runId,options,productionAdapter);
// Trusted in-process test seam. Production CLI never accepts adapters or launch overrides.
export async function executeCapturedWithAdapter(scope,runId,{signal}={},adapter=productionAdapter){
 let owned,launch,execution,result=null,outcome,dispatch=false,stage='preparing';
 const started=Date.now();
 const cancelled=()=>({status:'cancelled',code:null,terminalObserved:false,cleanupComplete:true,diagnostics:newDiagnostics(stage,'aborted')});
 try {
  owned=await claimCodexRun(scope,runId);execution=owned.execution;
  if(signal?.aborted){outcome=cancelled();}
  else {
   stage='capsule';parseEvidenceCapsule(owned.snapshot);
   stage='preflight';const preflight=await adapter.preflight();if(!preflight.ok){const e=new Error(preflight.code);e.code=preflight.code;e.cleanupComplete=preflight.cleanupComplete!==false;throw e;}
   stage='launch';launch=await adapter.createLaunch({executableReceipt:preflight,runId,deadline:started+CODEX_LIMITS.preflightMs,evidenceRoots:scope.evidenceRoots??[],stateRoot:scope.stateRoot??process.env.EVIDENCELENS_STATE_ROOT});adapter.assertLaunch(launch);
   await recordCodexScratch(scope,runId,execution.attemptId,launch.root);
   if(signal?.aborted)outcome=cancelled();
   else {
    stage='dispatch';const saved=await readForDispatch(scope,runId,{attemptId:execution.attemptId});dispatch=true;
    stage='process';outcome=await adapter.supervise(launch,Buffer.from(saved.promptText,'utf8'),{signal});
    if(outcome.status==='candidate'){stage='result_validation';result=validateBoundCodexResult(owned.snapshot,outcome.candidate);outcome={...outcome,status:'succeeded',candidate:null};}
   }
  }
 }catch(e){
  if(!owned)return {ok:false,runId,...codexError(e)};
  if(e.scratchRoot)await recordCodexScratch(scope,runId,execution.attemptId,e.scratchRoot).catch(()=>{});
  const trigger={capsule:'capsule_invalid',preflight:'preflight_rejected',launch:'launch_failed',dispatch:'dispatch_failed',process:'supervisor_failed',result_validation:'result_rejected'}[stage]??'supervisor_failed';
  outcome={status:dispatch||e.cleanupComplete===false?'uncertain':'failed',code:codexError(e).code,terminalObserved:outcome?.terminalObserved??false,cleanupComplete:outcome?.cleanupComplete??(dispatch?false:e.cleanupComplete!==false),diagnostics:{...(outcome?.diagnostics??newDiagnostics()),stage,trigger}};
 }
 if(launch&&outcome.cleanupComplete){try{await launch.cleanup();}catch{outcome={...outcome,status:'uncertain',code:'uncertain',cleanupComplete:false,diagnostics:outcome.diagnostics?.trigger?outcome.diagnostics:{...(outcome.diagnostics??newDiagnostics()),stage:'cleanup',trigger:'cleanup_failed'}};}}
 if(signal?.aborted&&outcome.cleanupComplete){outcome={...outcome,status:'cancelled',code:null,diagnostics:outcome.diagnostics?.trigger?outcome.diagnostics:{...(outcome.diagnostics??newDiagnostics()),stage,trigger:'aborted'}};result=null;}
 if(outcome.status!=='succeeded')result=null;
 const receipt={...execution,...(launch?{binaryVersion:launch.binaryVersion,binarySha256:launch.binarySha256,policySha256:launch.policySha256}:{}),status:outcome.status,errorCode:outcome.code,finishedAt:new Date().toISOString(),elapsedMs:Date.now()-started,terminalObserved:outcome.terminalObserved,cleanupComplete:outcome.cleanupComplete,diagnostics:outcome.diagnostics??newDiagnostics(stage),resultSha256:result?.resultSha256??null};
 try{return await completeCodexRun(scope,runId,{execution:receipt,result,signal});}catch(e){return {ok:false,runId,code:codexError(e).code,diagnostics:{...receipt.diagnostics,stage:'publication',trigger:'publication_failed'}};}
}
