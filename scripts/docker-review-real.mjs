#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { StringDecoder } from "node:string_decoder";
import { promisify } from "node:util";
import { reviewResponseSchema } from "../dist/contracts/review.js";
import { DEEPSEEK_MODELS } from "../dist/providers/config.js";

const offline = process.argv.includes("--offline");
const profile = offline ? "smoke" : "review";
const service = profile;
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

function waitForChildClose(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timer;
    let exitMetadata;
    const cleanup = () => {
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("close", onClose);
      child.off("error", onError);
    };
    const settleClose = (code, signal) => {
      cleanup();
      if (exitMetadata !== undefined && (exitMetadata.code !== code || exitMetadata.signal !== signal)) {
        try { fail("protocol"); } catch (error) { reject(error); }
        return;
      }
      resolve({ code, signal });
    };
    const onExit = (code, signal) => { exitMetadata = { code, signal }; };
    const onClose = (code, signal) => settleClose(code, signal);
    const onError = () => {
      cleanup();
      try { fail("docker"); } catch (error) { reject(error); }
    };

    child.once("exit", onExit);
    child.once("close", onClose);
    child.once("error", onError);
    timer = setTimeout(() => {
      cleanup();
      try { fail("shutdown"); } catch (error) { reject(error); }
    }, timeoutMs);

    if (child.exitCode !== null || child.signalCode !== null) {
      settleClose(child.exitCode, child.signalCode);
    }
  });
}

export async function completeProofLifecycle(child, payload, isOffline = offline, options = {}) {
  const write = options.write ?? ((message) => process.stdout.write(message));
  const timeoutMs = options.timeoutMs ?? controlTimeoutMs;
  try { child.stdin.end(); } catch { fail("docker"); }
  const { code, signal } = await waitForChildClose(child, timeoutMs);
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

async function main() {
  if (!offline && (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.trim() === "")) {
    fail("preflight", "DEEPSEEK_API_KEY is required for the credentialed review; no request was sent");
  }

  const liveProof = offline ? undefined : await resolveLiveProof();
  const expectedModel = liveProof?.model;

  const child = spawn("docker", ["compose", "--profile", profile, "run", "--rm", "-T", service], {
    stdio: ["pipe", "pipe", "pipe"],
    env: offline ? { ...process.env, EVIDENCELENS_DISABLE_PROVIDER: "1" } : liveProof.childEnv
  });
  const client = new StdioClient(child, liveProof?.toolsCallTimeoutMs);
  try {
    const payload = await performMcpReview(client, offline, expectedModel);
    await completeProofLifecycle(child, payload, offline);
  } catch (error) {
    if (error instanceof Error && /^\[docker-review:(?:preflight|docker|initialize|tools\/list|tools\/call|protocol|timeout)\] failed$/u.test(error.message)) throw error;
    fail("protocol", error);
  } finally {
    if (!child.killed && child.exitCode === null) child.kill("SIGTERM");
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const category = error instanceof Error ? error.message : `[docker-review:${classifyFailure("protocol")}] failed`;
    process.stderr.write(`${category}\n`);
    process.exitCode = 1;
  });
}
