#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { StringDecoder } from "node:string_decoder";
import { promisify } from "node:util";
import { createHash, randomBytes } from "node:crypto";
import { reviewResponseSchema } from "../dist/contracts/review.js";
import { DEEPSEEK_MODELS } from "../dist/providers/config.js";
import {
  CHILD_DIAGNOSTIC_GENERATION_ENV,
  CHILD_DIAGNOSTIC_KEY_ENV,
  CHILD_DIAGNOSTIC_MAX_BYTES,
  CHILD_DIAGNOSTIC_PREFIX,
  parseChildDiagnosticFrame
} from "../dist/providers/diagnostics.js";

const offline = process.argv.includes("--offline");
const controlTimeoutMs = 30_000;
const liveProofMarginMs = 30_000;
const protocolVersion = "2025-11-25";
const expectedReferences = [
  "filesystem://course/tests/fixtures/evidence/text/assignment.txt",
  "filesystem://course/tests/fixtures/evidence/tables/rubric.csv",
  "filesystem://course/tests/fixtures/evidence/images/rubric-screenshot.png",
  "filesystem://course/tests/fixtures/evidence/pdfs/text-page.pdf"
];
const rawFixtureMarkers = ["Read the assignment brief.", "Criterion,Excellent"];

const failurePhases = new Set(["preflight", "docker", "initialize", "tools/list", "tools/call", "protocol", "timeout"]);
const execFileAsync = promisify(execFile);

const diagnosticSpecs = [
  ["rpc-envelope-plain-object", "mcp", "scripts/docker-review-real.mjs", ["rpc", "envelope"], "invalid_type"],
  ["rpc-envelope-version", "mcp", "scripts/docker-review-real.mjs", ["rpc", "jsonrpc"], "invalid_value"],
  ["rpc-envelope-id", "mcp", "scripts/docker-review-real.mjs", ["rpc", "id"], "invalid_value"],
  ["rpc-error-result-exclusive", "mcp", "scripts/docker-review-real.mjs", ["rpc", "result_error"], "custom"],
  ["tool-result-envelope", "mcp", "scripts/docker-review-real.mjs", ["tool", "result"], "invalid_type"],
  ["tool-content-cardinality", "mcp", "scripts/docker-review-real.mjs", ["tool", "content", "length"], "too_big"],
  ["tool-content-type", "mcp", "scripts/docker-review-real.mjs", ["tool", "content", 0, "type"], "invalid_value"],
  ["tool-content-text-json", "mcp", "scripts/docker-review-real.mjs", ["tool", "content", 0, "text"], "invalid_format"],
  ["public-schema-keyset", "public", "src/contracts/review.ts", ["response"], "unrecognized_keys"],
  ["public-schema-status", "public", "src/contracts/review.ts", ["status"], "invalid_value"],
  ["public-schema-request-id", "public", "src/contracts/review.ts", ["requestId"], "invalid_type"],
  ["public-schema-normalized-evidence", "public", "src/contracts/review.ts", ["normalizedEvidence"], "invalid_type"],
  ["public-schema-findings", "public", "src/contracts/review.ts", ["findings"], "invalid_type"],
  ["public-schema-metadata", "public", "src/contracts/review.ts", ["metadata"], "invalid_type"],
  ["provider-identity-name", "provider", "src/tools/review.ts", ["metadata", "provider", "name"], "invalid_value"],
  ["provider-identity-model", "provider", "src/tools/review.ts", ["metadata", "provider", "model"], "invalid_value"],
  ["fixture-set-cardinality", "orchestration", "scripts/docker-review-real.mjs", ["normalizedEvidence", "length"], "too_small"],
  ["fixture-set-identity", "orchestration", "scripts/docker-review-real.mjs", ["normalizedEvidence", "source", "reference"], "invalid_value"],
  ["fixture-set-role", "orchestration", "scripts/docker-review-real.mjs", ["normalizedEvidence", "role"], "invalid_value"],
  ["fixture-set-hash", "provenance", "src/providers/provenance.ts", ["normalizedEvidence", "contentHash"], "invalid_format"],
  ["citation-provenance-evidence-id", "provenance", "src/providers/provenance.ts", ["citations", "evidenceId"], "invalid_value"],
  ["citation-provenance-location", "provenance", "src/providers/provenance.ts", ["citations", "location"], "invalid_value"],
  ["citation-provenance-hash", "provenance", "src/providers/provenance.ts", ["citations", "contentHash"], "invalid_value"],
  ["citation-provenance-source", "provenance", "src/providers/provenance.ts", ["citations", "sourceReference"], "invalid_value"],
  ["citation-provenance-visual", "provenance", "src/providers/provenance.ts", ["citations", "visual"], "custom"],
  ["disclosure-guard-key", "public", "src/tools/review.ts", ["disclosure", "key"], "custom"],
  ["disclosure-guard-path", "public", "scripts/docker-review-real.mjs", ["disclosure", "path"], "custom"],
  ["disclosure-guard-fixture", "public", "scripts/docker-review-real.mjs", ["disclosure", "fixture"], "custom"],
  ["child-exit-code", "transport", "scripts/docker-review-real.mjs", ["child", "code"], "invalid_value"],
  ["child-exit-signal", "transport", "scripts/docker-review-real.mjs", ["child", "signal"], "invalid_value"],
  ["child-exit-close-agreement", "transport", "scripts/docker-review-real.mjs", ["child", "close"], "custom"],
  ["bounded-io-stdout-line", "transport", "scripts/docker-review-real.mjs", ["bounds", "stdout"], "too_big"],
  ["bounded-io-stderr", "transport", "scripts/docker-review-real.mjs", ["bounds", "stderr"], "too_big"],
  ["bounded-io-queue", "transport", "scripts/docker-review-real.mjs", ["bounds", "queue"], "too_big"],
  ["bounded-io-deadline", "transport", "scripts/docker-review-real.mjs", ["bounds", "deadline"], "too_big"],
  ["provider-http-json-decode", "provider", "src/providers/deepseek.ts", ["provider", "http", "json"], "invalid_format"],
  ["provider-choice-cardinality", "provider", "src/providers/deepseek.ts", ["provider", "choices"], "too_small"],
  ["provider-message-content", "provider", "src/providers/deepseek.ts", ["provider", "message", "content"], "invalid_type"],
  ["provider-reasoning-selection", "provider", "src/providers/deepseek.ts", ["provider", "message", "reasoning_content"], "invalid_type"],
  ["provider-content-size", "provider", "src/providers/deepseek.ts", ["provider", "content", "bytes"], "too_big"],
  ["provider-json-object-extraction", "provider", "src/providers/deepseek.ts", ["provider", "content", "object"], "invalid_format"],
  ["finding-presence", "provider", "src/providers/provenance.ts", ["findings"], "too_small"],
  ["finding-draft-keyset", "provider", "src/providers/provenance.ts", ["findings", "keyset"], "unrecognized_keys"],
  ["finding-draft-id", "provider", "src/providers/provenance.ts", ["findings", "id"], "invalid_type"],
  ["finding-draft-type", "provider", "src/providers/provenance.ts", ["findings", "type"], "invalid_value"],
  ["finding-draft-enums", "provider", "src/providers/provenance.ts", ["findings", "enum"], "invalid_value"],
  ["finding-draft-text-bound", "provider", "src/providers/provenance.ts", ["findings", "text"], "too_big"],
  ["finding-follow-up", "provider", "src/providers/provenance.ts", ["findings", "followUpChecks"], "too_small"],
  ["finding-evidence-ids", "provenance", "src/providers/provenance.ts", ["findings", "evidenceIds"], "custom"],
  ["finding-citations", "provenance", "src/providers/provenance.ts", ["findings", "citations"], "custom"],
  ["provenance-order", "provenance", "src/providers/provenance.ts", ["provenance", "order"], "custom"],
  ["provenance-uniqueness", "provenance", "src/providers/provenance.ts", ["provenance", "unique"], "custom"],
  ["orchestration-plain-object", "orchestration", "src/tools/review.ts", ["orchestration", "object"], "invalid_type"],
  ["orchestration-keyset", "orchestration", "src/tools/review.ts", ["orchestration", "keyset"], "unrecognized_keys"],
  ["orchestration-schema", "orchestration", "src/tools/review.ts", ["orchestration", "schema"], "custom"],
  ["orchestration-identity", "orchestration", "src/tools/review.ts", ["orchestration", "identity"], "custom"],
  ["orchestration-namespace", "orchestration", "src/tools/review.ts", ["orchestration", "namespace"], "custom"],
  ["orchestration-collision", "orchestration", "src/tools/review.ts", ["orchestration", "collision"], "custom"],
  ["orchestration-merged-schema", "orchestration", "src/tools/review.ts", ["orchestration", "merged"], "custom"]
];

const featureKey = (path, code) => JSON.stringify({ path, code });
const fingerprint = (key) => createHash("sha256").update(`evidencelens-diagnostic-v1:${key}`).digest("hex");
const diagnosticFeatureIndex = new Map();
const diagnosticInvariantIndex = new Map();
export const DIAGNOSTIC_INVARIANT_MAP = Object.freeze(Object.fromEntries(diagnosticSpecs.map(([invariant_id, tier, production_file, path, code], index) => {
  const key = featureKey(path, code);
  const entry = Object.freeze({ invariant_id, tier, production_file, test_file: "tests/scripts/docker-review-real.test.ts", regression_id: `P10-24-${String(index + 1).padStart(3, "0")}`, permitted_files: Object.freeze([production_file]) });
  if (diagnosticFeatureIndex.has(key)) throw new Error("diagnostic registry collision");
  diagnosticFeatureIndex.set(key, { entry, feature_fingerprint: fingerprint(key) });
  diagnosticInvariantIndex.set(invariant_id, Object.freeze({ path: Object.freeze([...path]), code }));
  return [invariant_id, entry];
})));

const registryEntries = Object.values(DIAGNOSTIC_INVARIANT_MAP);
if (new Set(registryEntries.map(({ invariant_id }) => invariant_id)).size !== registryEntries.length
  || new Set(registryEntries.map(({ regression_id }) => regression_id)).size !== registryEntries.length
  || new Set([...diagnosticFeatureIndex.values()].map(({ feature_fingerprint }) => feature_fingerprint)).size !== registryEntries.length) {
  throw new Error("diagnostic registry collision");
}

export function classifyDiagnostic(features) {
  if (!Array.isArray(features) || features.length !== 1) {
    return { invariant_id: "ambiguous", feature_fingerprint: fingerprint("ambiguous"), repair: "no_repair", follow_up_request_budget: 0 };
  }
  const feature = features[0];
  const match = diagnosticFeatureIndex.get(featureKey(feature?.path, feature?.code));
  if (match === undefined) return { invariant_id: "ambiguous", feature_fingerprint: fingerprint("ambiguous"), repair: "no_repair", follow_up_request_budget: 0 };
  const { entry, feature_fingerprint } = match;
  return { invariant_id: entry.invariant_id, feature_fingerprint, tier: entry.tier, regression_id: entry.regression_id, permitted_files: entry.permitted_files, repair: "allowlisted" };
}

export function diagnosticFeatureForInvariant(invariantId) {
  const feature = diagnosticInvariantIndex.get(invariantId);
  if (feature === undefined) return undefined;
  return { path: [...feature.path], code: feature.code };
}

export function classifyFailure(phase, ..._privateDetails) {
  if (failurePhases.has(phase)) return phase;
  if (phase === "shutdown") return "timeout";
  return "protocol";
}

function fail(phase, ...privateDetails) {
  void privateDetails;
  throw new Error(`[docker-review:${classifyFailure(phase)}] failed`);
}

function jsonLine(message) {
  return `${JSON.stringify(message)}\n`;
}

export function methodTimeoutMs(method, toolsCallTimeoutMs = controlTimeoutMs) {
  return method === "tools/call" ? toolsCallTimeoutMs : controlTimeoutMs;
}

function isOrdinaryObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isJsonRpcResponse(message, expectedId) {
  if (!isOrdinaryObject(message) || message.jsonrpc !== "2.0" || message.id !== expectedId) return false;
  const hasResult = Object.prototype.hasOwnProperty.call(message, "result");
  const hasError = Object.prototype.hasOwnProperty.call(message, "error");
  return hasResult !== hasError;
}

export function liveProofPreflight(resolvedEnvironment, baseEnvironment = process.env) {
  try {
    const retry = resolvedEnvironment?.DEEPSEEK_MAX_RETRIES;
    const rawTimeout = resolvedEnvironment?.DEEPSEEK_TIMEOUT_MS ?? "30000";
    if (retry !== "0" || !/^(?:0|[1-9]\d*)$/u.test(rawTimeout)) fail("preflight");
    const providerTimeoutMs = Number(rawTimeout);
    if (!Number.isFinite(providerTimeoutMs) || providerTimeoutMs < 1_000 || providerTimeoutMs > 120_000) fail("preflight");
    const toolsCallTimeoutMs = providerTimeoutMs + liveProofMarginMs;
    if (!Number.isFinite(toolsCallTimeoutMs) || toolsCallTimeoutMs <= providerTimeoutMs) fail("preflight");
    return {
      childEnv: { ...baseEnvironment, DEEPSEEK_MAX_RETRIES: "0" },
      providerTimeoutMs,
      toolsCallTimeoutMs
    };
  } catch {
    fail("preflight");
  }
}

export const MAX_STDOUT_LINE_BYTES = 32_000_000;
export const MAX_STDERR_BYTES = 1_000_000;
export const MAX_PENDING_EVENTS = 8;

class ChildDiagnosticCollector {
  constructor() {
    this.buffer = Buffer.alloc(0);
    this.frames = [];
    this.terminalSeen = false;
  }

  consume(chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.buffer = Buffer.concat([this.buffer, bytes]);
    while (true) {
      const newline = this.buffer.indexOf(0x0a);
      if (newline < 0) {
        if (this.buffer.length > CHILD_DIAGNOSTIC_MAX_BYTES && this.buffer.toString("utf8", 0, CHILD_DIAGNOSTIC_PREFIX.length) === CHILD_DIAGNOSTIC_PREFIX) {
          this.frames.push(undefined);
          this.buffer = Buffer.alloc(0);
        }
        return;
      }
      const line = this.buffer.subarray(0, newline + 1);
      this.buffer = this.buffer.subarray(newline + 1);
      if (line.toString("utf8", 0, CHILD_DIAGNOSTIC_PREFIX.length) !== CHILD_DIAGNOSTIC_PREFIX) continue;
      this.frames.push(!this.terminalSeen && line.length <= CHILD_DIAGNOSTIC_MAX_BYTES ? line.toString("utf8") : undefined);
    }
  }

  markTerminal() { this.terminalSeen = true; }

  feature(expected) {
    if (this.frames.length !== 1 || this.frames[0] === undefined) return undefined;
    return parseChildDiagnosticFrame(this.frames[0], expected);
  }

  clear() {
    this.buffer.fill(0);
    this.buffer = Buffer.alloc(0);
    this.frames.fill(undefined);
    this.frames.length = 0;
  }
}

export class StdioClient {
  static get MAX_PENDING_EVENTS() { return MAX_PENDING_EVENTS; }

  constructor(child, toolsCallTimeoutMs = controlTimeoutMs) {
    this.child = child;
    this.toolsCallTimeoutMs = toolsCallTimeoutMs;
    this.buffer = "";
    this.decoder = new StringDecoder("utf8");
    this.stdoutLineBytes = 0;
    this.stderrBytes = 0;
    this.pendingEvents = [];
    this.waiters = [];
    this.terminalEvent = undefined;
    this.exitMetadata = undefined;
    this.onData = (chunk) => {
      if (this.terminalEvent !== undefined) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      let offset = 0;
      while (offset < bytes.length && this.terminalEvent === undefined) {
        const newline = bytes.indexOf(0x0a, offset);
        const end = newline < 0 ? bytes.length : newline;
        const piece = bytes.subarray(offset, end);
        if (this.stdoutLineBytes + piece.length > MAX_STDOUT_LINE_BYTES) {
          this.terminate({ overflow: true }, true);
          return;
        }
        this.stdoutLineBytes += piece.length;
        this.buffer += this.decoder.write(piece);
        if (newline < 0) return;
        this.buffer += this.decoder.end();
        this.consumeLine();
        this.decoder = new StringDecoder("utf8");
        this.stdoutLineBytes = 0;
        offset = newline + 1;
      }
    };
    this.onStderrData = (chunk) => {
      if (this.terminalEvent !== undefined) return;
      const size = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      if (this.stderrBytes + size > MAX_STDERR_BYTES) this.terminate({ overflow: true }, true);
      else this.stderrBytes += size;
    };
    this.onExit = (code, signal) => { this.exitMetadata = { code, signal }; };
    this.onClose = (code, signal) => {
      const exit = this.exitMetadata;
      if (exit === undefined || exit.code !== code || exit.signal !== signal) this.terminate({ dockerError: true }, true);
      else this.terminate({ done: true, code, signal });
    };
    this.onError = () => this.terminate({ dockerError: true });
    this.onStdinError = () => this.terminate({ dockerError: true }, true);
    this.onStdoutError = () => this.terminate({ dockerError: true }, true);
    this.onStderrError = () => this.terminate({ dockerError: true }, true);
    child.stdout.on("data", this.onData);
    child.stdout.on("error", this.onStdoutError);
    child.stderr?.on("data", this.onStderrData);
    child.stderr?.on("error", this.onStderrError);
    child.stdin.on("error", this.onStdinError);
    child.on("exit", this.onExit);
    child.on("close", this.onClose);
    child.on("error", this.onError);
  }

  detach() {
    this.child.stdout.off("data", this.onData);
    this.child.stderr?.off("data", this.onStderrData);
    this.child.off("exit", this.onExit);
    this.child.off("close", this.onClose);
    this.child.off("error", this.onError);
    this.buffer = "";
    this.stdoutLineBytes = 0;
    this.stderrBytes = 0;
    this.pendingEvents.length = 0;
  }

  resolveWaiter(waiter, event) {
    if (waiter.timer !== undefined) clearTimeout(waiter.timer);
    waiter.resolve(event);
  }

  terminate(event, clearPending = false) {
    if (this.terminalEvent !== undefined) return;
    this.terminalEvent = event;
    this.detach();
    if (clearPending) this.pendingEvents.length = 0;
    while (this.waiters.length) this.resolveWaiter(this.waiters.shift(), event);
  }

  deliver(event) {
    if (this.terminalEvent !== undefined) return;
    const waiter = this.waiters.shift();
    if (waiter !== undefined) {
      this.resolveWaiter(waiter, event);
      return;
    }
    if (this.pendingEvents.length >= MAX_PENDING_EVENTS) {
      this.terminate({ overflow: true }, true);
      return;
    }
    this.pendingEvents.push(event);
  }

  consumeLine() {
      const line = this.buffer.trim();
      this.buffer = "";
      if (line.length === 0) return;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        this.deliver({ malformed: true });
        return;
      }
      this.deliver({ message });
  }

  next(timeoutMs) {
    if (this.pendingEvents.length > 0) return Promise.resolve(this.pendingEvents.shift());
    if (this.terminalEvent !== undefined) return Promise.resolve(this.terminalEvent);
    return new Promise((resolve) => {
      const waiter = { resolve, timer: undefined };
      if (timeoutMs !== undefined) {
        waiter.timer = setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index < 0) return;
          this.waiters.splice(index, 1);
          this.terminate({ timeout: true });
          resolve({ timeout: true });
        }, timeoutMs);
      }
      this.waiters.push(waiter);
    });
  }

  writeMessage(message, deadline = Date.now() + controlTimeoutMs) {
    if (this.terminalEvent !== undefined) return Promise.resolve(false);
    return new Promise((resolve) => {
      let settled = false;
      let callbackDone = false;
      let drainDone = true;
      let callbackError;
      const timer = setTimeout(() => {
        this.terminate({ timeout: true }, true);
        finish();
      }, Math.max(0, deadline - Date.now()));
      timer.unref?.();
      const finish = () => {
        if (!callbackDone || !drainDone) return;
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (callbackError) this.terminate({ dockerError: true }, true);
        resolve(!callbackError && this.terminalEvent === undefined);
      };
      try {
        const writable = this.child.stdin.write(jsonLine(message), (error) => {
          callbackDone = true;
          callbackError = error;
          finish();
        });
        if (writable === false) {
          drainDone = false;
          this.child.stdin.once("drain", () => { drainDone = true; finish(); });
        }
        finish();
      } catch {
        callbackDone = true;
        callbackError = new Error("write");
        this.terminate({ dockerError: true }, true);
        finish();
      }
    });
  }

  async notify(method, params = {}) {
    const written = await this.writeMessage({ jsonrpc: "2.0", method, params });
    if (!written) fail("docker");
  }

  async request(id, method, params = {}) {
    const deadline = Date.now() + methodTimeoutMs(method, this.toolsCallTimeoutMs);
    const written = await this.writeMessage({ jsonrpc: "2.0", id, method, params }, deadline);
    if (!written) {
      if (this.terminalEvent?.timeout) fail("timeout");
      fail("docker");
    }
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) fail("timeout", method);
      const event = await this.next(remaining);
      if (event.timeout) fail("timeout", method);
      if (event.overflow) fail("protocol");
      if (event.dockerError) fail("docker");
      if (event.done) fail(method, `container exited before response (code=${event.code ?? "none"}, signal=${event.signal ?? "none"})`);
      if (event.malformed !== undefined) fail(method, "malformed JSON-RPC response");
      if (!isOrdinaryObject(event.message) || event.message.id !== id) continue;
      if (!isJsonRpcResponse(event.message, id)) fail(method, "invalid JSON-RPC response envelope");
      if (Object.prototype.hasOwnProperty.call(event.message, "error")) fail(method, JSON.stringify(event.message.error));
      return event.message.result;
    }
  }
}

export function validateInitializeResult(result, expectedProtocolVersion = protocolVersion) {
  if (!isOrdinaryObject(result)
    || result.protocolVersion !== expectedProtocolVersion
    || !isOrdinaryObject(result.capabilities)
    || !isOrdinaryObject(result.serverInfo)
    || typeof result.serverInfo.name !== "string"
    || result.serverInfo.name.trim() === ""
    || typeof result.serverInfo.version !== "string"
    || result.serverInfo.version.trim() === "") {
    fail("initialize", "invalid initialize result");
  }
  return result;
}

export function fixtureRequest(isOffline = offline) {
  return {
    reviewId: isOffline ? "docker-smoke-001" : "docker-review-real-001",
    objective: "Review the fixed assignment evidence against its rubric.",
    evidence: [
      { id: "brief", role: "assignment_brief", type: "text", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/text/assignment.txt" } },
      { id: "rubric", role: "rubric", type: "table", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/tables/rubric.csv" } },
      { id: "instructions", role: "teacher_instructions", type: "image", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/images/rubric-screenshot.png" } },
      { id: "solution", role: "solution", type: "pdf", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/pdfs/text-page.pdf" } }
    ]
  };
}

function hasForbiddenKey(value) {
  const forbiddenKeys = new Set([
    "apiKey", "inputFingerprint", "promptVersion", "jsonrpc", "result", "error",
    "params", "method", "cause", "stack", "endpoint", "config"
  ]);
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(([key, child]) => forbiddenKeys.has(key) || hasForbiddenKey(child));
}

export async function resolveReviewModel(runCompose = execFileAsync) {
  try {
    const resolved = await runCompose("docker", ["compose", "--profile", "review", "config", "--format", "json"]);
    const document = JSON.parse(resolved.stdout);
    const model = document?.services?.review?.environment?.DEEPSEEK_MODEL;
    if (typeof model !== "string" || model.trim() === "" || !DEEPSEEK_MODELS.includes(model)) fail("preflight");
    return model;
  } catch {
    fail("preflight");
  }
}

async function resolveLiveProof(runCompose = execFileAsync, baseEnvironment = process.env) {
  const childEnv = { ...baseEnvironment, DEEPSEEK_MAX_RETRIES: "0" };
  try {
    const resolved = await runCompose("docker", ["compose", "--profile", "review", "config", "--format", "json"], { env: childEnv });
    const document = JSON.parse(resolved.stdout);
    const environment = document?.services?.review?.environment;
    const model = environment?.DEEPSEEK_MODEL;
    if (typeof model !== "string" || model.trim() === "" || !DEEPSEEK_MODELS.includes(model)) fail("preflight");
    return { model, ...liveProofPreflight(environment, childEnv) };
  } catch {
    fail("preflight");
  }
}

export function assertStructuralReview(result, isOffline = offline, expectedModel) {
  if (typeof result !== "object" || result === null || Array.isArray(result) || Object.keys(result).length !== 1 || result.content?.length !== 1 || result.content[0]?.type !== "text" || typeof result.content[0]?.text !== "string" || Object.keys(result.content[0]).length !== 2) fail("protocol");
  let payload;
  try {
    payload = reviewResponseSchema.parse(JSON.parse(result.content[0].text));
  } catch {
    fail("protocol");
  }
  if (payload.normalizedEvidence.length !== 4) fail("protocol");
  const references = payload.normalizedEvidence.map((evidence) => evidence?.source?.reference);
  if (JSON.stringify(references) !== JSON.stringify(expectedReferences)) fail("protocol");
  for (const evidence of payload.normalizedEvidence) {
    if (!/^[a-f0-9]{64}$/u.test(evidence.contentHash ?? "")) fail("protocol");
  }
  if (!Array.isArray(payload.findings)) fail("protocol");
  const serialized = JSON.stringify(payload);
  if (serialized.includes(process.cwd()) || /(?:\/Users\/|\/workspace\/)/u.test(serialized)) fail("protocol");
  if (rawFixtureMarkers.some((marker) => serialized.includes(marker))) fail("protocol");
  if (hasForbiddenKey(payload)) fail("protocol");
  const citations = payload.findings.flatMap((finding) => Array.isArray(finding?.citations) ? finding.citations : []);
  for (const citation of citations) {
    if (!expectedReferences.includes(citation.sourceReference)) fail("protocol");
    if (!/^[a-f0-9]{64}$/u.test(citation.contentHash ?? "")) fail("protocol");
  }
  if (!isOffline) {
    if (typeof expectedModel !== "string" || payload.metadata.provider?.name !== "deepseek" || payload.metadata.provider.model !== expectedModel) fail("protocol");
    if (!payload.findings.some((finding) => finding.id.startsWith("provider:deepseek:"))) fail("protocol");
  }
  return payload;
}

export function captureChildLifecycle(child, timeoutMs = controlTimeoutMs) {
  let exitMetadata;
  let closeMetadata;
  let exitCount = 0;
  let closeCount = 0;
  let stdoutComplete = child.stdout === undefined;
  let stderrComplete = child.stderr === undefined;
  let outcome;
  let evaluation;
  const waiters = [];

  const cleanup = () => {
    clearTimeout(timer);
    if (evaluation !== undefined) clearImmediate(evaluation);
    child.off("exit", onExit);
    child.off("close", onClose);
    child.off("error", onChildError);
    child.stdout?.off("data", onLateOutput);
    child.stdout?.off("end", onStdoutComplete);
    child.stdout?.off("close", onStdoutComplete);
    child.stdout?.off("error", onStreamError);
    child.stderr?.off("data", onLateOutput);
    child.stderr?.off("end", onStderrComplete);
    child.stderr?.off("close", onStderrComplete);
    child.stderr?.off("error", onStreamError);
    child.stdin?.off?.("error", onStreamError);
  };
  const settle = (next) => {
    if (outcome !== undefined) return;
    outcome = next;
    cleanup();
    while (waiters.length > 0) waiters.shift()(outcome);
  };
  const rejectAs = (phase) => {
    try { fail(phase); } catch (error) { settle({ error }); }
  };
  const terminalPairSeen = () => exitCount > 0 && closeCount > 0;
  const evaluate = () => {
    if (outcome !== undefined || evaluation !== undefined) return;
    if (!terminalPairSeen() || !stdoutComplete || !stderrComplete) return;
    evaluation = setImmediate(() => {
      evaluation = undefined;
      if (outcome !== undefined) return;
      if (exitCount !== 1 || closeCount !== 1
        || exitMetadata.code !== closeMetadata.code
        || exitMetadata.signal !== closeMetadata.signal) {
        rejectAs("protocol");
        return;
      }
      settle({ value: exitMetadata });
    });
  };
  const onExit = (code, signal) => {
    exitCount += 1;
    if (exitCount !== 1) { rejectAs("protocol"); return; }
    exitMetadata = { code, signal };
    evaluate();
  };
  const onClose = (code, signal) => {
    closeCount += 1;
    if (closeCount !== 1) { rejectAs("protocol"); return; }
    closeMetadata = { code, signal };
    evaluate();
  };
  const onLateOutput = () => {
    if (terminalPairSeen()) rejectAs("protocol");
  };
  const onStdoutComplete = () => { stdoutComplete = true; evaluate(); };
  const onStderrComplete = () => { stderrComplete = true; evaluate(); };
  const onChildError = () => rejectAs("docker");
  const onStreamError = () => rejectAs("docker");

  child.on("exit", onExit);
  child.on("close", onClose);
  child.on("error", onChildError);
  child.stdout?.on("data", onLateOutput);
  child.stdout?.on("end", onStdoutComplete);
  child.stdout?.on("close", onStdoutComplete);
  child.stdout?.on("error", onStreamError);
  child.stderr?.on("data", onLateOutput);
  child.stderr?.on("end", onStderrComplete);
  child.stderr?.on("close", onStderrComplete);
  child.stderr?.on("error", onStreamError);
  child.stdin?.on?.("error", onStreamError);

  const timer = setTimeout(() => rejectAs("shutdown"), timeoutMs);
  timer.unref?.();

  return Object.freeze({
    child,
    wait() {
      if (outcome !== undefined) {
        return outcome.error === undefined ? Promise.resolve(outcome.value) : Promise.reject(outcome.error);
      }
      return new Promise((resolve, reject) => {
        waiters.push((result) => result.error === undefined ? resolve(result.value) : reject(result.error));
      });
    }
  });
}

export async function completeProofLifecycle(lifecycle, payload, isOffline = offline, options = {}) {
  const write = options.write ?? ((message) => process.stdout.write(message));
  const child = lifecycle.child;
  try { child.stdin.end(); } catch { fail("docker"); }
  const { code, signal } = await lifecycle.wait();
  if (code !== 0 || signal !== null) fail("protocol", code, signal);
  write(`${isOffline ? "offline smoke" : "credentialed review"} passed: ${payload.normalizedEvidence.length} fixtures, ${payload.findings.length} findings\n`);
}

export async function performMcpReview(client, isOffline = offline, expectedModel) {
  const initialized = await client.request(1, "initialize", {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: isOffline ? "docker-smoke" : "docker-review-real", version: "0.1.0" }
  });
  validateInitializeResult(initialized, protocolVersion);
  await client.notify("notifications/initialized", {});
  const listed = await client.request(2, "tools/list");
  if (!Array.isArray(listed?.tools) || listed.tools.length !== 1 || listed.tools[0]?.name !== "review_evidence") fail("tools/list", "expected only review_evidence");
  if (listed.tools[0]?.annotations?.readOnlyHint !== true || listed.tools[0]?.annotations?.destructiveHint !== false || listed.tools[0]?.annotations?.idempotentHint !== true) fail("tools/list", "review_evidence annotations were not read-only");
  const result = await client.request(3, "tools/call", { name: "review_evidence", arguments: fixtureRequest(isOffline) });
  return assertStructuralReview(result, isOffline, expectedModel);
}

export async function runReviewHarness(options = {}) {
  const isOffline = options.isOffline ?? offline;
  const environment = options.environment ?? process.env;
  const spawnChild = options.spawnChild ?? spawn;
  const resolveProof = options.resolveProof ?? resolveLiveProof;
  const write = options.write ?? ((message) => process.stdout.write(message));
  const classify = options.classify ?? classifyDiagnostic;
  const retainDiagnostic = options.retainDiagnostic ?? (() => undefined);

  if (!isOffline && (!environment.DEEPSEEK_API_KEY || environment.DEEPSEEK_API_KEY.trim() === "")) {
    fail("preflight", "DEEPSEEK_API_KEY is required for the credentialed review; no request was sent");
  }

  const liveProof = isOffline ? undefined : await resolveProof(undefined, environment);
  const expectedModel = liveProof?.model;
  const selectedProfile = isOffline ? "smoke" : "review";
  const diagnosticKey = isOffline ? undefined : randomBytes(32);
  let diagnosticGeneration = isOffline ? undefined : randomBytes(32).toString("hex");
  const diagnosticCollector = isOffline ? undefined : new ChildDiagnosticCollector();
  const childEnvironment = isOffline
    ? { ...environment, EVIDENCELENS_DISABLE_PROVIDER: "1" }
    : {
        ...liveProof.childEnv,
        [CHILD_DIAGNOSTIC_GENERATION_ENV]: diagnosticGeneration,
        [CHILD_DIAGNOSTIC_KEY_ENV]: diagnosticKey.toString("hex")
      };
  const childArguments = ["compose", "--profile", selectedProfile, "run", "--rm", "-T"];
  if (!isOffline) childArguments.push("-e", CHILD_DIAGNOSTIC_GENERATION_ENV, "-e", CHILD_DIAGNOSTIC_KEY_ENV);
  childArguments.push(selectedProfile);

  const child = spawnChild("docker", childArguments, {
    stdio: ["pipe", "pipe", "pipe"],
    env: childEnvironment
  });
  const onDiagnosticData = (chunk) => diagnosticCollector?.consume(chunk);
  const onDiagnosticTerminal = () => diagnosticCollector?.markTerminal();
  child.stderr?.on("data", onDiagnosticData);
  child.on("exit", onDiagnosticTerminal);
  child.on("close", onDiagnosticTerminal);
  const lifecycleTimeoutMs = (controlTimeoutMs * 3) + (liveProof?.toolsCallTimeoutMs ?? controlTimeoutMs);
  const lifecycle = captureChildLifecycle(child, lifecycleTimeoutMs);
  const client = new StdioClient(child, liveProof?.toolsCallTimeoutMs);
  try {
    const payload = await performMcpReview(client, isOffline, expectedModel);
    await completeProofLifecycle(lifecycle, payload, isOffline, { write });
  } catch (error) {
    if (!isOffline) {
      const feature = diagnosticCollector.feature({ generation: diagnosticGeneration, key: diagnosticKey });
      const diagnostic = classify(feature === undefined ? [] : [feature]);
      try { retainDiagnostic(diagnostic); } catch { /* Diagnostic retention cannot mask the owning failure. */ }
    }
    if (error instanceof Error && /^\[docker-review:(?:preflight|docker|initialize|tools\/list|tools\/call|protocol|timeout)\] failed$/u.test(error.message)) throw error;
    fail("protocol", error);
  } finally {
    child.stderr?.off("data", onDiagnosticData);
    child.off("exit", onDiagnosticTerminal);
    child.off("close", onDiagnosticTerminal);
    diagnosticCollector?.clear();
    diagnosticKey?.fill(0);
    delete childEnvironment[CHILD_DIAGNOSTIC_GENERATION_ENV];
    delete childEnvironment[CHILD_DIAGNOSTIC_KEY_ENV];
    diagnosticGeneration = undefined;
    if (!child.killed && child.exitCode === null) child.kill("SIGTERM");
  }
}

async function main() {
  await runReviewHarness();
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const category = error instanceof Error ? error.message : `[docker-review:${classifyFailure("protocol")}] failed`;
    process.stderr.write(`${category}\n`);
    process.exitCode = 1;
  });
}
