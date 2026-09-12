#!/usr/bin/env node
import { execFile } from "node:child_process";
import { randomBytes as cryptoRandomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { chmod, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { MAX_EVIDENCE_BYTES, canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";
import { validateResumeBlock } from "./prelive-review-gate.mjs";

export const FIXED_CHALLENGE_HANDOFF = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-23-HANDOFF.json";
const FIXED_BUILD_HANDOFF = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-22-BUILD.json";
const REPORTS = [".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-REVIEW.md", ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-SECURITY.md"];
const execFileAsync = promisify(execFile);
const h64 = /^[0-9a-f]{64}$/u; const gitId = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u; const imageId = /^sha256:[0-9a-f]{64}$/u;
function fail(code) { throw new Error(code); }
function ordinary(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function keys(v, expected, code) { if (!ordinary(v) || JSON.stringify(Object.keys(v).sort()) !== JSON.stringify([...expected].sort())) fail(code); }
function exactPath(path, expected) { if (typeof path !== "string" || path !== expected || resolve(path) !== resolve(expected)) fail("ENVELOPE_ARGV"); }

async function syncDir(path) { const h = await open(path, fsConstants.O_RDONLY); try { await h.sync(); } finally { await h.close(); } }
async function exclusiveJson(path, value) {
  const bytes = Buffer.from(canonicalJson(value)); if (bytes.length > MAX_EVIDENCE_BYTES) fail("ENVELOPE_SIZE");
  let h; try { h = await open(path, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600); await h.writeFile(bytes); await h.sync(); } finally { await h?.close(); }
  await syncDir(dirname(path)); return bytes;
}
async function atomicPublicJson(path, value) {
  const bytes = Buffer.from(canonicalJson(value)); const temp = `${path}.tmp-${process.pid}-${cryptoRandomBytes(8).toString("hex")}`; let h;
  try { h = await open(temp, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600); await h.writeFile(bytes); await h.sync(); await h.close(); h = undefined; await rename(temp, path); await syncDir(dirname(path)); }
  catch (e) { await h?.close().catch(() => undefined); await unlink(temp).catch(() => undefined); throw e; }
  return bytes;
}
async function secure(path, ownerOnly = true) {
  let h; try { h = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW); const s = await h.stat(); if (!s.isFile() || s.uid !== process.getuid?.() || (ownerOnly && (s.mode & 0o777) !== 0o600) || s.size < 3 || s.size > MAX_EVIDENCE_BYTES) fail("ENVELOPE_FILE"); const bytes = await h.readFile(); const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); const parsed = JSON.parse(text); if (canonicalJson(parsed) !== text) fail("ENVELOPE_CANONICAL"); return { bytes, parsed }; }
  catch (e) { if (e instanceof Error && e.message.startsWith("ENVELOPE_")) throw e; fail("ENVELOPE_FILE"); } finally { await h?.close().catch(() => undefined); }
}
async function boundedBytes(path) { const b = await readFile(path); if (!b.length || b.length > MAX_EVIDENCE_BYTES) fail("ENVELOPE_REPORT"); return b; }

function validateBuildDescriptor(v) {
  if (!ordinary(v) || v.schema !== "evidencelens.build-generation.v1" || v.status !== "completed" || !h64.test(v.generation) || !h64.test(v.non_planning_tree) || !gitId.test(v.reviewed_commit) || !h64.test(v.result_sha256) || typeof v.result_locator !== "string") fail("ENVELOPE_BUILD");
}
function validateResult(v, d) {
  if (!ordinary(v) || v.schema !== "evidencelens.build-result.v1" || v.generation !== d.generation || !imageId.test(v.image_id) || !h64.test(v.runtime_sha256) || !h64.test(v.image_config_sha256) || !h64.test(v.image_content_sha256) || !h64.test(v.daemon_identity_sha256) || !Array.isArray(v.fixture_sha256) || v.fixture_sha256.length !== 4 || v.fixture_sha256.some(x => !h64.test(x)) || JSON.stringify(v.sentinels) !== JSON.stringify({ proof: "normalized", review: "normalized" })) fail("ENVELOPE_RESULT");
}

export async function authenticateChallengePlanning(path, repoDir = process.cwd()) {
  try {
    const [{ stdout: blob }, { stdout: commit }, committed] = await Promise.all([
      execFileAsync("git", ["rev-parse", `HEAD:${path}`], { cwd: repoDir, encoding: "utf8", maxBuffer: 1024 }),
      execFileAsync("git", ["log", "-1", "--format=%H", "--", path], { cwd: repoDir, encoding: "utf8", maxBuffer: 1024 }),
      execFileAsync("git", ["show", `HEAD:${path}`], { cwd: repoDir, encoding: null, maxBuffer: MAX_EVIDENCE_BYTES }),
    ]);
    const blobId = blob.trim(), commitId = commit.trim(); if (!gitId.test(blobId) || !gitId.test(commitId)) fail("ENVELOPE_GIT");
    if (!Buffer.from(await readFile(join(repoDir, path))).equals(committed.stdout)) fail("ENVELOPE_GIT");
    return { blob: blobId, commit: commitId };
  } catch (e) { if (e instanceof Error && e.message === "ENVELOPE_GIT") throw e; fail("ENVELOPE_GIT"); }
}

export async function prepareChallengeHandoff(path, options = {}) {
  const expectedPath = options.expectedPath ?? FIXED_CHALLENGE_HANDOFF; exactPath(path, expectedPath);
  const now = options.nowMs ?? Date.now(), ttl = options.ttlMs ?? 15 * 60_000;
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(ttl) || ttl < 1_000 || ttl > 60 * 60_000) fail("ENVELOPE_TTL");
  const nonce = (options.randomBytes ?? cryptoRandomBytes)(32).toString("hex"); if (!h64.test(nonce)) fail("ENVELOPE_NONCE");
  const descriptorLocator = options.descriptorLocator ?? (await secure(FIXED_BUILD_HANDOFF, false)).parsed.descriptor_locator;
  const descriptorRead = await secure(descriptorLocator); validateBuildDescriptor(descriptorRead.parsed);
  const resultRead = await secure(descriptorRead.parsed.result_locator); if (sha256Hex(resultRead.bytes) !== descriptorRead.parsed.result_sha256) fail("ENVELOPE_DIGEST"); validateResult(resultRead.parsed, descriptorRead.parsed);
  const reportPaths = options.reportPaths ?? REPORTS; if (!Array.isArray(reportPaths) || reportPaths.length !== 2) fail("ENVELOPE_REPORT");
  const report_sha256 = []; for (const report of reportPaths) report_sha256.push(sha256Hex(await boundedBytes(report)));
  const root = options.privateRoot ?? join(tmpdir(), `evidencelens-challenge-${nonce}`); await mkdir(root, { mode: 0o700 }); await chmod(root, 0o700); await syncDir(dirname(root));
  const envelope = { build_result_sha256: descriptorRead.parsed.result_sha256, daemon_identity_sha256: resultRead.parsed.daemon_identity_sha256, fixture_sha256: resultRead.parsed.fixture_sha256, generation: descriptorRead.parsed.generation, image_config_sha256: resultRead.parsed.image_config_sha256, image_content_sha256: resultRead.parsed.image_content_sha256, image_id: resultRead.parsed.image_id, non_planning_tree: descriptorRead.parsed.non_planning_tree, report_sha256, reviewed_commit: descriptorRead.parsed.reviewed_commit, runtime_sha256: resultRead.parsed.runtime_sha256, schema: "evidencelens.evidence-envelope.v1", sentinels: resultRead.parsed.sentinels };
  const envelopeLocator = join(root, "ENVELOPE.json"), envelopeBytes = await exclusiveJson(envelopeLocator, envelope);
  const challenge = { envelope_sha256: sha256Hex(envelopeBytes), expires_at_ms: now + ttl, generation: descriptorRead.parsed.generation, issued_at_ms: now, manifest_sha256: sha256Hex(Buffer.from(canonicalJson(envelope))), nonce, schema: "evidencelens.review-challenge.v1" };
  const challengeLocator = join(root, "CHALLENGE.json"), challengeBytes = await exclusiveJson(challengeLocator, challenge);
  const ledgerLocator = join(root, "REPLAY.json"); await exclusiveJson(ledgerLocator, { generation: challenge.generation, nonce, schema: "evidencelens.replay.v1", status: "unconsumed" });
  const handoff = { challenge_locator: challengeLocator, challenge_mode: "0600", challenge_owner: process.getuid?.(), challenge_sha256: sha256Hex(challengeBytes), envelope_locator: envelopeLocator, envelope_mode: "0600", envelope_owner: process.getuid?.(), envelope_sha256: challenge.envelope_sha256, generation: challenge.generation, image_id: resultRead.parsed.image_id, ledger_locator: ledgerLocator, manifest_sha256: challenge.manifest_sha256, nonce, non_planning_tree: descriptorRead.parsed.non_planning_tree, reviewed_commit: descriptorRead.parsed.reviewed_commit, schema: "evidencelens.challenge-handoff.v1", status: "prepared" };
  await atomicPublicJson(path, handoff); return handoff;
}

export async function validateChallengePrecommit(path, options = {}) {
  const expectedPath = options.expectedPath ?? FIXED_CHALLENGE_HANDOFF; exactPath(path, expectedPath); const now = options.nowMs ?? Date.now();
  const { parsed: h } = await secure(path, false); keys(h, ["challenge_locator","challenge_mode","challenge_owner","challenge_sha256","envelope_locator","envelope_mode","envelope_owner","envelope_sha256","generation","image_id","ledger_locator","manifest_sha256","nonce","non_planning_tree","reviewed_commit","schema","status"], "ENVELOPE_HANDOFF");
  if (h.schema !== "evidencelens.challenge-handoff.v1" || h.status !== "prepared" || h.challenge_mode !== "0600" || h.envelope_mode !== "0600" || h.challenge_owner !== process.getuid?.() || h.envelope_owner !== process.getuid?.() || !h64.test(h.nonce) || !h64.test(h.manifest_sha256) || !h64.test(h.generation) || !h64.test(h.non_planning_tree) || !gitId.test(h.reviewed_commit) || !imageId.test(h.image_id)) fail("ENVELOPE_HANDOFF");
  const e = await secure(h.envelope_locator), c = await secure(h.challenge_locator), l = await secure(h.ledger_locator);
  if (sha256Hex(e.bytes) !== h.envelope_sha256 || sha256Hex(c.bytes) !== h.challenge_sha256) fail("ENVELOPE_DIGEST");
  const ch = c.parsed; keys(ch, ["envelope_sha256","expires_at_ms","generation","issued_at_ms","manifest_sha256","nonce","schema"], "ENVELOPE_CHALLENGE");
  if (ch.schema !== "evidencelens.review-challenge.v1" || ch.envelope_sha256 !== h.envelope_sha256 || ch.manifest_sha256 !== h.manifest_sha256 || ch.nonce !== h.nonce || ch.generation !== h.generation) fail("ENVELOPE_DIGEST");
  if (!Number.isSafeInteger(ch.issued_at_ms) || !Number.isSafeInteger(ch.expires_at_ms) || now < ch.issued_at_ms || now > ch.expires_at_ms) fail("ENVELOPE_TTL");
  if (sha256Hex(e.bytes) !== ch.manifest_sha256) fail("ENVELOPE_DIGEST");
  if (JSON.stringify(l.parsed) !== JSON.stringify({ generation: h.generation, nonce: h.nonce, schema: "evidencelens.replay.v1", status: "unconsumed" })) fail("ENVELOPE_REPLAY");
  return { handoff: h, challenge: ch, envelope: e.parsed, ledger: l.parsed };
}

export async function verifyChallengeHandoff(path, options = {}) {
  const expectedPath = options.expectedPath ?? FIXED_CHALLENGE_HANDOFF; exactPath(path, expectedPath);
  const identity = await (options.authenticatePlanning ?? authenticateChallengePlanning)(path);
  const state = await validateChallengePrecommit(path, { expectedPath, nowMs: options.nowMs });
  const h = state.handoff, e = state.envelope;
  if (e.generation !== h.generation || e.image_id !== h.image_id || e.non_planning_tree !== h.non_planning_tree || e.reviewed_commit !== h.reviewed_commit || !Array.isArray(e.report_sha256) || e.report_sha256.length !== 2) fail("ENVELOPE_IDENTITY");
  const value = { authorization_echo: `authorize evidencelens review nonce=${h.nonce} manifest_sha256=${h.manifest_sha256}`, challenge_commit: identity.commit, challenge_expires_at_ms: state.challenge.expires_at_ms, challenge_handoff_blob: identity.blob, generation: h.generation, image_id: h.image_id, manifest_sha256: h.manifest_sha256, nonce: h.nonce, non_planning_tree: h.non_planning_tree, replay_status: "unconsumed", reviewed_commit: h.reviewed_commit, schema: "evidencelens.challenge-resume.v1", status: "ready" };
  return validateResumeBlock(value);
}

async function main(argv) {
  if (argv.length !== 2 || argv[1] !== FIXED_CHALLENGE_HANDOFF) fail("ENVELOPE_ARGV");
  if (argv[0] === "prepare") { await prepareChallengeHandoff(argv[1]); return; }
  if (argv[0] === "validate-precommit") { await validateChallengePrecommit(argv[1]); return; }
  if (argv[0] === "verify") { process.stdout.write(canonicalJson(await verifyChallengeHandoff(argv[1]))); return; }
  fail("ENVELOPE_ARGV");
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main(process.argv.slice(2)).catch(e => { const code = e instanceof Error && /^ENVELOPE_[A-Z_]+$/u.test(e.message) ? e.message : "ENVELOPE_FAILED"; process.stderr.write(`evidence-envelope: ${code}\n`); process.exitCode = 1; });
