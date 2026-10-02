#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const INVALID = 'BASELINE_INPUT_INVALID';
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const KINDS = ['requirements', 'rubric', 'teacher_guidance', 'template', 'solution', 'support', 'history'];
const ITEM_BYTES = 1_000_000;
const TOTAL_BYTES = 5_000_000;
const CLI_BYTES = 32 * 1024;
const fail = () => { throw new Error(INVALID); };
const isId = (value) => typeof value === 'string' && ID.test(value);

// Metadata is plain data. Read descriptors so accessor fields cannot act as readers.
function fields(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length) fail();
  return keys.map((key) => {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) fail();
    return descriptor.value;
  });
}

function snapshot(input) {
  try {
    const [sources, currentSourceId, reviewMode] = fields(input, ['sources', 'currentSourceId', 'reviewMode']);
    if (!Array.isArray(sources) || sources.length > 100 ||
        !(currentSourceId === null || isId(currentSourceId)) ||
        !['artifact_only', 'process'].includes(reviewMode)) fail();
    const seen = new Set();
    const copy = [];
    for (let i = 0; i < sources.length; i++) {
      const entry = Object.getOwnPropertyDescriptor(sources, String(i));
      if (!entry || !Object.hasOwn(entry, 'value')) fail();
      const [id, documentId, kind, access, exclusion] = fields(entry.value,
        ['id', 'documentId', 'kind', 'access', 'exclusion']);
      if (!isId(id) || !isId(documentId) || seen.has(id) || !KINDS.includes(kind) ||
          !['allowed', 'excluded', 'unknown'].includes(access) || !['none', 'whole', 'partial'].includes(exclusion)) fail();
      seen.add(id);
      copy.push({ id, documentId, kind, access, exclusion });
    }
    return { sources: copy, currentSourceId, reviewMode };
  } catch { fail(); }
}

export function selectBaselineSources(input) {
  const { sources, currentSourceId, reviewMode } = snapshot(input);
  const denied = new Map();
  const reasons = [null, 'access_unknown', 'partial_exclusion_unsupported', 'user_excluded'];
  for (const source of sources) {
    const rank = source.access === 'excluded' || source.exclusion === 'whole' ? 3
      : source.exclusion === 'partial' ? 2 : source.access === 'unknown' ? 1 : 0;
    denied.set(source.documentId, Math.max(rank, denied.get(source.documentId) ?? 0));
  }
  const reads = [], skipped = [];
  for (const source of sources) {
    let reason = reasons[denied.get(source.documentId)];
    let purpose = 'baseline';
    if (!reason && source.kind === 'solution') {
      if (source.id === currentSourceId) purpose = 'current_artifact';
      else reason = currentSourceId === null ? 'awaiting_current_selection' : 'not_current_artifact';
    } else if (!reason && source.kind === 'history') {
      if (reviewMode === 'process') purpose = 'process_context';
      else reason = 'history_not_requested';
    }
    if (reason) skipped.push({ id: source.id, reason });
    else reads.push({ id: source.id, purpose });
  }
  const status = currentSourceId === null
    ? (sources.some((source) => source.kind === 'solution') ? 'needs_selection' : 'not_provided')
    : reads.some((read) => read.id === currentSourceId && read.purpose === 'current_artifact') ? 'selected' : 'unavailable';
  return { reads, skipped, currentArtifact: { sourceId: currentSourceId, status } };
}

export async function collectBaselineSources(input, readSource) {
  const selection = selectBaselineSources(input);
  if (typeof readSource !== 'function') fail();
  const items = [], unavailable = [];
  let remaining = TOTAL_BYTES;
  for (const { id } of selection.reads) {
    if (remaining === 0) {
      unavailable.push({ id, reason: 'budget_exhausted' });
      continue;
    }
    let content;
    try { content = await readSource(id); }
    catch { unavailable.push({ id, reason: 'read_failed' }); continue; }
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > ITEM_BYTES) {
      unavailable.push({ id, reason: 'unsupported_content' });
      continue;
    }
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > remaining) {
      unavailable.push({ id, reason: 'budget_exhausted' });
      remaining = 0;
      continue;
    }
    remaining -= bytes;
    items.push({ id, content, contentHash: createHash('sha256').update(content, 'utf8').digest('hex') });
  }
  return { selection, items, unavailable };
}

async function main() {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += chunk.length;
      if (size > CLI_BYTES) fail();
      chunks.push(chunk);
    }
    const input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    process.stdout.write(`${JSON.stringify(selectBaselineSources(input))}\n`);
  } catch {
    process.stderr.write(`${INVALID}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
