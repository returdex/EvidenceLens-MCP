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

test('BLOCKING acceptance: read-only Codex-owned metadata must permit positive structured completion',async t=>{
 const r=await protocolFixture();
 assert.equal(r.timedOut,false);assert.equal(r.authUnchanged,true);assert.equal(r.requests.length,0);
 assert.ok(r.stderr.includes('failed to initialize in-process app-server client'));
 t.diagnostic('Strict profile template SHA256 '+r.policySha256+'; startup rejected before any model request.');
 assert.equal(r.exitCode,0,'Current pinned CLI requires installation_id write access outside owned scratch. Selected production policy cannot start.');
});
