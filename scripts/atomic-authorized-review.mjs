#!/usr/bin/env node
import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";
import { FIXED_CHALLENGE_HANDOFF, verifyChallengeHandoff } from "./evidence-envelope.mjs";
import { completeProofLifecycle, performMcpReview, StdioClient } from "./docker-review-real.mjs";
import { deriveProofRuntimeSpec, proofDockerRunArgv } from "./proof-runtime-spec.mjs";

const MAX_STDIN_BYTES = 1025;
function fail(code) { throw new Error(code); }
function exactPath(path, expected) { if (typeof path !== "string" || path !== expected || resolve(path) !== resolve(expected)) fail("AUTHORIZED_ARGV"); }
async function fsyncDirectory(path) { const h = await open(path, fsConstants.O_RDONLY); try { await h.sync(); } finally { await h.close(); } }

export async function readAuthorizationLine(input) {
  const chunks = []; let total = 0;
  try {
    for await (const chunk of input) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += bytes.length; if (total > MAX_STDIN_BYTES) { input.destroy?.(); fail("AUTHORIZED_STDIN"); }
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length < 2 || bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a) || bytes.includes(0x0d) || bytes.includes(0x00)) fail("AUTHORIZED_STDIN");
    let line; try { line = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, -1)); } catch { fail("AUTHORIZED_STDIN"); }
    if (Buffer.byteLength(line) > 1024 || line.length === 0) fail("AUTHORIZED_STDIN");
    return line;
  } catch (e) { if (e instanceof Error && e.message === "AUTHORIZED_STDIN") throw e; fail("AUTHORIZED_STDIN"); }
}

async function readHandoff(path) {
  let h; try { h = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW); const s = await h.stat(); if (!s.isFile() || s.uid !== process.getuid?.() || s.size < 3 || s.size > 1_000_000) fail("AUTHORIZED_STATE"); const bytes = await h.readFile(); const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); const value = JSON.parse(text); if (canonicalJson(value) !== text || typeof value.ledger_locator !== "string") fail("AUTHORIZED_STATE"); return value; }
  catch (e) { if (e instanceof Error && e.message.startsWith("AUTHORIZED_")) throw e; fail("AUTHORIZED_STATE"); } finally { await h?.close().catch(() => undefined); }
}

async function durableConsume(path, resume) {
  const handoff = await readHandoff(path);
  if (handoff.nonce !== resume.nonce || handoff.generation !== resume.generation || handoff.manifest_sha256 !== resume.manifest_sha256) fail("AUTHORIZED_STATE");
  const marker = `${handoff.ledger_locator}.consumed`; let markerHandle;
  try {
    markerHandle = await open(marker, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    const consumed = { generation: resume.generation, manifest_sha256: resume.manifest_sha256, nonce: resume.nonce, schema: "evidencelens.replay-consumption.v1", status: "consumed" };
    await markerHandle.writeFile(Buffer.from(canonicalJson(consumed))); await markerHandle.sync(); await markerHandle.close(); markerHandle = undefined; await fsyncDirectory(dirname(marker));
    const temp = `${handoff.ledger_locator}.tmp-${process.pid}`; let tempHandle;
    try { tempHandle = await open(temp, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600); await tempHandle.writeFile(Buffer.from(canonicalJson(consumed))); await tempHandle.sync(); await tempHandle.close(); tempHandle = undefined; await rename(temp, handoff.ledger_locator); await fsyncDirectory(dirname(handoff.ledger_locator)); }
    catch (e) { await tempHandle?.close().catch(() => undefined); await unlink(temp).catch(() => undefined); throw e; }
  } catch (e) { await markerHandle?.close().catch(() => undefined); if (e?.code === "EEXIST") fail("AUTHORIZED_REPLAY"); if (e instanceof Error && e.message.startsWith("AUTHORIZED_")) throw e; fail("AUTHORIZED_CONSUME"); }
}

async function defaultSpawnPinned(resume) {
  const spec = await deriveProofRuntimeSpec(); if (sha256Hex(Buffer.from(canonicalJson(spec))) !== (await readEnvelopeRuntimeHash(FIXED_CHALLENGE_HANDOFF))) fail("AUTHORIZED_RUNTIME");
  const key = process.env.DEEPSEEK_API_KEY; if (typeof key !== "string" || key.trim() === "") fail("AUTHORIZED_CREDENTIAL");
  const argv = proofDockerRunArgv(spec, resume.image_id).map(value => value === "DEEPSEEK_API_KEY=<runtime-secret>" ? "DEEPSEEK_API_KEY" : value);
  if (argv.some(value => /(?:build|buildx|pull|--mount|--volume)/u.test(value))) fail("AUTHORIZED_RUNTIME");
  const child = spawn("docker", argv, { stdio: ["pipe", "pipe", "pipe"], env: { PATH: process.env.PATH, HOME: process.env.HOME, DOCKER_HOST: process.env.DOCKER_HOST, DOCKER_CONTEXT: process.env.DOCKER_CONTEXT, DEEPSEEK_API_KEY: key } });
  const client = new StdioClient(child, Number(spec.proof.environment.DEEPSEEK_TIMEOUT_MS) + 30_000);
  try { const payload = await performMcpReview(client, false, spec.proof.environment.DEEPSEEK_MODEL); await completeProofLifecycle(child, payload, false, { write: () => undefined }); return { status: "passed" }; }
  catch { if (!child.killed && child.exitCode === null) child.kill("SIGTERM"); return { status: "failed" }; }
}

async function readEnvelopeRuntimeHash(path) {
  const handoff = await readHandoff(path); const bytes = await readFile(handoff.envelope_locator); const envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); if (!/^[0-9a-f]{64}$/u.test(envelope.runtime_sha256)) fail("AUTHORIZED_RUNTIME"); return envelope.runtime_sha256;
}

export async function executeAuthorizedOnce(path, input, options = {}) {
  const expectedPath = options.expectedPath ?? FIXED_CHALLENGE_HANDOFF; exactPath(path, expectedPath);
  const line = await readAuthorizationLine(input);
  const resume = await (options.verify ?? verifyChallengeHandoff)(path, { expectedPath });
  const supplied = Buffer.from(line), expected = Buffer.from(resume.authorization_echo);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) fail("AUTHORIZED_MISMATCH");
  await (options.consume ?? durableConsume)(path, resume);
  const outcome = await (options.spawnPinned ?? defaultSpawnPinned)(resume);
  const result = { schema: "evidencelens.authorized-review.v1", status: outcome?.status === "passed" ? "passed" : "failed" };
  await (options.publishOutcome ?? durableOutcome)(path, resume, result);
  return result;
}

async function durableOutcome(path, resume, result) {
  const handoff = await readHandoff(path); const target = `${handoff.ledger_locator}.outcome`; let h;
  try { h = await open(target, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600); await h.writeFile(Buffer.from(canonicalJson({ generation: resume.generation, nonce: resume.nonce, ...result }))); await h.sync(); await h.close(); h = undefined; await fsyncDirectory(dirname(target)); }
  catch (e) { await h?.close().catch(() => undefined); fail("AUTHORIZED_OUTCOME"); }
}

async function main(argv) {
  if (argv.length !== 1 || argv[0] !== FIXED_CHALLENGE_HANDOFF) fail("AUTHORIZED_ARGV");
  process.stdout.write(canonicalJson(await executeAuthorizedOnce(argv[0], process.stdin)));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main(process.argv.slice(2)).catch(e => { const code = e instanceof Error && /^AUTHORIZED_[A-Z_]+$/u.test(e.message) ? e.message : "AUTHORIZED_FAILED"; process.stderr.write(`authorized-review: ${code}\n`); process.exitCode = 1; });
