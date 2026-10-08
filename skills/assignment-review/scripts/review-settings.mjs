#!/usr/bin/env node
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,isAbsolute,join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {fields,array,text,decode,fail,safeError} from './prompt-contract.mjs';
export const REVIEW_DEFAULTS=Object.freeze({reviewers:Object.freeze(['codex']),responseMode:'full',minimumGoal:null,planningGoal:null,automaticRetries:0});
const keys=Object.keys(REVIEW_DEFAULTS),maxBytes=4096;
export function validateSettings(input){
 const v=fields(input,Object.keys(input??{}));if(Object.keys(v).some(k=>!keys.includes(k)))fail('corrupt_record');
 if(Object.hasOwn(v,'reviewers')){v.reviewers=array(v.reviewers,2,x=>{if(!['codex','deepseek'].includes(x))fail('corrupt_record');return x;});if(!v.reviewers.length||new Set(v.reviewers).size!==v.reviewers.length)fail('corrupt_record');v.reviewers.sort((a,b)=>['codex','deepseek'].indexOf(a)-['codex','deepseek'].indexOf(b));}
 if(Object.hasOwn(v,'responseMode')&&!['full','summary'].includes(v.responseMode))fail('corrupt_record');
 for(const k of ['minimumGoal','planningGoal'])if(Object.hasOwn(v,k)&&v[k]!==null){text(v[k],80);if(!/^[\p{L}\p{N} ._+()\/-]{1,40}$/u.test(v[k])||!v[k].trim())fail('corrupt_record');}
 if(Object.hasOwn(v,'automaticRetries')&&v.automaticRetries!==0)fail('corrupt_record');return v;
}
async function parents(path){
 const up=dirname(path);if(up!==path)await parents(up);
 try{const s=await fs.lstat(path);if(!s.isDirectory()||s.isSymbolicLink())fail('unsafe_path');}catch(e){if(e.code!=='ENOENT')throw e;}
}
async function read(path){
 await parents(dirname(path));let h;
 try{
  const before=await fs.lstat(path);if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1)fail('unsafe_path');
  h=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const s=await h.stat();if(!s.isFile()||s.nlink!==1||s.dev!==before.dev||s.ino!==before.ino||s.size>maxBytes)fail('unsafe_path');
  const bytes=await h.readFile();if(bytes.length>maxBytes)fail('store_limit');
  let raw;try{raw=JSON.parse(decode(bytes));}catch{fail('corrupt_record');}
  const v=fields(raw,['schemaVersion','settings']);if(v.schemaVersion!==1)fail('corrupt_record');
  return {settings:validateSettings(v.settings),bytes};
 }catch(e){if(e.code==='ENOENT')return {settings:{},bytes:null};if(['ELOOP','EISDIR','ENXIO'].includes(e.code))fail('unsafe_path');throw e;}finally{await h?.close();}
}
function paths(projectRoot,userRoot){
 if(typeof projectRoot!=='string'||!isAbsolute(projectRoot)||typeof userRoot!=='string'||!isAbsolute(userRoot))fail('unsafe_path');
 const p=join(resolve(projectRoot),'.evidencelens','review-settings.json'),u=join(resolve(userRoot),'review-settings.json');if(p===u)fail('unsafe_path');return {project:p,user:u};
}
export async function resolveReviewSettings({projectRoot,overrides={}}, {userRoot=process.env.EVIDENCELENS_SETTINGS_ROOT??join(homedir(),'.config','evidencelens')}={}){
 const locations=paths(projectRoot,userRoot),instruction=validateSettings(overrides);
 await parents(resolve(projectRoot));const root=await fs.lstat(resolve(projectRoot));if(!root.isDirectory()||root.isSymbolicLink())fail('unsafe_path');
 const project=await read(locations.project),user=await read(locations.user),effective={},sources={};
 for(const k of keys){const layer=Object.hasOwn(instruction,k)?'instruction':Object.hasOwn(project.settings,k)?'project':Object.hasOwn(user.settings,k)?'user':'builtin';const value={instruction,project:project.settings,user:user.settings,builtin:REVIEW_DEFAULTS}[layer][k];effective[k]=Array.isArray(value)?[...value]:value;sources[k]={layer,path:locations[layer]??null};}
 return {effective,sources,locations,stored:{project:project.settings,user:user.settings},reviewStarted:false};
}
export function buildSettingsExecutionPlan(resolved,{recheck=false}={}){
 if(typeof recheck!=='boolean')fail('corrupt_record');const settings=validateSettings(resolved.effective);if(keys.some(k=>!Object.hasOwn(settings,k)))fail('corrupt_record');
 return {...resolved,executionPlan:settings.reviewers.map(provider=>({provider,executionKind:provider==='codex'?'codex_exec':'host_skill',helper:provider+'-review.mjs',attempts:1})),reviewIntent:{minimumGoal:settings.minimumGoal,planningGoal:settings.planningGoal,recheck},delivery:{action:'synthesize',view:settings.responseMode},automaticRetries:0};
}
async function save(path,transform){
 const dir=dirname(path);await parents(dir);await fs.mkdir(dir,{recursive:true,mode:0o700});await parents(dir);
 const lock=join(dir,'.review-settings.lock');let lockStat;
 try{await fs.mkdir(lock,{mode:0o700});lockStat=await fs.lstat(lock);}catch(e){if(e.code==='EEXIST')fail('busy');throw e;}
 const temp=join(dir,'.review-settings-'+randomUUID()+'.tmp');let ownedTemp=null,dirty=false;
 try{
  const old=await read(path),settings=validateSettings(transform(old.settings)),bytes=JSON.stringify({schemaVersion:1,settings})+'\n';if(Buffer.byteLength(bytes)>maxBytes)fail('store_limit');
  const h=await fs.open(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{ownedTemp=await h.stat();await h.writeFile(bytes);await h.sync();}finally{await h.close();}
  await parents(dir);const current=await read(path);if(!((old.bytes===null&&current.bytes===null)||(old.bytes&&current.bytes&&old.bytes.equals(current.bytes))))fail('busy');
  const t=await fs.lstat(temp);if(t.dev!==ownedTemp.dev||t.ino!==ownedTemp.ino||t.nlink!==1||!t.isFile())fail('unsafe_path');
  dirty=true;await fs.rename(temp,path);ownedTemp=null;
  const d=await fs.open(dir,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await d.sync();}finally{await d.close();}
  dirty=false;return {savedPath:path,savedSettings:settings};
 }finally{
  if(!dirty){
   await parents(dir);
   if(ownedTemp){const s=await fs.lstat(temp).catch(()=>null);if(s?.dev===ownedTemp.dev&&s?.ino===ownedTemp.ino&&s?.isFile())await fs.unlink(temp);}
   const s=await fs.lstat(lock);if(s.dev===lockStat.dev&&s.ino===lockStat.ino&&s.isDirectory()&&!s.isSymbolicLink())await fs.rmdir(lock);
  }
 }
}
export async function reviewSettings(action,input={},options={}){
 if(!['show','plan','set','reset'].includes(action))fail('unsupported');
 const v=fields(input,Object.keys(input)),allowed=['projectRoot',...(['show','plan'].includes(action)?['overrides',...(action==='plan'?['recheck']:[])]:['scope',...(action==='set'?['changes']:['keys'])])];if(Object.keys(v).some(k=>!allowed.includes(k)))fail('corrupt_record');
 const projectRoot=Object.hasOwn(v,'projectRoot')?v.projectRoot:process.cwd();let resolved=await resolveReviewSettings({projectRoot,overrides:Object.hasOwn(v,'overrides')?v.overrides:{}},options);
 if(action==='show')return resolved;if(action==='plan')return buildSettingsExecutionPlan(resolved,{recheck:Object.hasOwn(v,'recheck')?v.recheck:false});
 const scope=Object.hasOwn(v,'scope')?v.scope:'project';if(!['project','user'].includes(scope))fail('corrupt_record');
 const changes=action==='set'?validateSettings(v.changes):null;
 const reset=action==='reset'?array(Object.hasOwn(v,'keys')?v.keys:keys,keys.length,k=>{if(!keys.includes(k))fail('corrupt_record');return k;}):null;
 if(reset&&new Set(reset).size!==reset.length)fail('corrupt_record');
 const saved=await save(resolved.locations[scope],old=>{const next={...old,...changes};for(const k of reset??[])delete next[k];return next;});
 resolved=await resolveReviewSettings({projectRoot},options);return {...resolved,...saved,savedScope:scope};
}
export async function main(args){try{
 if(args.length!==1)fail('unsupported');let n=0;const chunks=[];for await(const c of process.stdin){n+=c.length;if(n>maxBytes)fail('store_limit');chunks.push(c);}
 let input;try{input=JSON.parse(decode(Buffer.concat(chunks)));}catch{fail('corrupt_record');}
 process.stdout.write(JSON.stringify(await reviewSettings(args[0],input))+'\n');
}catch(e){process.stderr.write(JSON.stringify(safeError(e))+'\n');process.exitCode=1;}}
const entry=process.argv[1]?await fs.realpath(process.argv[1]).catch(()=>null):null;
if(entry&&import.meta.url===pathToFileURL(entry).href)await main(process.argv.slice(2));
