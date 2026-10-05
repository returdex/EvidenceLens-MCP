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
import { spawn,spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { executableIdentity } from '../../skills/assignment-review/scripts/codex-preflight.mjs';
import { MODEL_RESULT_SCHEMA,MODEL_CITATION_SCHEMA,MODEL_REFERENCE_SCHEMA } from '../../skills/assignment-review/scripts/codex-contract.mjs';
export const PINNED_BINARY_SHA256='6b582e8813ce7e8ed4c52814ee5cf230dba647bf2292df747a4003f2657ef201';
import { isolationPolicy,isolatedArgs,createReviewHome,toolAttempt } from '../../skills/assignment-review/scripts/codex-isolation.mjs';
export function runChild(executable,args,{env,cwd,input='',timeoutMs=15000,supervise=false}={}) {
 return new Promise((resolve,reject)=>{
  const child=spawn(executable,args,{env,cwd,detached:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',timedOut=false,overflow=false,rejected=false;
  const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}};
  const timer=setTimeout(()=>{timedOut=true;kill();},timeoutMs);
  child.stdout.on('data',b=>{stdout+=b;if(supervise&&toolAttempt(stdout,stderr)){rejected=true;kill();}if(stdout.length+stderr.length>2*1024*1024){overflow=true;kill();}});
  child.stderr.on('data',b=>{stderr+=b;if(supervise&&toolAttempt(stdout,stderr)){rejected=true;kill();}if(stdout.length+stderr.length>2*1024*1024){overflow=true;kill();}});
  child.stdin.on('error',()=>{});child.stdin.end(input);
  child.once('error',e=>{clearTimeout(timer);reject(e);});
  child.once('close',(exitCode,signal)=>{clearTimeout(timer);kill();resolve({exitCode,signal,stdout,stderr,timedOut,overflow,rejected});});
 });
}
export function candidatePolicy({binary,scratch,auth,control,extraRead=[],installation}) {
 return isolationPolicy({binary,scratch,auth,control,extraRead,installation})+'\n(allow network-outbound (remote ip "localhost:*"))';
}
export async function protocolFixture(mode='success',{permitInstallationMetadata=false,tool,supervise=false,useRunner=false,configOverrides={},homeEntries=[],homeDirectories=[],isolatedHome=true,isolateUserHome=true,globalSkills=true,denyPreferencesSync=false,responseHeaders={},catalogEtag=null,citationOnly=false,referenceOnly=false,outputSchema,responseResult}={}) {
 const base=await mkdtemp('/private/tmp/el20-host-');await chmod(base,0o700);
 const home=base+'/home',codexHome=home+'/.codex',scratch=base+'/scratch',control=base+'/control';
 for(const p of [home,codexHome,scratch,control])await mkdir(p,{mode:0o700});
 const binary=await realpath('/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex');
 const identity=await executableIdentity(binary);
 if(identity.binarySha256!==PINNED_BINARY_SHA256){await rm(base,{recursive:true,force:true});throw new Error('Pinned binary changed: gate must be reviewed');}
 const claims={'https://api.openai.com/auth':{chatgpt_account_id:'synthetic-account',chatgpt_plan_type:'plus',chatgpt_user_id:'synthetic-user'},email:'synthetic@example.invalid',exp:4102444800};
 const token=[{alg:'none'},claims].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.synthetic';
 const auth=codexHome+'/auth.json',authSentinel='AUTH_SYNTHETIC_SENTINEL_20';
 const authText=JSON.stringify({auth_mode:'chatgpt',OPENAI_API_KEY:null,tokens:{id_token:token,access_token:token,refresh_token:authSentinel,account_id:'synthetic-account'},last_refresh:new Date().toISOString()});
 await writeFile(auth,authText,{mode:0o600});
 const ambient='AMBIENT_SYNTHETIC_SENTINEL_20';
 if(globalSkills){await mkdir(home+'/.agents/skills/ambient',{recursive:true});await writeFile(home+'/.agents/skills/ambient/SKILL.md',ambient);}
 await mkdir(codexHome+'/skills');await mkdir(codexHome+'/skills/injected');await writeFile(codexHome+'/skills/injected/SKILL.md',ambient);await mkdir(codexHome+'/memories');await writeFile(codexHome+'/memories/MEMORY.md',ambient);await mkdir(scratch+'/.codex');await writeFile(scratch+'/.codex/config.toml','model_instructions_file=\"'+home+'/AGENTS.md\"');await writeFile(scratch+'/AGENTS.md',ambient);
 await writeFile(home+'/AGENTS.md',ambient);await writeFile(codexHome+'/AGENTS.md',ambient);
 await writeFile(codexHome+'/config.toml','model_instructions_file="'+home+'/AGENTS.md"\n');
 for(const entry of homeDirectories){if(!/^[A-Za-z0-9_.-]+$/.test(entry))throw Error('Invalid synthetic directory');await mkdir(codexHome+'/'+entry,{mode:0o700});if(entry==='agents')await writeFile(codexHome+'/agents/injected.toml','description="AGENT_PRIVATE_SENTINEL"\ndeveloper_instructions="AGENT_PRIVATE_SENTINEL"\n');}
 for(const entry of homeEntries){if(!/^[A-Za-z0-9_.-]+$/.test(entry))throw Error('Invalid synthetic entry');await writeFile(codexHome+'/'+entry,'SYNTHETIC_PRIVATE_STATE',{mode:0o600});}
 const installationId=randomUUID();await writeFile(codexHome+'/installation_id',installationId,{mode:0o600});
 const outside=base+'/outside.txt';await writeFile(outside,'OUTSIDE_SYNTHETIC_SENTINEL_20');
 const schema=control+'/schema.json';await writeFile(schema,JSON.stringify(outputSchema??(referenceOnly?MODEL_REFERENCE_SCHEMA:citationOnly?MODEL_CITATION_SCHEMA:MODEL_RESULT_SCHEMA)),{mode:0o400});
 const result=responseResult?structuredClone(responseResult):fixture().result;if(citationOnly||referenceOnly){result.schemaVersion=referenceOnly?3:2;for(const f of result.findings)for(const e of f.evidence){delete e.startByte;delete e.endByte;if(referenceOnly)delete e.quote;}}const requests=[];
 function sse(res,type,data){res.write('event: '+type+'\ndata: '+JSON.stringify({type,...data})+'\n\n');}
 const server=createServer((req,res)=>{
  let body='';req.on('data',b=>body+=b);req.on('end',()=>{
   if(req.method==='GET'){res.writeHead(200,{'content-type':'application/json',...(catalogEtag?{etag:catalogEtag}:{})});res.end('{"models":[]}');return;}
   requests.push({path:req.url,body:JSON.parse(body)});
   if(mode==='500'||mode==='429'){res.writeHead(Number(mode),{'content-type':'application/json'});res.end('{"error":{"message":"synthetic failure","type":"server_error"}}');return;}
   if(mode==='disconnect'){req.socket.destroy();return;}
   res.writeHead(200,{'content-type':'text/event-stream',...responseHeaders});
   sse(res,'response.created',{response:{id:'resp_fixture',object:'response',status:'in_progress',output:[]}});
   if(mode==='truncated'){res.end();return;}
   if(mode==='failed'){sse(res,'response.failed',{response:{id:'resp_fixture',status:'failed',error:{code:'server_error',message:'synthetic failure'}}});res.end();return;}
   const item=tool&&requests.length===1?tool({base,home,codexHome,scratch,auth,outside,reviewHome:reviewHome.codexHome}):{type:'message',id:'msg_fixture',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(result),annotations:[]}]};
   sse(res,'response.output_item.added',{output_index:0,item});
   sse(res,'response.output_item.done',{output_index:0,item});
   sse(res,'response.completed',{response:{id:'resp_fixture',status:'completed',output:[item],usage:{input_tokens:10,output_tokens:10,total_tokens:20}}});res.end();
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const args=isolatedArgs({schema,scratch});args.pop();
 const config={'model_providers.evidencelens_bounded.base_url':`http://127.0.0.1:${port}/fixture`,chatgpt_base_url:`http://127.0.0.1:${port}/backend-api/`,...configOverrides};
 for(const [key,value] of Object.entries(config))args.push('-c',key+'='+JSON.stringify(value));args.push('-');
 const reviewHome=isolatedHome?await createReviewHome({control,auth,installationText:installationId}):{codexHome,installation:codexHome+'/installation_id'};
 let policy=candidatePolicy({binary,scratch,auth,control,installation:permitInstallationMetadata?reviewHome.installation:undefined,extraRead:[reviewHome.installation]});
 if(denyPreferencesSync)policy=policy.replace(/^\(allow ipc-posix-shm-read-data .*\n/m,'');
 try {
  const env={HOME:isolatedHome&&isolateUserHome?reviewHome.codexHome:home,CODEX_HOME:reviewHome.codexHome,PATH:'/usr/bin:/bin',TMPDIR:scratch,LANG:'en_US.UTF-8',EVIDENCELENS_CHILD:'1'};
  const child=useRunner?{outcome:await (await import('../../skills/assignment-review/scripts/codex-runner.mjs')).superviseCodexProcess({executable:'/usr/bin/sandbox-exec',args:['-p',policy,binary,...args],env,cwd:scratch},Buffer.from('SYNTHETIC PROTOCOL FIXTURE ONLY'),{timeoutMs:15000})}:await runChild('/usr/bin/sandbox-exec',['-p',policy,binary,...args],{env,cwd:scratch,input:'SYNTHETIC PROTOCOL FIXTURE ONLY',supervise});
  return {...child,requests,result,policySha256:sha256(policy.replaceAll(base,'<fixture-root>')),authSentinel,ambient,installationUnchanged:(await readFile(codexHome+'/installation_id','utf8'))===installationId,authUnchanged:(await readFile(auth,'utf8'))===authText,outsideUnchanged:(await readFile(outside,'utf8'))==='OUTSIDE_SYNTHETIC_SENTINEL_20'};
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));if(isolatedHome)await chmod(reviewHome.codexHome,0o700);await rm(base,{recursive:true,force:true});}
}

// Trusted library adapter fixture; this is never a production CLI option.
export async function capturedFlow(t,{stage='in_progress',current=true,sourceId='S1',installed=false}={}){
 const fs=await import('node:fs/promises');const store=await import('../../skills/assignment-review/scripts/prompt-store.mjs');const {captureCodexPrompt}=await import('../../skills/assignment-review/scripts/codex-review.mjs');
 const root=await fs.mkdtemp('/private/tmp/el20-flow-');await fs.chmod(root,0o700);t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const f=fixture(),scope={stateRoot:root+'/state',taskId:f.snapshot.taskId,conversationId:f.snapshot.conversationId};
 if(sourceId!=='S1'){f.snapshot.currentSourceId=f.capsule.currentSourceId=f.result.currentSourceId=sourceId;f.snapshot.materials[0].sourceId=f.capsule.sources[0].sourceId=f.result.coverage[0].sourceId=f.result.findings[0].evidence[0].sourceId=f.admitted[0].sourceId=sourceId;}
 await fs.mkdir(root+'/project');await fs.symlink((await import('node:url')).fileURLToPath(new URL('../../skills/assignment-review',import.meta.url)),root+'/installed');
 const cli=(helper,action,input)=>{const r=spawnSync(process.execPath,[root+'/installed/scripts/'+helper+'.mjs',action],{env:{PATH:'/usr/bin:/bin',HOME:root,CODEX_THREAD_ID:scope.conversationId,EVIDENCELENS_STATE_ROOT:scope.stateRoot},cwd:root+'/project',input:JSON.stringify(input),encoding:'utf8',timeout:15000});if(r.status!==0)throw Error('Synthetic installed helper failed: '+r.stderr);return JSON.parse(r.stdout);};
 const receipt=installed?cli('prompt-records','begin',{taskId:scope.taskId,executionKind:'codex_exec'}):await store.beginRun(scope,{executionKind:'codex_exec'});
 for(const value of [f.snapshot,f.capsule,f.result]){value.runId=receipt.runId;value.stage=stage;if(!current)value.currentSourceId=null;}
 f.snapshot.sequence=receipt.sequence;
 if(!current){f.snapshot.materials=[];f.capsule.sources=[];f.admitted=[];f.result.coverage=[];f.result.findings=[];}
 const captureInput={snapshot:f.snapshot,capsule:f.capsule,admitted:f.admitted};
 if(installed)cli('codex-review','capture',{taskId:scope.taskId,runId:receipt.runId,...captureInput});else await captureCodexPrompt(scope,receipt.runId,captureInput);
 const exportPrompt=()=>installed?cli('prompt-records','export',{taskId:scope.taskId,expectedRunId:receipt.runId}):store.exportLatest(scope,{expectedRunId:receipt.runId});
 const exported=await exportPrompt();let calls=0;
 const adapter={
  preflight:async()=>({ok:true}),assertLaunch:()=>{},
  createLaunch:async()=>{
   const scratch=await fs.mkdtemp('/private/tmp/evidencelens-codex-');await fs.chmod(scratch,0o700);
   const result=f.result;
   const rows=[{type:'thread.started',thread_id:'synthetic'},{type:'turn.started'},{type:'item.completed',item:{type:'reasoning',text:'PRIVATE_REASONING_SENTINEL'}},{type:'item.completed',item:{type:'agent_message',text:JSON.stringify(result)}},{type:'turn.completed'}];
   const code=`import fs from 'node:fs/promises';import {createHash} from 'node:crypto';let parts=[];for await(const b of process.stdin)parts.push(b);await fs.writeFile(${JSON.stringify(scratch+'/stdin.sha')},createHash('sha256').update(Buffer.concat(parts)).digest('hex'));process.stdout.write(${JSON.stringify(rows.map(x=>JSON.stringify(x)).join('\n')+'\n')});`;
   return {executable:process.execPath,args:['--input-type=module','-e',code],env:{PATH:'/usr/bin:/bin',CODEX_HOME:scratch},cwd:scratch,root:scratch,binaryVersion:'0.160.0',binarySha256:PINNED_BINARY_SHA256,policySha256:'0'.repeat(64),cleanup:async()=>{const h=await fs.readFile(scratch+'/stdin.sha','utf8').catch(()=>null);if(h!==null&&h!==exported.metadata.promptSha256)throw Error('stdin mismatch');await fs.rm(scratch,{recursive:true,force:true});return true;}};
  },
  supervise:async(...args)=>{calls++;return (await import('../../skills/assignment-review/scripts/codex-runner.mjs')).superviseCodexProcess(...args);}
 };
 return {root,scope,receipt,exported,exportPrompt,f,adapter,calls:()=>calls};
}
