import { CODEX_EXECUTABLE,CODEX_VERSION } from './codex-profile.mjs';
import { spawn } from 'node:child_process';
import { constants as C } from 'node:fs';
import { realpath,lstat,open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname,isAbsolute,join } from 'node:path';
import { homedir } from 'node:os';
import { CODEX_LIMITS,codexFail,codexError } from './codex-contract.mjs';

export function childEnvironment(environment=process.env,tempRoot) {
 const home=environment.HOME??homedir(),codexHome=environment.CODEX_HOME??join(home,'.codex');
 if(!isAbsolute(home)||!isAbsolute(codexHome)||tempRoot!==undefined&&!isAbsolute(tempRoot))codexFail('unsafe_path');
 return {HOME:home,CODEX_HOME:codexHome,PATH:'/usr/bin:/bin',LANG:'en_US.UTF-8',EVIDENCELENS_CHILD:'1',...(tempRoot?{TMPDIR:tempRoot}:{})};
}
export async function executableIdentity(candidate){
 let path;
 try{path=await realpath(candidate);}catch(error){if(['ENOENT','ENOTDIR'].includes(error.code))codexFail('codex_missing');codexFail('unsafe_path');}
 for(let parent=dirname(path);;parent=dirname(parent)){
  const s=await lstat(parent),trusted=[0,process.getuid()].includes(s.uid);
  if(!s.isDirectory()||s.isSymbolicLink()||!trusted||s.mode&0o002&&!(s.uid===0&&s.mode&0o1000))codexFail('unsafe_path');
  if(parent===dirname(parent))break;
 }
 const handle=await open(path,C.O_RDONLY|C.O_NOFOLLOW);
 try{
  const a=await handle.stat();
  if(!a.isFile()||![0,process.getuid()].includes(a.uid)||a.mode&0o022||!(a.mode&0o111)||a.size>512*1024*1024)codexFail('unsafe_path');
  const digest=createHash('sha256');
  for await(const chunk of handle.createReadStream({autoClose:false}))digest.update(chunk);
  const b=await handle.stat();
  if(a.ino!==b.ino||a.size!==b.size||a.mtimeMs!==b.mtimeMs)codexFail('unsafe_path');
  return {executable:path,binarySha256:digest.digest('hex')};
 }finally{await handle.close();}
}
// Own a process group. Never accept a PID or shell command from caller data.
export function boundedProbe(executable,args,{env,cwd,timeoutMs=10000,maxBytes=64*1024}={}) {
 return new Promise(resolve=>{
  let child,bytes=0,chunks=[],code=null,settled=false,killTimer,finishTimer;
  const signal=s=>{try{if(child?.pid)process.kill(-child.pid,s);}catch{}};
  const done=(exitCode,cleanupComplete)=>{
   if(settled)return;settled=true;clearTimeout(timer);clearTimeout(killTimer);clearTimeout(finishTimer);
   resolve({exitCode,cleanupComplete,code,output:code?null:Buffer.concat(chunks).toString('utf8')});chunks=[];
  };
  const stop=reason=>{
   if(code)return;code=reason;chunks=[];signal('SIGTERM');
   killTimer=setTimeout(()=>{signal('SIGKILL');},CODEX_LIMITS.graceMs);
   finishTimer=setTimeout(()=>{signal('SIGKILL');child?.stdout.destroy();child?.stderr.destroy();done(null,false);},CODEX_LIMITS.graceMs*2);
  };
  const timer=setTimeout(()=>stop('timed_out'),Math.max(1,Math.min(timeoutMs,10000)));
  try{
   child=spawn(executable,args,{env,cwd,shell:false,detached:true,stdio:['ignore','pipe','pipe']});
   for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes)stop('output_limit');else if(!code)chunks.push(chunk);});
   child.once('error',()=>{code='codex_missing';done(null,true);});
   child.once('close',async exitCode=>{
    signal('SIGKILL');let gone=false;const until=Date.now()+CODEX_LIMITS.graceMs;
    do{try{process.kill(-child.pid,0);}catch(e){if(e.code==='ESRCH'){gone=true;break;}}await new Promise(r=>setTimeout(r,25));}while(Date.now()<until);
    if(!gone&&!code)code='uncertain';done(exitCode,gone);
   });
  }catch{code='codex_missing';done(null,true);}
 });
}
export async function preflightCodex({executable,environment=process.env,platform=process.platform,arch=process.arch,timeoutMs=10000}={}){
 const started=Date.now();
 try{
  if(environment.EVIDENCELENS_CHILD==='1')codexFail('recursive_call');
  if(platform!=='darwin'||arch!=='arm64')codexFail('unsupported');
  executable??=CODEX_EXECUTABLE;
  const binary=await executableIdentity(executable),env=childEnvironment(environment);
  const probe=async args=>{
   const remaining=Math.min(timeoutMs,10000)-(Date.now()-started);
   if(remaining<=0)return {code:'timed_out',cleanupComplete:true};
   return boundedProbe(binary.executable,args,{env,timeoutMs:remaining});
  };
  const version=await probe(['--version']);
  if(version.code)return {ok:false,code:version.code,cleanupComplete:version.cleanupComplete};
  if(version.exitCode!==0||version.output.trim()!=='codex-cli '+CODEX_VERSION)codexFail('codex_incompatible');
  const help=await probe(['exec','--help']);
  if(help.code)return {ok:false,code:help.code,cleanupComplete:help.cleanupComplete};
  if(help.exitCode!==0||['--json','--output-schema','--ephemeral','--ignore-user-config','--ignore-rules','--strict-config','--skip-git-repo-check'].some(flag=>!help.output.includes(flag)))codexFail('codex_incompatible');
  const login=await probe(['login','status']);
  if(login.code)return {ok:false,code:login.code,cleanupComplete:login.cleanupComplete};
  if(/\b(?:not logged in|logged out)\b/i.test(login.output))codexFail('login_required');
  if(/\b(?:API key|api_key)\b/i.test(login.output))codexFail('auth_mode_unsupported');
  if(login.exitCode!==0||login.output.trim()!=='Logged in using ChatGPT')codexFail('uncertain');
  return {ok:true,...binary,version:CODEX_VERSION,platform,arch,auth:'chatgpt',executionReady:false,elapsedMs:Date.now()-started};
 }catch(error){return {ok:false,...codexError(error)};}
}
