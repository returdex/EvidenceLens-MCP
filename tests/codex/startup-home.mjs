import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {protocolFixture,runChild} from './helpers.mjs';
import {createReviewHome,isolationPolicy,createIsolatedLaunch} from '../../skills/assignment-review/scripts/codex-isolation.mjs';
import {executableIdentity} from '../../skills/assignment-review/scripts/codex-preflight.mjs';

for(const [name,entries] of Object.entries({agents:{homeDirectories:['agents']},cache:{homeEntries:['models_cache.json']}}))test('actual CLI reproduces denied ambient '+name+' and sealed home fixes it',async()=>{
 const old=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,isolatedHome:false,globalSkills:false,...entries});
 assert.equal(old.outcome.status,'failed');assert.equal(old.outcome.diagnostics.trigger,'unexpected_stderr');assert.equal(old.outcome.diagnostics.reportedErrorCategory,'permission');
 if(name==='agents'){assert.equal(old.requests.length,0);assert.equal(old.outcome.diagnostics.threadObserved,false);}
 const fixed=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,homeDirectories:['agents'],homeEntries:['models_cache.json']});
 assert.equal(fixed.outcome.status,'candidate',JSON.stringify(fixed.outcome));assert.equal(fixed.requests.length,1);assert.equal(fixed.authUnchanged,true);assert.equal(fixed.installationUnchanged,true);assert.equal(fixed.outsideUnchanged,true);
 for(const marker of [fixed.ambient,fixed.authSentinel,'AGENT_PRIVATE_SENTINEL','SYNTHETIC_PRIVATE_STATE'])assert.ok(!JSON.stringify(fixed.requests).includes(marker));
});
test('sealed home owns only auth alias and noncredential metadata; OS denies ambient read and alias/original writes',async t=>{
 const root=await fs.mkdtemp('/private/tmp/el-home-');await fs.chmod(root,0o700);const control=root+'/control',scratch=root+'/scratch',original=root+'/original';for(const d of [control,scratch,original])await fs.mkdir(d,{mode:0o700});
 const auth=original+'/auth.json',agent=original+'/agent.toml',installationText=randomUUID();await fs.writeFile(auth,'AUTH_SENTINEL',{mode:0o600});await fs.writeFile(agent,'AGENT_PRIVATE_SENTINEL',{mode:0o600});
 const home=await createReviewHome({control,auth,installationText});await fs.chmod(control,0o500);
 t.after(async()=>{await fs.chmod(control,0o700);await fs.chmod(home.codexHome,0o700);await fs.rm(root,{recursive:true,force:true});});
 assert.deepEqual((await fs.readdir(home.codexHome)).sort(),['auth.json','installation_id']);assert.equal(await fs.readlink(home.codexHome+'/auth.json'),auth);assert.equal((await fs.lstat(home.codexHome)).mode&0o777,0o500);
 const binary=await fs.realpath('/bin/sh'),policy=isolationPolicy({binary,scratch,control,auth,installation:home.installation,extraRead:['/bin/cat','/bin/rm']});
 const script='if /bin/cat "$1" >/dev/null 2>&1; then echo auth-readable; fi; if /bin/cat "$2" >/dev/null 2>&1; then echo LEAK; else echo agent-denied; fi; if (echo changed > "$1") 2>/dev/null; then echo WRITE; else echo auth-write-denied; fi; if /bin/rm "$1" 2>/dev/null; then echo REMOVED; else echo alias-delete-denied; fi; if (echo changed > "$3") 2>/dev/null; then echo WRITE; else echo original-write-denied; fi; if (echo new > "$4") 2>/dev/null; then echo CREATED; else echo config-create-denied; fi';
 const r=await runChild('/usr/bin/sandbox-exec',['-p',policy,binary,'-c',script,'probe',home.codexHome+'/auth.json',agent,auth,home.codexHome+'/config.toml'],{env:{PATH:'/usr/bin:/bin'},cwd:scratch});
 assert.equal(r.exitCode,0);assert.equal(r.stdout,'auth-readable\nagent-denied\nauth-write-denied\nalias-delete-denied\noriginal-write-denied\nconfig-create-denied\n');assert.equal(await fs.readFile(auth,'utf8'),'AUTH_SENTINEL');assert.equal(await fs.readFile(home.installation,'utf8'),installationText);
});
for(const name of ['view_image','apply_patch'])test('forced '+name+' cannot leak or replace projected auth alias',async()=>{
 const r=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,homeDirectories:['agents'],tool:({reviewHome})=>name==='view_image'?{type:'function_call',id:'fc',call_id:'call',name,arguments:JSON.stringify({path:reviewHome+'/auth.json'})}:{type:'custom_tool_call',id:'ct',call_id:'call',name,input:'*** Begin Patch\n*** Delete File: '+reviewHome+'/auth.json\n*** End Patch'}});
 assert.notEqual(r.outcome.status,'candidate');assert.equal(r.outcome.cleanupComplete,true);assert.equal(r.authUnchanged,true);assert.equal(r.installationUnchanged,true);assert.ok(!JSON.stringify(r.requests).includes(r.authSentinel));
});
test('actual installed home crosses startup into a turn with network explicitly denied',async()=>{
 const launch=await createIsolatedLaunch({executableReceipt:{...await executableIdentity('/opt/homebrew/bin/codex'),version:'0.141.0'},runId:randomUUID()});
 try{
  assert.ok(launch.env.CODEX_HOME.startsWith(launch.root+'/control/'));assert.equal(launch.env.HOME,launch.env.CODEX_HOME);assert.ok((await fs.lstat(launch.env.CODEX_HOME+'/auth.json')).isSymbolicLink());
  const raw=await fs.readFile(launch.args[1],'utf8');assert.ok(!raw.includes('(literal '+JSON.stringify(process.env.HOME+'/.codex/installation_id')+')'));
  const policy=raw.replace('(allow network-outbound)','');assert.ok(!policy.includes('network-outbound'));
  const r=await runChild('/usr/bin/sandbox-exec',['-p',policy,...launch.args.slice(2)],{env:launch.env,cwd:launch.cwd,input:'SYNTHETIC STARTUP ONLY. No coursework.',timeoutMs:4000});
  const events=r.stdout.split('\n').filter(Boolean).map(x=>JSON.parse(x));assert.ok(events.some(x=>x.type==='thread.started'));assert.ok(events.some(x=>x.type==='turn.started'));assert.ok(!r.stderr.includes('\nError: Operation not permitted'));assert.ok(!r.stderr.includes('failed to read skills dir '));assert.notEqual(r.exitCode,0);
 }finally{assert.equal(await launch.cleanup(),true);}
});

test('existing HOME/.agents/skills is rejected with old HOME wiring and absent from isolated requests',async()=>{
 const old=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true,isolateUserHome:false});
 assert.equal(old.outcome.status,'failed');assert.equal(old.outcome.diagnostics.trigger,'unexpected_stderr');assert.equal(old.outcome.diagnostics.reportedErrorCategory,'permission');
 const fixed=await protocolFixture('success',{permitInstallationMetadata:true,useRunner:true});
 assert.equal(fixed.outcome.status,'candidate',JSON.stringify(fixed.outcome));assert.equal(fixed.requests.length,1);assert.equal(fixed.authUnchanged,true);assert.equal(fixed.installationUnchanged,true);assert.ok(!JSON.stringify(fixed.requests).includes(fixed.ambient));
});
