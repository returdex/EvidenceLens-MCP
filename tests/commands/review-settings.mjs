import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';
import {reviewSettings} from '../../skills/assignment-review/scripts/review-settings.mjs';
import {installSkills} from '../../scripts/install-review-skills.mjs';
async function setup(t){const root=await fs.mkdtemp('/private/tmp/el26-');t.after(()=>fs.rm(root,{recursive:true,force:true}));const projectRoot=root+'/项目 A',other=root+'/项目 B',userRoot=root+'/user';await fs.mkdir(projectRoot);await fs.mkdir(other);return {root,projectRoot,other,options:{userRoot}};}
test('unconfigured show/plan have conservative defaults, source labels and no writes',async t=>{
 const x=await setup(t),before=await fs.readdir(x.root),r=await reviewSettings('show',{projectRoot:x.projectRoot},x.options);assert.deepEqual(r.effective,{reviewers:['codex'],responseMode:'full',minimumGoal:null,planningGoal:null,automaticRetries:0});assert.ok(Object.values(r.sources).every(s=>s.layer==='builtin'));assert.equal(r.reviewStarted,false);assert.deepEqual(await fs.readdir(x.root),before);
 const p=await reviewSettings('plan',{projectRoot:x.projectRoot},x.options);assert.deepEqual(p.executionPlan,[{provider:'codex',executionKind:'codex_exec',helper:'codex-review.mjs',attempts:1}]);assert.equal(p.delivery.view,'full');assert.equal(p.reviewIntent.minimumGoal,null);
});
test('user/project/instruction precedence is per field; reset reveals inherited values and isolates projects',async t=>{
 const x=await setup(t);await reviewSettings('set',{projectRoot:x.projectRoot,scope:'user',changes:{reviewers:['deepseek','codex'],planningGoal:'D'}},x.options);
 const saved=await reviewSettings('set',{projectRoot:x.projectRoot,changes:{reviewers:['codex'],minimumGoal:'P'}},x.options);assert.equal(saved.savedScope,'project');assert.equal((await fs.stat(saved.savedPath)).mode&0o777,0o600);
 const r=await reviewSettings('plan',{projectRoot:x.projectRoot,overrides:{responseMode:'summary'},recheck:true},x.options);assert.deepEqual(r.effective.reviewers,['codex']);assert.equal(r.sources.minimumGoal.layer,'project');assert.equal(r.sources.planningGoal.layer,'user');assert.equal(r.sources.responseMode.layer,'instruction');assert.deepEqual(r.reviewIntent,{minimumGoal:'P',planningGoal:'D',recheck:true});assert.equal(r.delivery.view,'summary');
 const other=await reviewSettings('plan',{projectRoot:x.other},x.options);assert.equal(other.executionPlan.length,2);assert.equal(other.effective.minimumGoal,null);
 const reset=await reviewSettings('reset',{projectRoot:x.projectRoot,keys:['reviewers']},x.options);assert.equal(reset.sources.reviewers.layer,'user');assert.equal(reset.effective.minimumGoal,'P');
 await reviewSettings('reset',{projectRoot:x.projectRoot},x.options);await reviewSettings('reset',{projectRoot:x.projectRoot,scope:'user'},x.options);assert.ok(Object.values((await reviewSettings('show',{projectRoot:x.projectRoot},x.options)).sources).every(s=>s.layer==='builtin'));
});
test('invalid mutations cannot replace previous bytes or save credentials/transport/retry settings',async t=>{
 const x=await setup(t),r=await reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'P'}},x.options),before=await fs.readFile(r.savedPath);
 for(const changes of [{reviewers:[]},{reviewers:['codex','codex']},{reviewers:['other']},{automaticRetries:1},{apiKey:'secret'},{endpoint:'https://example.invalid'},{responseMode:'short'},{minimumGoal:'<instruction>'},{planningGoal:'sk-'+'a'.repeat(30)},{schemaVersion:2}]){await assert.rejects(reviewSettings('set',{projectRoot:x.projectRoot,changes},x.options));assert.deepEqual(await fs.readFile(r.savedPath),before);}
 await assert.rejects(reviewSettings('reset',{projectRoot:x.projectRoot,keys:['unknown']},x.options));assert.deepEqual(await fs.readFile(r.savedPath),before);
});
test('symlinks, hardlinks, invalid stored config and existing lock are rejected without replacement',async t=>{
 const x=await setup(t);await fs.mkdir(x.projectRoot+'/.evidencelens');const p=x.projectRoot+'/.evidencelens/review-settings.json',target=x.root+'/keep';await fs.writeFile(target,'KEEP');await fs.symlink(target,p);
 await assert.rejects(reviewSettings('show',{projectRoot:x.projectRoot},x.options),{code:'unsafe_path'});await assert.rejects(reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'P'}},x.options));assert.equal(await fs.readFile(target,'utf8'),'KEEP');await fs.unlink(p);
 await fs.link(target,p);await assert.rejects(reviewSettings('show',{projectRoot:x.projectRoot},x.options),{code:'unsafe_path'});await fs.unlink(p);
 await fs.writeFile(p,'{"schemaVersion":2,"settings":{}}');await assert.rejects(reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'P'}},x.options));assert.match(await fs.readFile(p,'utf8'),/schemaVersion":2/);await fs.unlink(p);
 await fs.mkdir(x.projectRoot+'/.evidencelens/.review-settings.lock');await assert.rejects(reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'P'}},x.options),{code:'busy'});await assert.rejects(fs.stat(p),{code:'ENOENT'});
 const linked=x.root+'/linked';await fs.symlink(x.other,linked);await assert.rejects(reviewSettings('show',{projectRoot:linked},x.options),{code:'unsafe_path'});
});
test('installed helper works outside repository cwd and setting changes preserve course files',async t=>{
 const x=await setup(t),target=x.root+'/skills';await fs.writeFile(x.other+'/assignment.txt','KEEP COURSE');assert.ok((await installSkills(target,{apply:true})).ok);
 const script=target+'/assignment-review/scripts/review-settings.mjs',env={PATH:'/usr/bin:/bin',HOME:x.root,EVIDENCELENS_SETTINGS_ROOT:x.options.userRoot};
 const call=(action,input)=>{const r=spawnSync(process.execPath,[script,action],{env,cwd:x.other,input:JSON.stringify(input),encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
 assert.equal(call('show',{}).sources.reviewers.layer,'builtin');const r=call('set',{changes:{reviewers:['codex','deepseek'],minimumGoal:'P',planningGoal:'D'}});assert.equal(r.savedPath,x.other+'/.evidencelens/review-settings.json');assert.equal(call('plan',{}).executionPlan.length,2);
 assert.equal(call('plan',{projectRoot:x.projectRoot}).executionPlan.length,1);call('reset',{});assert.equal(call('plan',{}).executionPlan.length,1);assert.equal(await fs.readFile(x.other+'/assignment.txt','utf8'),'KEEP COURSE');assert.match(await fs.readFile(target+'/el-settings/SKILL.md','utf8'),/review-settings/);
});
test('resolved default and explicit dual plans drive actual synthetic capture/dispatch and delivery',async t=>{
 const {capturedFlow}=await import('../codex/helpers.mjs');const {executeCapturedWithAdapter}=await import('../../skills/assignment-review/scripts/codex-runner.mjs');const {beginRun,readRunRecord}=await import('../../skills/assignment-review/scripts/prompt-store.mjs');const {captureDeepSeekPrompt,runCapturedDeepSeek}=await import('../../skills/assignment-review/scripts/deepseek-review.mjs');const {readBoundedJson}=await import('../../dist/providers/deepseek.js');const {buildReviewSynthesis}=await import('../../skills/assignment-review/scripts/review-synthesis.mjs');
 const settings=await setup(t);
 for(const dual of [false,true]){
  if(dual)await reviewSettings('set',{projectRoot:settings.projectRoot,changes:{reviewers:['codex','deepseek'],minimumGoal:'P',planningGoal:'D'}},settings.options);
  const plan=await reviewSettings('plan',{projectRoot:settings.projectRoot},settings.options),x=await capturedFlow(t,{reviewIntent:plan.reviewIntent});
  const meta=JSON.parse(x.exported.promptText.match(/<evidencelens-stage-v1>\n([^\n]+)/)[1]);assert.equal(meta.minimumGoal,dual?'P':null);assert.equal(meta.planningGoal,dual?'D':null);
  let ds=null,dsCalls=0;
  if(plan.executionPlan.some(p=>p.provider==='deepseek')){ds=await beginRun(x.scope);await captureDeepSeekPrompt(x.scope,ds.runId,{snapshot:{...x.f.snapshot,runId:ds.runId,sequence:ds.sequence},capsule:{...x.f.capsule,runId:ds.runId},admitted:x.f.admitted,reviewIntent:plan.reviewIntent});}
  for(const step of plan.executionPlan){if(step.provider==='codex'){assert.equal((await executeCapturedWithAdapter(x.scope,x.receipt.runId,{},x.adapter)).status,'succeeded');}else{
   const model={...x.f.result,runId:ds.runId,schemaVersion:3,findings:x.f.result.findings.map(f=>({...f,evidence:f.evidence.map(e=>({sourceId:e.sourceId,excerptId:e.excerptId}))}))};
   const r=await runCapturedDeepSeek(x.scope,ds.runId,{}, {loadConfig:()=>({apiKey:'synthetic',baseUrl:'https://synthetic.invalid',model:'deepseek-v4-pro'}),readJson:readBoundedJson,fetch:async()=>{dsCalls++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(model)}}]}));}});assert.equal(r.status,'succeeded');
  }}
  assert.equal(x.calls(),1);assert.equal(dsCalls,dual?1:0);const bundles=await Promise.all([x.receipt.runId,...(ds?[ds.runId]:[])].map(runId=>readRunRecord(x.scope,{historicalRunId:runId})));const report=buildReviewSynthesis(bundles,null,{view:plan.delivery.view});assert.equal(report.reports.length,dual?2:1);assert.equal(report.status,'all_validated');assert.equal(report.reports[0].view,'full');
 }
});
test('explicit null control fields cannot trigger reset, change scope or silently drop invalid intent',async t=>{
 const x=await setup(t),saved=await reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'P'}},x.options),before=await fs.readFile(saved.savedPath);
 for(const [action,patch] of [['reset',{keys:null}],['reset',{scope:null}],['plan',{recheck:null}],['plan',{overrides:null}],['show',{projectRoot:null}]])await assert.rejects(reviewSettings(action,{projectRoot:x.projectRoot,...patch},x.options));
 assert.deepEqual(await fs.readFile(saved.savedPath),before);
});
test('uncertain atomic commit preserves old settings and lock rather than retrying or deleting evidence',async t=>{
 const x=await setup(t),saved=await reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'P'}},x.options),before=await fs.readFile(saved.savedPath);
 const mock=t.mock.method(fs,'rename',async()=>{throw Object.assign(new Error('synthetic commit failure'),{code:'EIO'});});await assert.rejects(reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'D'}},x.options));mock.mock.restore();
 assert.deepEqual(await fs.readFile(saved.savedPath),before);assert.ok((await fs.stat(x.projectRoot+'/.evidencelens/.review-settings.lock')).isDirectory());await assert.rejects(reviewSettings('set',{projectRoot:x.projectRoot,changes:{minimumGoal:'D'}},x.options),{code:'busy'});
});
