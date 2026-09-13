#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson } from "./audit-live-readiness.mjs";

export const AUTOMATIC_BUILD_CONTROLS = Object.freeze({ build_count: 1, verifier_build_count: 0 });
export const AUTOMATIC_LIVE_CONTROLS = Object.freeze({
  diagnostic_second_call: false,
  fallback: false,
  max_provider_requests: 1,
  max_retries: 0,
  max_tools_calls: 1,
});

const lower64 = /^[0-9a-f]{64}$/u;
const imageId = /^sha256:[0-9a-f]{64}$/u;
const allowedModes = new Set(["auto-build", "auto-live-once"]);

function fail(code) { throw new Error(code); }
function plain(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
async function fsyncDirectory(path) {
  const handle = await open(path, fsConstants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

export function validateFixedInvocation(argv) {
  if (!Array.isArray(argv) || argv.length !== 1 || typeof argv[0] !== "string" || !allowedModes.has(argv[0])) fail("AUTOMATIC_ARGV");
  return argv[0];
}

export async function claimExclusive(path, claim) {
  if (typeof path !== "string" || path.length === 0 || !plain(claim) || !lower64.test(claim.generation) || !["build", "live"].includes(claim.kind)) fail("AUTOMATIC_CLAIM");
  const value = claim.kind === "live"
    ? { generation: claim.generation, max_provider_requests: 1, schema: "evidencelens.automatic-live-claim.v1", status: "consumed" }
    : { build_count: 1, generation: claim.generation, schema: "evidencelens.automatic-build-claim.v1", status: "started" };
  let handle;
  try {
    handle = await open(path, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(Buffer.from(canonicalJson(value)));
    await handle.sync();
    await handle.close(); handle = undefined;
    await fsyncDirectory(dirname(path));
    return value;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    if (error?.code === "EEXIST") fail("AUTOMATIC_REPLAY");
    if (error instanceof Error && error.message.startsWith("AUTOMATIC_")) throw error;
    fail("AUTOMATIC_CLAIM");
  }
}

export async function runAutomaticBuild(options) {
  if (!plain(options)) fail("AUTOMATIC_PREFLIGHT");
  const authenticate = options.authenticate;
  const claim = options.claim;
  const buildOnce = options.buildOnce;
  const verifyExisting = options.verifyExisting;
  if (![authenticate, claim, buildOnce, verifyExisting].every((entry) => typeof entry === "function")) fail("AUTOMATIC_PREFLIGHT");
  try { await authenticate(); } catch { fail("AUTOMATIC_PREFLIGHT"); }
  try { await claim(); } catch (error) {
    if (error instanceof Error && error.message === "AUTOMATIC_REPLAY") throw error;
    fail("AUTOMATIC_REPLAY");
  }
  let built;
  try { built = await buildOnce(AUTOMATIC_BUILD_CONTROLS); } catch { fail("AUTOMATIC_BUILD_FAILED"); }
  if (!plain(built) || !imageId.test(built.image_id)) fail("AUTOMATIC_BUILD_FAILED");
  let verified;
  try { verified = await verifyExisting(built, AUTOMATIC_BUILD_CONTROLS); } catch { fail("AUTOMATIC_VERIFICATION_FAILED"); }
  if (!plain(verified) || verified.image_id !== built.image_id) fail("AUTOMATIC_VERIFICATION_FAILED");
  return Object.freeze({ image_id: verified.image_id });
}

export async function runAutomaticLiveOnce(options) {
  if (!plain(options)) fail("AUTOMATIC_PREFLIGHT");
  const { authenticateReadyBuild, consume, readCredential, spawnOnce } = options;
  if (![authenticateReadyBuild, consume, readCredential, spawnOnce].every((entry) => typeof entry === "function")) fail("AUTOMATIC_PREFLIGHT");
  try { await authenticateReadyBuild(); } catch { fail("AUTOMATIC_PREFLIGHT"); }
  try { await consume(); } catch { fail("AUTOMATIC_REPLAY"); }
  let credential;
  try { credential = await readCredential(); } catch { fail("AUTOMATIC_CREDENTIAL"); }
  if (typeof credential !== "string" || credential.trim() === "") fail("AUTOMATIC_CREDENTIAL");
  let outcome;
  try { outcome = await spawnOnce(AUTOMATIC_LIVE_CONTROLS, credential); } catch { outcome = { status: "failed" }; }
  credential = undefined;
  return Object.freeze({ status: outcome?.status === "passed" ? "passed" : "failed" });
}

async function main(argv) {
  validateFixedInvocation(argv);
  // Concrete source sets and generation locators are supplied only by reviewed
  // phase artifacts. Running this primitive without one is a fail-closed error.
  fail("AUTOMATIC_PREFLIGHT");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    const code = error instanceof Error && /^AUTOMATIC_[A-Z_]+$/u.test(error.message) ? error.message : "AUTOMATIC_FAILED";
    process.stderr.write(`automatic-live-review: ${code}\n`);
    process.exitCode = 50;
  });
}
