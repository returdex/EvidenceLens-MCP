#!/usr/bin/env node
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { link, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { FIXED_BUILD_HANDOFF, MAX_EVIDENCE_BYTES, auditPreparedBuildHandoff, canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";
import { deriveProofRuntimeSpec } from "./proof-runtime-spec.mjs";

const execFileAsync = promisify(execFile);
const lower64 = /^[0-9a-f]{64}$/u;
const imageIdPattern = /^sha256:[0-9a-f]{64}$/u;

function fail(code) { throw new Error(code); }
function ordinary(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactPath(path, expected) {
  if (typeof path !== "string" || path !== expected || resolve(path) !== resolve(expected)) fail("PRODUCER_ARGV");
}
function exactKeys(value, keys, code) {
  if (!ordinary(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}

async function secureJson(path, ownerOnly = false) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.uid !== process.getuid?.() || stat.size < 3 || stat.size > MAX_EVIDENCE_BYTES || (ownerOnly && (stat.mode & 0o777) !== 0o600)) fail("PRODUCER_DESCRIPTOR");
    const bytes = await handle.readFile();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = JSON.parse(text);
    if (canonicalJson(parsed) !== text) fail("PRODUCER_DESCRIPTOR");
    return { parsed, bytes };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PRODUCER_")) throw error;
    fail("PRODUCER_DESCRIPTOR");
  } finally { await handle?.close().catch(() => undefined); }
}

async function secureBytes(path) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o600 || stat.size < 1 || stat.size > 512 * 1024 * 1024) fail("PRODUCER_ARCHIVE");
    return await handle.readFile();
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCER_ARCHIVE") throw error;
    fail("PRODUCER_ARCHIVE");
  } finally { await handle?.close().catch(() => undefined); }
}

async function fsyncDirectory(path) {
  const handle = await open(path, fsConstants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

async function atomicWrite(path, value, { exclusive = false } = {}) {
  const bytes = Buffer.from(canonicalJson(value));
  if (bytes.length > MAX_EVIDENCE_BYTES) fail("PRODUCER_RESULT");
  const temp = `${path}.tmp-${process.pid}-${randomBytes(12).toString("hex")}`;
  let handle;
  try {
    handle = await open(temp, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close(); handle = undefined;
    if (exclusive) {
      try { await link(temp, path); } catch (error) { if (error?.code === "EEXIST") fail("PRODUCER_RESULT_EXISTS"); throw error; }
      await unlink(temp);
    } else await rename(temp, path);
    await fsyncDirectory(dirname(path));
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temp).catch(() => undefined);
    throw error;
  }
  return bytes;
}

async function claimGeneration(descriptorLocator, descriptor, preparedSha256) {
  const claimPath = `${descriptorLocator}.claim`;
  const claim = { generation: descriptor.generation, prepared_sha256: preparedSha256, schema: "evidencelens.build-claim.v1" };
  try { await atomicWrite(claimPath, claim, { exclusive: true }); }
  catch { fail("PRODUCER_ALREADY_CLAIMED"); }
  return claim;
}

export async function authenticateCommittedPlanning(path, repoDir = process.cwd()) {
  if (path !== FIXED_BUILD_HANDOFF) fail("PRODUCER_ARGV");
  try {
    const [{ stdout: tracked }, { stdout: committed }] = await Promise.all([
      execFileAsync("git", ["ls-files", "--error-unmatch", "--", path], { cwd: repoDir, encoding: null, maxBuffer: MAX_EVIDENCE_BYTES }),
      execFileAsync("git", ["show", `HEAD:${path}`], { cwd: repoDir, encoding: null, maxBuffer: MAX_EVIDENCE_BYTES }),
    ]);
    if (!tracked.length || !Buffer.from(await readFile(join(repoDir, path))).equals(committed)) fail("PRODUCER_HANDOFF_COMMIT");
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCER_HANDOFF_COMMIT") throw error;
    fail("PRODUCER_HANDOFF_COMMIT");
  }
}

function validateResult(value, generation) {
  exactKeys(value, ["daemon_identity_sha256", "fixture_sha256", "generation", "image_config_sha256", "image_content_sha256", "image_id", "runtime_sha256", "schema", "sentinels"], "PRODUCER_RESULT");
  if (value.schema !== "evidencelens.build-result.v1" || value.generation !== generation || !imageIdPattern.test(value.image_id)) fail("PRODUCER_RESULT");
  for (const key of ["daemon_identity_sha256", "image_config_sha256", "image_content_sha256", "runtime_sha256"]) if (!lower64.test(value[key])) fail("PRODUCER_RESULT");
  if (!Array.isArray(value.fixture_sha256) || value.fixture_sha256.length !== 4 || value.fixture_sha256.some((entry) => !lower64.test(entry))) fail("PRODUCER_RESULT");
  if (!ordinary(value.sentinels) || JSON.stringify(value.sentinels) !== JSON.stringify({ proof: "normalized", review: "normalized" })) fail("PRODUCER_RESULT");
  return value;
}

async function defaultBuildOnce(descriptor) {
  const [file, ...args] = descriptor.build_argv;
  await execFileAsync(file, args, { env: { PATH: process.env.PATH, HOME: process.env.HOME, DOCKER_HOST: process.env.DOCKER_HOST, DOCKER_CONTEXT: process.env.DOCKER_CONTEXT }, encoding: "utf8", maxBuffer: 1024 * 1024 });
  const imageId = (await readFile(descriptor.build_argv[3], "utf8")).trim();
  if (!imageIdPattern.test(imageId)) fail("PRODUCER_IMAGE_ID");
  const [{ stdout: inspectText }, { stdout: daemonText }, runtime] = await Promise.all([
    execFileAsync("docker", ["image", "inspect", imageId], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }),
    execFileAsync("docker", ["version", "--format", "{{json .}}"], { encoding: "utf8", maxBuffer: 1024 * 1024 }),
    deriveProofRuntimeSpec(),
  ]);
  const inspect = JSON.parse(inspectText);
  if (!Array.isArray(inspect) || inspect.length !== 1 || inspect[0].Id !== imageId) fail("PRODUCER_IMAGE_INSPECT");
  const contextRoot = descriptor.build_argv[6];
  const fixtures = [
    "tests/fixtures/evidence/text/assignment.txt",
    "tests/fixtures/evidence/tables/rubric.csv",
    "tests/fixtures/evidence/images/rubric-screenshot.png",
    "tests/fixtures/evidence/pdfs/text-page.pdf",
  ];
  const fixtureSha256 = await Promise.all(fixtures.map(async (path) => sha256Hex(await readFile(join(contextRoot, path)))));
  return {
    daemon_identity_sha256: sha256Hex(Buffer.from(daemonText)),
    fixture_sha256: fixtureSha256,
    generation: descriptor.generation,
    image_config_sha256: sha256Hex(Buffer.from(canonicalJson(inspect[0].Config))),
    image_content_sha256: sha256Hex(Buffer.from(canonicalJson({ Id: inspect[0].Id, RootFS: inspect[0].RootFS }))),
    image_id: imageId,
    runtime_sha256: sha256Hex(Buffer.from(canonicalJson(runtime))),
    schema: "evidencelens.build-result.v1",
    sentinels: { proof: "normalized", review: "normalized" },
  };
}

function publicResult(status, generation, resultSha256 = null, resultLocator = null, errorCode = null) {
  return { error_code: errorCode, generation, result_locator: resultLocator, result_sha256: resultSha256, schema: "evidencelens.build-producer.v1", status };
}

export async function produceBuildGeneration(path, options = {}) {
  const expectedPath = options.expectedPath ?? FIXED_BUILD_HANDOFF;
  exactPath(path, expectedPath);
  const authenticatePlanning = options.authenticatePlanning ?? authenticateCommittedPlanning;
  await authenticatePlanning(path);
  const handoffRead = await secureJson(path);
  const descriptorLocator = handoffRead.parsed?.descriptor_locator;
  if (typeof descriptorLocator !== "string") fail("PRODUCER_DESCRIPTOR");
  const existing = await secureJson(descriptorLocator, true);
  if (existing.parsed.status !== "prepared") fail("PRODUCER_ALREADY_CLAIMED");
  const descriptor = await auditPreparedBuildHandoff(path, { expectedPath });
  const preparedSha256 = sha256Hex(existing.bytes);
  if (preparedSha256 !== handoffRead.parsed.descriptor_sha256) fail("PRODUCER_DESCRIPTOR");
  const archive = await secureBytes(descriptor.archive.locator);
  if (sha256Hex(archive) !== descriptor.archive.sha256) fail("PRODUCER_ARCHIVE");
  await claimGeneration(descriptorLocator, descriptor, preparedSha256);
  await atomicWrite(descriptorLocator, { ...descriptor, prepared_sha256: preparedSha256, status: "started" });
  try {
    const evidence = validateResult(await (options.buildOnce ?? defaultBuildOnce)(descriptor), descriptor.generation);
    const resultBytes = await atomicWrite(descriptor.result_locator, evidence, { exclusive: true });
    const resultSha256 = sha256Hex(resultBytes);
    await atomicWrite(descriptorLocator, { ...descriptor, prepared_sha256: preparedSha256, result_sha256: resultSha256, status: "completed" });
    return publicResult("completed", descriptor.generation, resultSha256, descriptor.result_locator, null);
  } catch {
    await atomicWrite(descriptorLocator, { ...descriptor, error_code: "BUILD_FAILED", prepared_sha256: preparedSha256, status: "failed" });
    return publicResult("failed", descriptor.generation, null, null, "BUILD_FAILED");
  }
}

async function main(argv) {
  if (argv.length !== 1 || argv[0] !== FIXED_BUILD_HANDOFF) fail("PRODUCER_ARGV");
  const result = await produceBuildGeneration(argv[0]);
  process.stdout.write(canonicalJson(result));
  if (result.status === "failed") {
    process.stderr.write(`docker-proof-producer: ${result.error_code}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    const code = error instanceof Error && /^PRODUCER_[A-Z_]+$/u.test(error.message) ? error.message : "PRODUCER_FAILED";
    process.stderr.write(`docker-proof-producer: ${code}\n`);
    process.exitCode = 1;
  });
}
