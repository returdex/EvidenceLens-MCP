#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { open, readFile, rename, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
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
  ["evidencelens.execution.v2", new Set(["passed", "gaps_found"])],
  ["evidencelens.repair.v2", new Set(["not_required", "ready", "blocked"])],
]);
const keys = ["certifier_sha256", "manifest_sha256", "non_planning_tree", "reviewed_commit", "schema", "status"];
const proofKeys = [...keys, "build_sha256", "clean_exit", "execution_sha256", "finding_count", "fixture_count", "outcome", "review_sha256", "security_sha256", "source_sha256"];
const nonPassOutcomes = new Set(["diagnostic_failed", "preflight_failed", "review_failed", "build_failed", "request_failed", "timeout", "protocol_failed", "disclosure", "malformed", "abnormal_close"]);
const execFileAsync = promisify(execFile);
const repairNames = ["10-30-REPAIR.json", "10-31-REPAIR.json", "10-32-REPAIR.json", "10-33-REPAIR.json"];
const phase = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e";
const consumedStateCommit = "1b62227f8c38b12a8c287f670d9300241a11686b";
const consumedStatePath = `${phase}/.10-51-live-state.json`;
const unavailable = "unavailable_from_committed_state";
const mode = (paths, schemas, committed = false) => Object.freeze({
  paths: Object.freeze(paths.map((name) => `${phase}/${name}`)),
  schemas: Object.freeze(schemas),
  committed,
});

const legacyConsumedLivePath = `${phase}/10-62-CONSUMED-LIVE.json`;
const consumedLivePath = `${phase}/10-67-CONSUMED-LIVE.json`;
const localValidationPath = `${phase}/10-65-LOCAL-VALIDATION.json`;
const forensicPath = consumedLivePath;
const transitionPath = `${phase}/10-65-TRANSITION.json`;
const executionPath = `${phase}/10-65-EXECUTION.json`;
const proofPath = `${phase}/10-65-PROOF.json`;
const sourcePath = `${phase}/10-63-SOURCE.json`;
const reviewPath = `${phase}/10-63-REVIEW.md`;
const securityPath = `${phase}/10-63-SECURITY.md`;
const buildPath = `${phase}/10-64-FINAL-BUILD.json`;
const legacyConsumedLiveCommit = "585fd01622ec7964cd72d0180847383f61757901";
const legacyConsumedLiveGeneration = "4de25b800d261e98344860f45de900ba852679671cac0aaefeef9d27dc488f65";
const legacyConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-59-live-state.json`, sha256: "e643c3cd6a952f92984aff2f8fc5d787cfed5d5e30dc689836bf7144e079008b" }),
  terminal: Object.freeze({ path: `${phase}/.10-59-terminal-snapshot.json`, sha256: "7114aeaa6705af340a02be6dca4a109a3ac63b9b7276d2eee2c17c269309f1c7" }),
  claim: Object.freeze({ path: `${phase}/.10-59-terminal-snapshot.json.claim`, sha256: "594d227593503d45a762861bae087220b925ba4e942b6662792bd660a4ac0b9a" }),
  transition: Object.freeze({ path: `${phase}/10-59-TRANSITION.json`, sha256: "0863f2868cbce68d4e322533f5fbab4e7c1b4a06f4da1bfbd5b0164e03d26545" }),
  execution: Object.freeze({ path: `${phase}/10-59-EXECUTION.json`, sha256: "eaa3e09b77489caedeb6864ed3f67843d1e7d3d5e05bcce7f647173f943f364c" }),
  proof: Object.freeze({ path: `${phase}/10-59-PROOF.json`, sha256: "48285129a2b75e5ae0ca03c1252b31295884a84cc9bd6f075a8672c7c6341711" }),
  local_validation: Object.freeze({ path: `${phase}/10-59-LOCAL-VALIDATION.json`, sha256: "4dc6ea01b98ff61d1573cebd54192dfa026b433915f4c0830734a779fc0a3926" }),
});
const consumedLiveCommit = "b7573aa06ff131855e78809847563f8ba6cfe624";
const consumedLiveGeneration = "0f9f862325bd28b0a21da955621e7cd0b064b88ee1d9ba931580c18c4ec7ccf6";
const consumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-65-live-state.json`, sha256: "101ad2c1e4fa6a416247f5a8c94cc6cf1e8072595692406723fb26f16fd14b11" }),
  terminal: Object.freeze({ path: `${phase}/.10-65-terminal-snapshot.json`, sha256: "135cbaa1d8414cca848653ea014c65ae6ad97a3cda3ddb5267595649e4891952" }),
  claim: Object.freeze({ path: `${phase}/.10-65-terminal-snapshot.json.claim`, sha256: "55b430235ac58ceb8d3b7f2de005ac4e0257eba858aaea1e218e5fbe1282cd16" }),
  transition: Object.freeze({ path: `${phase}/10-65-TRANSITION.json`, sha256: "8cfbcef191c12e7b20c47c4f2793d0c272ca29a6f5786aa7069d7876586d5063" }),
  execution: Object.freeze({ path: `${phase}/10-65-EXECUTION.json`, sha256: "0c81182fc62bdadb594de7f2b6ad9c47a9a132808e0f4628d71659edd0de65ea" }),
  proof: Object.freeze({ path: `${phase}/10-65-PROOF.json`, sha256: "3a36b63d9a3cd93e1462d8a531061b84be9ccef18f56b2a10de05168a146a163" }),
  local_validation: Object.freeze({ path: `${phase}/10-65-LOCAL-VALIDATION.json`, sha256: "36e9000c5fbcd9535b68730ee65b19d7ab2e1ed0c795c717ff78fe54de9632e1" }),
});
const consumedLiveArtifactKeys = ["commit", "mode", "path", "sha256"];
const consumedLiveArchiveKeys = ["artifacts", "authority", "certifier_sha256", "generation", "manifest_sha256", "mcp_tools_call_count", "non_planning_tree", "observed_provider_requests", "outcome", "replay_allowed", "reservation_count", "reviewed_commit", "schema", "status"];
const currentConsumedLiveArchiveKeys = [...consumedLiveArchiveKeys, "cause"];

export function auditConsumedLiveArchive(value) {
  const legacy = value?.generation === legacyConsumedLiveGeneration;
  const expectedGeneration = legacy ? legacyConsumedLiveGeneration : consumedLiveGeneration;
  const expectedCommit = legacy ? legacyConsumedLiveCommit : consumedLiveCommit;
  const expectedFiles = legacy ? legacyConsumedLiveFiles : consumedLiveFiles;
  const expectedKeys = legacy ? consumedLiveArchiveKeys : currentConsumedLiveArchiveKeys;
  const expectedMetadata = legacy ? {
    auditProof: "6e22b85bc9abbeb2ca8a04f28b99306367ddd69e6e85c4d82e065838326d8619",
    manifest: "10151b767b922cad23f0cd642767fa0796471ba71bff8dd82c38aaf87d560516",
    nonPlanningTree: "309c1f26d5707ed8e1ba9c10e22ca6eb97defb7435c4f2dcec5fdc47cbcba3b4",
    outcome: "automatic_terminal_missing",
    reviewedCommit: "26ba4806d9ef25717b0d1c180bd62aa4216cb634",
  } : {
    auditProof: "d671950bd0c248e0538bdcc38cd492cdca00c0da25228e11ccb7d21cb67af6cd",
    manifest: "6d3a5ce527a41a66de67aa98a683b500b67272fd8939ffe0f2a4b02a5e475a5e",
    nonPlanningTree: "b4fc225005464daebfa4fe0b1bbce580e4badde30ad0b404ebffd76d434a3c49",
    outcome: "request_failed",
    reviewedCommit: "4dcd025c47f35b29aeffbf8e8eeb4b7abfc839b2",
  };
  if (!exactKeys(value, expectedKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
    || value.generation !== expectedGeneration || value.authority !== false || value.replay_allowed !== false
    || (!legacy && value.cause !== "automatic_terminal_missing_before_tools")
    || value.reviewed_commit !== expectedMetadata.reviewedCommit
    || value.manifest_sha256 !== expectedMetadata.manifest
    || value.non_planning_tree !== expectedMetadata.nonPlanningTree
    || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
    || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
    || value.certifier_sha256.audit_proof_chain_sha256 !== expectedMetadata.auditProof
    || value.reservation_count !== 1 || value.mcp_tools_call_count !== 0 || value.observed_provider_requests !== 0
    || value.outcome !== expectedMetadata.outcome || value.status !== "gaps_found"
    || !exactKeys(value.artifacts, Object.keys(expectedFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
  for (const [name, expected] of Object.entries(expectedFiles)) {
    const artifact = value.artifacts[name];
    if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== expectedCommit
      || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
  }
  return Object.freeze({ authority: false, status: "gaps_found" });
}

async function syncDirectory(path) {
  const handle = await open(path, fsConstants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function createConsumedLiveArchive(path = consumedLivePath) {
  if (path !== consumedLivePath) fail("PROOF_CHAIN_ARGV");
  const artifacts = {};
  for (const [name, expected] of Object.entries(consumedLiveFiles)) {
    let committed;
    try { committed = (await execFileAsync("git", ["show", `${consumedLiveCommit}:${expected.path}`], { encoding: null, maxBuffer: 1024 * 1024 })).stdout; }
    catch { fail("PROOF_CHAIN_CONSUMED_LIVE"); }
    let handle;
    try {
      handle = await open(expected.path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      const stat = await handle.stat(); const bytes = await handle.readFile();
      if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o600 || !bytes.equals(committed)
        || sha256Hex(bytes) !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
      const reopened = await open(expected.path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      try { if (sha256Hex(await reopened.readFile()) !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE"); } finally { await reopened.close(); }
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); const parsed = JSON.parse(text);
      if (canonicalJson(parsed) !== text) fail("PROOF_CHAIN_CONSUMED_LIVE");
      artifacts[name] = { commit: consumedLiveCommit, mode: "0600", path: expected.path, sha256: expected.sha256 };
    } catch (error) {
      if (error instanceof Error && error.message === "PROOF_CHAIN_CONSUMED_LIVE") throw error;
      fail("PROOF_CHAIN_CONSUMED_LIVE");
    } finally { await handle?.close().catch(() => undefined); }
  }
  const value = { artifacts, authority: false, cause: "automatic_terminal_missing_before_tools", certifier_sha256: {
    audit_live_evidence_sha256: "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500",
    audit_proof_chain_sha256: "d671950bd0c248e0538bdcc38cd492cdca00c0da25228e11ccb7d21cb67af6cd",
  }, generation: consumedLiveGeneration, manifest_sha256: "6d3a5ce527a41a66de67aa98a683b500b67272fd8939ffe0f2a4b02a5e475a5e",
    mcp_tools_call_count: 0, non_planning_tree: "b4fc225005464daebfa4fe0b1bbce580e4badde30ad0b404ebffd76d434a3c49",
    observed_provider_requests: 0, outcome: "request_failed", replay_allowed: false, reservation_count: 1,
    reviewed_commit: "4dcd025c47f35b29aeffbf8e8eeb4b7abfc839b2", schema: "evidencelens.consumed-live-archive.v1", status: "gaps_found" };
  auditConsumedLiveArchive(value);
  const bytes = Buffer.from(canonicalJson(value)); const temporary = `${path}.tmp-${process.pid}-${randomBytes(12).toString("hex")}`;
  let temp; let reservation;
  try {
    temp = await open(temporary, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await temp.writeFile(bytes); await temp.sync(); await temp.close(); temp = undefined;
    reservation = await open(path, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await reservation.close(); reservation = undefined;
    await rename(temporary, path); await syncDirectory(dirname(path));
    const reopened = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try { const stat = await reopened.stat(); const persisted = await reopened.readFile(); if ((stat.mode & 0o777) !== 0o600 || sha256Hex(persisted) !== sha256Hex(bytes)) fail("PROOF_CHAIN_CONSUMED_LIVE"); }
    finally { await reopened.close(); }
    return value;
  } catch (error) {
    await temp?.close().catch(() => undefined); await reservation?.close().catch(() => undefined); await unlink(temporary).catch(() => undefined);
    if (error?.code === "EEXIST") fail("PROOF_CHAIN_REPLAY");
    if (error instanceof Error && /^PROOF_CHAIN_/u.test(error.message)) throw error;
    fail("PROOF_CHAIN_CONSUMED_LIVE");
  }
}

/** These ordered registries are production constants, not caller input. */
export const BRANCH_AUTHORITY_REGISTRIES = Object.freeze({
  preflight: Object.freeze({
    branch: "preflight_started",
    schema: "evidencelens.preflight-sync-authority.v1",
    paths: Object.freeze([forensicPath, transitionPath, executionPath, proofPath, localValidationPath]),
  }),
  live: Object.freeze({
    branch: "preflight_authenticated",
    schema: "evidencelens.live-sync-authority.v1",
    paths: Object.freeze([forensicPath, sourcePath, reviewPath, securityPath, buildPath, transitionPath, executionPath, proofPath, localValidationPath]),
  }),
});

export const FINAL_AUDIT_REGISTRIES = Object.freeze({
  preflight: Object.freeze([...BRANCH_AUTHORITY_REGISTRIES.preflight.paths, `${phase}/10-66-SYNC-CLAIM.json`, `${phase}/10-66-SYNC-JOURNAL.json`]),
  live: Object.freeze([...BRANCH_AUTHORITY_REGISTRIES.live.paths, `${phase}/10-66-SYNC-CLAIM.json`, `${phase}/10-66-SYNC-JOURNAL.json`]),
});

const ownerCapabilities = new WeakSet();
/** The returned object has identity only; it contains no serializable authority. */
export function createTerminalOwnerCapability() {
  const capability = Object.freeze(Object.create(null));
  ownerCapabilities.add(capability);
  return capability;
}
export function closeTerminalOwnerCapability(capability) { ownerCapabilities.delete(capability); }
function requireOwner(capability) { if (!ownerCapabilities.has(capability)) fail("PROOF_CHAIN_LOCAL_OWNER"); }

const validationReceiptKeys = ["artifact_sha256", "auditors", "branch", "capability_identity", "generation", "outcome", "schema", "validation"];
export function validateTerminalOwnerReceipt(value) {
  if (!exactKeys(value, validationReceiptKeys) || value.schema !== "evidencelens.terminal-owner-validation.v1"
    || !hash.test(value.generation) || !["preflight_started", "preflight_authenticated"].includes(value.branch)
    || typeof value.capability_identity !== "string" || !hash.test(value.capability_identity)
    || !exactKeys(value.artifact_sha256, ["execution", "proof", "transition"])
    || Object.values(value.artifact_sha256).some((entry) => !hash.test(entry))
    || !exactKeys(value.auditors, ["execution", "proof"]) || value.auditors.execution !== "execution-auto" || value.auditors.proof !== "proof-auto"
    || !exactKeys(value.validation, ["execution", "proof"])
    || !["passed", "failed"].includes(value.validation.execution) || !["passed", "failed"].includes(value.validation.proof)
    || typeof value.outcome !== "string" || value.outcome.length === 0) fail("PROOF_CHAIN_LOCAL_VALIDATION");
  return Object.freeze(value);
}

export function auditExecutionAuto(capability, transition, execution) {
  requireOwner(capability);
  const branch = authenticatedBranch(transition);
  auditExecution(execution);
  assertBranchExecution(branch, execution);
  return Object.freeze({ branch, status: execution.status });
}
export function auditProofAuto(capability, transition, execution, proof) {
  requireOwner(capability);
  const branch = authenticatedBranch(transition);
  auditExecution(execution);
  if (branch === "preflight_started") auditPreflightProof(proof); else auditLiveProof(proof);
  assertBranchExecution(branch, execution);
  if (proof.execution_sha256 !== sha256Hex(Buffer.from(canonicalJson(execution))) || proof.outcome !== execution.outcome || proof.status !== execution.status) fail("PROOF_CHAIN_IDENTITY");
  return Object.freeze({ branch, status: proof.status });
}

function auditPreflightProof(value) {
  if (!exactKeys(value, proofKeys) || value.schema !== "evidencelens.live-proof.v3") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)
    || value.execution_sha256 === unavailable || !hash.test(value.execution_sha256)
    || [value.build_sha256, value.review_sha256, value.security_sha256, value.source_sha256].some((entry) => entry !== unavailable)
    || value.status !== "gaps_found" || value.outcome !== "preflight_failed" || value.clean_exit !== false
    || value.fixture_count !== 0 || value.finding_count !== 0) fail("PROOF_CHAIN_PREFLIGHT_PROOF");
  return sourceIdentity(value);
}

function authenticatedBranch(transition) {
  if (!plain(transition) || transition.schema !== "evidencelens.live-transition.v1"
    || !["preflight_started", "preflight_authenticated"].includes(transition.branch)
    || !hash.test(transition.generation)) fail("PROOF_CHAIN_TRANSITION");
  return transition.branch;
}
function assertBranchExecution(branch, execution) {
  if (branch === "preflight_started") {
    if (execution.status !== "gaps_found" || execution.outcome === "passed" || execution.mcp_tools_call_count !== 0
      || execution.reservation_count !== 0 || execution.request_receipt !== null) fail("PROOF_CHAIN_BRANCH");
  } else if (execution.reservation_count !== 1) fail("PROOF_CHAIN_BRANCH");
}

export const PROOF_CHAIN_MODES = Object.freeze({
  "consumed-live-archive": mode(["10-67-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-59": mode(["10-62-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "forensic-consumed-generation": mode(["10-53-FORENSIC.json"], ["evidencelens.consumed-generation-forensic.v1"]),
  "source-review": mode(["10-49-SOURCE.json", "10-49-REVIEW.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2"]),
  "source-review-auto": mode(["10-63-SOURCE.json", "10-63-REVIEW.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2"]),
  reviews: mode(["10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  "reviews-auto": mode(["10-63-SOURCE.json", "10-63-REVIEW.md", "10-63-SECURITY.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  build: mode(["10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  "build-auto": mode(["10-64-FINAL-BUILD.json", "10-63-SOURCE.json", "10-63-REVIEW.md", "10-63-SECURITY.md"], ["evidencelens.build-auto.branch", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  diagnostic: mode(["10-29-DIAGNOSTIC.json", "10-28-DIAGNOSTIC-BUILD.json"], ["evidencelens.diagnostic.v2", "evidencelens.build.v2"]),
  repair: mode(["10-30-REPAIR.json", "10-29-DIAGNOSTIC.json"], ["evidencelens.repair.v2", "evidencelens.diagnostic.v2"]),
  "repair-set": mode(["10-29-DIAGNOSTIC.json", ...repairNames], ["evidencelens.diagnostic.v2", ...repairNames.map(() => "evidencelens.repair.v2")], true),
  execution: mode(["10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.execution.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  proof: mode(["10-51-PROOF.json", "10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.live-proof.v3", "evidencelens.execution.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  "sync-authority": mode(["10-51-PROOF.json", "10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.live-proof.v3", "evidencelens.execution.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"], true),
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
  if (plain(value) && value.schema === "evidencelens.consumed-live-archive.v1") return auditConsumedLiveArchive(value);
  if (plain(value) && value.schema === "evidencelens.consumed-generation-forensic.v1") return auditConsumedGenerationForensic(value);
  if (plain(value) && value.schema === "evidencelens.live-proof.v3") return auditLiveProof(value);
  if (plain(value) && value.schema === "evidencelens.execution.v2") return auditExecution(value);
  if (plain(value) && (value.schema === "evidencelens.build-terminal.v1" || value.schema === "evidencelens.build.v2" && exactKeys(value, buildKeys))) {
    auditBuildAuto(value);
    return sourceIdentity(value);
  }
  if (plain(value) && value.schema === "evidencelens.build.v2" && exactKeys(value, buildKeys)) {
    auditBuild(value);
    return sourceIdentity(value);
  }
  if (!exactKeys(value, keys) || !schemas.has(value.schema)) fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)) fail("PROOF_CHAIN_SCHEMA");
  if (!schemas.get(value.schema).has(value.status)) fail("PROOF_CHAIN_STATE");
  return sourceIdentity(value);
}

const forensicKeys = [
  "build_generation", "build_image_id", "build_sha256", "canonical_encoding", "certifier_sha256",
  "committed_state_commit", "committed_state_mode", "committed_state_path", "committed_state_sha256",
  "diagnostic", "generation", "inner_status", "lifecycle_close", "lifecycle_exit", "manifest_sha256",
  "mcp_tools_call_count", "non_planning_tree", "observed_provider_requests", "outcome", "previous_sha256",
  "request_receipt", "request_receipt_mac", "reservation_count", "result", "reviewed_commit", "schema",
  "sequence", "status", "transcript", "wrapper_status",
];

export function auditConsumedGenerationForensic(value) {
  if (!exactKeys(value, forensicKeys) || value.schema !== "evidencelens.consumed-generation-forensic.v1") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (value.status !== "gaps_found" || value.outcome !== "terminal_evidence_incomplete"
    || value.committed_state_commit !== consumedStateCommit || value.committed_state_path !== consumedStatePath
    || value.committed_state_sha256 !== "fccf4bf8244b73cea24ac00a47653762164906ec451d1373de1260a43e30a387"
    || value.canonical_encoding !== "utf-8/canonical-json" || value.committed_state_mode !== "0600"
    || value.generation !== "aa9559e40fb797ce19457fdbbecb5a59913befb124d6258b4ea506e7596ce19f"
    || value.sequence !== 4 || value.previous_sha256 !== "ba48bb767a5dc0648e58c062364e79865235056b4bcfaa1eb0d3ceadfca08a09"
    || value.wrapper_status !== "completed" || value.inner_status !== "failed"
    || value.reservation_count !== 1 || value.mcp_tools_call_count !== 0 || value.observed_provider_requests !== 0
    || ["diagnostic", "request_receipt", "request_receipt_mac", "lifecycle_exit", "lifecycle_close", "transcript", "result"].some((key) => value[key] !== unavailable)
    || value.reviewed_commit !== "5751312a28da639ebe0b24834b18d90655efe4b3"
    || value.non_planning_tree !== "4f9b2179939056aaa632d06f0b7405eddfde2322c7fcd207de5b6817f88dd79a"
    || value.manifest_sha256 !== "8a8556d3eb5bd93f04e27ba5becb369aa2fecf9ffbe596f443f1b42732ce76fd"
    || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
    || value.certifier_sha256.audit_proof_chain_sha256 !== "ee6e0fe5a3c9e3a9aa2f408d3dda31bcb182c2c825afc9ed51a6472e2594e802"
    || value.build_generation !== "aa9559e40fb797ce19457fdbbecb5a59913befb124d6258b4ea506e7596ce19f"
    || value.build_image_id !== "sha256:5766201ff50c1fb4f0688443d11793eb4192ea209cc6d99f435f498deec4d270"
    || value.build_sha256 !== "d0af8988e0e9c070b9dcd5c6095ae3a86536c00821a05b6b7d4a5d88b427d3be") fail("PROOF_CHAIN_FORENSIC");
  return sourceIdentity(value);
}

export function auditLiveProof(value) {
  if (!exactKeys(value, proofKeys) || value.schema !== "evidencelens.live-proof.v3") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)) fail("PROOF_CHAIN_SCHEMA");
  if (["build_sha256", "execution_sha256", "review_sha256", "security_sha256", "source_sha256"].some((key) => !hash.test(value[key]))) fail("PROOF_CHAIN_SCHEMA");
  const passed = value.outcome === "passed";
  if (!passed && !nonPassOutcomes.has(value.outcome)) fail("PROOF_CHAIN_STATE");
  if (passed
    ? value.status !== "passed" || value.clean_exit !== true || value.fixture_count !== 4 || !Number.isSafeInteger(value.finding_count) || value.finding_count < 1
    : value.status !== "gaps_found" || value.clean_exit !== false || value.fixture_count !== 0 || value.finding_count !== 0) fail("PROOF_CHAIN_STATE");
  return sourceIdentity(value);
}

const buildKeys = [...keys, "build_count", "daemon_identity_sha256", "fixture_sha256", "generation", "image_config_sha256", "image_content_sha256", "image_id", "runtime_sha256", "verifier_build_count"];
const terminalBuildKeys = [...keys, "attempted_input_paths", "build_count", "diagnostic", "generation", "input_sha256", "verifier_build_count"];
const receiptKeys = ["diagnostic_second_call", "fallback", "generation", "mac", "max_retries", "observed_provider_requests", "reservation_count", "schema"];
const lifecycleKeys = ["code", "observed", "signal"];
const resultKeys = ["finding_count", "fixture_count", "model", "provider", "provenance", "public_schema"];
const transcriptKeys = ["close_code", "exit_code", "mcp_method", "tool"];
const executionKeys = [...keys, "argv", "build_generation", "clean_exit", "close", "diagnostic", "environment", "execution_generation", "exit", "finding_count", "fixture_count", "image_id", "mcp_tools_call_count", "model", "outcome", "provider", "repair_set", "request_receipt", "request_receipt_sha256", "reservation_count", "result", "result_sha256", "transcript", "transcript_sha256"];
const diagnosticCodes = new Set(["pre_fetch", "request", "timeout", "protocol", "disclosure", "malformed", "abnormal_close"]);

function auditBuild(value) {
  if (!exactKeys(value, buildKeys) || value.schema !== "evidencelens.build.v2" || value.status !== "ready"
    || value.build_count !== 1 || value.verifier_build_count !== 0 || !hash.test(value.generation)
    || !/^sha256:[0-9a-f]{64}$/u.test(value.image_id)
    || ["daemon_identity_sha256", "image_config_sha256", "image_content_sha256", "runtime_sha256"].some((key) => !hash.test(value[key]))
    || !Array.isArray(value.fixture_sha256) || value.fixture_sha256.length !== 4 || value.fixture_sha256.some((entry) => !hash.test(entry))) fail("PROOF_CHAIN_BUILD");
}

export function auditBuildAuto(value) {
  if (value?.schema === "evidencelens.build.v2") {
    auditBuild(value);
    return Object.freeze({ branch: "ready", status: "ready" });
  }
  const expectedPaths = PROOF_CHAIN_MODES["build-auto"].paths.slice(1);
  if (!exactKeys(value, terminalBuildKeys) || value.schema !== "evidencelens.build-terminal.v1"
    || value.status !== "terminal_non_pass" || ![0, 1].includes(value.build_count) || value.verifier_build_count !== 0
    || !hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)
    || !hash.test(value.generation) || JSON.stringify(value.attempted_input_paths) !== JSON.stringify(expectedPaths)
    || !exactKeys(value.diagnostic, ["code"]) || !["input_unavailable", "input_invalid", "build_failed", "verification_failed"].includes(value.diagnostic.code)
    || !exactKeys(value.input_sha256, ["review", "security", "source"])
    || Object.values(value.input_sha256).some((entry) => entry !== "unavailable" && !hash.test(entry))) fail("PROOF_CHAIN_BUILD_AUTO");
  validateCertifiers(value.certifier_sha256);
  return Object.freeze({ branch: "terminal_non_pass", status: "gaps_found" });
}

function auditLifecycle(value) {
  return exactKeys(value, lifecycleKeys) && value.observed === true && (value.code === null || Number.isSafeInteger(value.code))
    && (value.signal === null || typeof value.signal === "string");
}

function auditReceipt(value, execution) {
  if (!exactKeys(value, receiptKeys) || value.schema !== "evidencelens.provider-request-receipt.v1"
    || value.generation !== execution.execution_generation || value.reservation_count !== 1
    || ![0, 1].includes(value.observed_provider_requests) || value.max_retries !== 0
    || value.fallback !== false || value.diagnostic_second_call !== false || !hash.test(value.mac)
    || sha256Hex(Buffer.from(canonicalJson(value))) !== execution.request_receipt_sha256) fail("PROOF_CHAIN_RECEIPT");
}

export function auditExecution(value) {
  if (!exactKeys(value, executionKeys) || value.schema !== "evidencelens.execution.v2") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)
    || !hash.test(value.execution_generation)
    || JSON.stringify(value.argv) !== JSON.stringify(["docker", "compose", "--profile", "review", "run", "--rm", "-T", "review"])
    || !exactKeys(value.environment, ["profile", "provider_disabled"]) || value.environment.profile !== "review" || value.environment.provider_disabled !== false
    || !Array.isArray(value.repair_set) || value.repair_set.length !== 0
    || ![0, 1].includes(value.mcp_tools_call_count) || ![0, 1].includes(value.reservation_count)) fail("PROOF_CHAIN_EXECUTION");
  const preReservation = value.mcp_tools_call_count === 0 && value.reservation_count === 0;
  const preTools = value.mcp_tools_call_count === 0 && value.reservation_count === 1;
  if (preReservation) {
    if (value.build_generation !== unavailable || value.image_id !== unavailable || value.request_receipt !== null || value.request_receipt_sha256 !== null
      || value.transcript !== null || value.transcript_sha256 !== null || value.exit !== null || value.close !== null) fail("PROOF_CHAIN_EXECUTION");
  } else {
    if (!hash.test(value.build_generation) || !/^sha256:[0-9a-f]{64}$/u.test(value.image_id)) fail("PROOF_CHAIN_EXECUTION");
    if (preTools) {
      if (value.request_receipt !== null || value.request_receipt_sha256 !== null) fail("PROOF_CHAIN_RECEIPT");
    } else auditReceipt(value.request_receipt, value);
  }
  if (!preReservation && !preTools) {
    if (!auditLifecycle(value.exit) || !auditLifecycle(value.close) || value.exit.code !== value.close.code || value.exit.signal !== value.close.signal
      || !exactKeys(value.transcript, transcriptKeys) || value.transcript.mcp_method !== "tools/call" || value.transcript.tool !== "review_evidence"
      || value.transcript.exit_code !== value.exit.code || value.transcript.close_code !== value.close.code
      || !hash.test(value.transcript_sha256) || sha256Hex(Buffer.from(canonicalJson(value.transcript))) !== value.transcript_sha256) fail("PROOF_CHAIN_EXECUTION");
  } else if (preTools && (value.transcript !== null || value.transcript_sha256 !== null || value.exit !== null || value.close !== null)) fail("PROOF_CHAIN_EXECUTION");
  const observed = preReservation || preTools ? 0 : value.request_receipt.observed_provider_requests;
  if (value.outcome === "passed") {
    if (preReservation || preTools || value.status !== "passed" || value.clean_exit !== true || value.exit.code !== 0 || value.exit.signal !== null
      || observed !== 1 || value.fixture_count !== 4 || !Number.isSafeInteger(value.finding_count) || value.finding_count < 1
      || value.provider !== "deepseek" || typeof value.model !== "string" || value.model.length < 1 || value.diagnostic !== null
      || !exactKeys(value.result, resultKeys) || value.result.fixture_count !== 4 || value.result.finding_count !== value.finding_count
      || value.result.provider !== value.provider || value.result.model !== value.model || value.result.provenance !== true || value.result.public_schema !== true
      || !hash.test(value.result_sha256) || sha256Hex(Buffer.from(canonicalJson(value.result))) !== value.result_sha256) fail("PROOF_CHAIN_EXECUTION");
  } else if (!nonPassOutcomes.has(value.outcome) || value.status !== "gaps_found" || value.clean_exit !== false || value.fixture_count !== 0 || value.finding_count !== 0
    || value.result !== null || value.result_sha256 !== null || value.provider !== "deepseek" || typeof value.model !== "string"
    || !exactKeys(value.diagnostic, ["code", "path"]) || !diagnosticCodes.has(value.diagnostic.code) || value.diagnostic.path !== "transport.fetch"
    || (preReservation && value.outcome !== "preflight_failed") || (preTools && observed !== 0)
    || (!preReservation && value.diagnostic.code === "pre_fetch" ? observed !== 0 : observed > 1)) fail("PROOF_CHAIN_EXECUTION");
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
    if (modeName === "build-auto" && index === 0) {
      if (!["evidencelens.build.v2", "evidencelens.build-terminal.v1"].includes(record.schema)) fail("PROOF_CHAIN_SCHEMA");
    } else if (record.schema !== specification.schemas[index]) fail("PROOF_CHAIN_SCHEMA");
  });
  if (["consumed-live-archive", "consumed-live-archive-10-59"].includes(modeName)) return auditConsumedLiveArchive(records[0]);
  const identity = JSON.stringify(sourceIdentity(records[0]));
  if (records.slice(1).some((record) => JSON.stringify(sourceIdentity(record)) !== identity)) fail("PROOF_CHAIN_IDENTITY");
  if (modeName === "repair-set") auditRepairSet(records[0], records.slice(1));
  if (["build", "build-auto", "execution", "proof", "sync-authority"].includes(modeName)) {
    const buildIndex = ["build", "build-auto"].includes(modeName) ? 0 : modeName === "execution" ? 1 : 2;
    if (modeName === "build-auto") auditBuildAuto(records[buildIndex]); else auditBuild(records[buildIndex]);
  }
  if (modeName === "execution") {
    if (records[0].build_generation !== records[1].generation || records[0].image_id !== records[1].image_id) fail("PROOF_CHAIN_IDENTITY");
  }
  if (["proof", "sync-authority"].includes(modeName)) {
    const [proof, execution, build, source, review, security] = records;
    const bindings = {
      execution_sha256: execution,
      build_sha256: build,
      source_sha256: source,
      review_sha256: review,
      security_sha256: security,
    };
    for (const [field, record] of Object.entries(bindings)) {
      if (proof[field] !== sha256Hex(Buffer.from(canonicalJson(record)))) fail("PROOF_CHAIN_IDENTITY");
    }
    if (execution.build_generation !== build.generation || execution.image_id !== build.image_id
      || proof.outcome !== execution.outcome || proof.status !== execution.status || proof.clean_exit !== execution.clean_exit
      || proof.fixture_count !== execution.fixture_count || proof.finding_count !== execution.finding_count) fail("PROOF_CHAIN_IDENTITY");
  }
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
async function load(path, canonicalOwnerOnly = false) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size < 3n || before.size > 1024n * 1024n || before.nlink !== 1n
      || (canonicalOwnerOnly && (before.mode & 0o077n) !== 0n)) fail("PROOF_CHAIN_FILE");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) fail("PROOF_CHAIN_FILE");
    const reopened = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    let second;
    try { second = await reopened.readFile(); } finally { await reopened.close(); }
    if (sha256Hex(bytes) !== sha256Hex(second)) fail("PROOF_CHAIN_FILE");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    try {
      const value = JSON.parse(text);
      if (canonicalOwnerOnly && text !== canonicalJson(value)) fail("PROOF_CHAIN_FILE");
      return value;
    } catch (error) {
      if (error instanceof Error && /^PROOF_CHAIN_/u.test(error.message)) throw error;
      return evidence(text);
    }
  } catch (error) {
    if (error instanceof Error && /^PROOF_CHAIN_/u.test(error.message)) throw error;
    fail("PROOF_CHAIN_FILE");
  } finally { await handle?.close().catch(() => undefined); }
}
async function assertConsumedState() {
  const state = await load(consumedStatePath, true);
  let committed;
  try {
    committed = (await execFileAsync("git", ["show", `${consumedStateCommit}:${consumedStatePath}`], { encoding: null, maxBuffer: 1024 * 1024 })).stdout;
  } catch { fail("PROOF_CHAIN_FORENSIC"); }
  const working = await readFile(consumedStatePath);
  if (!working.equals(committed) || sha256Hex(committed) !== "fccf4bf8244b73cea24ac00a47653762164906ec451d1373de1260a43e30a387"
    || canonicalJson(state) !== committed.toString("utf8")) fail("PROOF_CHAIN_FORENSIC");
}
export async function auditConsumedGenerationForensicFile(path) {
  const value = await load(path, true);
  auditConsumedGenerationForensic(value);
  return value;
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
async function readFixedCommittedTuple(paths, repoDir = process.cwd()) {
  let fullCommit;
  try { fullCommit = (await execFileAsync("git", ["rev-parse", "HEAD^{commit}"], { cwd: repoDir, encoding: "utf8" })).stdout.trim(); }
  catch { fail("PROOF_CHAIN_COMMITTED"); }
  if (!/^[0-9a-f]{40}$/u.test(fullCommit)) fail("PROOF_CHAIN_COMMITTED");
  const values = [];
  for (const path of paths) {
    let canonical;
    try { canonical = (await execFileAsync("git", ["show", `${fullCommit}:${path}`], { cwd: repoDir, encoding: null, maxBuffer: 1024 * 1024 })).stdout; }
    catch { fail("PROOF_CHAIN_COMMITTED"); }
    let handle;
    try {
      handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      const before = await handle.stat({ bigint: true }); const working = await handle.readFile(); const after = await handle.stat({ bigint: true });
      if (!before.isFile() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || !working.equals(canonical)) fail("PROOF_CHAIN_COMMITTED");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(working);
      try { const parsed = JSON.parse(text); if (canonicalJson(parsed) !== text) fail("PROOF_CHAIN_COMMITTED"); values.push(parsed); }
      catch (error) { if (error instanceof Error && error.message === "PROOF_CHAIN_COMMITTED") throw error; values.push(evidence(text)); }
    } catch (error) {
      if (error instanceof Error && error.message === "PROOF_CHAIN_COMMITTED") throw error;
      fail("PROOF_CHAIN_COMMITTED");
    } finally { await handle?.close().catch(() => undefined); }
  }
  return { fullCommit, values };
}

function registryFromRecords(values, expected) {
  if (values.length !== expected.paths.length) fail("PROOF_CHAIN_ARGV");
  const offset = expected === BRANCH_AUTHORITY_REGISTRIES.live ? 5 : 1;
  const [forensic] = values;
  auditConsumedLiveArchive(forensic);
  const transition = values[offset]; const execution = values[offset + 1]; const proof = values[offset + 2]; const receipt = values[offset + 3];
  const branch = authenticatedBranch(transition);
  if (branch !== expected.branch) fail("PROOF_CHAIN_BRANCH");
  auditExecution(execution);
  if (branch === "preflight_started") auditPreflightProof(proof); else auditLiveProof(proof);
  validateTerminalOwnerReceipt(receipt);
  if (receipt.validation.execution !== "passed" || receipt.validation.proof !== "passed") fail("PROOF_CHAIN_LOCAL_VALIDATION");
  assertBranchExecution(branch, execution);
  if (transition.generation !== receipt.generation || execution.execution_generation !== receipt.generation
    || receipt.artifact_sha256.execution !== sha256Hex(Buffer.from(canonicalJson(execution)))
    || receipt.artifact_sha256.proof !== sha256Hex(Buffer.from(canonicalJson(proof)))
    || receipt.artifact_sha256.transition !== sha256Hex(Buffer.from(canonicalJson(transition)))
    || proof.execution_sha256 !== receipt.artifact_sha256.execution) fail("PROOF_CHAIN_IDENTITY");
  if (expected === BRANCH_AUTHORITY_REGISTRIES.live) {
    auditSourceAndReports(values[1], values[2], values[3]); auditBuildAuto(values[4]);
    if (proof.status !== (execution.status) || proof.outcome !== execution.outcome) fail("PROOF_CHAIN_IDENTITY");
  } else if (proof.status !== "gaps_found" || proof.outcome === "passed") fail("PROOF_CHAIN_BRANCH");
  return Object.freeze({ branch, registry_schema: expected.schema, status: proof.status });
}

export async function auditCommittedAuthority(modeName, repoDir = process.cwd()) {
  if (!["execution-committed-auto", "proof-committed-auto", "sync-authority-auto", "final-audit-auto"].includes(modeName)) fail("PROOF_CHAIN_ARGV");
  const transitionOnly = await readFixedCommittedTuple([transitionPath], repoDir);
  const branch = authenticatedBranch(transitionOnly.values[0]);
  const registry = branch === "preflight_started" ? BRANCH_AUTHORITY_REGISTRIES.preflight : BRANCH_AUTHORITY_REGISTRIES.live;
  const paths = modeName === "final-audit-auto" ? FINAL_AUDIT_REGISTRIES[branch === "preflight_started" ? "preflight" : "live"] : registry.paths;
  const committed = await readFixedCommittedTuple(paths, repoDir);
  const result = registryFromRecords(committed.values.slice(0, registry.paths.length), registry);
  return Object.freeze({ ...result, cardinality: paths.length, full_commit: committed.fullCommit });
}
async function main(argv) {
  const [mode, ...paths] = argv;
  if (["execution-auto", "proof-auto"].includes(mode)) fail("PROOF_CHAIN_LOCAL_OWNER");
  if (mode === "create-consumed-live-archive") {
    if (paths.length !== 0) fail("PROOF_CHAIN_ARGV");
    await createConsumedLiveArchive(); process.stdout.write(`${canonicalJson({ status: "gaps_found" })}\n`); return;
  }
  if (["execution-committed-auto", "proof-committed-auto", "sync-authority-auto", "final-audit-auto"].includes(mode)) {
    if (paths.length !== 0) fail("PROOF_CHAIN_ARGV");
    process.stdout.write(`${canonicalJson(await auditCommittedAuthority(mode))}\n`);
    return;
  }
  if (mode === "terminal-owner-receipt-auto") {
    if (paths.length !== 1 || paths[0] !== localValidationPath) fail("PROOF_CHAIN_ARGV");
    validateTerminalOwnerReceipt(await load(localValidationPath, true));
    process.stdout.write(`${canonicalJson({ status: "ready" })}\n`); return;
  }
  const specification = PROOF_CHAIN_MODES[mode];
  if (!specification || paths.length !== specification.paths.length || new Set(paths).size !== paths.length
    || paths.some((path, index) => path !== specification.paths[index])) fail("PROOF_CHAIN_ARGV");
  if (specification.committed) await assertCommittedInputs(paths);
  if (mode === "forensic-consumed-generation") await assertConsumedState();
  const records = await Promise.all(paths.map((path) => load(path, mode === "forensic-consumed-generation")));
  auditModeRecords(mode, records);
  if (!["forensic-consumed-generation", "consumed-live-archive", "consumed-live-archive-10-59"].includes(mode)) await Promise.all(records.map((record) => auditGitIdentity(record)));
  if (mode === "forensic-consumed-generation") {
    process.stdout.write(`${canonicalJson({ status: "gaps_found" })}\n`);
    return;
  }
  if (["consumed-live-archive", "consumed-live-archive-10-59"].includes(mode)) {
    process.stdout.write(`${canonicalJson({ authority: false, status: "gaps_found" })}\n`); return;
  }
  if (mode === "build-auto") {
    process.stdout.write(`${canonicalJson(auditBuildAuto(records[0]))}\n`);
    return;
  }
  if (mode === "repair-set") {
    const result = auditRepairSet(records[0], records.slice(1));
    process.stdout.write(`${canonicalJson({ production_correction: result.production_correction, status: "ready" })}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then(() => {
    if (!["forensic-consumed-generation", "consumed-live-archive", "consumed-live-archive-10-59", "create-consumed-live-archive"].includes(process.argv[2])) process.stdout.write("proof chain audit passed\n");
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error && /^PROOF_CHAIN_/u.test(error.message) ? error.message : "PROOF_CHAIN_FAILED"}\n`);
    process.exitCode = 1;
  });
}
