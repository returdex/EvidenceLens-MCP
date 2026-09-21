#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { lstat, open, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { auditLiveEvidence } from "./audit-live-evidence.mjs";
import { canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";

const names = ["phase7", "phase10", "requirements"];
const legacyTupleNames = ["proof", "execution", "build", "source", "review", "security"];
const preflightTupleNames = ["forensic", "transition", "execution", "proof", "local_validation"];
const liveTupleNames = ["forensic", "source", "review", "security", "build", "transition", "execution", "proof", "local_validation"];
function tupleNamesFor(length) {
  if (length === 5) return preflightTupleNames;
  if (length === 9) return liveTupleNames;
  if (length === 6) return legacyTupleNames;
  fail("PROOF_SYNC_AUTHORITY");
}
function claimSchemaFor(length) {
  if (length === 5) return "evidencelens.preflight-sync-claim.v1";
  if (length === 9) return "evidencelens.live-sync-claim.v1";
  if (length === 6) return "evidencelens.sync-claim.v2";
  fail("PROOF_SYNC_AUTHORITY");
}
const phaseDirectory = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e";
export const FIXED_SYNC_PATHS = Object.freeze({
  forensic: `${phaseDirectory}/10-167-CONSUMED-LIVE.json`, source: `${phaseDirectory}/10-167-SOURCE.json`, review: `${phaseDirectory}/10-167-REVIEW.md`,
  security: `${phaseDirectory}/10-167-SECURITY.md`, build: `${phaseDirectory}/10-168-FINAL-BUILD.json`, transition: `${phaseDirectory}/10-169-TRANSITION.json`,
  execution: `${phaseDirectory}/10-169-EXECUTION.json`, proof: `${phaseDirectory}/10-169-PROOF.json`, localValidation: `${phaseDirectory}/10-169-LOCAL-VALIDATION.json`,
  claim: `${phaseDirectory}/10-170-SYNC-CLAIM.json`, journal: `${phaseDirectory}/10-170-SYNC-JOURNAL.json`,
  phase7: ".planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md", phase10: `${phaseDirectory}/10-VERIFICATION.md`, requirements: ".planning/REQUIREMENTS.md",
});
const execFileAsync = promisify(execFile);
const hash = /^[0-9a-f]{64}$/u;
function fail(code) { throw new Error(code); }
function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
function exact(value, keys) { return plain(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()); }

async function syncDir(path) { const handle = await open(path, fsConstants.O_RDONLY); try { await handle.sync(); } finally { await handle.close(); } }
async function readBytes(path, ownerOnly = false) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 2 || stat.size > 1_000_000 || (ownerOnly && (stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o600))) fail("PROOF_SYNC_TAMPERED");
    return await handle.readFile();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PROOF_SYNC_")) throw error;
    fail("PROOF_SYNC_TAMPERED");
  } finally { await handle?.close().catch(() => undefined); }
}
async function exclusive(path, bytes) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(bytes); await handle.sync(); await handle.close(); handle = undefined; await syncDir(dirname(path));
  } catch (error) { await handle?.close().catch(() => undefined); if (error?.code === "EEXIST") fail("PROOF_SYNC_REPLAY"); fail("PROOF_SYNC_IO"); }
}
async function atomicReplace(path, bytes) {
  const temp = `${path}.tmp-${process.pid}-${randomBytes(12).toString("hex")}`; let handle;
  try {
    handle = await open(temp, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(bytes); await handle.sync(); await handle.close(); handle = undefined;
    await rename(temp, path); await syncDir(dirname(path));
  } catch { await handle?.close().catch(() => undefined); await unlink(temp).catch(() => undefined); fail("PROOF_SYNC_IO"); }
}
function once(text, pattern, replacement) {
  const matches = text.match(new RegExp(pattern.source, `${pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`}`));
  if (matches?.length !== 1) fail("PROOF_SYNC_STALE");
  return text.replace(pattern, replacement);
}
function replaceFrontmatterStatus(text, state) {
  if (!text.startsWith("---\n")) fail("PROOF_SYNC_STALE");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(text);
  if (!match) fail("PROOF_SYNC_STALE");
  const frontmatter = once(match[1], /^status: (?:passed|gaps_found)$/mu, `status: ${state}`);
  return `---\n${frontmatter}\n---${text.slice(match[0].length - (match[0].endsWith("\n") ? 1 : 0))}`;
}
function replacements(proof, originals) {
  const state = proof.outcome === "passed" ? "passed" : "gaps_found";
  const phase7 = replaceFrontmatterStatus(originals.phase7.toString("utf8"), state);
  const phase10 = replaceFrontmatterStatus(originals.phase10.toString("utf8"), state);
  let requirements = originals.requirements.toString("utf8");
  requirements = once(requirements, /^- \[[ x]\] \*\*PROV-01\*\*:/mu, `- [${state === "passed" ? "x" : " "}] **PROV-01**:`);
  requirements = once(requirements, /^\| PROV-01 \| Phase 10 \| (?:Complete|Gap: credentialed Docker MCP proof) \|$/mu, `| PROV-01 | Phase 10 | ${state === "passed" ? "Complete" : "Gap: credentialed Docker MCP proof"} |`);
  auditLiveEvidence(proof, phase7, phase10, requirements);
  return { phase7: Buffer.from(phase7), phase10: Buffer.from(phase10), requirements: Buffer.from(requirements) };
}
function validateClaim(value) {
  if (!exact(value, ["intended_state", "original_sha256", "replacement_sha256", "schema", "tuple_sha256"])
    || !["evidencelens.sync-claim.v2", "evidencelens.preflight-sync-claim.v1", "evidencelens.live-sync-claim.v1"].includes(value.schema)
    || !["passed", "gaps_found"].includes(value.intended_state)) fail("PROOF_SYNC_TAMPERED");
  for (const field of ["original_sha256", "replacement_sha256"]) if (!exact(value[field], names) || names.some((name) => !hash.test(value[field][name]))) fail("PROOF_SYNC_TAMPERED");
  const tupleNames = Object.keys(value.tuple_sha256 ?? {}).sort();
  const allowed = [legacyTupleNames, preflightTupleNames, liveTupleNames].some((names) => JSON.stringify([...names].sort()) === JSON.stringify(tupleNames));
  if (!allowed || tupleNames.some((name) => !hash.test(value.tuple_sha256[name]))) fail("PROOF_SYNC_TAMPERED");
  return value;
}
function validateJournal(value, claimSha256) {
  if (!exact(value, ["claim_sha256", "completed", "schema"]) || value.schema !== "evidencelens.sync-journal.v1" || value.claim_sha256 !== claimSha256
    || !Array.isArray(value.completed) || value.completed.some((name, index) => !names.includes(name) || names.indexOf(name) !== index)) fail("PROOF_SYNC_TAMPERED");
  return value;
}
async function readCanonical(path, validator) {
  const bytes = await readBytes(path, true); let value;
  try { value = validator(JSON.parse(bytes.toString("utf8"))); } catch (error) { if (error instanceof Error && error.message.startsWith("PROOF_SYNC_")) throw error; fail("PROOF_SYNC_TAMPERED"); }
  if (canonicalJson(value) !== bytes.toString("utf8")) fail("PROOF_SYNC_TAMPERED"); return { bytes, value };
}
async function loadProof(path) {
  const bytes = await readBytes(path, true); let value; try { value = JSON.parse(bytes.toString("utf8")); } catch { fail("PROOF_SYNC_TAMPERED"); }
  if (canonicalJson(value) !== bytes.toString("utf8")) fail("PROOF_SYNC_TAMPERED"); return { bytes, value };
}
function targetPaths(paths) { return { phase7: paths.phase7Path, phase10: paths.phase10Path, requirements: paths.requirementsPath }; }
async function createJournal(path, claimSha256) { const value = { claim_sha256: claimSha256, completed: [], schema: "evidencelens.sync-journal.v1" }; await exclusive(path, Buffer.from(canonicalJson(value))); return value; }

async function defaultAuthorityValidator(authorityPaths) {
  try {
    const { stdout } = await execFileAsync(process.execPath, ["scripts/audit-proof-chain.mjs", "sync-authority-auto"], {
      cwd: process.cwd(), encoding: "utf8", env: { ...process.env, EVIDENCELENS_DISABLE_PROVIDER: "1" }, maxBuffer: 1024 * 1024,
    });
    return JSON.parse(stdout.trim().split("\n")[0]);
  } catch { fail("PROOF_SYNC_AUTHORITY"); }
}

function validateCertifiedAuthority(value, tupleNames) {
  const expectedBranch = tupleNames === preflightTupleNames ? "preflight_started" : "ready";
  if (!plain(value) || value.branch !== expectedBranch
    || !exact(value.tuple_sha256, tupleNames)
    || tupleNames.some((name) => !hash.test(value.tuple_sha256[name]))) fail("PROOF_SYNC_AUTHORITY");
  return value;
}

function validateProofState(proof, tupleNames) {
  if (tupleNames === preflightTupleNames) {
    if (proof.status !== "gaps_found" || proof.outcome === "passed") fail("PROOF_SYNC_AUTHORITY");
  } else if (proof.status !== "passed" || proof.outcome !== "passed") fail("PROOF_SYNC_AUTHORITY");
}

async function authenticateAuthority(paths, validator = defaultAuthorityValidator) {
  if (!Array.isArray(paths.authorityPaths) || ![5, 6, 9].includes(paths.authorityPaths.length)
    || new Set(paths.authorityPaths).size !== paths.authorityPaths.length || !paths.authorityPaths.includes(paths.proofPath)
    || typeof validator !== "function") fail("PROOF_SYNC_AUTHORITY");
  const tupleNames = tupleNamesFor(paths.authorityPaths.length);
  let certified;
  try { certified = validateCertifiedAuthority(await validator(paths.authorityPaths), tupleNames); } catch (error) {
    if (error instanceof Error && error.message.startsWith("PROOF_SYNC_")) throw error;
    fail("PROOF_SYNC_AUTHORITY");
  }
  const bytes = await Promise.all(paths.authorityPaths.map((path) => readBytes(path)));
  const observed = Object.fromEntries(tupleNames.map((name, index) => [name, sha256Hex(bytes[index])]));
  if (tupleNames.some((name) => observed[name] !== certified.tuple_sha256[name])) fail("PROOF_SYNC_AUTHORITY");
  const proofIndex = paths.authorityPaths.indexOf(paths.proofPath);
  return {
    branch: certified.branch,
    proof: bytes[proofIndex],
    tuple_sha256: observed,
  };
}

async function apply(paths, proof, claim, journal, replacementsByName, interruptAt) {
  const targets = targetPaths(paths);
  for (const name of names) {
    if (journal.completed.includes(name)) continue;
    const current = await readBytes(targets[name]); const currentHash = sha256Hex(current);
    if (currentHash === claim.replacement_sha256[name]) {
      // The target rename was durable but the journal update was interrupted.
    } else {
      if (currentHash !== claim.original_sha256[name]) fail("PROOF_SYNC_STALE");
      if (interruptAt === `before-${name}`) fail("PROOF_SYNC_INTERRUPTED");
      await atomicReplace(targets[name], replacementsByName[name]);
      if (interruptAt === `after-${name}`) fail("PROOF_SYNC_INTERRUPTED");
    }
    journal = { ...journal, completed: [...journal.completed, name] };
    await atomicReplace(paths.journalPath, Buffer.from(canonicalJson(journal)));
  }
  auditLiveEvidence(proof, ...(await Promise.all([paths.phase7Path, paths.phase10Path, paths.requirementsPath].map((path) => readBytes(path)))).map((bytes) => bytes.toString("utf8")));
  return journal;
}

export async function synchronizeProofState(paths, options = {}) {
  const authority = await authenticateAuthority(paths, options.authorityValidator);
  const sealed = await loadProof(paths.proofPath);
  if (!sealed.bytes.equals(authority.proof)) fail("PROOF_SYNC_AUTHORITY");
  const authorityNames = tupleNamesFor(paths.authorityPaths.length);
  validateProofState(sealed.value, authorityNames);
  const targets = targetPaths(paths); const originals = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readBytes(targets[name])])));
  const next = replacements(sealed.value, originals);
  const claimSchema = claimSchemaFor(paths.authorityPaths.length);
  const claim = validateClaim({ intended_state: sealed.value.outcome === "passed" ? "passed" : "gaps_found", original_sha256: Object.fromEntries(names.map((name) => [name, sha256Hex(originals[name])])), replacement_sha256: Object.fromEntries(names.map((name) => [name, sha256Hex(next[name])])), schema: claimSchema, tuple_sha256: authority.tuple_sha256 });
  const claimBytes = Buffer.from(canonicalJson(claim)); await exclusive(paths.claimPath, claimBytes);
  if (options.interruptAt === "after-claim") fail("PROOF_SYNC_INTERRUPTED");
  const journal = await createJournal(paths.journalPath, sha256Hex(claimBytes));
  return apply(paths, sealed.value, claim, journal, next, options.interruptAt);
}

export async function recoverProofSynchronization(paths, _sideEffects = undefined, options = {}) {
  const authority = await authenticateAuthority(paths, options.authorityValidator);
  const sealed = await loadProof(paths.proofPath); const claimRecord = await readCanonical(paths.claimPath, validateClaim);
  const tupleNames = tupleNamesFor(paths.authorityPaths.length);
  validateProofState(sealed.value, tupleNames);
  const intendedState = sealed.value.outcome === "passed" ? "passed" : "gaps_found";
  if (claimRecord.value.schema !== claimSchemaFor(paths.authorityPaths.length) || claimRecord.value.intended_state !== intendedState) fail("PROOF_SYNC_TAMPERED");
  if (!sealed.bytes.equals(authority.proof) || tupleNames.some((name) => authority.tuple_sha256[name] !== claimRecord.value.tuple_sha256[name])) fail("PROOF_SYNC_TAMPERED");
  const originals = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readBytes(targetPaths(paths)[name])])));
  // Derive replacements from any still-original target, or reconstruct them from
  // the current target and the sealed state when a rename already completed.
  const base = {};
  for (const name of names) {
    const currentHash = sha256Hex(originals[name]);
    if (currentHash !== claimRecord.value.original_sha256[name] && currentHash !== claimRecord.value.replacement_sha256[name]) fail("PROOF_SYNC_STALE");
    base[name] = originals[name];
  }
  // Status-only transforms are idempotent, so applying them to either original
  // or replacement bytes produces the exact claimed replacement.
  const next = replacements(sealed.value, base);
  if (names.some((name) => sha256Hex(next[name]) !== claimRecord.value.replacement_sha256[name])) fail("PROOF_SYNC_TAMPERED");
  let journal;
  try { journal = (await readCanonical(paths.journalPath, (value) => validateJournal(value, sha256Hex(claimRecord.bytes)))).value; }
  catch (error) {
    try { await lstat(paths.journalPath); throw error; } catch (statError) { if (statError?.code !== "ENOENT") throw statError; }
    journal = await createJournal(paths.journalPath, sha256Hex(claimRecord.bytes));
  }
  return apply(paths, sealed.value, claimRecord.value, journal, next);
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "recover") fail("PROOF_SYNC_USAGE");
  let authority;
  try {
    authority = JSON.parse((await execFileAsync(process.execPath, ["scripts/audit-proof-chain.mjs", "sync-authority-auto"], {
      cwd: process.cwd(), encoding: "utf8", env: { ...process.env, EVIDENCELENS_DISABLE_PROVIDER: "1" }, maxBuffer: 1024 * 1024,
    })).stdout.trim().split("\n")[0]);
  } catch { fail("PROOF_SYNC_AUTHORITY"); }
  const isPreflight = authority.branch === "preflight_started";
  const paths = {
    proofPath: FIXED_SYNC_PATHS.proof,
    authorityPaths: isPreflight
      ? [FIXED_SYNC_PATHS.forensic, FIXED_SYNC_PATHS.transition, FIXED_SYNC_PATHS.execution, FIXED_SYNC_PATHS.proof, FIXED_SYNC_PATHS.localValidation]
      : [FIXED_SYNC_PATHS.forensic, FIXED_SYNC_PATHS.source, FIXED_SYNC_PATHS.review, FIXED_SYNC_PATHS.security, FIXED_SYNC_PATHS.build, FIXED_SYNC_PATHS.transition, FIXED_SYNC_PATHS.execution, FIXED_SYNC_PATHS.proof, FIXED_SYNC_PATHS.localValidation],
    claimPath: FIXED_SYNC_PATHS.claim, journalPath: FIXED_SYNC_PATHS.journal,
    phase7Path: FIXED_SYNC_PATHS.phase7, phase10Path: FIXED_SYNC_PATHS.phase10, requirementsPath: FIXED_SYNC_PATHS.requirements,
  };
  try {
    await lstat(paths.claimPath);
    await recoverProofSynchronization(paths);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await synchronizeProofState(paths);
  }
  process.stdout.write("proof state synchronization complete\n");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "PROOF_SYNC_FAILED"}\n`);
    process.exitCode = 1;
  });
}
