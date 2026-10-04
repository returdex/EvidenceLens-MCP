import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installSkills, skillNames } from '../../scripts/install-review-skills.mjs';
const script = fileURLToPath(new URL('../../scripts/install-review-skills.mjs', import.meta.url));
async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'el-install-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, target: join(root, '课程 空格', 'skills') };
}
test('dry-run writes nothing; apply and repeat install resolve shared files outside cwd', async t => {
  const { root, target } = await fixture(t);
  const dry = await installSkills(target);
  assert.ok(dry.ok); assert.equal(dry.entries.length, 7);
  await assert.rejects(fs.stat(target), { code: 'ENOENT' });
  const applied = await installSkills(target, { apply: true });
  assert.ok(applied.ok); assert.ok(applied.entries.every(e => e.status === 'created'));
  assert.deepEqual((await fs.readdir(target)).sort(), [...skillNames].sort());
  for (const e of applied.entries) assert.equal(await fs.readlink(e.destination), e.source);
  assert.ok((await installSkills(target, { apply: true })).entries.every(e => e.status === 'unchanged'));
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import {readFile} from 'node:fs/promises'; await readFile(${JSON.stringify(join(target, 'el-check', '../assignment-review/references/command-entrypoints.md'))}); await import(${JSON.stringify(new URL('file://' + join(target, 'assignment-review/scripts/baseline-sources.mjs')).href)});`], { cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
});
test('all collision types preserve existing content and preflight prevents any link creation', async t => {
  for (const kind of ['file', 'directory', 'link', 'dangling']) {
    const { root, target } = await fixture(t);
    await fs.mkdir(target, { recursive: true });
    const dest = join(target, 'el-prompt');
    if (kind === 'file') await fs.writeFile(dest, 'KEEP');
    else if (kind === 'directory') await fs.mkdir(dest);
    else await fs.symlink(kind === 'link' ? root : join(root, 'absent'), dest);
    const before = await fs.lstat(dest);
    const result = await installSkills(target, { apply: true });
    assert.equal(result.ok, false); assert.equal(result.entries.at(-1).status, 'conflict');
    assert.deepEqual(await fs.readdir(target), ['el-prompt']);
    assert.equal((await fs.lstat(dest)).ino, before.ino);
    if (kind === 'file') assert.equal(await fs.readFile(dest, 'utf8'), 'KEEP');
  }
});
test('missing shared source prevents all writes', async t => {
  const { root, target } = await fixture(t);
  const result = await installSkills(target, { apply: true, sourceRoot: join(root, 'missing') });
  assert.equal(result.ok, false); assert.ok(result.entries.every(e => e.status === 'missing_source'));
  await assert.rejects(fs.stat(target), { code: 'ENOENT' });
});
test('symlink root or parent and non-directory parent are rejected', async t => {
  const { root } = await fixture(t);
  const link = join(root, 'redirect'); await fs.symlink(root, link);
  await assert.rejects(installSkills(link, { apply: true }), /real directories/);
  await assert.rejects(installSkills(join(link, 'skills'), { apply: true }), /real directories/);
  const file = join(root, 'file'); await fs.writeFile(file, 'KEEP');
  await assert.rejects(installSkills(join(file, 'skills'), { apply: true }), /real directories/);
});
test('mid-creation failure rolls back own links and preserves unrelated files', async t => {
  const { target } = await fixture(t);
  await fs.mkdir(target, { recursive: true }); await fs.writeFile(join(target, 'unrelated'), 'KEEP');
  const original = fs.symlink.bind(fs); let calls = 0;
  const mock = t.mock.method(fs, 'symlink', async (...args) => {
    if (++calls === 3) throw Object.assign(new Error('synthetic failure'), { code: 'EACCES' });
    return original(...args);
  });
  const result = await installSkills(target, { apply: true }); mock.mock.restore();
  assert.equal(result.ok, false); assert.equal(result.error, 'EACCES');
  assert.equal(result.entries.filter(e => e.status === 'rolled_back').length, 2);
  assert.deepEqual(await fs.readdir(target), ['unrelated']);
  assert.equal(await fs.readFile(join(target, 'unrelated'), 'utf8'), 'KEEP');
});
test('CLI rejects missing/relative target, unknown and repeated flags', () => {
  for (const args of [[], ['--target-root', 'relative'], ['--force'], ['--target-root', '/tmp/x', '--apply', '--apply']]) {
    const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10000 });
    assert.equal(r.status, 1); assert.match(r.stderr, /Usage:/);
  }
});


test('post-create identity failure reports retained link as unverified, never merely planned', async t => {
  const { target } = await fixture(t);
  const original = fs.lstat.bind(fs);
  const destination = join(target, 'assignment-review');
  const mock = t.mock.method(fs, 'lstat', async (...args) => {
    const value = await original(...args);
    if (args[0] === destination && value.isSymbolicLink()) {
      throw Object.assign(new Error('synthetic identity read failure'), { code: 'EIO' });
    }
    return value;
  });
  const result = await installSkills(target, { apply: true }); mock.mock.restore();
  assert.equal(result.ok, false); assert.equal(result.error, 'EIO');
  assert.equal(result.entries[0].status, 'rollback_unverified');
  assert.ok((await original(destination)).isSymbolicLink());
  assert.deepEqual(await fs.readdir(target), ['assignment-review']);
});
