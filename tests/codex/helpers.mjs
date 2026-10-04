import { randomUUID } from 'node:crypto';
import { sha256 } from '../../skills/assignment-review/scripts/prompt-contract.mjs';
export function fixture() {
  const content='A 中文 excerpt\nsecond line';
  const identity={runId:randomUUID(),taskId:'T20',conversationId:randomUUID(),stage:'in_progress',currentSourceId:'S1'};
  const capsule={schemaVersion:1,...identity,sources:[{sourceId:'S1',sourceHash:sha256(content),excerpts:[{excerptId:'E1',startByte:0,endByte:Buffer.byteLength(content),text:content,excerptSha256:sha256(content),locator:'lines 1-2'}]}]};
  const snapshot={schemaVersion:1,...identity,sequence:1,reviewMode:'artifact_only',promptText:'pending',promptSha256:sha256('pending'),capturedAt:new Date().toISOString(),materials:[{sourceId:'S1',role:'solution',status:'inspected',sourceReference:'synthetic.txt',inspectedParts:['lines 1-2'],observedAt:new Date().toISOString(),hashKind:'sha256_utf8',contentHash:sha256(content),availability:'inline_excerpt'}],limitations:['Synthetic excerpt only']};
  const result={schemaVersion:1,runId:identity.runId,taskId:identity.taskId,stage:identity.stage,currentSourceId:'S1',coverage:[{sourceId:'S1',status:'covered',excerptIds:['E1']}],findings:[{findingId:'F1',kind:'observation',severity:'info',claim:'Contains text',evidence:[{sourceId:'S1',excerptId:'E1',startByte:0,endByte:1,quote:'A'}],action:null}],limitations:[]};
  return {content,capsule,snapshot,result,admitted:[{sourceId:'S1',text:content}]};
}

// Actual-binary fixtures use only fabricated auth and an OS-enforced loopback endpoint.
import { mkdtemp,mkdir,writeFile,chmod,rm,realpath,readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { executableIdentity } from '../../skills/assignment-review/scripts/codex-preflight.mjs';
import { MODEL_RESULT_SCHEMA } from '../../skills/assignment-review/scripts/codex-contract.mjs';
export const PINNED_BINARY_SHA256='51f848c212ee24e8da923a7175813a74c113d47e01f0d40f1fea46b12644c363';
export const DISABLED_FEATURES=['shell_tool','unified_exec','shell_snapshot','multi_agent','apps','plugins','hooks','memories','browser_use','browser_use_external','computer_use','in_app_browser','image_generation','goals','workspace_dependencies','skill_mcp_dependency_install','tool_suggest'];
export function runChild(executable,args,{env,cwd,input='',timeoutMs=15000}={}) {
 return new Promise((resolve,reject)=>{
  const child=spawn(executable,args,{env,cwd,detached:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',timedOut=false,overflow=false;
  const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}};
  const timer=setTimeout(()=>{timedOut=true;kill();},timeoutMs);
  child.stdout.on('data',b=>{stdout+=b;if(stdout.length+stderr.length>2*1024*1024){overflow=true;kill();}});
  child.stderr.on('data',b=>{stderr+=b;if(stdout.length+stderr.length>2*1024*1024){overflow=true;kill();}});
  child.stdin.on('error',()=>{});child.stdin.end(input);
  child.once('error',e=>{clearTimeout(timer);reject(e);});
  child.once('close',(exitCode,signal)=>{clearTimeout(timer);kill();resolve({exitCode,signal,stdout,stderr,timedOut,overflow});});
 });
}
export function candidatePolicy({binary,scratch,auth,control,extraRead=[]}) {
 const q=JSON.stringify;
 return `(version 1)
(deny default)
(import "dyld-support.sb")
(allow file-test-existence)
(allow process-exec process-fork)
(allow signal (target self))
(allow sysctl-read mach-lookup)
(allow file-read-metadata)
(allow file-read* (subpath "/System/Library") (subpath "/usr/lib") (subpath "/usr/share/zoneinfo") (subpath "/dev") (literal ${q(binary)}) (literal ${q(auth)}) (literal ${q(auth.replace(/auth\.json$/,'installation_id'))}) (subpath ${q(control)}) (subpath ${q(scratch)}) ${extraRead.map(p=>`(literal ${q(p)})`).join(' ')})
(allow file-write* (subpath ${q(scratch)}) (literal "/dev/null"))
(allow network-outbound (remote ip "localhost:*"))
`;
}
export async function protocolFixture(mode='success',{permitInstallationMetadata=false,tool,configOverrides={}}={}) {
 const base=await mkdtemp('/private/tmp/el20-host-');await chmod(base,0o700);
 const home=base+'/home',codexHome=home+'/.codex',scratch=base+'/scratch',control=base+'/control';
 for(const p of [home,codexHome,scratch,control])await mkdir(p,{mode:0o700});
 const binary=await realpath('/opt/homebrew/bin/codex');
 const identity=await executableIdentity(binary);
 if(identity.binarySha256!==PINNED_BINARY_SHA256){await rm(base,{recursive:true,force:true});throw new Error('Pinned binary changed: gate must be reviewed');}
 const claims={'https://api.openai.com/auth':{chatgpt_account_id:'synthetic-account',chatgpt_plan_type:'plus',chatgpt_user_id:'synthetic-user'},email:'synthetic@example.invalid',exp:4102444800};
 const token=[{alg:'none'},claims].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.synthetic';
 const auth=codexHome+'/auth.json',authSentinel='AUTH_SYNTHETIC_SENTINEL_20';
 const authText=JSON.stringify({auth_mode:'chatgpt',OPENAI_API_KEY:null,tokens:{id_token:token,access_token:token,refresh_token:authSentinel,account_id:'synthetic-account'},last_refresh:new Date().toISOString()});
 await writeFile(auth,authText,{mode:0o600});
 const ambient='AMBIENT_SYNTHETIC_SENTINEL_20';
 await writeFile(home+'/AGENTS.md',ambient);await writeFile(codexHome+'/AGENTS.md',ambient);
 await writeFile(codexHome+'/config.toml','model_instructions_file="'+home+'/AGENTS.md"\n');
 await writeFile(codexHome+'/installation_id',randomUUID(),{mode:0o600});
 const outside=base+'/outside.txt';await writeFile(outside,'OUTSIDE_SYNTHETIC_SENTINEL_20');
 const schema=control+'/schema.json';await writeFile(schema,JSON.stringify(MODEL_RESULT_SCHEMA),{mode:0o400});
 const {result}=fixture();const requests=[];
 function sse(res,type,data){res.write('event: '+type+'\ndata: '+JSON.stringify({type,...data})+'\n\n');}
 const server=createServer((req,res)=>{
  let body='';req.on('data',b=>body+=b);req.on('end',()=>{
   if(req.method==='GET'){res.writeHead(200,{'content-type':'application/json'});res.end('{"models":[]}');return;}
   requests.push({path:req.url,body:JSON.parse(body)});
   if(mode==='500'||mode==='429'){res.writeHead(Number(mode),{'content-type':'application/json'});res.end('{"error":{"message":"synthetic failure","type":"server_error"}}');return;}
   if(mode==='disconnect'){req.socket.destroy();return;}
   res.writeHead(200,{'content-type':'text/event-stream'});
   sse(res,'response.created',{response:{id:'resp_fixture',object:'response',status:'in_progress',output:[]}});
   if(mode==='truncated'){res.end();return;}
   if(mode==='failed'){sse(res,'response.failed',{response:{id:'resp_fixture',status:'failed',error:{code:'server_error',message:'synthetic failure'}}});res.end();return;}
   const item=tool&&requests.length===1?tool({base,home,codexHome,scratch,auth,outside}):{type:'message',id:'msg_fixture',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(result),annotations:[]}]};
   sse(res,'response.output_item.added',{output_index:0,item});
   sse(res,'response.output_item.done',{output_index:0,item});
   sse(res,'response.completed',{response:{id:'resp_fixture',status:'completed',output:[item],usage:{input_tokens:10,output_tokens:10,total_tokens:20}}});res.end();
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const config={approval_policy:'never',model_provider:'evidencelens_bounded','model_providers.evidencelens_bounded.name':'EvidenceLens bounded Codex','model_providers.evidencelens_bounded.requires_openai_auth':true,'model_providers.evidencelens_bounded.request_max_retries':0,'model_providers.evidencelens_bounded.stream_max_retries':0,'model_providers.evidencelens_bounded.base_url':`http://127.0.0.1:${port}/fixture`,chatgpt_base_url:`http://127.0.0.1:${port}/backend-api/`,web_search:'disabled',project_doc_max_bytes:0,'history.persistence':'none',forced_login_method:'chatgpt','analytics.enabled':false,log_dir:scratch+'/log',sqlite_home:scratch+'/sqlite',...configOverrides};
 const args=['exec','--ignore-user-config','--ignore-rules','--strict-config','--ephemeral','--skip-git-repo-check','--json','--output-schema',schema,'--color','never','-C',scratch,'-m','gpt-5.4'];
 for(const [key,value] of Object.entries(config))args.push('-c',key+'='+JSON.stringify(value));
 for(const f of DISABLED_FEATURES)args.push('--disable',f);args.push('-');
 // A test-only exception to diagnose the startup failure, never production certification.
 const policy=candidatePolicy({binary,scratch,auth,control})+(permitInstallationMetadata?'\n(allow file-write* (literal '+JSON.stringify(codexHome+'/installation_id')+'))':'');
 try {
  const child=await runChild('/usr/bin/sandbox-exec',['-p',policy,binary,...args],{env:{HOME:home,CODEX_HOME:codexHome,PATH:'/usr/bin:/bin',TMPDIR:scratch,LANG:'en_US.UTF-8',EVIDENCELENS_CHILD:'1'},cwd:scratch,input:'SYNTHETIC PROTOCOL FIXTURE ONLY'});
  return {...child,requests,result,policySha256:sha256(policy.replaceAll(base,'<fixture-root>')),authSentinel,ambient,authUnchanged:(await readFile(auth,'utf8'))===authText,outsideUnchanged:(await readFile(outside,'utf8'))==='OUTSIDE_SYNTHETIC_SENTINEL_20'};
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(base,{recursive:true,force:true});}
}
