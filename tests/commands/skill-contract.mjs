import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, symlink, unlink, rm, mkdir, chmod, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../skills/', import.meta.url));
const commands = ['el-help', 'el-prepare', 'el-check', 'el-final', 'el-recheck', 'el-prompt'];
// This checks packaging/link integrity only, not model routing or language semantics.
async function inspect(root) {
  assert.deepEqual((await readdir(root)).filter(n => n.startsWith('el-')).sort(), [...commands].sort());
  const descriptions = new Set();
  const seen = new Set();
  async function visit(path) {
    path = resolve(path);
    if (seen.has(path)) return;
    seen.add(path);
    const text = await readFile(path, 'utf8');
    for (const [, link] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      if (/^[a-z]+:|^#/i.test(link)) continue;
      const target = resolve(dirname(path), link.split('#')[0]);
      await readFile(target);
      if (target.endsWith('.md')) await visit(target);
    }
  }
  for (const command of commands) {
    const path = join(root, command, 'SKILL.md');
    const text = await readFile(path, 'utf8');
    assert.match(text, new RegExp(`^---\nname: ${command}\n`));
    const desc = text.match(/^description: "(.+)"$/m)?.[1];
    assert.ok(desc); descriptions.add(desc);
    assert.ok(text.includes('../assignment-review/references/command-entrypoints.md'));
    assert.doesNotMatch(text, /\/(?:Users|home)\/|[A-Z]:\\/);
    await visit(path);
  }
  assert.equal(descriptions.size, 6);
  for (const name of ['baseline-sources','prompt-contract','prompt-store','prompt-records']) await readFile(join(root, `assignment-review/scripts/${name}.mjs`));
}
test('six distinct entry manifests have a complete local reference graph', () => inspect(source));
test('installed sibling symlinks work outside the checkout; missing shared dependency fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'el-command-contract-'));
  try {
    for (const name of [...commands, 'assignment-review']) await symlink(join(source, name), join(root, name), 'dir');
    await inspect(root);
    await unlink(join(root, 'assignment-review'));
    await assert.rejects(inspect(root), { code: 'ENOENT' });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('installed prompt CLI executes through sibling link from external Unicode cwd; missing helper fails', async () => {
  const root = await mkdtemp('/private/tmp/el-installed-');
  try {
    await chmod(root, 0o700);
    const install=join(root,'skills 中文'), project=join(root,'course space');
    await mkdir(install,{mode:0o700}); await mkdir(project,{mode:0o700});
    await symlink(join(source,'assignment-review'),join(install,'assignment-review'),'dir');
    const helper=join(install,'assignment-review/scripts/prompt-records.mjs');
    const env={PATH:process.env.PATH,CODEX_THREAD_ID:randomUUID(),EVIDENCELENS_STATE_ROOT:join(root,'state')};
    const run=()=>spawnSync(process.execPath,[helper,'begin'],{env,cwd:project,input:'{}',encoding:'utf8',timeout:10000});
    const actual=run(); assert.equal(actual.status,0,actual.stderr); assert.equal(JSON.parse(actual.stdout).ok,true);
    // Copy only our test package before removing a dependency; never mutate the installed source.
    await unlink(join(install,'assignment-review')); await cp(join(source,'assignment-review'),join(install,'assignment-review'),{recursive:true});
    await unlink(join(install,'assignment-review/scripts/prompt-contract.mjs'));
    assert.notEqual(run().status,0);
  } finally { await rm(root,{recursive:true,force:true}); }
});
