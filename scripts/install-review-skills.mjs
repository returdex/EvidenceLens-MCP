#!/usr/bin/env node
import fs from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const skillNames = Object.freeze([
  'assignment-review', 'el-help', 'el-prepare', 'el-check', 'el-final', 'el-recheck', 'el-prompt',
]);
const defaultSource = fileURLToPath(new URL('../skills/', import.meta.url));
async function statOrMissing(path) {
  try { return await fs.lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function checkParents(path) {
  const parent = dirname(path);
  if (parent !== path) await checkParents(parent);
  const stat = await statOrMissing(path);
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
    throw new Error('Target root and its parents must be real directories (no symlinks).');
  }
}
// Local filesystem installer only. It neither starts Codex nor reads assignment material.
export async function installSkills(targetRoot, { apply = false, sourceRoot = defaultSource } = {}) {
  if (typeof targetRoot !== 'string' || !isAbsolute(targetRoot)) throw new Error('An absolute --target-root is required.');
  targetRoot = resolve(targetRoot);
  await checkParents(targetRoot);
  const entries = [];
  for (const name of skillNames) {
    const destination = join(targetRoot, name);
    let source;
    try {
      source = await fs.realpath(join(sourceRoot, name));
      if (!(await fs.stat(join(source, 'SKILL.md'))).isFile()) throw new Error('Not a manifest');
      await fs.readFile(join(source, 'SKILL.md'), 'utf8');
    } catch { entries.push({ name, destination, status: 'missing_source' }); continue; }
    const stat = await statOrMissing(destination);
    let status = 'planned';
    if (stat) {
      status = 'conflict';
      if (stat.isSymbolicLink()) {
        const link = await fs.readlink(destination);
        if (resolve(dirname(destination), link) === source) status = 'unchanged';
      }
    }
    entries.push({ name, source, destination, status });
  }
  const report = { mode: apply ? 'apply' : 'dry-run', targetRoot, ok: false, entries };
  if (entries.some(e => ['conflict', 'missing_source'].includes(e.status))) return report;
  if (!apply) return { ...report, ok: true };
  const created = [];
  try {
    await fs.mkdir(targetRoot, { recursive: true });
    await checkParents(targetRoot);
    for (const entry of entries.filter(e => e.status === 'planned')) {
      await checkParents(targetRoot);
      await fs.symlink(entry.source, entry.destination, 'dir'); // EEXIST never overwrites a concurrent entry.
      const owned = { entry, identity: null };
      created.push(owned);
      entry.status = 'created';
      owned.identity = await fs.lstat(entry.destination);
    }
    return { ...report, ok: true };
  } catch (error) {
    report.error = error.code || 'INSTALL_FAILED';
    for (const { entry, identity } of created.reverse()) {
      if (!identity) { entry.status = 'rollback_unverified'; continue; }
      try {
        await checkParents(targetRoot);
        const current = await fs.lstat(entry.destination);
        if (current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino &&
            await fs.readlink(entry.destination) === entry.source) {
          await fs.unlink(entry.destination);
          entry.status = 'rolled_back';
        } else entry.status = 'changed_preserved';
      } catch { entry.status = 'rollback_unverified'; }
    }
    return report;
  }
}

async function main(args) {
  const usage = 'Usage: node scripts/install-review-skills.mjs --target-root ABSOLUTE_PATH [--apply]';
  if (args.length === 1 && args[0] === '--help') { console.log(usage); return; }
  let target, apply = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target-root' && target === undefined) target = args[++i];
    else if (args[i] === '--apply' && !apply) apply = true;
    else throw new Error(usage);
  }
  if (!target || !isAbsolute(target)) throw new Error(usage);
  const report = await installSkills(target, { apply });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.code || error.message);
    process.exitCode = 1;
  });
}
