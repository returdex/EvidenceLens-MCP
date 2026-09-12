#!/usr/bin/env node
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { FIXED_BUILD_HANDOFF, MAX_EVIDENCE_BYTES, canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";
import { authenticateCommittedPlanning } from "./docker-proof-produce.mjs";

const execFileAsync = promisify(execFile);
const lower64 = /^[0-9a-f]{64}$/u;
const imageIdPattern = /^sha256:[0-9a-f]{64}$/u;

function fail(code) { throw new Error(code); }
function exactPath(path, expected) { if (typeof path !== "string" || path !== expected || resolve(path) !== resolve(expected)) fail("VERIFIER_ARGV"); }

async function secureJson(path, ownerOnly = false) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.uid !== process.getuid?.() || stat.size < 3 || stat.size > MAX_EVIDENCE_BYTES || (ownerOnly && (stat.mode & 0o777) !== 0o600)) fail("VERIFIER_FILE");
    const bytes = await handle.readFile();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = JSON.parse(text);
    if (canonicalJson(parsed) !== text) fail("VERIFIER_FILE");
    return { parsed, bytes };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("VERIFIER_")) throw error;
    fail("VERIFIER_FILE");
  } finally { await handle?.close().catch(() => undefined); }
}

function validateResult(value, generation) {
  const keys = ["daemon_identity_sha256", "fixture_sha256", "generation", "image_config_sha256", "image_content_sha256", "image_id", "runtime_sha256", "schema", "sentinels"];
  if (value === null || typeof value !== "object" || Array.isArray(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys.sort())
    || value.schema !== "evidencelens.build-result.v1" || value.generation !== generation || !imageIdPattern.test(value.image_id)) fail("VERIFIER_RESULT");
  for (const key of ["daemon_identity_sha256", "image_config_sha256", "image_content_sha256", "runtime_sha256"]) if (!lower64.test(value[key])) fail("VERIFIER_RESULT");
  if (!Array.isArray(value.fixture_sha256) || value.fixture_sha256.length !== 4 || value.fixture_sha256.some((entry) => !lower64.test(entry))) fail("VERIFIER_RESULT");
  if (JSON.stringify(value.sentinels) !== JSON.stringify({ proof: "normalized", review: "normalized" })) fail("VERIFIER_RESULT");
  return value;
}

async function defaultInspectImage(expected) {
  const { stdout } = await execFileAsync("docker", ["image", "inspect", expected.image_id], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  const value = JSON.parse(stdout);
  if (!Array.isArray(value) || value.length !== 1 || value[0].Id !== expected.image_id) fail("VERIFIER_IMAGE");
  return expected;
}

export async function verifyExistingBuild(path, options = {}) {
  const expectedPath = options.expectedPath ?? FIXED_BUILD_HANDOFF;
  exactPath(path, expectedPath);
  await (options.authenticatePlanning ?? authenticateCommittedPlanning)(path);
  const handoff = (await secureJson(path)).parsed;
  const descriptor = (await secureJson(handoff.descriptor_locator, true)).parsed;
  if (descriptor.schema !== "evidencelens.build-generation.v1" || descriptor.status !== "completed"
    || descriptor.generation !== handoff.generation || descriptor.prepared_sha256 !== handoff.descriptor_sha256 || !lower64.test(descriptor.result_sha256)) fail("VERIFIER_STATE");
  const claim = (await secureJson(`${handoff.descriptor_locator}.claim`, true)).parsed;
  if (JSON.stringify(claim) !== JSON.stringify({ generation: handoff.generation, prepared_sha256: handoff.descriptor_sha256, schema: "evidencelens.build-claim.v1" })) fail("VERIFIER_STATE");
  const resultRead = await secureJson(descriptor.result_locator, true);
  if (sha256Hex(resultRead.bytes) !== descriptor.result_sha256) fail("VERIFIER_RESULT_DIGEST");
  const result = validateResult(resultRead.parsed, descriptor.generation);
  const inspected = await (options.inspectImage ?? defaultInspectImage)(result);
  if (canonicalJson(inspected) !== canonicalJson(result)) fail("VERIFIER_IMAGE");
  return result;
}

async function main(argv) {
  if (argv.length !== 1 || argv[0] !== FIXED_BUILD_HANDOFF) fail("VERIFIER_ARGV");
  process.stdout.write(canonicalJson(await verifyExistingBuild(argv[0])));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    const code = error instanceof Error && /^VERIFIER_[A-Z_]+$/u.test(error.message) ? error.message : "VERIFIER_FAILED";
    process.stderr.write(`docker-proof-verifier: ${code}\n`);
    process.exitCode = 1;
  });
}
