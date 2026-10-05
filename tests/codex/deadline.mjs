import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {superviseCodexProcess} from '../../skills/assignment-review/scripts/codex-runner.mjs';

// Advance the supervisor's deadline while a real, independently timed child stays alive.
const realSetTimeout = globalThis.setTimeout;
const pause = ms => new Promise(resolve => realSetTimeout(resolve, ms));
async function ready(path) {
 const until = Date.now() + 5000;
 while (Date.now() < until) {
  try { if (await readFile(path, 'utf8') === 'ready') return; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await pause(10);
 }
 throw new Error('Child did not start');
}
async function fixture(t, body) {
 const root = await mkdtemp(join(tmpdir(), 'el-deadline-'));
 const marker = join(root, 'ready'), release = join(root, 'release');
 const controller = new AbortController();
 let pending;
 try {
  t.mock.timers.enable({apis: ['setTimeout']});
  const code = `import {writeFileSync,existsSync} from 'node:fs';
   process.stdout.write(JSON.stringify({type:'thread.started',thread_id:'synthetic'})+'\\n');
   process.stdout.write(JSON.stringify({type:'turn.started'})+'\\n');
   writeFileSync(${JSON.stringify(marker)},'ready');
   const timer=setInterval(()=>{if(!existsSync(${JSON.stringify(release)}))return;clearInterval(timer);
    process.stdout.write(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'{"synthetic":true}'}})+'\\n');
    process.stdout.write(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}})+'\\n');},10);`;
  let settled = false;
  pending = superviseCodexProcess({executable: process.execPath, args: ['--input-type=module','-e',code], env: {PATH:'/usr/bin:/bin'}, cwd:root}, Buffer.from('synthetic'), {signal:controller.signal}).then(r=>{settled=true;return r;});
  await ready(marker);
  await body({pending,release,settled:()=>settled});
 } finally {
  controller.abort();
  t.mock.timers.reset();
  if (pending) await pending;
  await rm(root, {recursive:true,force:true});
 }
}
test('default deadline lets a real child complete after five minutes of supervisor time', async t => {
 await fixture(t, async ({pending,release,settled}) => {
  t.mock.timers.tick(300000);
  await pause(20);
  assert.equal(settled(),false);
  await writeFile(release,'finish');
  const result = await pending;
  assert.equal(result.status,'candidate');
  assert.equal(result.terminalObserved,true);
  assert.equal(result.cleanupComplete,true);
  assert.equal(result.diagnostics.terminationRequested,false);
 });
});
test('default deadline still terminates and cleans a real child at ten minutes', async t => {
 await fixture(t, async ({pending,settled}) => {
  t.mock.timers.tick(599999);
  await pause(20);
  assert.equal(settled(),false);
  t.mock.timers.tick(1);
  const result = await pending;
  assert.equal(result.status,'failed');
  assert.equal(result.code,'timed_out');
  assert.equal(result.candidate,null);
  assert.equal(result.cleanupComplete,true);
  assert.equal(result.diagnostics.trigger,'deadline_exceeded');
  assert.equal(result.diagnostics.terminationRequested,true);
  assert.equal(result.diagnostics.closeObserved,true);
 });
});
