import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,chmod,rm,symlink,realpath } from 'node:fs/promises';
import { candidatePolicy,runChild,protocolFixture } from './helpers.mjs';

test('actual Seatbelt deny-default: allowed read, denied sibling/symlink/write',async()=>{
 const base=await mkdtemp('/private/tmp/el20-isolation-');await chmod(base,0o700);
 try {
  const scratch=base+'/scratch',control=base+'/control';await mkdir(scratch);await mkdir(control);
  await writeFile(control+'/allowed','ALLOWED');await writeFile(base+'/outside','FORBIDDEN');await symlink(base+'/outside',control+'/alias');
  const binary=await realpath('/bin/sh');
  const policy=candidatePolicy({binary,scratch,control,auth:base+'/auth.json',extraRead:['/bin/cat','/usr/bin/touch']});
  const code='if /bin/cat "$1/allowed" >/dev/null 2>&1; then echo allowed; fi; for p in "$2/outside" "$1/alias"; do if /bin/cat "$p" >/dev/null 2>&1; then echo LEAK; else echo denied; fi; done; if /usr/bin/touch "$2/outside" 2>/dev/null; then echo WRITE; else echo denied; fi';
  const r=await runChild('/usr/bin/sandbox-exec',['-p',policy,binary,'-c',code,'probe',control,base],{cwd:scratch,env:{PATH:'/usr/bin:/bin'}});
  assert.equal(r.exitCode,0);assert.equal(r.stdout,'allowed\ndenied\ndenied\ndenied\n');
 }finally{await rm(base,{recursive:true,force:true});}
});

test('native sandbox profile negative observation remains uncertified',async t=>{
 const base=await mkdtemp('/private/tmp/el20-native-');await chmod(base,0o700);
 try {
  const home=base+'/home',work=base+'/work';await mkdir(home);await mkdir(work);
  await writeFile(work+'/inside','ALLOWED');await writeFile(base+'/outside','FORBIDDEN');
  const profile='permissions.el20.filesystem={":root"="deny",":minimal"="read",":tmpdir"="deny",":slash_tmp"="deny",'+JSON.stringify(work)+'="read"}';
  const code='for p in "$1/inside" "$2/outside"; do if /bin/cat "$p" >/dev/null 2>&1; then echo read-allowed; else echo read-denied; fi; done; if /usr/bin/touch "$1/new" 2>/dev/null; then echo write-allowed; else echo write-denied; fi';
  const r=await runChild('/opt/homebrew/bin/codex',['sandbox','-c',profile,'-c','permissions.el20.network.enabled=false','-P','el20','-C',work,'/bin/sh','-c',code,'probe',work,base],{cwd:work,env:{HOME:home,CODEX_HOME:home,PATH:'/usr/bin:/bin',TMPDIR:base}});
  assert.equal(r.timedOut,false);assert.equal(r.exitCode,0);assert.equal(r.stdout,'read-allowed\nread-allowed\nwrite-allowed\n');
  t.diagnostic('Native profile isolation FAILED. This assertion preserves the observed defect; it is not certification.');
 }finally{await rm(base,{recursive:true,force:true});}
});

test('historical read-only metadata policy rejects startup before dispatch',async t=>{
 const r=await protocolFixture();
 assert.equal(r.timedOut,false);assert.equal(r.authUnchanged,true);assert.equal(r.requests.length,0);
 assert.ok(r.stderr.includes('failed to initialize in-process app-server client'));
 t.diagnostic('Strict profile template SHA256 '+r.policySha256+'; startup rejected before any model request.');
 assert.equal(r.exitCode,1);
 const revised=await protocolFixture('success',{permitInstallationMetadata:true,supervise:true});
 assert.equal(revised.exitCode,0);assert.equal(revised.requests.length,1);assert.equal(revised.installationUnchanged,true);assert.equal(revised.authUnchanged,true);assert.equal(revised.rejected,false);
});

test('production launcher: separate status policy, sealed descriptor, original metadata unchanged, no inference',async()=>{
 const {createIsolatedLaunch,assertCertifiedLaunch,verifyIsolationContract}=await import('../../skills/assignment-review/scripts/codex-isolation.mjs');
 const {executableIdentity}=await import('../../skills/assignment-review/scripts/codex-preflight.mjs');
 const {randomUUID}=await import('node:crypto');
 const receipt={...await executableIdentity('/opt/homebrew/bin/codex'),version:'0.141.0'};
 await assert.rejects(verifyIsolationContract({...receipt,binarySha256:'0'.repeat(64)}));
 assert.throws(()=>assertCertifiedLaunch({}));
 const launch=await createIsolatedLaunch({executableReceipt:receipt,runId:randomUUID()});
 try{
  assertCertifiedLaunch(launch);assert.ok(Object.isFrozen(launch));assert.ok(Object.isFrozen(launch.args));assert.ok(!launch.args.join(' ').includes('base_url'));
  const fs=await import('node:fs/promises');const policy=await fs.readFile(launch.args[1],'utf8');
  assert.ok(!policy.includes('config.toml'));assert.ok(!policy.includes('/agents/'));assert.ok(policy.includes('file-write-data file-write-mode'));
 }finally{assert.equal(await launch.cleanup(),true);}
});
