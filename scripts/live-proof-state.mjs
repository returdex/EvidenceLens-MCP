import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { open, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";

import { canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";

const lower64 = /^[0-9a-f]{64}$/u;
const buildStatuses = new Set(["prepared", "started", "ready", "preflight_failed", "build_failed", "verification_failed"]);
const liveStatuses = new Set(["prepared", "preflight_started", "preflight_authenticated", "consumed", "passed", "failed"]);
const terminalBuild = new Set(["ready", "preflight_failed", "build_failed", "verification_failed"]);
const terminalLive = new Set(["passed", "failed"]);
export const TERMINAL_VARIANTS = Object.freeze([
  "passed", "post_fetch_non_pass", "post_tools_pre_fetch",
  "pre_tools_post_reservation", "pre_reservation_preflight",
]);
const terminalVariants = new Set(TERMINAL_VARIANTS);

function fail(code) { throw new Error(code); }
function isPlain(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, expected) {
  return isPlain(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

const terminalKeys = ["branch", "close", "diagnostic", "exit", "generation", "mac", "mcp_tools_call_count", "observed_provider_requests", "request_receipt", "reservation_count", "result", "schema", "stream_truncated", "transcript"];
function terminalBody(value) { const { mac: _mac, ...body } = value; return body; }
function terminalMac(body, key) { return createHmac("sha256", key).update(canonicalJson(body)).digest("hex"); }

export function createAuthenticatedTerminalSnapshot(input, key) {
  if (!isPlain(input) || !Buffer.isBuffer(key) || key.length !== 32 || !terminalVariants.has(input.branch)
    || !lower64.test(input.generation)) fail("PROOF_TERMINAL_MALFORMED");
  const counts = {
    passed: [1, 1, 1], post_fetch_non_pass: [1, 1, 1], post_tools_pre_fetch: [1, 1, 0],
    pre_tools_post_reservation: [0, 1, 0], pre_reservation_preflight: [0, 0, 0],
  }[input.branch];
  const body = {
    branch: input.branch, close: input.close ?? null, diagnostic: input.diagnostic ?? null,
    exit: input.exit ?? null, generation: input.generation, mcp_tools_call_count: counts[0],
    observed_provider_requests: counts[2], request_receipt: input.request_receipt ?? null,
    reservation_count: counts[1], result: input.result ?? null,
    schema: "evidencelens.terminal-snapshot.v1", stream_truncated: input.stream_truncated === true,
    transcript: input.transcript ?? null,
  };
  return Object.freeze({ ...body, mac: terminalMac(body, key) });
}

export function authenticateTerminalSnapshot(value, { generation, key }) {
  if (!exactKeys(value, terminalKeys) || value.schema !== "evidencelens.terminal-snapshot.v1"
    || value.generation !== generation || !terminalVariants.has(value.branch) || !lower64.test(value.mac)
    || !Buffer.isBuffer(key) || key.length !== 32) fail("PROOF_TERMINAL_MALFORMED");
  const expected = Buffer.from(terminalMac(terminalBody(value), key), "hex");
  if (!timingSafeEqual(expected, Buffer.from(value.mac, "hex"))) fail("PROOF_TERMINAL_AUTH");
  const counts = {
    passed: [1, 1, 1], post_fetch_non_pass: [1, 1, 1], post_tools_pre_fetch: [1, 1, 0],
    pre_tools_post_reservation: [0, 1, 0], pre_reservation_preflight: [0, 0, 0],
  }[value.branch];
  if (value.mcp_tools_call_count !== counts[0] || value.reservation_count !== counts[1] || value.observed_provider_requests !== counts[2]) fail("PROOF_TERMINAL_STATE");
  if (value.branch === "passed" && (value.diagnostic !== null || value.result === null || value.transcript === null || value.exit === null || value.close === null)) fail("PROOF_TERMINAL_STATE");
  if (value.branch === "pre_reservation_preflight" && [value.request_receipt, value.result, value.transcript, value.exit, value.close].some((entry) => entry !== null)) fail("PROOF_TERMINAL_STATE");
  if (value.branch === "pre_tools_post_reservation" && [value.request_receipt, value.result, value.transcript].some((entry) => entry !== null)) fail("PROOF_TERMINAL_STATE");
  if (value.branch !== "passed" && value.diagnostic === null) fail("PROOF_TERMINAL_STATE");
  return Object.freeze(value);
}
async function syncDirectory(path) {
  const handle = await open(path, fsConstants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}
function validate(value) {
  const keys = ["build_count", "generation", "inner_status", "kind", "max_provider_requests", "mcp_tools_call_count", "observed_provider_requests", "previous_sha256", "reservation_count", "schema", "sequence", "wrapper_status"];
  if (!isPlain(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys.sort())) fail("PROOF_STATE_MALFORMED");
  if (value.schema !== "evidencelens.live-proof-state.v1" || !["build", "live"].includes(value.kind) || !lower64.test(value.generation)) fail("PROOF_STATE_MALFORMED");
  const statuses = value.kind === "build" ? buildStatuses : liveStatuses;
  if (!statuses.has(value.inner_status) || !["pending", "completed"].includes(value.wrapper_status)) fail("PROOF_STATE_MALFORMED");
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 0 || (value.previous_sha256 !== null && !lower64.test(value.previous_sha256))) fail("PROOF_STATE_MALFORMED");
  if (![value.build_count, value.max_provider_requests, value.mcp_tools_call_count, value.reservation_count, value.observed_provider_requests].every(Number.isSafeInteger)) fail("PROOF_STATE_MALFORMED");
  if (value.build_count < 0 || value.build_count > 1 || value.max_provider_requests !== (value.kind === "live" ? 1 : 0)) fail("PROOF_STATE_MALFORMED");
  if ([value.mcp_tools_call_count, value.reservation_count, value.observed_provider_requests].some((count) => count < 0 || count > value.max_provider_requests)) fail("PROOF_STATE_MALFORMED");
  if (value.observed_provider_requests > value.reservation_count || value.kind === "build" && (value.mcp_tools_call_count !== 0 || value.reservation_count !== 0 || value.observed_provider_requests !== 0)) fail("PROOF_STATE_MALFORMED");
  if (value.wrapper_status === "completed" && !(value.kind === "build" ? terminalBuild : terminalLive).has(value.inner_status)) fail("PROOF_STATE_MALFORMED");
  return value;
}

async function writeExclusive(path, value) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(Buffer.from(canonicalJson(value))); await handle.sync();
    await handle.close(); handle = undefined; await syncDirectory(dirname(path));
  } catch (error) {
    await handle?.close().catch(() => undefined);
    if (error?.code === "EEXIST") fail("PROOF_STATE_REPLAY");
    if (error instanceof Error && error.message.startsWith("PROOF_STATE_")) throw error;
    fail("PROOF_STATE_IO");
  }
}

async function replaceDurably(path, previousBytes, value) {
  const temp = `${path}.tmp-${process.pid}-${randomBytes(12).toString("hex")}`;
  const next = validate({ ...value, previous_sha256: sha256Hex(previousBytes), sequence: value.sequence + 1 });
  let handle;
  try {
    handle = await open(temp, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(Buffer.from(canonicalJson(next))); await handle.sync();
    await handle.close(); handle = undefined; await rename(temp, path); await syncDirectory(dirname(path));
    return next;
  } catch (error) {
    await handle?.close().catch(() => undefined); await unlink(temp).catch(() => undefined);
    if (error instanceof Error && error.message.startsWith("PROOF_STATE_")) throw error;
    fail("PROOF_STATE_IO");
  }
}

async function secureRead(path) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o600 || stat.size < 3 || stat.size > 1_000_000) fail("PROOF_STATE_MALFORMED");
    const bytes = await handle.readFile();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const value = validate(JSON.parse(text));
    if (canonicalJson(value) !== text) fail("PROOF_STATE_MALFORMED");
    return { bytes, value };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PROOF_STATE_")) throw error;
    fail("PROOF_STATE_MALFORMED");
  } finally { await handle?.close().catch(() => undefined); }
}

export async function createProofState(path, kind, generation) {
  if (typeof path !== "string" || path.length === 0 || !["build", "live"].includes(kind) || !lower64.test(generation)) fail("PROOF_STATE_MALFORMED");
  const value = validate({
    build_count: 0, generation, inner_status: "prepared", kind,
    max_provider_requests: kind === "live" ? 1 : 0, previous_sha256: null,
    mcp_tools_call_count: 0, observed_provider_requests: 0, reservation_count: 0, schema: "evidencelens.live-proof-state.v1",
    sequence: 0, wrapper_status: "pending",
  });
  await writeExclusive(path, value); return value;
}

export async function readProofState(path) { return (await secureRead(path)).value; }

export async function transitionProofState(path, nextStatus, counts = {}) {
  const current = await secureRead(path); const value = current.value;
  if (value.wrapper_status !== "pending") fail("PROOF_STATE_TRANSITION");
  const allowed = value.kind === "build"
    ? { prepared: ["started", "preflight_failed"], started: ["ready", "build_failed", "verification_failed"] }
    : { prepared: ["preflight_started", "consumed"], preflight_started: ["preflight_authenticated", "failed"], preflight_authenticated: ["consumed", "failed"], consumed: ["passed", "failed"] };
  if (!allowed[value.inner_status]?.includes(nextStatus)) fail("PROOF_STATE_TRANSITION");
  const buildCount = nextStatus === "started" ? 1 : value.build_count;
  const nextCounts = { mcp_tools_call_count: counts.mcp_tools_call_count ?? value.mcp_tools_call_count, reservation_count: counts.reservation_count ?? value.reservation_count, observed_provider_requests: counts.observed_provider_requests ?? value.observed_provider_requests };
  for (const key of Object.keys(nextCounts)) if (!Number.isSafeInteger(nextCounts[key]) || nextCounts[key] < value[key] || nextCounts[key] > value.max_provider_requests) fail("PROOF_STATE_TRANSITION");
  if (nextCounts.observed_provider_requests > nextCounts.reservation_count) fail("PROOF_STATE_TRANSITION");
  return replaceDurably(path, current.bytes, { ...value, ...nextCounts, build_count: buildCount, inner_status: nextStatus });
}

export async function recordProviderAttempt(path) {
  const current = await secureRead(path); const value = current.value;
  if (value.kind !== "live" || value.inner_status !== "consumed" || value.wrapper_status !== "pending" || value.reservation_count !== 0) fail("PROOF_STATE_TRANSITION");
  return replaceDurably(path, current.bytes, { ...value, reservation_count: 1 });
}

export async function recordRequestEvidence(path, evidence) {
  const current = await secureRead(path); const value = current.value;
  if (value.kind !== "live" || value.inner_status !== "consumed" || value.wrapper_status !== "pending" || !isPlain(evidence)
    || Object.keys(evidence).sort().join(",") !== "mcp_tools_call_count,observed_provider_requests,reservation_count"
    || evidence.mcp_tools_call_count !== 1 || evidence.reservation_count !== 1 || (evidence.observed_provider_requests !== 0 && evidence.observed_provider_requests !== 1)
    || value.reservation_count !== 1 || value.mcp_tools_call_count !== 0 || value.observed_provider_requests !== 0) fail("PROOF_STATE_TRANSITION");
  return replaceDurably(path, current.bytes, { ...value, ...evidence });
}

export async function completeWrapper(path) {
  const current = await secureRead(path); const value = current.value;
  if (value.wrapper_status === "completed") return value;
  if (!(value.kind === "build" ? terminalBuild : terminalLive).has(value.inner_status)) fail("PROOF_STATE_TRANSITION");
  return replaceDurably(path, current.bytes, { ...value, wrapper_status: "completed" });
}

export async function recoverProofState(path, _sideEffectHooks = undefined) {
  const current = await secureRead(path); const value = current.value;
  if (value.wrapper_status === "completed") return value;
  if ((value.kind === "build" ? terminalBuild : terminalLive).has(value.inner_status)) return completeWrapper(path);
  // Recovery is intentionally evidence-only. Once a generation is prepared or
  // consumed it is never rebuilt, re-read from credentials, or respawned.
  const terminal = value.kind === "build"
    ? (value.inner_status === "prepared" ? "preflight_failed" : "build_failed")
    : "failed";
  await replaceDurably(path, current.bytes, { ...value, inner_status: terminal });
  return completeWrapper(path).then(() => readProofState(path));
}
