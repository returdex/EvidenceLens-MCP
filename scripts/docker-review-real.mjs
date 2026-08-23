#!/usr/bin/env node
import { spawn } from "node:child_process";

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

function fail(phase, message) {
  const sanitized = String(message)
    .replaceAll(process.cwd(), "<host-path>")
    .replaceAll(/\/Users\/[^\s"']+/gu, "<host-path>")
    .replaceAll(/(?:https?|file):\/\/[^\s"']+/gu, "<external-detail>");
  throw new Error(`[docker-review:${phase}] ${sanitized}`);
}

function jsonLine(message) {
  return `${JSON.stringify(message)}\n`;
}

function withTimeout(promise, phase) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${requestTimeoutMs}ms`)), requestTimeoutMs);
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
      if (event.done) fail(method, `container exited before response (code=${event.code ?? "none"}, signal=${event.signal ?? "none"})`);
      if (event.malformed !== undefined) fail(method, "malformed JSON-RPC response");
      if (event.message?.id !== id) continue;
      if (event.message.error !== undefined) fail(method, JSON.stringify(event.message.error));
      if (event.message.result === undefined) fail(method, "response did not contain a result");
      return event.message.result;
    }
  }
}

function fixtureRequest() {
  return {
    reviewId: offline ? "docker-smoke-001" : "docker-review-real-001",
    objective: "Review the fixed assignment evidence against its rubric.",
    evidence: [
      { id: "brief", role: "assignment_brief", type: "text", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/text/assignment.txt" } },
      { id: "rubric", role: "rubric", type: "table", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/tables/rubric.csv" } },
      { id: "instructions", role: "teacher_instructions", type: "image", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/images/rubric-screenshot.png" } },
      { id: "solution", role: "solution", type: "pdf", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/pdfs/text-page.pdf" } }
    ]
  };
}

function assertStructuralReview(result) {
  if (result?.content?.length !== 1 || result.content[0]?.type !== "text") fail("tools/call", "missing MCP text result");
  let payload;
  try {
    payload = JSON.parse(result.content[0].text);
  } catch {
    fail("tools/call", "MCP text result was not JSON");
  }
  if (payload.ok !== true || payload.status !== "accepted") fail("tools/call", "review did not return ok=true and status=accepted");
  if (!Array.isArray(payload.normalizedEvidence) || payload.normalizedEvidence.length !== 4) fail("tools/call", "expected exactly four normalized evidence items");
  const references = payload.normalizedEvidence.map((evidence) => evidence?.source?.reference);
  if (JSON.stringify(references) !== JSON.stringify(expectedReferences)) fail("tools/call", `unexpected references ${JSON.stringify(references)}`);
  for (const evidence of payload.normalizedEvidence) {
    if (!/^[a-f0-9]{64}$/u.test(evidence.contentHash ?? "")) fail("tools/call", "evidence content hash was not lowercase SHA-256");
  }
  if (!Array.isArray(payload.findings)) fail("tools/call", "findings was not an array");
  const serialized = JSON.stringify(payload);
  if (serialized.includes(process.cwd()) || serialized.includes("/workspace/")) fail("tools/call", "response leaked an absolute host or container path");
  if (rawFixtureMarkers.some((marker) => serialized.includes(marker))) fail("tools/call", "response leaked raw fixture content");
  if (serialized.includes("inputFingerprint") || serialized.includes("promptVersion")) fail("tools/call", "response leaked provider request metadata");
  const citations = payload.findings.flatMap((finding) => Array.isArray(finding?.citations) ? finding.citations : []);
  for (const citation of citations) {
    if (!expectedReferences.includes(citation.sourceReference)) fail("tools/call", "citation source reference was not one of the fixed fixtures");
    if (!/^[a-f0-9]{64}$/u.test(citation.contentHash ?? "")) fail("tools/call", "citation content hash was not lowercase SHA-256");
  }
  if (!offline && !payload.findings.some((finding) => typeof finding?.id === "string" && finding.id.startsWith("provider:"))) {
    fail("tools/call", "credentialed review returned no provider-namespaced finding; deterministic-only output is not accepted");
  }
  return payload;
}

async function main() {
  if (!offline && (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.trim() === "")) {
    fail("preflight", "DEEPSEEK_API_KEY is required for the credentialed review; no request was sent");
  }

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
    const result = await client.request(3, "tools/call", { name: "review_evidence", arguments: fixtureRequest() });
    const payload = assertStructuralReview(result);
    process.stdout.write(`${offline ? "offline smoke" : "credentialed review"} passed: ${payload.normalizedEvidence.length} fixtures, ${payload.findings.length} findings\n`);
    client.child.stdin.end();
    await withTimeout(new Promise((resolve) => child.once("exit", resolve)), "shutdown");
  } catch (error) {
    fail("runtime", `${error instanceof Error ? error.message : String(error)}${stderr.trim() ? `; stderr=${stderr.trim()}` : ""}`);
  } finally {
    if (!child.killed && child.exitCode === null) child.kill("SIGTERM");
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
