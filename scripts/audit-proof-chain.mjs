#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  ["evidencelens.live-proof.v2", new Set(["passed", "gaps_found"])],
]);
const keys = ["certifier_sha256", "manifest_sha256", "non_planning_tree", "reviewed_commit", "schema", "status"];

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
  if (!exactKeys(value, keys) || !schemas.has(value.schema)) fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)) fail("PROOF_CHAIN_SCHEMA");
  if (!schemas.get(value.schema).has(value.status)) fail("PROOF_CHAIN_STATE");
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
  const text = await readFile(path, "utf8");
  try { return JSON.parse(text); } catch { return evidence(text); }
}
async function main(argv) {
  const [mode, ...paths] = argv;
  if (mode === "source-review" && paths.length === 2) {
    const [source, review] = await Promise.all(paths.map(load));
    await Promise.all([auditGitIdentity(source), auditGitIdentity(review)]);
    if (source.schema !== "evidencelens.source.v2" || review.schema !== "evidencelens.deep-review.v2" || JSON.stringify(sourceIdentity(source)) !== JSON.stringify(sourceIdentity(review))) fail("PROOF_CHAIN_IDENTITY");
    return;
  }
  if (mode === "reviews" && paths.length === 3) {
    const [source, deep, asvs] = await Promise.all(paths.map(load)); auditSourceAndReports(source, deep, asvs); await Promise.all([source, deep, asvs].map((record) => auditGitIdentity(record))); return;
  }
  if (["build", "diagnostic", "repair", "proof"].includes(mode) && paths.length >= 1) {
    const records = await Promise.all(paths.map(load)); records.forEach(auditChainRecord);
    const identity = JSON.stringify(sourceIdentity(records[0]));
    if (records.slice(1).some((record) => JSON.stringify(sourceIdentity(record)) !== identity)) fail("PROOF_CHAIN_IDENTITY");
    return;
  }
  fail("PROOF_CHAIN_ARGV");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then(() => process.stdout.write("proof chain audit passed\n")).catch((error) => {
    process.stderr.write(`${error instanceof Error && /^PROOF_CHAIN_/u.test(error.message) ? error.message : "PROOF_CHAIN_FAILED"}\n`);
    process.exitCode = 1;
  });
}
