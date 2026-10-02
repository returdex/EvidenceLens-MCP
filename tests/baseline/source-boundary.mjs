import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { selectBaselineSources as select, collectBaselineSources as collect } from '../../skills/assignment-review/scripts/baseline-sources.mjs';

const helper = fileURLToPath(new URL('../../skills/assignment-review/scripts/baseline-sources.mjs', import.meta.url));
const source = (id, kind = 'requirements', extra = {}) => ({ id, documentId: id, kind, access: 'allowed', exclusion: 'none', ...extra });
const input = (sources, currentSourceId = null, reviewMode = 'artifact_only') => ({ sources, currentSourceId, reviewMode });
const cli = (data) => spawnSync(process.execPath, [helper], { input: data, encoding: 'utf8', timeout: 5000 });

test('current solution only; baseline order and requested process context', async () => {
  const data = input([source('brief'), source('old', 'solution'), source('now', 'solution'), source('history', 'history')], 'now');
  const calls = [];
  const result = await collect(data, (id) => { calls.push(id); return id; });
  assert.deepEqual(calls, ['brief', 'now']);
  assert.deepEqual(result.selection.reads, [{ id: 'brief', purpose: 'baseline' }, { id: 'now', purpose: 'current_artifact' }]);
  assert.deepEqual(result.selection.skipped, [{ id: 'old', reason: 'not_current_artifact' }, { id: 'history', reason: 'history_not_requested' }]);
  assert.equal(result.selection.currentArtifact.status, 'selected');
  data.reviewMode = 'process';
  assert.deepEqual(select(data).reads.at(-1), { id: 'history', purpose: 'process_context' });
  assert.deepEqual(select(input(['rubric', 'teacher_guidance', 'template', 'support'].map((kind) => source(kind, kind)))).reads.map((r) => r.purpose), Array(4).fill('baseline'));
});

test('whole, partial and unknown groups deny all known aliases before any read', async () => {
  const secret = randomUUID();
  const sources = [source('brief')];
  for (const [id, extra] of Object.entries({ whole: { exclusion: 'whole' }, partial: { exclusion: 'partial' }, unknown: { access: 'unknown' }, denied: { access: 'excluded' } })) {
    sources.push(source(`${id}_alias`, 'solution', { documentId: id }), source(id, 'support', extra));
  }
  const calls = [];
  const result = await collect(input(sources, 'partial_alias'), (id) => { calls.push(id); return id === 'brief' ? 'Allowed brief' : secret; });
  assert.deepEqual(calls, ['brief']);
  assert.equal(result.selection.currentArtifact.status, 'unavailable');
  assert.deepEqual(result.selection.skipped.map((s) => s.reason), ['user_excluded','user_excluded','partial_exclusion_unsupported','partial_exclusion_unsupported','access_unknown','access_unknown','user_excluded','user_excluded']);
  assert.equal(JSON.stringify(result).includes(secret), false);
  const out = cli(JSON.stringify(input(sources, 'partial_alias')));
  assert.equal(out.status, 0);
  assert.equal((out.stdout + out.stderr).includes(secret), false);
});

test('group denial precedence is independent of metadata order and target kind', () => {
  const group = [source('unknown', 'history', { documentId: 'group', access: 'unknown' }), source('partial', 'solution', { documentId: 'group', exclusion: 'partial' }), source('whole', 'template', { documentId: 'group', exclusion: 'whole' })];
  for (const sources of [group, [...group].reverse()]) assert.ok(select(input(sources, 'partial', 'process')).skipped.every((s) => s.reason === 'user_excluded'));
  assert.ok(select(input(group.slice(0, 2))).skipped.every((s) => s.reason === 'partial_exclusion_unsupported'));
});

test('missing, undesignated and non-solution targets never choose a fallback', async () => {
  const sources = [source('brief'), source('old', 'solution')];
  for (const target of ['missing', 'brief', null]) {
    const calls = [];
    const result = await collect(input(sources, target), (id) => { calls.push(id); return 'text'; });
    assert.deepEqual(calls, ['brief']);
    assert.equal(result.selection.currentArtifact.status, target === null ? 'needs_selection' : 'unavailable');
  }
  assert.equal(select(input([])).currentArtifact.status, 'not_provided');
  assert.equal(select(input(sources)).skipped[0].reason, 'awaiting_current_selection');
});

test('strict bounded metadata rejects invalid input with zero reads', async () => {
  const valid = input([source('brief')]);
  const invalid = [null, {}, { ...valid, content: 'raw' }, input([source('a'), source('a')]), input([source('../path')]), input([source('a', 'bad')]), input([source('a', 'support', { access: 'yes' })]), input([source('a', 'support', { exclusion: null })]), input([source('a', 'support', { documentId: 'https://example.invalid' })]), input([source('a', 'support', { path: '/private' })]), input(Array.from({ length: 101 }, (_, i) => source(`S${i}`))), input(new Array(1)), { ...valid, reviewMode: 'auto' }, { ...valid, currentSourceId: 3 }];
  const accessor = { ...valid };
  Object.defineProperty(accessor, 'sources', { enumerable: true, get() { throw new Error('must not invoke'); } });
  invalid.push(accessor);
  let calls = 0;
  for (const data of invalid) await assert.rejects(collect(data, () => { calls++; }), { message: 'BASELINE_INPUT_INVALID' });
  assert.equal(calls, 0);
  assert.equal(select(input(Array.from({ length: 100 }, (_, i) => source(`S${i}`)))).reads.length, 100);
});

test('unreadable current is selected but never claimed inspected; other work continues', async () => {
  const secret = randomUUID();
  const calls = [];
  const result = await collect(input([source('now', 'solution'), source('brief')], 'now'), (id) => {
    calls.push(id);
    if (id === 'now') throw new Error(secret);
    return 'Compare two alternatives.';
  });
  assert.deepEqual(calls, ['now', 'brief']);
  assert.equal(result.selection.currentArtifact.status, 'selected');
  assert.deepEqual(result.items.map((i) => i.id), ['brief']);
  assert.deepEqual(result.unavailable, [{ id: 'now', reason: 'read_failed' }]);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test('non-text and oversized UTF-8 text are rejected; exact item bound accepted', async () => {
  const data = [null, Buffer.from('x'), '中'.repeat(333334), 'x'.repeat(1000000), ''];
  const result = await collect(input(data.map((_, i) => source(`S${i}`))), (id) => data[Number(id.slice(1))]);
  assert.deepEqual(result.unavailable.map((r) => r.reason), Array(3).fill('unsupported_content'));
  assert.deepEqual(result.items.map((r) => r.id), ['S3', 'S4']);
});

test('aggregate cap prevents subsequent calls at exact and overflow boundaries', async () => {
  for (const bytes of [1000000, 900000]) {
    const calls = [];
    const result = await collect(input(Array.from({ length: 8 }, (_, i) => source(`S${i}`))), (id) => { calls.push(id); return 'x'.repeat(bytes); });
    assert.equal(result.items.length, 5);
    assert.equal(calls.length, bytes === 1000000 ? 5 : 6);
    assert.ok(result.unavailable.every((item) => item.reason === 'budget_exhausted'));
    assert.ok(result.items.reduce((total, item) => total + Buffer.byteLength(item.content), 0) <= 5000000);
  }
});

test('admitted text hash is fresh for same source ID and preserves exact text', async () => {
  const data = input([source('now', 'solution')], 'now');
  const first = await collect(data, () => '第一稿\n');
  const next = await collect(data, () => '第二稿\n');
  assert.equal(first.items[0].contentHash, createHash('sha256').update('第一稿\n').digest('hex'));
  assert.notEqual(first.items[0].contentHash, next.items[0].contentHash);
  assert.equal(first.items[0].id, next.items[0].id);
});

test('callback mutation cannot expand snapshotted selection', async () => {
  const data = input([source('brief'), source('now', 'solution')], 'now');
  const calls = [];
  const result = await collect(data, (id) => { calls.push(id); data.sources.push(source('secret')); data.sources[1].id = 'substitute'; data.currentSourceId = 'secret'; return id; });
  assert.deepEqual(calls, ['brief', 'now']);
  assert.equal(result.selection.currentArtifact.sourceId, 'now');
});

test('CLI valid metadata only; stable failures including byte boundary and invalid UTF-8', () => {
  const valid = JSON.stringify(input([source('brief')]));
  const success = cli(valid);
  assert.equal(success.status, 0);
  assert.equal(success.stderr, '');
  assert.deepEqual(JSON.parse(success.stdout), select(JSON.parse(valid)));
  assert.equal(cli(valid + ' '.repeat(32768 - Buffer.byteLength(valid))).status, 0);
  for (const data of ['{', valid + ' '.repeat(32769), JSON.stringify({ ...input([]), content: randomUUID() }), Buffer.from([0xff])]) {
    const result = cli(data);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'BASELINE_INPUT_INVALID\n');
  }
});

test('import does not read stdin or write stdout', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('../../skills/assignment-review/scripts/baseline-sources.mjs', import.meta.url).href)})`], { input: '{bad', encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0);
  assert.equal(result.stdout + result.stderr, '');
});
