import { constants } from 'node:fs';
import { lstat, open, realpath, mkdir } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { sha256 } from '../skills/assignment-review/scripts/prompt-contract.mjs';
import { collectBaselineSources } from '../skills/assignment-review/scripts/baseline-sources.mjs';
const fail=()=>{throw Error('EVALUATION_INPUT_INVALID');};
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const time=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x));
async function metadata(path,roots){
 if(typeof path!=='string'||resolve(path)!==path||!roots.some(r=>path.startsWith(r+sep)))fail();
 for(let p=path;;p=dirname(p)){const s=await lstat(p);if(s.isSymbolicLink()||![0,process.getuid()].includes(s.uid)||(s.mode&0o022)&&!(s.uid===0&&(s.mode&0o1000)))fail();if(dirname(p)===p)break;}
 const s=await lstat(path,{bigint:true});if(!s.isFile()||s.uid!==BigInt(process.getuid())||s.size>1000000n)fail();
 if(await realpath(path)!==path)fail();return s;
}
const identity=s=>`${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;
// Metadata only is inspected for excluded sources. Content reads occur after group closure.
export async function freezeEvaluationInputs(input,stage,{roots,onRead=()=>{}}={}){
 // Reject accessors before cloning metadata; no metadata field may act as a reader.
 function plain(v,depth=0){
  if(depth>12)fail();if(v===null||['string','number','boolean'].includes(typeof v))return;
  if(typeof v!=='object'||(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype))fail();
  const ds=Object.getOwnPropertyDescriptors(v);if(Reflect.ownKeys(ds).length>1000)fail();
  for(const k of Reflect.ownKeys(ds)){if(typeof k!=='string'||!Object.hasOwn(ds[k],'value'))fail();plain(ds[k].value,depth+1);}
 }
 plain(input);const encoded=JSON.stringify(input);if(Buffer.byteLength(encoded)>262144)fail();const m=JSON.parse(encoded);
 if(m.manifestVersion!==1||!id(m.caseId)||!['tuning','held_out_candidate'].includes(m.role)||!['verified','blocked'].includes(m.readiness)||!Array.isArray(m.entries)||m.entries.length>100||!Array.isArray(roots)||!roots.length)fail();
 roots=await Promise.all(roots.map(async r=>{if(typeof r!=='string'||resolve(r)!==r||await realpath(r)!==r)fail();return r;}));
 const st=m.stages?.[stage];if(!st||!time(st.cutoff)||!st.cutoffEvidence||!['preparation','in_progress','final','recheck'].includes(stage))fail();
 const entries=new Map(),stats=new Map(),denied=new Set(),edges=new Map();
 for(const e of m.entries){
  if(!id(e.sourceId)||!id(e.documentId)||entries.has(e.sourceId)||!['reviewer','evaluator_only'].includes(e.partition)||!time(e.availableAt)||!e.availableAtEvidence||!Array.isArray(e.derivedFrom)||!Array.isArray(e.aliases)||!Array.isArray(e.stages)||!e.versionIdentity||!e.coverage||!/^[a-f0-9]{64}$/.test(e.sha256))fail();
  entries.set(e.sourceId,e);stats.set(e.sourceId,await metadata(e.path,roots));edges.set(e.sourceId,new Set());
  if(e.partition==='evaluator_only'||Date.parse(e.availableAt)>Date.parse(st.cutoff)||!e.stages.includes(stage))denied.add(e.sourceId);
 }
 const visiting=new Set(),visited=new Set();
 function visit(k){if(visiting.has(k))fail();if(visited.has(k))return;visiting.add(k);for(const p of entries.get(k).derivedFrom){if(!entries.has(p))fail();visit(p);}visiting.delete(k);visited.add(k);}
 for(const e of entries.values())visit(e.sourceId);
 function connect(a,b){if(!entries.has(b))fail();edges.get(a).add(b);edges.get(b).add(a);}
 for(const a of entries.values()){
  for(const b of a.aliases)connect(a.sourceId,b);
  for(const b of entries.values())if(a.documentId===b.documentId||a.path===b.path||a.sha256===b.sha256||`${stats.get(a.sourceId).dev}:${stats.get(a.sourceId).ino}`===`${stats.get(b.sourceId).dev}:${stats.get(b.sourceId).ino}`)connect(a.sourceId,b.sourceId);
 }
 let changed=true;while(changed){changed=false;for(const e of entries.values())if(!denied.has(e.sourceId)&&([...edges.get(e.sourceId)].some(k=>denied.has(k))||e.derivedFrom.some(k=>denied.has(k)))){denied.add(e.sourceId);changed=true;}}
 const sources=[...entries.values()].map(e=>({id:e.sourceId,documentId:e.documentId,kind:e.role,access:denied.has(e.sourceId)?'excluded':'allowed',exclusion:'none'}));
 const result=await collectBaselineSources({sources,currentSourceId:st.currentSourceId,reviewMode:'artifact_only'},async k=>{
  const e=entries.get(k),before=stats.get(k);if(identity(await metadata(e.path,roots))!==identity(before))fail();
  const f=await open(e.path,constants.O_RDONLY|constants.O_NOFOLLOW);try{
   if(identity(await f.stat({bigint:true}))!==identity(before))fail();onRead(k);
   const bytes=Buffer.alloc(1000001);let size=0;while(size<bytes.length){const r=await f.read(bytes,size,bytes.length-size,size);if(!r.bytesRead)break;size+=r.bytesRead;}
   const content=bytes.subarray(0,size);if(size>1000000||sha256(content)!==e.sha256||identity(await f.stat({bigint:true}))!==identity(before)||identity(await metadata(e.path,roots))!==identity(before))fail();
   return new TextDecoder('utf-8',{fatal:true}).decode(content);
  }finally{await f.close();}
 });
 const ledger={manifestVersion:1,caseId:m.caseId,stage,cutoff:st.cutoff,manifestSha256:sha256(JSON.stringify(m)),selection:result.selection,items:result.items,unavailable:result.unavailable,
  sourceIdentity:[...entries.values()].filter(e=>!denied.has(e.sourceId)).map(e=>({sourceId:e.sourceId,path:e.path,sha256:e.sha256,dev:String(stats.get(e.sourceId).dev),ino:String(stats.get(e.sourceId).ino)})),
  readiness:m.readiness==='verified'&&typeof m.assessedVersion==='string'&&m.assessedVersion.length>0&&(stage==='preparation'||st.currentSourceId!==null)&&result.unavailable.length===0&&result.items.length>0&&['selected','not_provided'].includes(result.selection.currentArtifact.status)?'input_ready':'blocked'};
 return {...ledger,freezeSha256:sha256(JSON.stringify(ledger))};
}

// No dispatch: caller supplies a new private output directory outside repository/evidence roots.
export async function writeEvaluationLedger(directory,ledger,{protectedRoots=[process.cwd()]}={}){
 if(typeof directory!=='string'||resolve(directory)!==directory||!Array.isArray(protectedRoots))fail();
 const parent=dirname(directory);if(await realpath(parent)!==parent)fail();
 for(const r of protectedRoots){const root=await realpath(r);if(directory===root||directory.startsWith(root+sep)||root.startsWith(directory+sep))fail();}
 for(let p=parent;;p=dirname(p)){
  const s=await lstat(p);if(!s.isDirectory()||s.isSymbolicLink()||![0,process.getuid()].includes(s.uid)||(s.mode&0o022)&&!(s.uid===0&&(s.mode&0o1000)))fail();
  try{await lstat(resolve(p,'.git'));fail();}catch(e){if(e.message==='EVALUATION_INPUT_INVALID'||e.code!=='ENOENT')throw e;}
  if(dirname(p)===p)break;
 }
 const bytes=Buffer.from(JSON.stringify(ledger));if(bytes.length>6000000)fail();
 await mkdir(directory,{mode:0o700});
 const f=await open(resolve(directory,'freeze.json'),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{await f.writeFile(bytes);await f.sync();}finally{await f.close();}
}
