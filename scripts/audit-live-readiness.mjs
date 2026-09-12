#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FIXED_BUILD_HANDOFF = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-22-BUILD.json";
export const MAX_EVIDENCE_BYTES = 64 * 1024;
export const FIXTURE_PATHS = Object.freeze([
  "/proof-fixtures/assignment.txt",
  "/proof-fixtures/rubric.csv",
  "/proof-fixtures/rubric-screenshot.png",
  "/proof-fixtures/text-page.pdf",
]);

const lower64 = /^[0-9a-f]{64}$/u;
const commitId = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const forbiddenEvidenceKey = /(?:^|_)(?:evidence_commit|report_commit|self|cross|mutual)(?:_|$)|^(?:envelope|handoff)(?:_.*)?(?:hash|sha256)$/iu;
const utf8 = new TextDecoder("utf-8", { fatal: true });

function fail(code) { throw new Error(code); }
function ordinary(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactKeys(value, keys, code) {
  if (!ordinary(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function lowerHash(value, code) { if (typeof value !== "string" || !lower64.test(value)) fail(code); }
function reviewedCommit(value, code) { if (typeof value !== "string" || !commitId.test(value)) fail(code); }
function absoluteLocator(value, code) {
  if (typeof value !== "string" || value.length < 2 || value.length > 4096 || !value.startsWith("/") || value.includes("\0") || resolve(value) !== value) fail(code);
}

export function sha256Hex(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (Array.isArray(value)) return value.map(canonical);
  if (!ordinary(value)) fail("READINESS_SCHEMA");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

export function canonicalJson(value) { return `${JSON.stringify(canonical(value))}\n`; }

export function assertAcyclicEvidence(value) {
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!ordinary(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (forbiddenEvidenceKey.test(key)) fail("READINESS_CYCLIC_FIELD");
      visit(child);
    }
  };
  visit(value);
  return value;
}

async function secureReadJson(path, { ownerOnly, expectedSha256 } = {}) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 3 || stat.size > MAX_EVIDENCE_BYTES) fail("READINESS_FILE");
    if (stat.uid !== process.getuid?.()) fail("READINESS_OWNER");
    if (ownerOnly && (stat.mode & 0o777) !== 0o600) fail("READINESS_MODE");
    const bytes = await handle.readFile();
    if (expectedSha256 && sha256Hex(bytes) !== expectedSha256) fail("READINESS_DIGEST");
    let text;
    try { text = utf8.decode(bytes); } catch { fail("READINESS_UTF8"); }
    let parsed;
    try { parsed = JSON.parse(text); } catch { fail("READINESS_JSON"); }
    if (canonicalJson(parsed) !== text) fail("READINESS_NONCANONICAL");
    return { parsed, bytes, stat };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("READINESS_")) throw error;
    fail("READINESS_FILE");
  } finally { await handle?.close().catch(() => undefined); }
}

function validateArchive(archive) {
  exactKeys(archive, ["locator", "sha256"], "READINESS_ARCHIVE");
  absoluteLocator(archive.locator, "READINESS_ARCHIVE");
  lowerHash(archive.sha256, "READINESS_ARCHIVE");
}

function validateBuildArgv(argv) {
  if (!Array.isArray(argv) || argv.length !== 7 || argv[0] !== "docker" || argv[1] !== "build"
    || argv[2] !== "--iidfile" || argv[4] !== "-f" || argv[5] !== "Dockerfile.proof") fail("READINESS_BUILD_ARGV");
  for (const value of argv) if (typeof value !== "string" || value.length === 0 || value.length > 4096 || /[\0\r\n]/u.test(value)) fail("READINESS_BUILD_ARGV");
  absoluteLocator(argv[3], "READINESS_BUILD_ARGV");
  absoluteLocator(argv[6], "READINESS_BUILD_ARGV");
}

function validateHandoff(value) {
  exactKeys(value, ["archive", "descriptor_locator", "descriptor_mode", "descriptor_owner", "descriptor_sha256", "generation", "non_planning_tree", "reviewed_commit", "schema", "status"], "READINESS_HANDOFF_SCHEMA");
  if (value.schema !== "evidencelens.build-handoff.v1" || value.status !== "prepared") fail("READINESS_HANDOFF_STATE");
  validateArchive(value.archive);
  absoluteLocator(value.descriptor_locator, "READINESS_DESCRIPTOR");
  if (value.descriptor_mode !== "0600" || value.descriptor_owner !== process.getuid?.()) fail("READINESS_DESCRIPTOR_METADATA");
  lowerHash(value.descriptor_sha256, "READINESS_DESCRIPTOR");
  lowerHash(value.generation, "READINESS_GENERATION");
  lowerHash(value.non_planning_tree, "READINESS_TREE");
  reviewedCommit(value.reviewed_commit, "READINESS_COMMIT");
}

function validateDescriptor(value) {
  exactKeys(value, ["archive", "build_argv", "generation", "non_planning_tree", "result_locator", "reviewed_commit", "schema", "status"], "READINESS_DESCRIPTOR_SCHEMA");
  if (value.schema !== "evidencelens.build-generation.v1" || value.status !== "prepared") fail("READINESS_DESCRIPTOR_STATE");
  validateArchive(value.archive);
  validateBuildArgv(value.build_argv);
  absoluteLocator(value.result_locator, "READINESS_RESULT");
  lowerHash(value.generation, "READINESS_GENERATION");
  lowerHash(value.non_planning_tree, "READINESS_TREE");
  reviewedCommit(value.reviewed_commit, "READINESS_COMMIT");
}

export async function auditPreparedBuildHandoff(path, options = {}) {
  const expectedPath = options.expectedPath ?? resolve(FIXED_BUILD_HANDOFF);
  if (typeof path !== "string" || resolve(path) !== resolve(expectedPath) || path !== expectedPath) fail("READINESS_HANDOFF_PATH");
  const { parsed: handoff } = await secureReadJson(path);
  validateHandoff(handoff);
  const { parsed: descriptor } = await secureReadJson(handoff.descriptor_locator, { ownerOnly: true, expectedSha256: handoff.descriptor_sha256 });
  validateDescriptor(descriptor);
  if (descriptor.generation !== handoff.generation || descriptor.reviewed_commit !== handoff.reviewed_commit
    || descriptor.non_planning_tree !== handoff.non_planning_tree || canonicalJson(descriptor.archive) !== canonicalJson(handoff.archive)) fail("READINESS_IDENTITY");
  return descriptor;
}

export function validateSourceReview(value) {
  assertAcyclicEvidence(value);
  if (!ordinary(value) || value.schema !== "evidencelens.source-review.v1") fail("READINESS_SOURCE_SCHEMA");
  reviewedCommit(value.reviewed_commit, "READINESS_COMMIT");
  lowerHash(value.non_planning_tree, "READINESS_TREE");
  lowerHash(value.manifest_sha256, "READINESS_MANIFEST");
  if (!Array.isArray(value.fixture_sha256) || value.fixture_sha256.length !== 4) fail("READINESS_FIXTURES");
  value.fixture_sha256.forEach((entry) => lowerHash(entry, "READINESS_FIXTURES"));
  return value;
}

export function validateImageBound(value) {
  assertAcyclicEvidence(value);
  if (!ordinary(value) || value.schema !== "evidencelens.image-bound.v1") fail("READINESS_IMAGE_SCHEMA");
  validateSourceReview(value.source_review);
  lowerHash(value.image_config_sha256, "READINESS_IMAGE");
  lowerHash(value.image_content_sha256, "READINESS_IMAGE");
  lowerHash(value.daemon_identity_sha256, "READINESS_IMAGE");
  lowerHash(value.runtime_sha256, "READINESS_RUNTIME");
  if (!Array.isArray(value.fixture_sha256) || value.fixture_sha256.length !== 4) fail("READINESS_FIXTURES");
  value.fixture_sha256.forEach((entry) => lowerHash(entry, "READINESS_FIXTURES"));
  if (!ordinary(value.sentinels) || value.sentinels.review !== "normalized" || value.sentinels.proof !== "normalized") fail("READINESS_SENTINELS");
  return value;
}

function evidenceFromMarkdown(text) {
  const match = /```json evidencelens-evidence\n([^`]+)```/u.exec(text);
  if (!match) fail("READINESS_REPORT_EVIDENCE");
  let value; try { value = JSON.parse(match[1]); } catch { fail("READINESS_REPORT_EVIDENCE"); }
  return value;
}

async function auditImageBound(paths) {
  if (paths.length !== 2) fail("READINESS_ARGV");
  const records = [];
  for (const path of paths) {
    const handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW).catch(() => fail("READINESS_FILE"));
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_EVIDENCE_BYTES) fail("READINESS_FILE");
      records.push(validateImageBound(evidenceFromMarkdown(utf8.decode(await handle.readFile()))));
    } finally { await handle.close(); }
  }
  if (canonicalJson(records[0]) !== canonicalJson(records[1])) fail("READINESS_REPORT_MISMATCH");
}

async function main(argv) {
  const [mode, ...paths] = argv;
  if (mode === "prepared-build-handoff" && paths.length === 1 && paths[0] === FIXED_BUILD_HANDOFF) {
    await auditPreparedBuildHandoff(paths[0], { expectedPath: FIXED_BUILD_HANDOFF });
    return;
  }
  if (mode === "image-bound") return auditImageBound(paths);
  fail("READINESS_ARGV");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    const code = error instanceof Error && /^READINESS_[A-Z_]+$/u.test(error.message) ? error.message : "READINESS_FAILED";
    process.stderr.write(`audit-live-readiness: ${code}\n`);
    process.exitCode = 1;
  });
}
