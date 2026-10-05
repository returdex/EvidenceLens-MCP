import { admitPriorSummaries,validateReviewAssessment } from './review-recheck.mjs';
import { bindRunMetrics } from './codex-metrics.mjs';
import { newDiagnostics } from './codex-diagnostics.mjs';
import fs from 'node:fs/promises';
import { validateBoundCodexResult } from './codex-result.mjs';
import { validateExecutionRecord,validateResultEnvelope } from './codex-contract.mjs';
import { constants as C } from 'node:fs';
import { dirname, join, resolve, isAbsolute, sep } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fail,safeError,sha256,uuid,id,fields,array,decode,LIMITS,validateSnapshot,validateLifecycle,transition } from './prompt-contract.mjs';

const now=()=>new Date().toISOString();
async function stat(p){try{return await fs.lstat(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
const overlap=(a,b)=>a===b||a.startsWith(b+sep)||b.startsWith(a+sep);
function owner(s){if(typeof process.getuid!=='function'||!C.O_NOFOLLOW)fail('unsupported');return s.uid===process.getuid();}
function privateDir(s){if(!s?.isDirectory()||s.isSymbolicLink()||!owner(s)||(s.mode&0o777)!==0o700)fail('unsafe_path');}
async function dirs(p,create,privateFrom){
 const parent=dirname(p); if(parent!==p)await dirs(parent,create,privateFrom);
 let s=await stat(p);
 if(!s&&create){try{await fs.mkdir(p,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}s=await stat(p);}
 if(!s)return false;
 if(!s.isDirectory()||s.isSymbolicLink()||(!owner(s)&&s.uid!==0))fail('unsafe_path');
 const sticky=s.uid===0&&Boolean(s.mode&0o1000);
 if((s.mode&0o022)&&!sticky)fail('unsafe_path');
 if(p===privateFrom||p.startsWith(privateFrom+sep))privateDir(s);
 if(parent!==p){const ps=await stat(parent);if(ps&&(ps.mode&0o022)){if(ps.uid!==0||!(ps.mode&0o1000))fail('unsafe_path');privateDir(s);}}
 if(await stat(join(p,'.git')))fail('unsafe_path');
 return true;
}
async function context(scope,create=false){
 if(!scope||!uuid(scope.conversationId)||!(scope.taskId===undefined||id(scope.taskId)))fail('identity_required');
 const root=scope.stateRoot??process.env.EVIDENCELENS_STATE_ROOT??join(homedir(),'.local','state','evidencelens');
 if(typeof root!=='string'||!isAbsolute(root)||root!==resolve(root))fail('unsafe_path');
 const evidence=[process.cwd(),...(scope.evidenceRoots??[])];
 for(const e of evidence){if(typeof e!=='string'||!isAbsolute(e)||overlap(root,resolve(e)))fail('unsafe_path');}
 await dirs(root,create,root);
 const dir=join(root,sha256(scope.conversationId));
 await dirs(dir,create,root);
 return {scope,root,dir,index:join(dir,'index.json'),lock:join(dir,'lock')};
}
async function syncDir(p){const h=await fs.open(p,C.O_RDONLY|C.O_NOFOLLOW);try{await h.sync();}finally{await h.close();}}
async function read(p,max=LIMITS.snapshot){
 let h;try{
  const s=await stat(p);if(!s)return null;
  if(!s.isFile()||s.isSymbolicLink()||!owner(s)||(s.mode&0o777)!==0o600||s.nlink!==1||s.size>max)fail('unsafe_path');
  h=await fs.open(p,C.O_RDONLY|C.O_NOFOLLOW);const opened=await h.stat();if(opened.ino!==s.ino||opened.dev!==s.dev)fail('uncertain');
  const bytes=Buffer.alloc(max+1);let n=0;while(n<bytes.length){const r=await h.read(bytes,n,bytes.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}
  if(n>max)fail('store_limit');
  try{return JSON.parse(decode(bytes.subarray(0,n)));}catch(e){if(e.code)throw e;fail('corrupt_record');}
 }finally{await h?.close();}
}
async function writeExclusive(p,value){if(Buffer.byteLength(JSON.stringify(value))>(p.endsWith('index.json')||p.includes('index.json.tmp-')?4*1024*1024:LIMITS.snapshot))fail('store_limit');const h=await fs.open(p,C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);try{await h.writeFile(JSON.stringify(value));await h.sync();}finally{await h.close();}await syncDir(dirname(p));}
async function replace(p,value){
 // Only known metadata names are passed by this module. Never overwrite a foreign link.
 const s=await stat(p);if(s)await read(p,p.endsWith('index.json')?4*1024*1024:LIMITS.snapshot);
 const tmp=p+'.tmp-'+randomUUID();await writeExclusive(tmp,value);await fs.rename(tmp,p);await syncDir(dirname(p));
}
function indexValue(input,conversationId){
 if(input===null)return {schemaVersion:1,conversationId,revision:0,tasks:[]};
 const v=fields(input,['schemaVersion','conversationId','revision','tasks']);
 if(v.schemaVersion!==1||v.conversationId!==conversationId||!Number.isSafeInteger(v.revision)||v.revision<0)fail('corrupt_record');
 v.tasks=array(v.tasks,LIMITS.tasks,t=>{
  const x=fields(t,['taskId','generation','sequence','latest','deleted','runs']);
  if(!id(x.taskId)||!uuid(x.generation)||!Number.isSafeInteger(x.sequence)||x.sequence<0||typeof x.deleted!=='boolean'||!(x.latest===null||uuid(x.latest)))fail('corrupt_record');
  x.runs=array(x.runs,LIMITS.runs,r=>{const v=fields(r,['runId','sequence']);if(!uuid(v.runId)||!Number.isSafeInteger(v.sequence)||v.sequence<1||v.sequence>x.sequence)fail('corrupt_record');return v;});
  if(new Set(x.runs.map(r=>r.runId)).size!==x.runs.length||new Set(x.runs.map(r=>r.sequence)).size!==x.runs.length)fail('corrupt_record');
  if(!x.deleted&&(!x.runs.length||x.latest!==x.runs.at(-1).runId||x.sequence!==x.runs.at(-1).sequence))fail('corrupt_record');
  return x;
 });
 if(new Set(v.tasks.map(t=>t.taskId)).size!==v.tasks.length)fail('corrupt_record');return v;
}
async function loadIndex(c){return indexValue(await read(c.index,4*1024*1024),c.scope.conversationId);}
function taskFor(index,taskId){
 if(taskId!==undefined)return index.tasks.find(t=>t.taskId===taskId);
 if(index.tasks.length>1)fail('identity_required');return index.tasks[0];
}
const taskDir=(c,t)=>join(c.dir,sha256(t.taskId));
const recordPath=(c,t,runId,kind)=>join(taskDir(c,t),runId+'.'+kind+'.json');
function member(t,runId){if(!t)fail('no_record');if(t.deleted)fail('deleted');const r=t.runs.find(r=>r.runId===runId);if(!r)fail('latest_mismatch');return r;}
async function state(c,t,runId){const r=member(t,runId);await dirs(taskDir(c,t),false,c.root);const v=validateLifecycle(await read(recordPath(c,t,runId,'state')));if(v.taskId!==t.taskId||v.conversationId!==c.scope.conversationId||v.runId!==runId||v.sequence!==r.sequence)fail('corrupt_record');return v;}
async function snapshot(c,t,l){const v=validateSnapshot(await read(recordPath(c,t,l.runId,'snapshot')));if(v.runId!==l.runId||v.taskId!==l.taskId||v.conversationId!==l.conversationId||v.sequence!==l.sequence||v.promptSha256!==l.promptSha256)fail('corrupt_record');return v;}
function receipt(l){return {ok:true,runId:l.runId,taskId:l.taskId,conversationId:l.conversationId,sequence:l.sequence,status:l.status,promptSha256:l.promptSha256,executionKind:l.executionKind};}
async function boundary(c,name){await c.scope.onBoundary?.(name);}
async function unlocked(c){if(await stat(c.lock))fail('busy');}
async function transaction(scope,create,fn){
 const c=await context(scope,create);if(!await stat(c.dir))fail('no_record');
 try{await fs.mkdir(c.lock,{mode:0o700});}catch(e){if(e.code==='EEXIST')fail('busy');throw e;}
 const lock={lockId:randomUUID(),pid:process.pid,createdAt:now()};let dirty=false;
 try{
  await writeExclusive(join(c.lock,'owner.json'),lock);
  const index=await loadIndex(c);
  const tx={c,index,dirty(){dirty=true;},async publish(){dirty=true;index.revision++;await replace(c.index,index);await boundary(c,'after_head');}};
  const result=await fn(tx);
  const actual=await read(join(c.lock,'owner.json'));if(actual?.lockId!==lock.lockId)fail('uncertain');
  await fs.unlink(join(c.lock,'owner.json'));await fs.rmdir(c.lock);await syncDir(c.dir);return result;
 }catch(e){
  // A partial mutation is intentionally left locked for explicit inspected recovery.
  if(!dirty){try{const actual=await read(join(c.lock,'owner.json'));if(actual?.lockId===lock.lockId){await fs.unlink(join(c.lock,'owner.json'));await fs.rmdir(c.lock);}}catch{}}
  throw e;
 }
}
export async function beginRun(scope,{executionKind="host_skill"}={}){
 if(!["host_skill","codex_exec"].includes(executionKind))fail("corrupt_record");
 const runId=randomUUID();let taskId=scope?.taskId;
 try{return await transaction(scope,true,async tx=>{
  const {c,index}=tx;let t=taskFor(index,taskId);
  if(!t){if(index.tasks.length>=LIMITS.tasks)fail('store_limit');taskId??='T-'+randomUUID();t={taskId,generation:randomUUID(),sequence:0,latest:null,deleted:false,runs:[]};index.tasks.push(t);}else taskId=t.taskId;
  if(t.deleted){if(t.runs.length)fail('deleted');t.deleted=false;t.generation=randomUUID();t.sequence=0;}
  if(t.runs.length>=LIMITS.runs)fail('store_limit');
  const l=validateLifecycle({schemaVersion:executionKind==='codex_exec'?2:1,runId,taskId,conversationId:scope.conversationId,sequence:t.sequence+1,status:'preparing',executionKind,createdAt:now(),updatedAt:now(),errorCode:null,promptSha256:null});
  await boundary(c,'before_state');tx.dirty();await dirs(taskDir(c,t),true,c.root);await writeExclusive(recordPath(c,t,runId,'state'),l);await boundary(c,'after_state');
  t.sequence=l.sequence;t.latest=runId;t.runs.push({runId,sequence:l.sequence});await tx.publish();return receipt(l);
 });}catch(e){return {ok:false,...safeError(e),runId,...(id(taskId)?{taskId}:{}),...(uuid(scope?.conversationId)?{conversationId:scope.conversationId}:{})};}
}
export async function captureRun(scope,runId,input,{executionKind}={}){
 const v=validateSnapshot(input);if(v.runId!==runId||v.conversationId!==scope.conversationId||v.taskId!==scope.taskId)fail('latest_mismatch');
 return transaction(scope,false,async tx=>{
  const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
  if(executionKind!==undefined&&l.executionKind!==executionKind)fail('unsupported');
  if(v.sequence!==l.sequence)fail('corrupt_record');
  const p=recordPath(c,t,runId,'snapshot'),existing=await read(p);
  if(existing){if(JSON.stringify(validateSnapshot(existing))!==JSON.stringify(v))fail('uncertain');if(l.status==='captured'&&l.promptSha256===v.promptSha256)return receipt(l);fail('uncertain');}
  const next=transition(l,'captured',{promptSha256:v.promptSha256});await boundary(c,'before_snapshot');tx.dirty();await writeExclusive(p,v);await boundary(c,'after_snapshot');await replace(recordPath(c,t,runId,'state'),next);await tx.publish();return receipt(next);
 });
}
export async function readForDispatch(scope,runId,{attemptId}={}){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.executionKind==='codex_exec'){const e=await execution(c,t,l);if(!e||e.attemptId!==attemptId||e.status!=='preparing')fail('busy');}
 if(l.status!=='captured')fail('uncertain');const v=await snapshot(c,t,l),next=transition(l,'dispatched');tx.dirty();await replace(recordPath(c,t,runId,'state'),next);await tx.publish();return {promptText:v.promptText,metadata:{...receipt(next),stage:v.stage,currentSourceId:v.currentSourceId,materials:v.materials,limitations:v.limitations}};
});}
// Internal DeepSeek stage path. Host-skill lifecycle is retained; provider identity is explicit.
export async function claimHostProviderRun(scope,runId){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.executionKind!=='host_skill'||l.status!=='captured')fail('unsupported');
 const v=await snapshot(c,t,l),next=transition(l,'dispatched');
 tx.dirty();await replace(recordPath(c,t,runId,'state'),next);await tx.publish();return v;
});}
function providerReceipt(v,l){
 const r=fields(v,['schemaVersion','provider','runId','taskId','conversationId','promptSha256','status','errorCode','model','reportedModel','elapsedMs','observedRequests','httpStatus','trigger','resultSha256']);
 if(r.schemaVersion!==1||r.provider!=='deepseek'||['runId','taskId','conversationId','promptSha256'].some(k=>r[k]!==l[k])||!['succeeded','failed','cancelled','uncertain'].includes(r.status)||!Number.isSafeInteger(r.elapsedMs)||r.elapsedMs<0||![0,1].includes(r.observedRequests)||!(r.httpStatus===null||Number.isInteger(r.httpStatus)&&r.httpStatus>=100&&r.httpStatus<=599))fail('corrupt_record');
 for(const k of ['model','reportedModel'])if(r[k]!==null&&(typeof r[k]!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(r[k])))fail('corrupt_record');
 if(![null,'runtime_unavailable','configuration_unavailable','provider_disabled','recursive_call','http_error','network_error','response_invalid','result_rejected','aborted','deadline_exceeded'].includes(r.trigger))fail('corrupt_record');
 if(!(r.resultSha256===null||typeof r.resultSha256==='string'&&/^[a-f0-9]{64}$/.test(r.resultSha256)))fail('corrupt_record');
 transition(l,r.status,{errorCode:r.errorCode});
 if(r.status==='succeeded'&&(r.observedRequests!==1||r.httpStatus!==200||r.trigger!==null||r.resultSha256===null)||r.status!=='succeeded'&&r.resultSha256!==null)fail('corrupt_record');
 return r;
}
export async function completeHostProviderRun(scope,runId,{execution:input,result=null,signal}){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.executionKind!=='host_skill'||l.status!=='dispatched')fail('unsupported');
 const e=providerReceipt(input,l);
 if(e.status==='succeeded'){
  if(l.status!=='dispatched')fail('uncertain');
  const r=validateResultEnvelope(result),bound=validateBoundCodexResult(await snapshot(c,t,l),r.modelResponse);
  if(JSON.stringify(r)!==JSON.stringify(bound)||r.resultSha256!==e.resultSha256)fail('corrupt_record');
  tx.dirty();await writeExclusive(recordPath(c,t,runId,'result'),r);
 }else if(result!==null)fail('corrupt_record');
 await boundary(c,'before_terminal_commit');
 if(signal?.aborted){if(result){await fs.unlink(recordPath(c,t,runId,'result'));result=null;}e.status='cancelled';e.errorCode=null;e.trigger='aborted';e.resultSha256=null;}
 const next=transition(l,e.status,{errorCode:e.errorCode});
 tx.dirty();await writeExclusive(recordPath(c,t,runId,'provider'),e);await replace(recordPath(c,t,runId,'state'),next);await tx.publish();
 return {...receipt(next),execution:e,...(result?{result}:{})};
});}
export async function readHostProviderRun(scope,runId){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.executionKind!=='host_skill')fail('unsupported');
 const raw=await read(recordPath(c,t,runId,'provider'));
 return {metadata:receipt(l),execution:raw?providerReceipt(raw,l):null,diagnosticAvailability:raw?'recorded':'not_recorded'};
});}
export async function finishRun(scope,runId,outcome){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.executionKind==='codex_exec'&&(outcome.status==='succeeded'||await execution(c,t,l)))fail('unsupported');
 const next=transition(l,outcome.status,{errorCode:outcome.errorCode??null});
 if(JSON.stringify(l)!==JSON.stringify(next)){tx.dirty();await replace(recordPath(c,t,runId,'state'),next);await tx.publish();}return receipt(next);
});}
export async function exportLatest(scope,{expectedRunId}={}){
 const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId);
 if(t?.deleted)fail('deleted');
 if(!t||!t.latest){if(expectedRunId)fail('latest_mismatch');fail('no_record');}
 if(t.deleted)fail('deleted');if(!uuid(expectedRunId))fail('identity_required');if(t.latest!==expectedRunId)fail('latest_mismatch');
 const l=await state(c,t,t.latest);if(l.promptSha256===null){const e=new Error('uncertain');e.code='uncertain';e.status=l.status;throw e;}const v=await snapshot(c,t,l);
 await boundary(c,'export_read');await unlocked(c);const after=await loadIndex(c);if(JSON.stringify(after)!==JSON.stringify(index))fail('busy');
 return {promptText:v.promptText,metadata:{...receipt(l),stage:v.stage,reviewMode:v.reviewMode,currentSourceId:v.currentSourceId,capturedAt:v.capturedAt,materials:v.materials,limitations:v.limitations}};
}
async function deletionPreview(c,t){
 await dirs(taskDir(c,t),false,c.root);
 const recognized=new Set(t.runs.flatMap(r=>['state','snapshot','execution','result','scratch','provider','metrics','handoff'].map(k=>r.runId+'.'+k+'.json')));
 let preservedUnknownCount=0,count=0;
 const d=await fs.opendir(taskDir(c,t));
 for await(const e of d){if(++count>LIMITS.runs*8+100)fail('store_limit');if(!recognized.has(e.name))preservedUnknownCount++;}
 return {mode:'dry-run',taskId:t.taskId,runs:t.runs.length,preservedUnknownCount};
}
export async function forgetTask(scope,{apply=false}={}){
 if(!id(scope.taskId))fail('identity_required');
 if(!apply){const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId);if(!t)fail('no_record');const result=await deletionPreview(c,t);await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');return result;}
 return transaction(scope,false,async tx=>{
  const {c,index}=tx,t=taskFor(index,scope.taskId);if(!t)fail('no_record');
  const preview=await deletionPreview(c,t);
  if(!t.deleted)for(const r of t.runs){const l=await state(c,t,r.runId);if(l.status==='dispatched')fail('busy');if(l.executionKind==='codex_exec'){const e=await execution(c,t,l);if(e?.status==='preparing'||e&&!e.cleanupComplete)fail('busy');}}

  t.deleted=true;tx.dirty();await tx.publish();await boundary(c,'after_tombstone');
  const remaining=[];
  for(const r of t.runs){
   try{
    const lp=recordPath(c,t,r.runId,'state'),sp=recordPath(c,t,r.runId,'snapshot');
    const lraw=await read(lp),sraw=await read(sp);
    const hp=recordPath(c,t,r.runId,'handoff'),hraw=await read(hp);
    if(hraw){if(!lraw||!sraw)fail('corrupt_record');validateStoredHandoff(hraw,lraw,sraw);const resultRaw=validateResultEnvelope(await read(recordPath(c,t,r.runId,'result')));if(hraw.resultSha256!==resultRaw.resultSha256)fail('corrupt_record');await fs.unlink(hp);}
    const mp=recordPath(c,t,r.runId,'metrics'),mraw=await read(mp,16384);
    if(mraw){if(!lraw)fail('corrupt_record');bindRunMetrics(mraw,await execution(c,t,validateLifecycle(lraw)));await fs.unlink(mp);}
    if(lraw){const l=validateLifecycle(lraw);if(l.runId!==r.runId||l.sequence!==r.sequence||l.taskId!==t.taskId||l.conversationId!==scope.conversationId)fail('corrupt_record');}
    for(const kind of ['execution','result','scratch','provider']){
     const p=recordPath(c,t,r.runId,kind),v=await read(p);if(!v)continue;
     if(!lraw||v.runId!==r.runId||v.taskId!==t.taskId||v.conversationId!==scope.conversationId)fail('corrupt_record');
     if(kind==='provider'){if(lraw.executionKind!=='host_skill')fail('corrupt_record');providerReceipt(v,validateLifecycle(lraw));}
     else if(kind==='result')validateResultEnvelope(v);
     else {if(lraw.executionKind!=='codex_exec')fail('corrupt_record');if(kind==='execution')validateExecutionRecord(v);else validateScratch(v);}
     await fs.unlink(p);
    }
    if(sraw){const v=validateSnapshot(sraw);if(!lraw||v.runId!==r.runId||v.sequence!==r.sequence||v.taskId!==t.taskId||v.conversationId!==scope.conversationId||v.promptSha256!==lraw.promptSha256)fail('corrupt_record');await fs.unlink(sp);await boundary(c,'after_delete_snapshot');}
    if(lraw)await fs.unlink(lp);
   }catch{remaining.push(r);}
  }
  await syncDir(taskDir(c,t));t.runs=remaining;t.latest=remaining.length?t.latest:null;await tx.publish();
  return {...preview,mode:'apply',deleted:true,incomplete:remaining.length>0,remainingRuns:remaining.length};
 });
}

// Diagnostic metadata only; it never grants a missing latest-attempt receipt.
export async function statusTask(scope){
 const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId);
 if(!t)fail('no_record');
 const result=t.deleted?{taskId:t.taskId,status:'deleted'}:receipt(await state(c,t,t.latest));
 await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');return result;
}

async function execution(c,t,l){const v=await read(recordPath(c,t,l.runId,'execution'));if(!v)return null;const r=validateExecutionRecord(v);if(['runId','taskId','conversationId','promptSha256'].some(k=>r[k]!==l[k]))fail('corrupt_record');return r;}
function validateScratch(input){const v=fields(input,['schemaVersion','runId','taskId','conversationId','attemptId','root']);if(v.schemaVersion!==1||!uuid(v.runId)||!uuid(v.conversationId)||!uuid(v.attemptId)||!id(v.taskId)||typeof v.root!=='string'||!/^\/private\/tmp\/evidencelens-codex-[A-Za-z0-9]+$/.test(v.root))fail('corrupt_record');return v;}
// Internal runner ownership, claimed before preflight. No lock is held during process execution.
export async function claimCodexRun(scope,runId){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.executionKind!=='codex_exec'||l.status!=='captured')fail('unsupported');if(await execution(c,t,l))fail('busy');
 const v=await snapshot(c,t,l),e=validateExecutionRecord({schemaVersion:2,diagnostics:newDiagnostics(),runId,taskId:l.taskId,conversationId:l.conversationId,attemptId:randomUUID(),executionKind:'codex_exec',promptSha256:l.promptSha256,binaryVersion:null,binarySha256:null,policySha256:null,status:'preparing',errorCode:null,startedAt:now(),finishedAt:null,elapsedMs:null,terminalObserved:false,cleanupComplete:false,resultSha256:null});
 tx.dirty();await writeExclusive(recordPath(c,t,runId,'execution'),e);await tx.publish();return {snapshot:v,execution:e};
});}
export async function recordCodexScratch(scope,runId,attemptId,root){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId),e=await execution(c,t,l);if(!e||e.attemptId!==attemptId||e.status!=='preparing')fail('busy');
 const v=validateScratch({schemaVersion:1,runId,taskId:l.taskId,conversationId:l.conversationId,attemptId,root});tx.dirty();await writeExclusive(recordPath(c,t,runId,'scratch'),v);await tx.publish();
});}
export async function completeCodexRun(scope,runId,{execution:input,result=null,metrics=null,signal}){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId),old=await execution(c,t,l),e=validateExecutionRecord(input);
 if(!old||old.status!=='preparing'||['attemptId','runId','taskId','conversationId','promptSha256','startedAt'].some(k=>e[k]!==old[k])||e.status==='preparing')fail('uncertain');
 const m=metrics===null?null:bindRunMetrics(metrics,e);
 if(e.status==='succeeded'){
  if(l.status!=='dispatched')fail('uncertain');const r=validateResultEnvelope(result);
  if(['runId','taskId','conversationId','promptSha256'].some(k=>r[k]!==l[k])||r.resultSha256!==e.resultSha256)fail('corrupt_record');
  const bound=validateBoundCodexResult(await snapshot(c,t,l),r.modelResponse);if(JSON.stringify(bound)!==JSON.stringify(r))fail('corrupt_record');
  tx.dirty();await writeExclusive(recordPath(c,t,runId,'result'),r);await boundary(c,'after_result');
 }else if(result!==null)fail('corrupt_record');
 await boundary(c,'before_terminal_commit');
 if(signal?.aborted&&e.cleanupComplete){if(result){await fs.unlink(recordPath(c,t,runId,'result'));result=null;}e.status='cancelled';e.errorCode=null;e.resultSha256=null;if(e.schemaVersion===2&&!e.diagnostics.trigger)e.diagnostics={...e.diagnostics,stage:'publication',trigger:'aborted'};}
 const next=transition(l,e.status,{errorCode:e.errorCode});
 if(m){tx.dirty();await writeExclusive(recordPath(c,t,runId,'metrics'),m);await boundary(c,'after_metrics');}
 tx.dirty();await replace(recordPath(c,t,runId,'execution'),e);await boundary(c,'after_execution');await replace(recordPath(c,t,runId,'state'),next);await tx.publish();return {...receipt(next),execution:e,metrics:m,...(result?{result}:{} )};
});}
export async function readCodexResult(scope,runId){
 const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId),l=await state(c,t,runId),e=await execution(c,t,l);
 if(l.status!=='succeeded'||e?.status!=='succeeded')fail('uncertain');const r=validateResultEnvelope(await read(recordPath(c,t,runId,'result')));
 if(['runId','taskId','conversationId','promptSha256'].some(k=>r[k]!==l[k])||r.resultSha256!==e.resultSha256)fail('corrupt_record');await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');return {metadata:receipt(l),execution:e,result:r};
}

// Read-only, explicit-run inspection: no prompt, result, source or process access.
export async function diagnoseCodexRun(scope,runId){
 const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.executionKind!=='codex_exec')fail('unsupported');const e=await execution(c,t,l);
 if(e&&(e.status==='preparing'?!['captured','dispatched'].includes(l.status):e.status!==l.status))fail('corrupt_record');
 const diagnosticAvailability=!e?'not_started':e.schemaVersion===1?'not_recorded':e.status==='preparing'?'pending':'recorded';
 await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');
 return {metadata:receipt(l),execution:e,diagnosticAvailability};
}

export async function readCodexMetrics(scope,runId){
 const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId),l=await state(c,t,runId),e=await execution(c,t,l);
 if(l.executionKind!=='codex_exec')fail('unsupported');
 if(e&&(e.status==='preparing'?!['captured','dispatched'].includes(l.status):e.status!==l.status))fail('corrupt_record');
 const raw=await read(recordPath(c,t,runId,'metrics'),16384),metrics=raw?bindRunMetrics(raw,e):null;
 await boundary(c,'metrics_read');await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');
 return {metadata:receipt(l),metrics,availability:metrics?'recorded':'not_recorded'};
}

// Bundles can only be obtained by a scoped coherent private-store read.
const trustedBundles=new WeakSet();
export const isTrustedRunBundle=value=>trustedBundles.has(value);
export async function readRunRecord(scope,{expectedRunId,historicalRunId}={},depth=0){
 if(depth>10)fail('store_limit');
 if(Boolean(expectedRunId)===Boolean(historicalRunId)||!uuid(expectedRunId??historicalRunId))fail('identity_required');
 const runId=expectedRunId??historicalRunId,c=await context(scope);await unlocked(c);
 const index=await loadIndex(c),t=taskFor(index,scope.taskId);member(t,runId);
 if(expectedRunId&&t.latest!==runId)fail('latest_mismatch');
 const l=await state(c,t,runId),s=l.promptSha256===null?null:await snapshot(c,t,l);
 const e=l.executionKind==='codex_exec'?await execution(c,t,l):null;
 if(e&&(e.status==='preparing'?!['captured','dispatched'].includes(l.status):e.status!==l.status))fail('corrupt_record');
 const providerRaw=l.executionKind==='host_skill'?await read(recordPath(c,t,runId,'provider')):null,provider=providerRaw?providerReceipt(providerRaw,l):null;
 if(provider&&provider.status!==l.status)fail('corrupt_record');
 const mraw=await read(recordPath(c,t,runId,'metrics'),16384),metrics=mraw?bindRunMetrics(mraw,e):null;
 let result=null;
 if(l.status==='succeeded'&&(e||provider)){
  const raw=validateResultEnvelope(await read(recordPath(c,t,runId,'result'))),bound=validateBoundCodexResult(s,raw.modelResponse);
  if(JSON.stringify(raw)!==JSON.stringify(bound)||raw.resultSha256!==(e??provider).resultSha256)fail('corrupt_record');result=bound;
 }
 await boundary(c,'record_read');await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');
 const bundle={metadata:{...receipt(l),selection:historicalRunId?'historical':'latest'},snapshot:s,execution:e,provider,metrics,metricsAvailability:metrics?'recorded':'not_recorded',result,assessment:null,assessmentAvailability:'not_recorded'};
 trustedBundles.add(bundle);
 try{
  const raw=await read(recordPath(c,t,runId,'handoff'));
  if(raw){validateStoredHandoff(raw,l,s);
   const priors=[];for(const p of raw.admittedPrior){
    if(p.kind==='local'){const prior=await readRunRecord(scope,{historicalRunId:p.runId},depth+1);if(!prior.result||prior.result.resultSha256!==p.resultSha256||prior.metadata.sequence>=bundle.metadata.sequence||prior.snapshot.reviewMode!==s.reviewMode)fail('corrupt_record');priors.push({...p,bundle:prior});}
    else priors.push({...p,summarySha256:p.summarySha256});
   }
   bundle.assessment=validateReviewAssessment(bundle,priors,raw);bundle.assessmentAvailability='recorded';
  }
 }catch(error){bundle.assessmentAvailability='record_error';bundle.assessmentError=error.code??'corrupt_record';}
 await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');
 // Freeze data transitively so callers cannot rewrite a trusted result before rendering.
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
 freeze(bundle);trustedBundles.add(bundle);return bundle;
}

function validateStoredHandoff(raw,l,s){
 const v=fields(raw,['schemaVersion','runId','taskId','conversationId','promptSha256','resultSha256','assessor','requirements','findings','admittedPrior','semanticVerification','assessmentSha256']);
 const {assessmentSha256,...body}=v;
 if(['runId','taskId','conversationId','promptSha256'].some(k=>v[k]!==l[k])||!s||v.assessor!=='host_review'||assessmentSha256!==sha256(JSON.stringify(body)))fail('corrupt_record');
 return v;
}
export async function annotateRun(scope,{expectedRunId,admittedPriorSummaries=[],assessment}){
 const bundle=await readRunRecord(scope,{expectedRunId}),prior=await admitPriorSummaries(scope,bundle,admittedPriorSummaries),v=validateReviewAssessment(bundle,prior,assessment);
 return transaction(scope,false,async tx=>{
  const {c,index}=tx,t=taskFor(index,scope.taskId);if(t.latest!==expectedRunId)fail('latest_mismatch');const l=await state(c,t,expectedRunId);
  const r=validateResultEnvelope(await read(recordPath(c,t,expectedRunId,'result')));if(l.status!=='succeeded'||r.resultSha256!==v.resultSha256||l.promptSha256!==v.promptSha256)fail('corrupt_record');
  const bound=validateBoundCodexResult(await snapshot(c,t,l),r.modelResponse);if(JSON.stringify(bound)!==JSON.stringify(r))fail('corrupt_record');
  const p=recordPath(c,t,expectedRunId,'handoff'),existing=await read(p);if(existing){if(JSON.stringify(existing)!==JSON.stringify(v))fail('uncertain');return {ok:true,runId:expectedRunId,assessmentSha256:v.assessmentSha256};}
  tx.dirty();await writeExclusive(p,v);await boundary(c,'after_handoff');await tx.publish();return {ok:true,runId:expectedRunId,assessmentSha256:v.assessmentSha256};
 });
}
