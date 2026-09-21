#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmod, mkdtemp, open, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";
import { auditExecutionAuto, auditProofAuto, closeTerminalOwnerCapability, createTerminalOwnerCapability, validateTerminalOwnerReceipt } from "./audit-proof-chain.mjs";
import { produceBuildGeneration } from "./docker-proof-produce.mjs";
import { verifyExistingBuild } from "./docker-proof-verify-existing.mjs";
import { authenticateTerminalSnapshot, completeWrapper, createAuthenticatedTerminalSnapshot, createProofState, readProofState, recordProviderAttempt, recordRequestEvidence, transitionProofState } from "./live-proof-state.mjs";
import { assertProviderDefaultOutputEnvironment, runReviewHarness } from "./docker-review-real.mjs";

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
const execFileAsync = promisify(execFile);
const phaseDirectory = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e";
export const FIXED_AUTOMATIC_PATHS = Object.freeze({
  forensic: `${phaseDirectory}/10-167-CONSUMED-LIVE.json`,
  source: `${phaseDirectory}/10-167-SOURCE.json`,
  review: `${phaseDirectory}/10-167-REVIEW.md`,
  security: `${phaseDirectory}/10-167-SECURITY.md`,
  build: `${phaseDirectory}/10-168-FINAL-BUILD.json`,
  state: `${phaseDirectory}/.10-169-live-state.json`,
  terminal: `${phaseDirectory}/.10-169-terminal-snapshot.json`,
  transition: `${phaseDirectory}/10-169-TRANSITION.json`,
  execution: `${phaseDirectory}/10-169-EXECUTION.json`,
  proof: `${phaseDirectory}/10-169-PROOF.json`,
  localValidation: `${phaseDirectory}/10-169-LOCAL-VALIDATION.json`,
});
const fixedReviewPaths = Object.freeze([
  FIXED_AUTOMATIC_PATHS.source,
  FIXED_AUTOMATIC_PATHS.review,
  FIXED_AUTOMATIC_PATHS.security,
]);
const fixedBuildPath = FIXED_AUTOMATIC_PATHS.build;
const fixedLiveStatePath = FIXED_AUTOMATIC_PATHS.state;
const fixedTerminalPath = FIXED_AUTOMATIC_PATHS.terminal;
const forensicCompatibilityPaths = Object.freeze({
  build: `${phaseDirectory}/10-50-FINAL-BUILD.json`, forensic: `${phaseDirectory}/10-53-FORENSIC.json`,
  source: `${phaseDirectory}/10-49-SOURCE.json`, state: `${phaseDirectory}/.10-51-live-state.json`,
});

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

export async function runStatefulAutomaticLive(options) {
  if (!plain(options) || typeof options.path !== "string" || typeof options.terminalPath !== "string" || !lower64.test(options.generation)) fail("AUTOMATIC_PREFLIGHT");
  try { assertProviderDefaultOutputEnvironment(options.harnessOptions?.environment ?? process.env); }
  catch { fail("AUTOMATIC_PREFLIGHT"); }
  const interrupt = typeof options.interrupt === "function" ? options.interrupt : async () => undefined;
  const terminalKey = randomBytes(32);
  const finishEvidence = async (snapshot) => {
    const state = await readProofState(options.path);
    if (typeof options.finishEvidence === "function") await options.finishEvidence({ snapshot, state });
  };
  await createProofState(options.path, "live", options.generation);
  await transitionProofState(options.path, "preflight_started");
  try { await options.authenticateReadyBuild(); } catch {
    const snapshot = createAuthenticatedTerminalSnapshot({
      branch: "pre_reservation_preflight", diagnostic: { code: "preflight" }, generation: options.generation,
    }, terminalKey);
    await sealTerminal(options.terminalPath, snapshot, terminalKey);
    await transitionProofState(options.path, "failed");
    await completeWrapper(options.path);
    await finishEvidence(snapshot);
    terminalKey.fill(0);
    fail("AUTOMATIC_PREFLIGHT");
  }
  await transitionProofState(options.path, "preflight_authenticated");
  let credential;
  try { credential = await options.readCredential(); } catch { credential = undefined; }
  if (typeof credential !== "string" || credential.trim() === "") {
    const snapshot = createAuthenticatedTerminalSnapshot({
      branch: "pre_reservation_preflight", diagnostic: { code: "credential" }, generation: options.generation,
    }, terminalKey);
    await sealTerminal(options.terminalPath, snapshot, terminalKey);
    await transitionProofState(options.path, "failed");
    await completeWrapper(options.path);
    await finishEvidence(snapshot);
    terminalKey.fill(0);
    fail("AUTOMATIC_CREDENTIAL");
  }
  await interrupt("before-consume");
  await transitionProofState(options.path, "consumed");
  await interrupt("after-consume");
  let status = "failed";
  let requestEvidence;
  let terminalSnapshot;
  await interrupt("before-spawn");
  await recordProviderAttempt(options.path);
  try {
    await (options.runHarness ?? runReviewHarness)({
      ...(plain(options.harnessOptions) ? options.harnessOptions : {}),
      isOffline: false,
      environment: { ...(options.harnessOptions?.environment ?? process.env), DEEPSEEK_API_KEY: credential },
      terminalGeneration: options.generation,
      terminalKey,
      retainRequestEvidence: (evidence) => { requestEvidence = evidence; },
      retainTerminalSnapshot: (snapshot) => {
        if (terminalSnapshot !== undefined) fail("AUTOMATIC_TERMINAL_DUPLICATE");
        terminalSnapshot = snapshot;
      },
    });
    status = "passed";
  } catch { status = "failed"; }
  credential = undefined;
  if (terminalSnapshot === undefined) {
    terminalSnapshot = createAuthenticatedTerminalSnapshot({
      branch: requestEvidence?.mcp_tools_call_count === 1 ? "post_tools_pre_fetch" : "pre_tools_post_reservation",
      diagnostic: { code: "terminal_callback_missing" }, generation: options.generation,
    }, terminalKey);
    await sealTerminal(options.terminalPath, terminalSnapshot, terminalKey);
    if (requestEvidence?.mcp_tools_call_count === 1) await recordRequestEvidence(options.path, requestEvidence);
    await transitionProofState(options.path, "failed");
    await completeWrapper(options.path);
    try { await finishEvidence(terminalSnapshot); } catch { /* failed validation is durably recorded by the owner */ }
    terminalKey.fill(0);
    fail("AUTOMATIC_TERMINAL_MISSING");
  }
  authenticateTerminalSnapshot(terminalSnapshot, { generation: options.generation, key: terminalKey });
  await sealTerminal(options.terminalPath, terminalSnapshot, terminalKey);
  if (requestEvidence?.mcp_tools_call_count === 1) await recordRequestEvidence(options.path, requestEvidence);
  else if (terminalSnapshot.branch !== "pre_tools_post_reservation") fail("AUTOMATIC_TERMINAL_STATE");
  await interrupt("after-spawn");
  await interrupt("before-result");
  await transitionProofState(options.path, status);
  await interrupt("after-result");
  await interrupt("before-wrapper");
  const result = await completeWrapper(options.path);
  await interrupt("after-wrapper");
  await finishEvidence(terminalSnapshot);
  terminalKey.fill(0);
  return Object.freeze({ ...result, terminal_branch: terminalSnapshot.branch, terminal_sha256: sha256Hex(Buffer.from(canonicalJson(terminalSnapshot))) });
}

function sourceIdentity(source) {
  return {
    certifier_sha256: source.certifier_sha256, manifest_sha256: source.manifest_sha256,
    non_planning_tree: source.non_planning_tree, reviewed_commit: source.reviewed_commit,
  };
}

function diagnosticOutcome(snapshot) {
  if (snapshot.branch === "passed") return { code: null, outcome: "passed" };
  if (snapshot.branch === "pre_reservation_preflight") return { code: "pre_fetch", outcome: "preflight_failed" };
  if (snapshot.observed_provider_requests === 1) return { code: "request", outcome: "request_failed" };
  return { code: "pre_fetch", outcome: "request_failed" };
}

export async function sealAutomaticLiveEvidence(input) {
  const { paths, generation, snapshot, state } = input;
  if (!plain(paths) || !plain(snapshot) || !plain(state) || generation !== snapshot.generation || generation !== state.generation) fail("AUTOMATIC_TERMINAL_STATE");
  const preflight = snapshot.branch === "pre_reservation_preflight";
  let source; let build; let reviewBytes; let securityBytes;
  if (preflight) {
    source = await readCanonicalJson(paths.forensic);
    build = null; reviewBytes = null; securityBytes = null;
  } else {
    [source, build, reviewBytes, securityBytes] = await Promise.all([
      readCanonicalJson(paths.source), readCanonicalJson(paths.build), readFile(paths.review), readFile(paths.security),
    ]);
  }
  const identity = sourceIdentity(source);
  const transition = { branch: preflight ? "preflight_started" : "preflight_authenticated", generation, schema: "evidencelens.live-transition.v1" };
  const { code, outcome } = diagnosticOutcome(snapshot);
  const passed = outcome === "passed";
  const receipt = snapshot.request_receipt;
  const execution = {
    ...identity, argv: ["docker", "compose", "--profile", "review", "run", "--rm", "-T", "review"],
    build_generation: snapshot.reservation_count === 0 ? "unavailable_from_committed_state" : build.generation,
    clean_exit: passed, close: snapshot.close, diagnostic: passed ? null : { code, path: "transport.fetch" },
    environment: { profile: "review", provider_disabled: false }, execution_generation: generation,
    exit: snapshot.exit, finding_count: passed ? snapshot.result.finding_count : 0, fixture_count: passed ? snapshot.result.fixture_count : 0,
    image_id: snapshot.reservation_count === 0 ? "unavailable_from_committed_state" : build.image_id,
    mcp_tools_call_count: snapshot.mcp_tools_call_count, model: snapshot.result?.model ?? "", outcome, provider: "deepseek", repair_set: [],
    request_receipt: receipt, request_receipt_sha256: receipt === null ? null : sha256Hex(Buffer.from(canonicalJson(receipt))),
    reservation_count: snapshot.reservation_count,
    result: passed ? snapshot.result : null, result_sha256: passed ? sha256Hex(Buffer.from(canonicalJson(snapshot.result))) : null,
    schema: "evidencelens.execution.v2", status: passed ? "passed" : "gaps_found", transcript: snapshot.transcript,
    transcript_sha256: snapshot.transcript === null ? null : sha256Hex(Buffer.from(canonicalJson(snapshot.transcript))),
  };
  const proof = {
    ...identity, build_sha256: preflight ? "unavailable_from_committed_state" : sha256Hex(Buffer.from(canonicalJson(build))), clean_exit: passed,
    execution_sha256: sha256Hex(Buffer.from(canonicalJson(execution))), finding_count: execution.finding_count,
    fixture_count: execution.fixture_count, outcome, review_sha256: preflight ? "unavailable_from_committed_state" : sha256Hex(reviewBytes), schema: "evidencelens.live-proof.v3",
    security_sha256: preflight ? "unavailable_from_committed_state" : sha256Hex(securityBytes),
    source_sha256: preflight ? "unavailable_from_committed_state" : sha256Hex(Buffer.from(canonicalJson(source))), status: execution.status,
  };
  const sealedTransition = await atomicJson(paths.transition, transition);
  const sealedExecution = await atomicJson(paths.execution, execution);
  const sealedProof = await atomicJson(paths.proof, proof);
  const capability = createTerminalOwnerCapability();
  const capabilityIdentity = randomBytes(32).toString("hex");
  let executionValidation = "failed"; let proofValidation = "failed";
  try {
    try { auditExecutionAuto(capability, sealedTransition, sealedExecution); executionValidation = "passed"; } catch { /* receipt records failure */ }
    try { auditProofAuto(capability, sealedTransition, sealedExecution, sealedProof); proofValidation = "passed"; } catch { /* receipt records failure */ }
  } finally { closeTerminalOwnerCapability(capability); }
  const validation = validateTerminalOwnerReceipt({
    artifact_sha256: {
      execution: sha256Hex(Buffer.from(canonicalJson(sealedExecution))), proof: sha256Hex(Buffer.from(canonicalJson(sealedProof))),
      transition: sha256Hex(Buffer.from(canonicalJson(sealedTransition))),
    },
    auditors: { execution: "execution-auto", proof: "proof-auto" }, branch: sealedTransition.branch,
    capability_identity: capabilityIdentity, generation, outcome, schema: "evidencelens.terminal-owner-validation.v1",
    validation: { execution: executionValidation, proof: proofValidation },
  });
  await atomicJson(paths.localValidation, validation);
  if (executionValidation !== "passed" || proofValidation !== "passed") fail("AUTOMATIC_TERMINAL_STATE");
  return Object.freeze({ execution: sealedExecution, localValidation: validation, proof: sealedProof, transition: sealedTransition });
}

async function runNodeScript(script, argv) {
  try {
    return await execFileAsync(process.execPath, [script, ...argv], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      maxBuffer: 1024 * 1024,
    });
  } catch {
    fail("AUTOMATIC_PREFLIGHT");
  }
}

async function readCanonicalJson(path) {
  try {
    const bytes = await readFile(path);
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (canonicalJson(value) !== bytes.toString("utf8")) fail("AUTOMATIC_PREFLIGHT");
    return value;
  } catch (error) {
    if (error instanceof Error && error.message === "AUTOMATIC_PREFLIGHT") throw error;
    fail("AUTOMATIC_PREFLIGHT");
  }
}

async function atomicJson(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`;
  let handle;
  try {
    handle = await open(temporary, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await handle.writeFile(canonicalJson(value));
    await handle.sync();
    await handle.close(); handle = undefined;
    await rename(temporary, path);
    await fsyncDirectory(dirname(path));
    return await readCanonicalJson(path);
  } catch {
    await handle?.close().catch(() => undefined);
    fail("AUTOMATIC_BUILD_FAILED");
  }
}

async function sealTerminal(path, snapshot, key) {
  const claim = `${path}.claim`;
  await claimExclusive(claim, { generation: snapshot.generation, kind: "live" });
  const sealed = await atomicJson(path, snapshot);
  authenticateTerminalSnapshot(sealed, { generation: snapshot.generation, key });
  return Object.freeze(sealed);
}

/** The old 10-49/50/51 tuple is readable only through its dedicated forensic
 * audit. It has no build, live, claim, proof, or synchronization callback. */
export async function readForensicCompatibility() {
  await runNodeScript("scripts/audit-proof-chain.mjs", ["forensic-consumed-generation", forensicCompatibilityPaths.forensic]);
  return Object.freeze(await readCanonicalJson(forensicCompatibilityPaths.forensic));
}

async function prepareBuild(source) {
  const root = await mkdtemp(join(tmpdir(), "evidencelens-auto-build-"));
  const archivePath = join(root, "source.tar");
  const contextPath = join(root, "context");
  const descriptorPath = join(root, "BUILD_GENERATION.json");
  const resultPath = join(root, "BUILD_RESULT.json");
  const iidPath = join(root, "image.id");
  await execFileAsync("git", ["archive", "--format=tar", "-o", archivePath, source.reviewed_commit], { cwd: process.cwd(), env: process.env });
  await chmod(archivePath, 0o600);
  await execFileAsync("mkdir", [contextPath]);
  await execFileAsync("tar", ["-xf", archivePath, "-C", contextPath]);
  const archive = { locator: archivePath, sha256: sha256Hex(await readFile(archivePath)) };
  const generation = randomBytes(32).toString("hex");
  const descriptor = {
    archive,
    build_argv: ["docker", "build", "--iidfile", iidPath, "-f", "Dockerfile.proof", contextPath],
    generation,
    non_planning_tree: source.non_planning_tree,
    result_locator: resultPath,
    reviewed_commit: source.reviewed_commit,
    schema: "evidencelens.build-generation.v1",
    status: "prepared",
  };
  await writeFile(descriptorPath, canonicalJson(descriptor), { mode: 0o600, flag: "wx" });
  const handoffPath = join(root, "BUILD_HANDOFF.json");
  await writeFile(handoffPath, canonicalJson({
    archive,
    descriptor_locator: descriptorPath,
    descriptor_mode: "0600",
    descriptor_owner: process.getuid?.(),
    descriptor_sha256: sha256Hex(await readFile(descriptorPath)),
    generation,
    non_planning_tree: source.non_planning_tree,
    reviewed_commit: source.reviewed_commit,
    schema: "evidencelens.build-handoff.v1",
    status: "prepared",
  }), { mode: 0o600, flag: "wx" });
  return { generation, handoffPath };
}

/** Production entrypoint. It deliberately has no options: every executable and
 * evidence locator is repository-owned and every child is launched without a
 * shell. The proof producer owns the exclusive generation claim and single
 * archive build; its verifier only inspects that resulting image. */
export async function runAutomaticBuildPipeline(dependencies) {
  if (!plain(dependencies) || !["audit", "readSource", "prepare", "produce", "verify", "seal"].every((key) => typeof dependencies[key] === "function")) fail("AUTOMATIC_PREFLIGHT");
  await dependencies.audit("reviews-auto", fixedReviewPaths);
  const source = await dependencies.readSource(fixedReviewPaths[0]);
  let prepared;
  try { prepared = await dependencies.prepare(source); } catch { fail("AUTOMATIC_BUILD_FAILED"); }
  const productionResult = await dependencies.produce(prepared.handoffPath, {
    expectedPath: prepared.handoffPath,
    authenticatePlanning: async () => undefined,
  });
  if (productionResult?.status !== "completed") fail("AUTOMATIC_BUILD_FAILED");
  let buildResult;
  try {
    buildResult = await dependencies.verify(prepared.handoffPath, {
      expectedPath: prepared.handoffPath,
      authenticatePlanning: async () => undefined,
    });
  } catch { fail("AUTOMATIC_VERIFICATION_FAILED"); }
  if (!plain(buildResult) || !imageId.test(buildResult.image_id)) fail("AUTOMATIC_VERIFICATION_FAILED");
  const finalBuild = await dependencies.seal(fixedBuildPath, {
    ...source,
    build_count: 1,
    daemon_identity_sha256: buildResult.daemon_identity_sha256,
    fixture_sha256: buildResult.fixture_sha256,
    generation: prepared.generation,
    image_config_sha256: buildResult.image_config_sha256,
    image_content_sha256: buildResult.image_content_sha256,
    image_id: buildResult.image_id,
    runtime_sha256: buildResult.runtime_sha256,
    schema: "evidencelens.build.v2",
    status: "ready",
    verifier_build_count: 0,
  });
  await dependencies.audit("build-auto", [fixedBuildPath, ...fixedReviewPaths]);
  return Object.freeze({ generation: finalBuild.generation, image_id: finalBuild.image_id, status: "ready" });
}

export async function runFixedAutomaticBuild() {
  return runAutomaticBuildPipeline({
    audit: (mode, paths) => runNodeScript("scripts/audit-proof-chain.mjs", [mode, ...paths]),
    prepare: prepareBuild,
    produce: produceBuildGeneration,
    readSource: readCanonicalJson,
    seal: atomicJson,
    verify: verifyExistingBuild,
  });
}

/** Production live entrypoint. Authentication precedes both state consumption
 * and credential access; the state machine consumes the generation before the
 * only guarded harness invocation. */
export async function runFixedAutomaticLive(dependencies = {}) {
  const paths = dependencies.paths ?? FIXED_AUTOMATIC_PATHS;
  const generation = dependencies.generation ?? randomBytes(32).toString("hex");
  let authenticatedImageId;
  return (dependencies.runStateful ?? runStatefulAutomaticLive)({
    authenticateReadyBuild: async () => {
      await (dependencies.auditBuild ?? runNodeScript)("scripts/audit-proof-chain.mjs", ["build-auto", paths.build, paths.source, paths.review, paths.security]);
      const build = await readCanonicalJson(paths.build);
      if (build.status !== "ready" || !lower64.test(build.generation) || !imageId.test(build.image_id)) fail("AUTOMATIC_PREFLIGHT");
      authenticatedImageId = build.image_id;
    },
    finishEvidence: ({ snapshot, state }) => (dependencies.sealEvidence ?? sealAutomaticLiveEvidence)({ generation, paths, snapshot, state }),
    generation,
    path: paths.state,
    terminalPath: paths.terminal,
    readCredential: dependencies.readCredential ?? (async () => process.env.DEEPSEEK_API_KEY),
    runHarness: (options) => (dependencies.runHarness ?? runReviewHarness)({ ...options, imageId: authenticatedImageId }),
  });
}

async function main(argv) {
  const mode = validateFixedInvocation(argv);
  const result = mode === "auto-build" ? await runFixedAutomaticBuild() : await runFixedAutomaticLive();
  process.stdout.write(canonicalJson(result));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    const code = error instanceof Error && /^AUTOMATIC_[A-Z_]+$/u.test(error.message) ? error.message : "AUTOMATIC_FAILED";
    process.stderr.write(`automatic-live-review: ${code}\n`);
    process.exitCode = 50;
  });
}
