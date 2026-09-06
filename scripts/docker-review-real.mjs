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
const requestTimeoutMs = 30_000;
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

function withTimeout(promise, phase) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try { fail("timeout", phase); } catch (error) { reject(error); }
    }, requestTimeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class StdioClient {
  constructor(child) {
    this.child = child;
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
      const event = await withTimeout(this.next(), method);
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

async function main() {
  if (!offline && (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.trim() === "")) {
    fail("preflight", "DEEPSEEK_API_KEY is required for the credentialed review; no request was sent");
  }

  const expectedModel = offline ? undefined : await resolveReviewModel();

  const child = spawn("docker", ["compose", "--profile", profile, "run", "--rm", "-T", service], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...(offline ? { EVIDENCELENS_DISABLE_PROVIDER: "1" } : {}) }
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const client = new StdioClient(child);
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
    process.stdout.write(`${offline ? "offline smoke" : "credentialed review"} passed: ${payload.normalizedEvidence.length} fixtures, ${payload.findings.length} findings\n`);
    client.child.stdin.end();
    await withTimeout(new Promise((resolve) => child.once("exit", resolve)), "shutdown");
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
