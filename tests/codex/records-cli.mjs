import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {assessmentFlow} from './helpers.mjs';import {createReviewAssessment} from '../../skills/assignment-review/scripts/review-recheck.mjs';import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
async function guard(x){await fs.writeFile(x.root+'/dispatch-guard.mjs',`import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';for(const k of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[k]=()=>{throw Error('UNEXPECTED_DISPATCH');};syncBuiltinESMExports();`);}
const source=fileURLToPath(new URL('../../skills/assignment-review',import.meta.url));
const cli=(x,root,action,input)=>spawnSync(process.execPath,['--import',x.root+'/dispatch-guard.mjs',root+'/scripts/review-records.mjs',action],{cwd:x.root+'/project',env:{PATH:'/usr/bin:/bin',HOME:x.root,CODEX_THREAD_ID:x.scope.conversationId,EVIDENCELENS_STATE_ROOT:x.scope.stateRoot},input:JSON.stringify(input),encoding:'utf8',timeout:15000});
for(const mode of ['symlink','copy'])test('installed '+mode+' show/full/annotate outside repo preserve raw export and have no dispatch imports',async t=>{
 const x=await assessmentFlow(t);await guard(x);const root=mode==='symlink'?x.root+'/installed':x.root+'/copy';if(mode==='copy')await fs.cp(source,root,{recursive:true});
 const input={taskId:x.scope.taskId,expectedRunId:x.receipt.runId},original=(await x.exportPrompt()).promptText;
 const dir=x.scope.stateRoot+'/'+sha256(x.scope.conversationId)+'/'+sha256(x.scope.taskId),before=await fs.readFile(dir+'/'+x.receipt.runId+'.snapshot.json');
 for(const action of ['show','full']){const r=cli(x,root,action,input);assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.ok(action==='show'?v.handoff.fullFindings.length===1:v.result.modelResponse.findings.length===1);}
 const a=createReviewAssessment(x.bundle,[],{requirements:[x.requirement],findings:[x.finding]});const annotated=cli(x,root,'annotate',{...input,admittedPriorSummaries:[],assessment:a});assert.equal(annotated.status,0,annotated.stderr);
 assert.deepEqual(await fs.readFile(dir+'/'+x.receipt.runId+'.snapshot.json'),before);assert.equal((await x.exportPrompt()).promptText,original);assert.equal(x.calls(),1);
 const full=JSON.parse(cli(x,root,'full',input).stdout);assert.equal(full.assessmentAvailability,'recorded');
 for(const file of ['review-records.mjs','review-handoff.mjs','review-recheck.mjs','prompt-store.mjs'])assert.ok(!/from ['"].*(?:codex-runner|codex-review|deepseek-review|child_process|https|http)['"]/.test(await fs.readFile(root+'/scripts/'+file,'utf8')));
});
test('record CLI rejects implicit latest, paths, providers, foreign identity and corrupt JSON safely',async t=>{
 const x=await assessmentFlow(t);await guard(x);const input={taskId:x.scope.taskId,expectedRunId:x.receipt.runId};for(const patch of [{expectedRunId:undefined},{taskId:'Other'},{path:'/private'},{provider:'other'},{model:'new'},{conversationId:x.scope.conversationId},{historicalRunId:x.receipt.runId}]){const r=cli(x,x.root+'/installed','show',{...input,...patch});assert.equal(r.status,1);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('/private'));}
 assert.equal(cli(x,x.root+'/installed','run',input).status,1);
});
