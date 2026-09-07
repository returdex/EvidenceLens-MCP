#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { reviewResponseSchema } from "../dist/contracts/review.js";
import { DEEPSEEK_MODELS } from "../dist/providers/config.js";

const offline = process.argv.includes("--offline");
const profile = offline ? "smoke" : "review";
const service = profile;
const controlTimeoutMs = 30_000;
const liveProofMarginMs = 30_000;
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

function withTimeout(promise, phase, timeoutMs = controlTimeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try { fail("timeout", phase); } catch (error) { reject(error); }
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class StdioClient {
  constructor(child, toolsCallTimeoutMs = controlTimeoutMs) {
    this.child = child;
    this.toolsCallTimeoutMs = toolsCallTimeoutMs;
    this.buffer = "";
    this.waiters = [];
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      this.buffer += chunk;
      this.drain();
    });
    child.on("exit", (code, signal) => {
      while (this.waiters.length) this.waiters.shift()({ done: true, code, signal });
    });
    child.on("error", () => {
      while (this.waiters.length) this.waiters.shift()({ dockerError: true });
    });
  }

  drain() {
    while (true) {
      const newline = this.buffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line.length === 0) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        this.waiters.shift()?.({ malformed: line });
        continue;
      }
      this.waiters.shift()?.({ message });
    }
  }

  next() {
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async request(id, method, params = {}) {
    this.child.stdin.write(jsonLine({ jsonrpc: "2.0", id, method, params }));
    while (true) {
      const event = await withTimeout(this.next(), method, methodTimeoutMs(method, this.toolsCallTimeoutMs));
      if (event.dockerError) fail("docker");
      if (event.done) fail(method, `container exited before response (code=${event.code ?? "none"}, signal=${event.signal ?? "none"})`);
      if (event.malformed !== undefined) fail(method, "malformed JSON-RPC response");
      if (event.message?.id !== id) continue;
      if (event.message.error !== undefined) fail(method, JSON.stringify(event.message.error));
      if (event.message.result === undefined) fail(method, "response did not contain a result");
      return event.message.result;
    }
  }
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

function waitForChildExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    const settleExit = (code, signal) => {
      cleanup();
      resolve({ code, signal });
    };
    const onExit = (code, signal) => settleExit(code, signal);
    const onError = () => {
      cleanup();
      try { fail("docker"); } catch (error) { reject(error); }
    };

    child.once("exit", onExit);
    child.once("error", onError);
    timer = setTimeout(() => {
      cleanup();
      try { fail("shutdown"); } catch (error) { reject(error); }
    }, timeoutMs);

    if (child.exitCode !== null || child.signalCode !== null) {
      settleExit(child.exitCode, child.signalCode);
    }
  });
}

export async function completeProofLifecycle(child, payload, isOffline = offline, options = {}) {
  const write = options.write ?? ((message) => process.stdout.write(message));
  const timeoutMs = options.timeoutMs ?? controlTimeoutMs;
  child.stdin.end();
  const { code, signal } = await waitForChildExit(child, timeoutMs);
  if (code !== 0 || signal !== null) fail("protocol", code, signal);
  write(`${isOffline ? "offline smoke" : "credentialed review"} passed: ${payload.normalizedEvidence.length} fixtures, ${payload.findings.length} findings\n`);
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
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const client = new StdioClient(child, liveProof?.toolsCallTimeoutMs);
  try {
    await client.request(1, "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: offline ? "docker-smoke" : "docker-review-real", version: "0.1.0" }
    });
    const listed = await client.request(2, "tools/list");
    if (!Array.isArray(listed?.tools) || listed.tools.length !== 1 || listed.tools[0]?.name !== "review_evidence") fail("tools/list", "expected only review_evidence");
    if (listed.tools[0]?.annotations?.readOnlyHint !== true || listed.tools[0]?.annotations?.destructiveHint !== false || listed.tools[0]?.annotations?.idempotentHint !== true) fail("tools/list", "review_evidence annotations were not read-only");
    const result = await client.request(3, "tools/call", { name: "review_evidence", arguments: fixtureRequest(offline) });
    const payload = assertStructuralReview(result, offline, expectedModel);
    await completeProofLifecycle(child, payload, offline);
  } catch (error) {
    if (error instanceof Error && /^\[docker-review:(?:preflight|docker|initialize|tools\/list|tools\/call|protocol|timeout)\] failed$/u.test(error.message)) throw error;
    fail("protocol", error, stderr);
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
