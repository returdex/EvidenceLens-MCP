import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, symlink, unlink, rm } from 'node:fs/promises';
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
  await readFile(join(root, 'assignment-review/scripts/baseline-sources.mjs'));
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
