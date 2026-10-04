import fs from 'node:fs/promises';
import { constants as C } from 'node:fs';
import { dirname,join,resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { sha256,uuid } from './prompt-contract.mjs';
import { MODEL_RESULT_SCHEMA,codexFail } from './codex-contract.mjs';
import { executableIdentity,childEnvironment,boundedProbe } from './codex-preflight.mjs';

export const BINARY_SHA256='51f848c212ee24e8da923a7175813a74c113d47e01f0d40f1fea46b12644c363';
export const DISABLED_FEATURES=Object.freeze(['shell_tool','unified_exec','shell_snapshot','multi_agent','apps','plugins','hooks','memories','browser_use','browser_use_external','computer_use','in_app_browser','image_generation','goals','workspace_dependencies','skill_mcp_dependency_install','tool_suggest']);
const DYLD='/System/Library/Sandbox/Profiles/dyld-support.sb';
const DYLD_SHA256='06215a5d32689aefe395c29710e182eb54ba22162f50df8b4842290f8a19bf1c';
const certified=new WeakSet();
const overlap=(a,b)=>a===b||a.startsWith(b+'/')||b.startsWith(a+'/');
// Pure policy builder. Only createIsolatedLaunch mints a runnable production capability.
export function isolationPolicy({binary,scratch,control,auth,installation,configFiles=[],network=false,extraRead=[]}) {
 const q=JSON.stringify,reads=[binary,auth,installation,...configFiles,...extraRead].filter(Boolean);
 return `(version 1)
(deny default)
(import "dyld-support.sb")
(allow file-test-existence file-read-metadata)
(allow process-exec process-fork)
(allow signal (target self))
(allow sysctl-read mach-lookup)
(allow file-read* (subpath "/System/Library") (subpath "/usr/lib") (subpath "/usr/share/zoneinfo") (subpath "/dev") (subpath ${q(control)}) (subpath ${q(scratch)}) ${reads.map(p=>`(literal ${q(p)})`).join(' ')})
(allow file-write* (subpath ${q(scratch)}) (literal "/dev/null"))
${installation?`(allow file-write-data file-write-mode (literal ${q(installation)}))`:''}
${network?'(allow network-outbound)':''}
`;
}
export function isolatedArgs({schema,scratch}) {
 const config={approval_policy:'never',model_provider:'evidencelens_bounded','model_providers.evidencelens_bounded.name':'EvidenceLens bounded Codex','model_providers.evidencelens_bounded.requires_openai_auth':true,'model_providers.evidencelens_bounded.request_max_retries':0,'model_providers.evidencelens_bounded.stream_max_retries':0,web_search:'disabled',project_doc_max_bytes:0,'history.persistence':'none',forced_login_method:'chatgpt','analytics.enabled':false,log_dir:scratch+'/log',sqlite_home:scratch+'/sqlite'};
 const args=['exec','--ignore-user-config','--ignore-rules','--strict-config','--ephemeral','--skip-git-repo-check','--json','--output-schema',schema,'--color','never','-C',scratch,'-m','gpt-5.4'];
 for(const [key,value] of Object.entries(config))args.push('-c',key+'='+JSON.stringify(value));
 for(const feature of DISABLED_FEATURES)args.push('--disable',feature);args.push('-');return args;
}
// A sealed per-run home avoids automatic discovery of ambient agent configs/cache.
// Auth bytes remain in Codex's original file; the adapter creates only a read alias.
export async function createReviewHome({control,auth,installationText}) {
 const codexHome=join(control,'codex-home');await fs.mkdir(codexHome,{mode:0o700});
 await fs.symlink(auth,join(codexHome,'auth.json'));
 const installation=join(codexHome,'installation_id');await fs.writeFile(installation,installationText,{flag:'wx',mode:0o600});
 await fs.chmod(codexHome,0o500);return {codexHome,installation};
}
// Called on the complete bounded stream as well as incrementally (chunk splits cannot hide markers).
export function toolAttempt(stdout,stderr) {
 if(stderr.includes('codex_core::tools::router'))return true;
 return /"type"\s*:\s*"(?:todo_list|file_change|command_execution|mcp_tool_call|tool_call|web_search|agent_tool_call|image_view)"/.test(stdout);
}
export function isolationContractDigest(){return sha256([isolationPolicy.toString(),isolatedArgs.toString(),createReviewHome.toString(),toolAttempt.toString(),JSON.stringify(DISABLED_FEATURES),JSON.stringify(MODEL_RESULT_SCHEMA),DYLD_SHA256].join('\n'));}
const CONTRACT_SHA256='4d3c2134f857f156471d9b408815d7c13ab525f2c84a09f49d3094ecb4ee766a';
async function regular(p,{max=1024*1024,privateOnly=false}={}){
 const s=await fs.lstat(p);
 if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||s.nlink!==1||s.mode&0o022||privateOnly&&s.mode&0o077||s.size>max)codexFail('unsafe_path');
 return s;
}
async function ownedParents(p){
 for(let d=dirname(p);;d=dirname(d)){
  const s=await fs.lstat(d);if(!s.isDirectory()||s.isSymbolicLink()||![0,process.getuid()].includes(s.uid)||s.mode&0o002&&!(s.uid===0&&s.mode&0o1000))codexFail('unsafe_path');if(d===dirname(d))break;
 }
}
async function metadataText(p){await regular(p,{max:80});const h=await fs.open(p,C.O_RDONLY|C.O_NOFOLLOW);try{const t=await h.readFile('utf8');if(!uuid(t.trim()))codexFail('isolation_unverified');return t;}finally{await h.close();}}
export async function verifyIsolationContract(receipt){
 if(process.platform!=='darwin'||process.arch!=='arm64')codexFail('unsupported');
 if(isolationContractDigest()!==CONTRACT_SHA256||sha256(await fs.readFile(DYLD))!==DYLD_SHA256)codexFail('isolation_unverified');
 const actual=await executableIdentity(receipt?.executable);
 if(receipt.version!=='0.141.0'||actual.binarySha256!==BINARY_SHA256||actual.binarySha256!==receipt.binarySha256)codexFail('isolation_unverified');return actual;
}
export function assertCertifiedLaunch(launch){if(!certified.has(launch))codexFail('isolation_unverified');}
export async function createIsolatedLaunch({executableReceipt,runId,evidenceRoots=[],stateRoot,deadline=Date.now()+10000}={}){
 if(process.env.EVIDENCELENS_CHILD==='1')codexFail('recursive_call');if(!uuid(runId))codexFail('unsafe_path');
 const remaining=()=>{const ms=deadline-Date.now();if(ms<=0)codexFail('timed_out');return Math.min(ms,10000);};remaining();
 const {executable:binary}=await verifyIsolationContract(executableReceipt);
 const home=process.env.HOME??homedir(),codexHome=process.env.CODEX_HOME??join(home,'.codex');
 if(!home.startsWith('/')||!codexHome.startsWith('/')||codexHome!==resolve(codexHome))codexFail('unsafe_path');
 const auth=join(codexHome,'auth.json'),installation=join(codexHome,'installation_id');
 await ownedParents(auth);const authStat=await regular(auth,{privateOnly:true}).catch(e=>{if(e.code==='ENOENT')codexFail('auth_mode_unsupported');throw e;});const installationText=await metadataText(installation).catch(e=>{if(e.code==='ENOENT')codexFail('isolation_unverified');throw e;});
 const protectedRoots=[process.cwd(),...evidenceRoots,stateRoot??join(homedir(),'.local','state','evidencelens')],canonicalRoots=[];
 for(const root of protectedRoots){
  if(typeof root!=='string'||!root.startsWith('/'))codexFail('unsafe_path');
  const path=await fs.realpath(root).catch(e=>{if(e.code==='ENOENT')return resolve(root);throw e;});canonicalRoots.push(path);
  if(['/System/Library','/System/Volumes/Preboot/Cryptexes','/usr/lib','/usr/share/zoneinfo','/dev',codexHome,dirname(binary)].some(p=>overlap(path,p)))codexFail('unsafe_path');
 }
 const root=await fs.mkdtemp('/private/tmp/evidencelens-codex-');await fs.chmod(root,0o700);const rootStat=await fs.lstat(root);
 const scratch=join(root,'runtime'),control=join(root,'control');
 let cleaned=false;
 const cleanup=async()=>{
  if(cleaned)return true;
  const s=await fs.lstat(root);if(s.ino!==rootStat.ino||s.isSymbolicLink()||s.uid!==process.getuid())codexFail('uncertain');
  const unchanged=await metadataText(installation).then(t=>t===installationText).catch(()=>false);
  const authAfter=await regular(auth,{privateOnly:true}).catch(()=>null);const authSame=authAfter&&authAfter.ino===authStat.ino&&authAfter.mtimeMs===authStat.mtimeMs&&authAfter.size===authStat.size;
  await fs.chmod(join(control,'codex-home'),0o700).catch(e=>{if(e.code!=="ENOENT")throw e;});await fs.chmod(control,0o700).catch(e=>{if(e.code!=="ENOENT")throw e;});await fs.rm(root,{recursive:true,force:false});cleaned=true;if(!unchanged||!authSame)codexFail('uncertain');return true;
 };
 try {
  if(canonicalRoots.some(p=>overlap(p,root)))codexFail('unsafe_path');
  await fs.mkdir(scratch,{mode:0o700});await fs.mkdir(control,{mode:0o700});
  const schema=join(control,'schema.json');await fs.writeFile(schema,JSON.stringify(MODEL_RESULT_SCHEMA),{flag:'wx',mode:0o400});
  const env=Object.freeze(childEnvironment(process.env,scratch));
  // Cheap positive/negative OS check on every launch, before any captured prompt is consumed.
  const approved=join(control,'sentinel'),denied=join(root,'denied');await fs.writeFile(approved,'synthetic');await fs.writeFile(denied,'synthetic');
  const checkPolicy=isolationPolicy({binary:'/bin/sh',scratch,control,auth,extraRead:['/bin/cat','/usr/bin/touch']});
  const check=await boundedProbe('/usr/bin/sandbox-exec',['-p',checkPolicy,'/bin/sh','-c','/bin/cat "$1" >/dev/null || exit 1; if /bin/cat "$2" >/dev/null 2>&1; then exit 2; fi; if /usr/bin/touch "$2" 2>/dev/null; then exit 3; fi; echo verified','probe',approved,denied],{env,cwd:scratch,timeoutMs:remaining()});
  await fs.unlink(approved);await fs.unlink(denied);
  if(!check.cleanupComplete){const e=new Error('uncertain');e.code='uncertain';e.cleanupComplete=false;throw e;}
  if(check.exitCode!==0||check.code||check.output.trim()!=='verified')codexFail('isolation_unverified');
  // Status-only config reads never become capabilities of the review process.
  const configFiles=[];const config=join(codexHome,'config.toml');
  try{await regular(config);configFiles.push(config);}catch(e){if(e.code!=='ENOENT')throw e;}
  const agents=join(codexHome,'agents');
  try {
   const s=await fs.lstat(agents);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.mode&0o022)codexFail('unsafe_path');
   const names=await fs.readdir(agents);if(names.length>200)codexFail('isolation_unverified');configFiles.push(agents);
   for(const name of names.filter(n=>/^[A-Za-z0-9_-]+\.toml$/.test(n))){const p=join(agents,name);await regular(p);configFiles.push(p);}
  }catch(e){if(e.code!=='ENOENT')throw e;}
  const statusPolicy=isolationPolicy({binary,scratch,control,auth,configFiles});
  const status=await boundedProbe('/usr/bin/sandbox-exec',['-p',statusPolicy,binary,'login','status'],{env,cwd:scratch,timeoutMs:remaining()});
  if(!status.cleanupComplete){const e=new Error('uncertain');e.code='uncertain';e.cleanupComplete=false;throw e;}
  if(status.code)codexFail(status.code);
  if(/API key|api_key/i.test(status.output))codexFail('auth_mode_unsupported');
  if(/not logged in|logged out/i.test(status.output))codexFail('login_required');
  if(status.exitCode!==0||!/^Logged in using ChatGPT$/m.test(status.output))codexFail('isolation_unverified');
  const reviewHome=await createReviewHome({control,auth,installationText});
  const reviewEnv=Object.freeze({...env,CODEX_HOME:reviewHome.codexHome});
  const policy=isolationPolicy({binary,scratch,control,auth,installation:reviewHome.installation,network:true});
  const policyPath=join(control,'policy.sb');await fs.writeFile(policyPath,policy,{flag:'wx',mode:0o400});await fs.chmod(control,0o500);
  const args=Object.freeze(['-f',policyPath,binary,...isolatedArgs({schema,scratch})]);
  const launch=Object.freeze({executable:'/usr/bin/sandbox-exec',args,env:reviewEnv,cwd:scratch,root,runId,binaryVersion:'0.141.0',binarySha256:BINARY_SHA256,policySha256:sha256(policy),contractSha256:CONTRACT_SHA256,cleanup});
  certified.add(launch);return launch;
 }catch(e){if(e.cleanupComplete===false){e.scratchRoot=root;throw e;}try{await cleanup();}catch{const error=new Error('uncertain');error.code='uncertain';error.cleanupComplete=cleaned;error.scratchRoot=root;throw error;}throw e;}
}
