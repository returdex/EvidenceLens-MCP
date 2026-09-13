#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { open } from "node:fs/promises";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createNonPlanningManifest } from "./live-review-source-set.mjs";
import { canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";

const hash = /^[0-9a-f]{64}$/u;
const commit = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const schemas = new Map([
  ["evidencelens.source.v2", new Set(["ready"])],
  ["evidencelens.deep-review.v2", new Set(["ready"])],
  ["evidencelens.asvs-review.v2", new Set(["ready"])],
  ["evidencelens.build.v2", new Set(["ready", "preflight_failed", "build_failed", "verification_failed"])],
  ["evidencelens.diagnostic.v2", new Set(["passed", "diagnostic_failed", "preflight_failed", "request_failed", "timeout", "protocol_failed", "disclosure", "malformed", "abnormal_close", "blocked_by_build"])],
  ["evidencelens.repair.v2", new Set(["not_required", "ready", "blocked"])],
]);
const keys = ["certifier_sha256", "manifest_sha256", "non_planning_tree", "reviewed_commit", "schema", "status"];
const proofKeys = [...keys, "clean_exit", "finding_count", "fixture_count", "outcome"];
const nonPassOutcomes = new Set(["diagnostic_failed", "preflight_failed", "review_failed", "build_failed", "request_failed", "timeout", "protocol_failed", "disclosure", "malformed", "abnormal_close"]);
const execFileAsync = promisify(execFile);
const repairNames = ["10-30-REPAIR.json", "10-31-REPAIR.json", "10-32-REPAIR.json", "10-33-REPAIR.json"];
const phase = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e";
const mode = (paths, schemas, committed = false) => Object.freeze({
  paths: Object.freeze(paths.map((name) => `${phase}/${name}`)),
  schemas: Object.freeze(schemas),
  committed,
});

export const PROOF_CHAIN_MODES = Object.freeze({
  "source-review": mode(["10-49-SOURCE.json", "10-49-REVIEW.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2"]),
  reviews: mode(["10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  build: mode(["10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  diagnostic: mode(["10-29-DIAGNOSTIC.json", "10-28-DIAGNOSTIC-BUILD.json"], ["evidencelens.diagnostic.v2", "evidencelens.build.v2"]),
  repair: mode(["10-30-REPAIR.json", "10-29-DIAGNOSTIC.json"], ["evidencelens.repair.v2", "evidencelens.diagnostic.v2"]),
  "repair-set": mode(["10-29-DIAGNOSTIC.json", ...repairNames], ["evidencelens.diagnostic.v2", ...repairNames.map(() => "evidencelens.repair.v2")], true),
  execution: mode(["10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.diagnostic.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  proof: mode(["10-51-PROOF.json", "10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.live-proof.v2", "evidencelens.diagnostic.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  "sync-authority": mode(["10-51-PROOF.json", "10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.live-proof.v2", "evidencelens.diagnostic.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"], true),
});

function fail(code) { throw new Error(code); }
function plain(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, expected) {
  return plain(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function validateCertifiers(value) {
  if (!exactKeys(value, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"]) ||
      !hash.test(value.audit_live_evidence_sha256) || !hash.test(value.audit_proof_chain_sha256)) fail("PROOF_CHAIN_SCHEMA");
}

export function sourceIdentity(value) {
  return {
    certifier_sha256: value.certifier_sha256,
    manifest_sha256: value.manifest_sha256,
    non_planning_tree: value.non_planning_tree,
    reviewed_commit: value.reviewed_commit,
  };
}

export function auditChainRecord(value) {
  if (plain(value) && value.schema === "evidencelens.live-proof.v2") return auditLiveProof(value);
  if (!exactKeys(value, keys) || !schemas.has(value.schema)) fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)) fail("PROOF_CHAIN_SCHEMA");
  if (!schemas.get(value.schema).has(value.status)) fail("PROOF_CHAIN_STATE");
  return sourceIdentity(value);
}

export function auditLiveProof(value) {
  if (!exactKeys(value, proofKeys) || value.schema !== "evidencelens.live-proof.v2") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)) fail("PROOF_CHAIN_SCHEMA");
  const passed = value.outcome === "passed";
  if (!passed && !nonPassOutcomes.has(value.outcome)) fail("PROOF_CHAIN_STATE");
  if (passed
    ? value.status !== "passed" || value.clean_exit !== true || value.fixture_count !== 4 || !Number.isSafeInteger(value.finding_count) || value.finding_count < 1
    : value.status !== "gaps_found" || value.clean_exit !== false || value.fixture_count !== 0 || value.finding_count !== 0) fail("PROOF_CHAIN_STATE");
  return sourceIdentity(value);
}

export function auditSourceAndReports(source, deepReview, asvsReview) {
  const records = [source, deepReview, asvsReview];
  const expectedSchemas = ["evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"];
  records.forEach((record, index) => {
    auditChainRecord(record);
    if (record.schema !== expectedSchemas[index]) fail("PROOF_CHAIN_SCHEMA");
  });
  const identity = JSON.stringify(sourceIdentity(source));
  if (records.slice(1).some((record) => JSON.stringify(sourceIdentity(record)) !== identity)) fail("PROOF_CHAIN_IDENTITY");
  return sourceIdentity(source);
}

export function auditRepairSet(diagnostic, repairs) {
  auditChainRecord(diagnostic);
  if (diagnostic.schema !== "evidencelens.diagnostic.v2" || repairs.length !== repairNames.length) fail("PROOF_CHAIN_REPAIR_SET");
  const expectedIdentity = JSON.stringify(sourceIdentity(diagnostic));
  let corrections = 0;
  for (const repair of repairs) {
    auditChainRecord(repair);
    if (repair.schema !== "evidencelens.repair.v2") fail("PROOF_CHAIN_REPAIR_SET");
    if (JSON.stringify(sourceIdentity(repair)) !== expectedIdentity) fail("PROOF_CHAIN_IDENTITY");
    if (repair.status === "ready") corrections += 1;
    else if (repair.status !== "not_required") fail("PROOF_CHAIN_REPAIR_SET");
  }
  const noRepairRoute = diagnostic.status === "passed" || diagnostic.status === "blocked_by_build";
  if ((noRepairRoute && corrections !== 0) || (!noRepairRoute && corrections !== 1)) fail("PROOF_CHAIN_REPAIR_SET");
  return { production_correction: corrections === 1, source_identity: sourceIdentity(diagnostic) };
}

export function auditModeRecords(modeName, records) {
  const specification = PROOF_CHAIN_MODES[modeName];
  if (!specification || !Array.isArray(records) || records.length !== specification.schemas.length) fail("PROOF_CHAIN_ARGV");
  records.forEach((record, index) => {
    auditChainRecord(record);
    if (record.schema !== specification.schemas[index]) fail("PROOF_CHAIN_SCHEMA");
  });
  const identity = JSON.stringify(sourceIdentity(records[0]));
  if (records.slice(1).some((record) => JSON.stringify(sourceIdentity(record)) !== identity)) fail("PROOF_CHAIN_IDENTITY");
  if (modeName === "repair-set") auditRepairSet(records[0], records.slice(1));
  return sourceIdentity(records[0]);
}

export async function auditGitIdentity(record, repoDir = process.cwd()) {
  auditChainRecord(record);
  const manifest = await createNonPlanningManifest({ repoDir, reviewedCommit: record.reviewed_commit });
  const manifestSha256 = sha256Hex(Buffer.from(canonicalJson(manifest.entries)));
  const byPath = new Map(manifest.entries.map((entry) => [entry.path, entry.sha256]));
  if (manifest.nonPlanningTree !== record.non_planning_tree || manifestSha256 !== record.manifest_sha256
    || byPath.get("scripts/audit-proof-chain.mjs") !== record.certifier_sha256.audit_proof_chain_sha256
    || byPath.get("scripts/audit-live-evidence.mjs") !== record.certifier_sha256.audit_live_evidence_sha256) fail("PROOF_CHAIN_IDENTITY");
  return sourceIdentity(record);
}

function evidence(text) {
  const match = /```json evidencelens-evidence\n([^`]+)```/u.exec(text);
  if (!match) fail("PROOF_CHAIN_SCHEMA");
  try { return JSON.parse(match[1]); } catch { fail("PROOF_CHAIN_SCHEMA"); }
}
async function load(path) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size < 3n || before.size > 1024n * 1024n || before.nlink !== 1n) fail("PROOF_CHAIN_FILE");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) fail("PROOF_CHAIN_FILE");
    const reopened = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    let second;
    try { second = await reopened.readFile(); } finally { await reopened.close(); }
    if (sha256Hex(bytes) !== sha256Hex(second)) fail("PROOF_CHAIN_FILE");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    try { return JSON.parse(text); } catch { return evidence(text); }
  } catch (error) {
    if (error instanceof Error && /^PROOF_CHAIN_/u.test(error.message)) throw error;
    fail("PROOF_CHAIN_FILE");
  } finally { await handle?.close().catch(() => undefined); }
}
async function assertCommittedInputs(paths, repoDir = process.cwd()) {
  for (const path of paths) {
    let committed;
    try { committed = (await execFileAsync("git", ["show", `HEAD:${path}`], { cwd: repoDir, encoding: null, maxBuffer: 1024 * 1024 })).stdout; }
    catch { fail("PROOF_CHAIN_REPAIR_SET"); }
    const working = await readFile(path);
    if (!working.equals(committed)) fail("PROOF_CHAIN_REPAIR_SET");
  }
}
async function main(argv) {
  const [mode, ...paths] = argv;
  const specification = PROOF_CHAIN_MODES[mode];
  if (!specification || paths.length !== specification.paths.length || new Set(paths).size !== paths.length
    || paths.some((path, index) => path !== specification.paths[index])) fail("PROOF_CHAIN_ARGV");
  if (specification.committed) await assertCommittedInputs(paths);
  const records = await Promise.all(paths.map(load));
  auditModeRecords(mode, records);
  await Promise.all(records.map((record) => auditGitIdentity(record)));
  if (mode === "repair-set") {
    const result = auditRepairSet(records[0], records.slice(1));
    process.stdout.write(`${canonicalJson({ production_correction: result.production_correction, status: "ready" })}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then(() => process.stdout.write("proof chain audit passed\n")).catch((error) => {
    process.stderr.write(`${error instanceof Error && /^PROOF_CHAIN_/u.test(error.message) ? error.message : "PROOF_CHAIN_FAILED"}\n`);
    process.exitCode = 1;
  });
}
