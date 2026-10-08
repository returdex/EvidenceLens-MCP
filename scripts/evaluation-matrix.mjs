// Explicitly authorized evaluation only. Never called by normal review entrypoints.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sha256,uuid} from '../skills/assignment-review/scripts/prompt-contract.mjs';

export function admittedFromFreeze(f) {
 const {freezeSha256,...body}=f;
 if(f.readiness!=='input_ready'||f.caseId!=='A2'||f.stage!=='final'||sha256(JSON.stringify(body))!==freezeSha256)throw Error('invalid_freeze');
 if(f.items.length!==3||new Set(f.items.map(x=>x.id)).size!==3||f.items.some(x=>!['Solution','Brief','Rubric'].includes(x.id)||sha256(x.content)!==x.contentHash))throw Error('invalid_allowlist');
 return f.items.map(x=>({sourceId:x.id,text:x.content}));
}
export function matrixInputSignature(snapshot,admitted) {
 return sha256(JSON.stringify({task:snapshot.promptText,stage:snapshot.stage,reviewMode:snapshot.reviewMode,currentSourceId:snapshot.currentSourceId,materials:admitted.map(x=>({id:x.sourceId,hash:sha256(x.text)}))}));
}
const baseline='3462c30fd8e0db34e69f22cc6f02d7e957c914db';
const load=(root,name)=>import(pathToFileURL(root+'/skills/assignment-review/scripts/'+name+'.mjs'));
async function privateWrite(path,data){await fs.writeFile(path,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});}
async function privateDirectory(path){await fs.mkdir(path,{mode:0o700});}
async function requirePrivate(path){const s=await fs.lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||s.mode&0o077)throw Error('unsafe_authorization');}

export async function prepare(config) {
 const repo=resolve('.'),root=resolve(config.outputRoot),parent=dirname(root);
 if(config.authorization!=='user_autonomous_milestone_completion'||config.maxPositions!==4||config.automaticRetries!==0||!uuid(process.env.CODEX_THREAD_ID)||await fs.realpath(parent)!==parent||root.startsWith(repo+'/'))throw Error('authorization_required');
 const frozen=resolve(config.frozenRoot);const rawFreeze=await fs.readFile(frozen+'/A2-freeze/freeze.json'),freeze=JSON.parse(rawFreeze),admitted=admittedFromFreeze(freeze);
 const snapshot=JSON.parse(await fs.readFile(frozen+'/A2-offline-snapshot.json')),capsule=JSON.parse(await fs.readFile(frozen+'/A2-capsule.json'));
 snapshot.promptText='请用中文完整审阅 FIT5046 A2 冻结源码文本，对照 Brief/Rubric，逐 criterion 列出官方要求、支持、反证、缺口、未知和可执行建议。最低目标 P 与可选规划目标 D 分开，P 不自动升级为 D；目标不是成绩，不预测总分。报告、图像、媒体、实际运行、遗漏源码、提交回执未提供，保持 unknown。区分 A2 设计骨架与 A4 完整实现，不编造要求、数据或引用。保留全部 info 和完整发现。Tutor feedback、成绩、先前建议及后续修改未提供，不得使用。本次是部分最终源码范围评估，不是完整作业验收。';
 snapshot.promptSha256=sha256(snapshot.promptText);
 const inputSignature=matrixInputSignature(snapshot,admitted);
 await privateDirectory(root);await privateDirectory(root+'/baseline');
 const oldRoot=root+'/baseline',files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'skills/assignment-review/scripts'],{cwd:repo,encoding:'utf8'}).trim().split('\n');
 const hashes=[];
 for(const p of files){const data=execFileSync('git',['show',baseline+':'+p],{cwd:repo});await fs.mkdir(dirname(oldRoot+'/'+p),{recursive:true,mode:0o700});await fs.writeFile(oldRoot+'/'+p,data,{mode:0o600,flag:'wx'});hashes.push({path:p,sha256:sha256(data)});}
 const positions=[];
 for(const [version,codeRoot] of [['old',oldRoot],['new',repo]]){
  const store=await load(codeRoot,'prompt-store'),capture=await load(codeRoot,'codex-review');
  const scope={stateRoot:root+'/state-'+version,conversationId:process.env.CODEX_THREAD_ID,taskId:'Matrix-'+version+'-'+randomUUID().slice(0,8),evidenceRoots:[repo,frozen]};
  for(const provider of ['codex','deepseek']){
   const receipt=await store.beginRun(scope,{executionKind:provider==='codex'?'codex_exec':'host_skill'}),s=structuredClone(snapshot),c=structuredClone(capsule);
   for(const x of [s,c])Object.assign(x,{runId:receipt.runId,taskId:scope.taskId,conversationId:scope.conversationId});s.sequence=receipt.sequence;s.capturedAt=new Date().toISOString();
   if(version==='new')await capture.captureEvidencePrompt(scope,receipt.runId,{snapshot:s,capsule:c,admitted,reviewIntent:{minimumGoal:'P',planningGoal:'D',recheck:false}},receipt.executionKind);
   else await capture.captureEvidencePrompt(scope,receipt.runId,{snapshot:s,capsule:c,admitted},receipt.executionKind);
   const exported=await store.exportLatest(scope,{expectedRunId:receipt.runId}),id=version+'-'+provider;
   await privateDirectory(root+'/'+id);await privateWrite(root+'/'+id+'/prompt.txt',exported.promptText);
   positions.push({id,version,provider,codeRoot,scope,runId:receipt.runId,promptSha256:exported.metadata.promptSha256,promptBytes:Buffer.byteLength(exported.promptText),inputSignature});
  }
 }
 // Provider source files have not changed: transport config/reader below are shared,
 // not a replacement for either version's capture, validation or store logic.
 const providerDiff=execFileSync('git',['diff','--name-only',baseline,'--','src/providers','src/contracts','src/evidence'],{cwd:repo,encoding:'utf8'}).trim();
 if(providerDiff)throw Error('transport_source_changed');
 const newFiles=[];for(const name of await fs.readdir(repo+'/skills/assignment-review/scripts'))if(name.endsWith('.mjs'))newFiles.push({path:'skills/assignment-review/scripts/'+name,sha256:sha256(await fs.readFile(repo+'/skills/assignment-review/scripts/'+name))});
 const {loadProviderConfig,hasProviderCredentialSource}=await import('../dist/providers/config.js'),configPath=repo+'/.evidencelens.local.json';
 const provider=loadProviderConfig(configPath,hasProviderCredentialSource(configPath,{})?{}:process.env);
 const providerSettings={model:provider.model,maxTokens:provider.maxTokens??null,automaticRetries:0};
 const plan={schemaVersion:1,authorization:config.authorization,root,repo,baseline,newRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),harnessSha256:sha256(await fs.readFile(new URL(import.meta.url))),capturedAt:new Date().toISOString(),maxPositions:4,automaticRetries:0,evaluatorTextReadsBeforeSeal:0,inputSignature,freezeSha256:freeze.freezeSha256,originalFreezeFileSha256:sha256(rawFreeze),baselineFiles:hashes,newFiles,providerSettings,positions,scope:'same-input final source-only; old Codex may be unavailable; failed positions are not semantic evidence',evaluatorRubric:['supported requirement/finding','tutor omissions','unsupported claims','grade overreach','action utility','finding retention'],providerTransport:'shared built reader/config from unchanged TS source; real native fetch, no retries'};
 await privateWrite(root+'/plan.json',plan);return {root,positions:positions.map(({id,runId,promptBytes})=>({id,runId,promptBytes})),inputSignature};
}

export async function execute(planPath) {
 await requirePrivate(planPath);const plan=JSON.parse(await fs.readFile(planPath));
 if(plan.authorization!=='user_autonomous_milestone_completion'||plan.maxPositions!==4||plan.automaticRetries!==0||plan.harnessSha256!==sha256(await fs.readFile(new URL(import.meta.url)))||plan.positions.length!==4||new Set(plan.positions.map(p=>p.id)).size!==4||plan.positions.some(p=>p.scope.conversationId!==process.env.CODEX_THREAD_ID||p.inputSignature!==plan.inputSignature))throw Error('invalid_plan');
 for(const [root,files] of [[plan.root+'/baseline',plan.baselineFiles],[plan.repo,plan.newFiles]])for(const f of files)if(sha256(await fs.readFile(root+'/'+f.path))!==f.sha256)throw Error('source_changed');
 await privateWrite(plan.root+'/dispatch-claim.json',{claimedAt:new Date().toISOString(),maxPositions:4,automaticRetries:0});
 const {loadProviderConfig,hasProviderCredentialSource}=await import('../dist/providers/config.js'),{readBoundedJson}=await import('../dist/providers/deepseek.js');
 const configPath=plan.repo+'/.evidencelens.local.json';
 const loadConfig=()=>loadProviderConfig(configPath,hasProviderCredentialSource(configPath,{})?{}:process.env);
 const c=loadConfig();if(c.model!==plan.providerSettings.model||(c.maxTokens??null)!==plan.providerSettings.maxTokens)throw Error('provider_settings_changed');
 const outcomes=[];
 for(const p of plan.positions){
  const store=await load(p.codeRoot,'prompt-store'),recordRoot=plan.root+'/'+p.id;
  // Actual exported bytes are checked before any launch.
  const bundle=await store.readRunRecord(p.scope,{historicalRunId:p.runId});
  if(sha256(await fs.readFile(recordRoot+'/prompt.txt'))!==p.promptSha256||bundle.snapshot.promptSha256!==p.promptSha256)throw Error('prompt_changed');
  let httpRequests=0,replyRecorded=false;
  const adapter={loadConfig,fetch:async(url,init)=>{
   if(++httpRequests!==1)throw Error('request_budget');
   const body=JSON.parse(init.body);if(body.messages.length!==1||body.messages[0].content!==bundle.snapshot.promptText||body.tools)throw Error('dispatch_mismatch');
   await privateWrite(recordRoot+'/request.json',{bodySha256:sha256(init.body),promptSha256:sha256(body.messages[0].content),model:body.model,observedRequests:httpRequests,dispatchedAt:new Date().toISOString()});
   return fetch(url,init);
  },readJson:async response=>{
   const b=await readBoundedJson(response),choice=b?.choices?.[0];
   await privateWrite(recordRoot+'/http-response.json',{model:b.model??null,usage:b.usage??null,finishReason:choice?.finish_reason??null,reply:typeof choice?.message?.content==='string'?choice.message.content:null,receivedAt:new Date().toISOString()});replyRecorded=true;return b;
  }};
  let outcome;
  if(p.provider==='codex'){const runner=await load(p.codeRoot,'codex-runner');outcome=await runner.runCapturedCodex(p.scope,p.runId);}
  else {const runner=await load(p.codeRoot,'deepseek-review');outcome=await runner.runCapturedDeepSeek(p.scope,p.runId,{},adapter);}
  await privateWrite(recordRoot+'/run.json',outcome);
  const full=await store.readRunRecord(p.scope,{historicalRunId:p.runId}),handoff=await load(p.codeRoot,'review-handoff');
  await privateWrite(recordRoot+'/full.json',full);await privateWrite(recordRoot+'/report.md',handoff.renderReviewHandoff(handoff.buildReviewHandoff(full)));
  const result={id:p.id,runId:p.runId,status:outcome.status,findings:full.result?.modelResponse.findings.length??0,httpRequests,replyRecorded};outcomes.push(result);process.stdout.write(JSON.stringify(result)+'\n');
 }
 await privateWrite(plan.root+'/seal.json',{sealedAt:new Date().toISOString(),outcomes,evaluatorTextReadsBeforeSeal:0,automaticRetries:0});return {root:plan.root,outcomes};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 const [action,file]=process.argv.slice(2);try{if(action==='prepare'){await requirePrivate(file);console.log(JSON.stringify(await prepare(JSON.parse(await fs.readFile(file)))));}else if(action==='execute')console.log(JSON.stringify(await execute(file)));else throw Error('unsupported');}catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=1;}
}
