import fs from 'node:fs/promises';
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
export async function beginRun(scope){
 const runId=randomUUID();let taskId=scope?.taskId;
 try{return await transaction(scope,true,async tx=>{
  const {c,index}=tx;let t=taskFor(index,taskId);
  if(!t){if(index.tasks.length>=LIMITS.tasks)fail('store_limit');taskId??='T-'+randomUUID();t={taskId,generation:randomUUID(),sequence:0,latest:null,deleted:false,runs:[]};index.tasks.push(t);}else taskId=t.taskId;
  if(t.deleted){if(t.runs.length)fail('deleted');t.deleted=false;t.generation=randomUUID();t.sequence=0;}
  if(t.runs.length>=LIMITS.runs)fail('store_limit');
  const l=validateLifecycle({schemaVersion:1,runId,taskId,conversationId:scope.conversationId,sequence:t.sequence+1,status:'preparing',executionKind:'host_skill',createdAt:now(),updatedAt:now(),errorCode:null,promptSha256:null});
  await boundary(c,'before_state');tx.dirty();await dirs(taskDir(c,t),true,c.root);await writeExclusive(recordPath(c,t,runId,'state'),l);await boundary(c,'after_state');
  t.sequence=l.sequence;t.latest=runId;t.runs.push({runId,sequence:l.sequence});await tx.publish();return receipt(l);
 });}catch(e){return {ok:false,...safeError(e),runId,...(id(taskId)?{taskId}:{}),...(uuid(scope?.conversationId)?{conversationId:scope.conversationId}:{})};}
}
export async function captureRun(scope,runId,input){
 const v=validateSnapshot(input);if(v.runId!==runId||v.conversationId!==scope.conversationId||v.taskId!==scope.taskId)fail('latest_mismatch');
 return transaction(scope,false,async tx=>{
  const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
  if(v.sequence!==l.sequence)fail('corrupt_record');
  const p=recordPath(c,t,runId,'snapshot'),existing=await read(p);
  if(existing){if(JSON.stringify(validateSnapshot(existing))!==JSON.stringify(v))fail('uncertain');if(l.status==='captured'&&l.promptSha256===v.promptSha256)return receipt(l);fail('uncertain');}
  const next=transition(l,'captured',{promptSha256:v.promptSha256});await boundary(c,'before_snapshot');tx.dirty();await writeExclusive(p,v);await boundary(c,'after_snapshot');await replace(recordPath(c,t,runId,'state'),next);await tx.publish();return receipt(next);
 });
}
export async function readForDispatch(scope,runId){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 if(l.status!=='captured')fail('uncertain');const v=await snapshot(c,t,l),next=transition(l,'dispatched');tx.dirty();await replace(recordPath(c,t,runId,'state'),next);await tx.publish();return {promptText:v.promptText,metadata:{...receipt(next),stage:v.stage,currentSourceId:v.currentSourceId,materials:v.materials,limitations:v.limitations}};
});}
export async function finishRun(scope,runId,outcome){return transaction(scope,false,async tx=>{
 const {c,index}=tx,t=taskFor(index,scope.taskId),l=await state(c,t,runId);
 const next=transition(l,outcome.status,{errorCode:outcome.errorCode??null});
 if(JSON.stringify(l)!==JSON.stringify(next)){tx.dirty();await replace(recordPath(c,t,runId,'state'),next);await tx.publish();}return receipt(next);
});}
export async function exportLatest(scope,{expectedRunId}={}){
 const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId);
 if(t?.deleted)fail('deleted');
 if(!t||!t.latest){if(expectedRunId)fail('latest_mismatch');fail('no_record');}
 if(t.deleted)fail('deleted');if(!uuid(expectedRunId))fail('identity_required');if(t.latest!==expectedRunId)fail('latest_mismatch');
 const l=await state(c,t,t.latest);if(l.promptSha256===null)fail('uncertain');const v=await snapshot(c,t,l);
 await boundary(c,'export_read');await unlocked(c);const after=await loadIndex(c);if(JSON.stringify(after)!==JSON.stringify(index))fail('busy');
 return {promptText:v.promptText,metadata:{...receipt(l),stage:v.stage,reviewMode:v.reviewMode,currentSourceId:v.currentSourceId,capturedAt:v.capturedAt,materials:v.materials,limitations:v.limitations}};
}
async function deletionPreview(c,t){
 await dirs(taskDir(c,t),false,c.root);
 const recognized=new Set(t.runs.flatMap(r=>[r.runId+'.state.json',r.runId+'.snapshot.json']));
 let preservedUnknownCount=0,count=0;
 const d=await fs.opendir(taskDir(c,t));
 for await(const e of d){if(++count>LIMITS.runs*2+100)fail('store_limit');if(!recognized.has(e.name))preservedUnknownCount++;}
 return {mode:'dry-run',taskId:t.taskId,runs:t.runs.length,preservedUnknownCount};
}
export async function forgetTask(scope,{apply=false}={}){
 if(!id(scope.taskId))fail('identity_required');
 if(!apply){const c=await context(scope);await unlocked(c);const index=await loadIndex(c),t=taskFor(index,scope.taskId);if(!t)fail('no_record');const result=await deletionPreview(c,t);await unlocked(c);if(JSON.stringify(await loadIndex(c))!==JSON.stringify(index))fail('busy');return result;}
 return transaction(scope,false,async tx=>{
  const {c,index}=tx,t=taskFor(index,scope.taskId);if(!t)fail('no_record');
  const preview=await deletionPreview(c,t);
  t.deleted=true;tx.dirty();await tx.publish();await boundary(c,'after_tombstone');
  const remaining=[];
  for(const r of t.runs){
   try{
    const lp=recordPath(c,t,r.runId,'state'),sp=recordPath(c,t,r.runId,'snapshot');
    const lraw=await read(lp),sraw=await read(sp);
    if(lraw){const l=validateLifecycle(lraw);if(l.runId!==r.runId||l.sequence!==r.sequence||l.taskId!==t.taskId||l.conversationId!==scope.conversationId)fail('corrupt_record');}
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
