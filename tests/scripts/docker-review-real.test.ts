import { execFile } from "node:child_process";
import { createHmac } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { assertStructuralReview, captureChildLifecycle, classifyDiagnostic, classifyFailure, completeProofLifecycle, diagnosticFeatureForInvariant, DIAGNOSTIC_INVARIANT_MAP, fixtureRequest, isJsonRpcResponse, liveProofPreflight, MAX_STDERR_BYTES, MAX_STDOUT_LINE_BYTES, methodTimeoutMs, performMcpReview, ProviderRequestReceiptCollector, resolveLiveProof, resolveReviewModel, REVIEW_IMAGE_ENV, runReviewHarness, StdioClient, validateInitializeResult } from "../../scripts/docker-review-real.mjs";
import { CHILD_DIAGNOSTIC_GENERATION_ENV, CHILD_DIAGNOSTIC_KEY_ENV, CHILD_DIAGNOSTIC_PREFIX, CHILD_DIAGNOSTIC_SCHEMA } from "../../src/providers/diagnostics.js";
import { createProviderRequestBudget, PROVIDER_REQUEST_GENERATION_ENV, PROVIDER_REQUEST_KEY_ENV, PROVIDER_REQUEST_RECEIPT_PREFIX } from "../../src/providers/request-budget.js";
import { PROOF_SENTINEL, REVIEW_SENTINEL } from "../../scripts/proof-runtime-spec.mjs";

const execFileAsync = promisify(execFile);
const certifiedImageId = `sha256:${"9".repeat(64)}`;
const hash = "a".repeat(64);
const refs = ["filesystem://course/tests/fixtures/evidence/text/assignment.txt", "filesystem://course/tests/fixtures/evidence/tables/rubric.csv", "filesystem://course/tests/fixtures/evidence/images/rubric-screenshot.png", "filesystem://course/tests/fixtures/evidence/pdfs/text-page.pdf"];
const roles = ["assignment_brief", "rubric", "teacher_instructions", "solution"];

function successPayload(): Record<string, any> {
  return {
    ok: true, status: "accepted", requestId: "docker-review-real-001",
    normalizedEvidence: refs.map((reference, index) => ({ source: { id: `evidence-${index}`, type: "text", reference }, role: roles[index], contentHash: hash, extraction: { extractor: "fixture", extractorVersion: "1", generatedAt: "1970-01-01T00:00:00.000Z", partial: false }, references: [{ kind: "text", startLine: 1, endLine: 1 }], warnings: [] })),
    findings: [{ id: "provider:deepseek:finding-1", type: "evidence_quality", severity: "low", confidence: "medium", title: "Finding", summary: "Summary", observation: "Observation", interpretation: "Interpretation", uncertainty: "Uncertainty", followUpChecks: ["Check evidence"], evidenceIds: ["evidence-0"], citations: [{ evidenceId: "evidence-0", role: "assignment_brief", contentHash: hash, sourceReference: refs[0], location: { kind: "text", startLine: 1, endLine: 1 }, visual: false }] }],
    metadata: { serverName: "evidencelens", serverVersion: "0.1.3", analyzerName: "deterministic-rules", analyzerVersion: "1.0.0", generatedAt: "1970-01-01T00:00:00.000Z", provider: { name: "deepseek", model: "deepseek-v4-flash-vision-exp" } }
  };
}

const mcp = (payload: unknown): unknown => ({ content: [{ type: "text", text: JSON.stringify(payload) }] });
function rejectProtocol(value: unknown, model = "deepseek-v4-flash-vision-exp") {
  expect(() => assertStructuralReview(value, false, model)).toThrow("[docker-review:protocol] failed");
}

class FakeChild extends EventEmitter {
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  stdout = new FakeStream();
  stderr = new FakeStream();
  stdin = Object.assign(new FakeStream(), { end: vi.fn() });
}

class FakeStream extends EventEmitter {
  setEncoding = vi.fn();
  destroyed = false;
  destroy = vi.fn(() => { this.destroyed = true; this.emit("close"); });
}

class FakeStdioChild extends EventEmitter {
  stdout = new FakeStream();
  stderr = new FakeStream();
  stdin = Object.assign(new FakeStream(), { write: vi.fn((_raw: string, callback?: (error?: Error) => void) => { callback?.(); return true; }), end: vi.fn((callback?: (error?: Error) => void) => callback?.()) });
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  killed = false;
  kill = vi.fn((signal: NodeJS.Signals) => { this.killed = true; this.signalCode = signal; return true; });
}

const line = (value: unknown) => `${JSON.stringify(value)}\n`;

function diagnosticLine(environment: Record<string, string>, overrides: Record<string, unknown> = {}): string {
  const unsigned = {
    schema: CHILD_DIAGNOSTIC_SCHEMA,
    generation: environment[CHILD_DIAGNOSTIC_GENERATION_ENV],
    sequence: 1,
    path: ["provider", "http", "json"],
    code: "invalid_format",
    ...overrides
  };
  const mac = createHmac("sha256", Buffer.from(environment[CHILD_DIAGNOSTIC_KEY_ENV], "hex"))
    .update(JSON.stringify(unsigned))
    .digest("hex");
  return `${CHILD_DIAGNOSTIC_PREFIX}${JSON.stringify({ ...unsigned, mac })}\n`;
}

function requestReceiptLine(environment: Record<string, string>, observed: 0 | 1, overrides: Record<string, unknown> = {}): string {
  const budget = createProviderRequestBudget({ generation: environment[PROVIDER_REQUEST_GENERATION_ENV], key: Buffer.from(environment[PROVIDER_REQUEST_KEY_ENV], "hex") });
  if (observed === 1) budget.acquireHttpSend();
  return `${PROVIDER_REQUEST_RECEIPT_PREFIX}${JSON.stringify({ ...budget.receipt(), ...overrides })}\n`;
}

function failingLiveChild(frame: (environment: Record<string, string>, child: FakeStdioChild) => void) {
  const child = new FakeStdioChild();
  child.stdin.end.mockImplementation(() => {
    setImmediate(() => {
      child.stdout.emit("end");
      child.stderr.emit("end");
      child.exitCode = 1;
      child.emit("exit", 1, null);
      child.emit("close", 1, null);
    });
  });
  child.kill.mockImplementation((signal: NodeJS.Signals) => {
    child.killed = true;
    child.signalCode = signal;
    setImmediate(() => {
      child.stdout.emit("end");
      child.stderr.emit("end");
      child.exitCode = 1;
      child.emit("exit", 1, null);
      child.emit("close", 1, null);
    });
    return true;
  });
  child.stdin.write.mockImplementation((raw: string, callback?: (error?: Error) => void) => {
    const message = JSON.parse(raw);
    if (message.method === "initialize") {
      child.stdout.emit("data", line({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "evidencelens", version: "0.1.3" } } }));
    } else if (message.method === "tools/list") {
      child.stdout.emit("data", line({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "review_evidence", annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true } }] } }));
    } else if (message.method === "tools/call") {
      frame((child as any).diagnosticEnvironment, child);
      child.stdout.emit("data", line({ jsonrpc: "2.0", id: 3, error: { code: -32000, message: "private" } }));
    }
    callback?.();
    return true;
  });
  return child;
}

describe("bounded Docker stdio event delivery", () => {
  it("exports the exact byte ceilings", () => {
    expect(MAX_STDOUT_LINE_BYTES).toBe(32_000_000);
    expect(MAX_STDERR_BYTES).toBe(1_000_000);
    expect(StdioClient.MAX_PENDING_EVENTS).toBe(8);
  });

  it.each(["before request", "while pending", "after settlement"])("absorbs sanitized stdin EPIPE %s", async (stage) => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child, 25);
    if (stage === "before request") child.stdin.emit("error", Object.assign(new Error("private"), { code: "EPIPE" }));
    const request = client.request(7, "tools/call");
    if (stage === "while pending") child.stdin.emit("error", Object.assign(new Error("private"), { code: "EPIPE" }));
    if (stage === "after settlement") {
      child.stdout.emit("data", line({ jsonrpc: "2.0", id: 7, result: {} }));
      await expect(request).resolves.toEqual({});
      expect(() => child.stdin.emit("error", Object.assign(new Error("late"), { code: "EPIPE" }))).not.toThrow();
      return;
    }
    await expect(request).rejects.toThrow("[docker-review:docker] failed");
  });

  it("sanitizes a synchronous stdin write throw", async () => {
    const child = new FakeStdioChild();
    child.stdin.write.mockImplementationOnce(() => { throw new Error("private write"); });
    const client = new StdioClient(child);
    await expect(client.request(1, "initialize")).rejects.toThrow("[docker-review:docker] failed");
  });

  it("enforces prospective stdout and cumulative stderr byte limits", async () => {
    const stdoutChild = new FakeStdioChild();
    const stdoutClient = new StdioClient(stdoutChild);
    stdoutChild.stdout.emit("data", Buffer.alloc(MAX_STDOUT_LINE_BYTES + 1, 0x61));
    await expect(stdoutClient.next()).resolves.toEqual({ overflow: true });
    expect((stdoutClient as any).buffer).toBe("");

    const stderrChild = new FakeStdioChild();
    const stderrClient = new StdioClient(stderrChild);
    stderrChild.stderr.emit("data", Buffer.alloc(MAX_STDERR_BYTES, 0x61));
    stderrChild.stderr.emit("data", Buffer.from("b"));
    await expect(stderrClient.next()).resolves.toEqual({ overflow: true });
    expect((stderrClient as any).stderrBytes).toBe(0);
  });

  it("records exit as metadata and waits for close before terminal delivery", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    const pending = client.next();
    child.emit("exit", 0, null);
    let settled = false;
    void pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    child.stdout.emit("end");
    child.stderr.emit("end");
    child.emit("close", 0, null);
    await expect(pending).resolves.toMatchObject({ done: true, code: 0, signal: null });
  });

  it("fails closed when exit and close metadata differ", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    const pending = client.next();
    child.emit("exit", 0, null);
    child.emit("close", 1, null);
    await expect(pending).resolves.toEqual({ dockerError: true });
  });
  it("keeps one absolute request deadline across notification traffic", async () => {
    vi.useFakeTimers();
    try {
      const child = new FakeStdioChild();
      const client = new StdioClient(child, 50);
      const request = client.request(7, "tools/call");
      const rejection = expect(request).rejects.toThrow("[docker-review:timeout] failed");

      for (const elapsed of [15, 15, 19]) {
        await vi.advanceTimersByTimeAsync(elapsed);
        child.stdout.emit("data", line({ jsonrpc: "2.0", method: "notifications/progress" }));
        await Promise.resolve();
      }
      await vi.advanceTimersByTimeAsync(1);

      await rejection;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [{ jsonrpc: "2.0", id: 7, result: {} }, true, "valid result"],
    [{ jsonrpc: "2.0", id: 7, error: { code: -1 } }, true, "valid error"],
    [{ id: 7, result: {} }, false, "missing jsonrpc"],
    [{ jsonrpc: "1.0", id: 7, result: {} }, false, "wrong jsonrpc"],
    [{ jsonrpc: "2.0", id: 7, result: {}, error: {} }, false, "both result and error"],
    [{ jsonrpc: "2.0", id: 7 }, false, "neither result nor error"],
    [{ jsonrpc: "2.0", id: 8, result: {} }, false, "wrong id"],
    [[{ jsonrpc: "2.0", id: 7, result: {} }], false, "array"],
    [null, false, "null"],
    ["response", false, "primitive"]
  ] as const)("validates %s as %s (%s)", (message, expected) => {
    expect(isJsonRpcResponse(message, 7)).toBe(expected);
  });

  it("redacts a valid matching JSON-RPC error response", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    const request = client.request(7, "initialize");
    child.stdout.emit("data", line({ jsonrpc: "2.0", id: 7, error: { message: "private response secret" } }));
    await expect(request).rejects.toThrow("[docker-review:initialize] failed");
    await expect(request).rejects.not.toThrow("private response secret");
  });

  it("resolves a request when a notification and its response are coalesced", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child, 100);
    const request = client.request(7, "tools/call");

    child.stdout.emit("data", `${line({ jsonrpc: "2.0", method: "notifications/progress" })}${line({ jsonrpc: "2.0", id: 7, result: { ok: true } })}`);

    await expect(request).resolves.toEqual({ ok: true });
    expect(child.stdin.write).toHaveBeenCalledOnce();
  });

  it("delivers an event emitted before next is registered", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    child.stdout.emit("data", line({ sequence: 1 }));
    await expect(client.next()).resolves.toEqual({ message: { sequence: 1 } });
  });

  it("returns three queued events exactly once in FIFO order", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    child.stdout.emit("data", [1, 2, 3].map((sequence) => line({ sequence })).join(""));

    const events = await Promise.all([client.next(), client.next(), client.next()]);
    expect(events.map((event: any) => event.message.sequence)).toEqual([1, 2, 3]);
  });

  it("parses split and coalesced lines once while ignoring blanks", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    child.stdout.emit("data", "  \n{\"sequence\":1");
    child.stdout.emit("data", `}\n${line({ sequence: 2 })}`);

    await expect(client.next()).resolves.toEqual({ message: { sequence: 1 } });
    await expect(client.next()).resolves.toEqual({ message: { sequence: 2 } });
  });

  it("surfaces a sanitized malformed marker without losing adjacent events", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    const raw = '{"secret":"never-surface"';
    child.stdout.emit("data", `${line({ sequence: 1 })}${raw}\n${line({ sequence: 2 })}`);

    await expect(client.next()).resolves.toEqual({ message: { sequence: 1 } });
    const malformed = await client.next();
    expect(malformed).toEqual({ malformed: true });
    expect(JSON.stringify(malformed)).not.toContain(raw);
    await expect(client.next()).resolves.toEqual({ message: { sequence: 2 } });
  });

  it("accepts exactly the finite queue bound and terminally overflows on the next event", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    const capacity = (StdioClient as any).MAX_PENDING_EVENTS as number;
    expect(Number.isSafeInteger(capacity)).toBe(true);
    expect(capacity).toBeGreaterThanOrEqual(3);

    child.stdout.emit("data", Array.from({ length: capacity }, (_, index) => line({ index })).join(""));
    expect((client as any).pendingEvents).toHaveLength(capacity);
    child.stdout.emit("data", line({ secret: "overflow-secret" }));

    expect((client as any).pendingEvents.length).toBeLessThanOrEqual(capacity);
    const terminal = await client.next();
    expect(terminal).toEqual({ overflow: true });
    expect(JSON.stringify(terminal)).not.toContain("overflow-secret");
    child.stdout.emit("data", Array.from({ length: capacity + 2 }, (_, index) => line({ later: index })).join(""));
    expect((client as any).pendingEvents.length).toBe(0);
  });

  it.each(["exit", "error"])("cleans up waiters and parser listeners after child %s", async (kind) => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    const waiting = client.next();
    if (kind === "exit") { child.emit("exit", 1, null); child.emit("close", 1, null); }
    else child.emit("error", new Error("private /Users/path stack secret"));

    const event = await waiting;
    expect(event).toEqual(kind === "exit" ? { done: true, code: 1, signal: null } : { dockerError: true });
    expect((client as any).waiters).toHaveLength(0);
    expect(child.stdout.listenerCount("data")).toBe(0);
    expect(JSON.stringify(event)).not.toMatch(/Users|private|stack|secret/u);
  });

  it("removes a timed-out waiter so it cannot consume a future event", async () => {
    vi.useFakeTimers();
    try {
      const child = new FakeStdioChild();
      const client = new StdioClient(child, 25);
      const timedOut = client.request(1, "tools/call");
      const rejection = expect(timedOut).rejects.toThrow("[docker-review:timeout] failed");
      await vi.advanceTimersByTimeAsync(25);
      await rejection;
      expect((client as any).waiters).toHaveLength(0);
      expect(child.stdout.listenerCount("data")).toBe(0);

      child.stdout.emit("data", line({ jsonrpc: "2.0", id: 2, result: "later" }));
      await expect(client.next()).resolves.toEqual({ timeout: true });
      expect((client as any).pendingEvents).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("credentialed Docker review harness", () => {
  it.each([undefined, "evidencelens-mcp:plan06", `sha256:${"0".repeat(63)}`])("rejects a non-immutable review image before Compose spawn", async (imageId) => {
    const spawnChild = vi.fn();
    await expect(runReviewHarness({
      isOffline: false,
      imageId,
      environment: { DEEPSEEK_API_KEY: "injected-test-only" },
      spawnChild,
    })).rejects.toThrow("[docker-review:preflight] failed");
    expect(spawnChild).not.toHaveBeenCalled();
  });

  it("accepts exactly one authenticated adapter receipt and keeps tools, reservation, and send distinct", () => {
    const environment = { [PROVIDER_REQUEST_GENERATION_ENV]: "c".repeat(64), [PROVIDER_REQUEST_KEY_ENV]: "d".repeat(64) };
    for (const observed of [0, 1] as const) {
      const collector = new ProviderRequestReceiptCollector();
      collector.consume(requestReceiptLine(environment, observed));
      expect(collector.receipt({ generation: environment[PROVIDER_REQUEST_GENERATION_ENV], key: Buffer.from(environment[PROVIDER_REQUEST_KEY_ENV], "hex") })).toMatchObject({ reservation_count: 1, observed_provider_requests: observed });
    }
  });

  it.each([
    ["missing", []],
    ["duplicate", [0, 0]],
    ["forged", [0, { mac: "0".repeat(64) }]],
    ["stale", [0, { generation: "e".repeat(64) }]],
    ["impossible", [0, { reservation_count: 0, observed_provider_requests: 1 }]],
  ] as const)("rejects %s adapter receipt evidence", (_name, specification) => {
    const environment = { [PROVIDER_REQUEST_GENERATION_ENV]: "c".repeat(64), [PROVIDER_REQUEST_KEY_ENV]: "d".repeat(64) };
    const collector = new ProviderRequestReceiptCollector();
    if (specification.length === 1 && typeof specification[0] === "number") collector.consume(requestReceiptLine(environment, specification[0] as 0 | 1));
    if (specification.length === 2 && typeof specification[1] === "number") {
      collector.consume(requestReceiptLine(environment, specification[0] as 0 | 1) + requestReceiptLine(environment, specification[1] as 0 | 1));
    } else if (specification.length === 2) collector.consume(requestReceiptLine(environment, specification[0] as 0 | 1, specification[1] as Record<string, unknown>));
    expect(collector.receipt({ generation: environment[PROVIDER_REQUEST_GENERATION_ENV], key: Buffer.from(environment[PROVIDER_REQUEST_KEY_ENV], "hex") })).toBeUndefined();
  });

  it("rejects an otherwise valid receipt arriving after child termination", () => {
    const environment = { [PROVIDER_REQUEST_GENERATION_ENV]: "c".repeat(64), [PROVIDER_REQUEST_KEY_ENV]: "d".repeat(64) };
    const collector = new ProviderRequestReceiptCollector();
    collector.markTerminal();
    collector.consume(requestReceiptLine(environment, 1));
    expect(collector.receipt({ generation: environment[PROVIDER_REQUEST_GENERATION_ENV], key: Buffer.from(environment[PROVIDER_REQUEST_KEY_ENV], "hex") })).toBeUndefined();
  });
  it("authenticates one production child frame and classifies it exactly once at the harness failure boundary", async () => {
    const child = failingLiveChild((environment, target) => {
      target.stderr.emit("data", `ordinary private stderr\n${diagnosticLine(environment)}`);
    });
    const diagnostics: unknown[] = [];
    const terminalSnapshots: any[] = [];
    const classifier = vi.fn(classifyDiagnostic);
    const spawnChild = vi.fn((_command, args, options) => {
      expect(args).toContain(CHILD_DIAGNOSTIC_KEY_ENV);
      expect(args).toContain(CHILD_DIAGNOSTIC_GENERATION_ENV);
      expect(options.env[REVIEW_IMAGE_ENV]).toBe(certifiedImageId);
      (child as any).diagnosticEnvironment = options.env;
      return child;
    });

    await expect(runReviewHarness({
      isOffline: false,
      imageId: certifiedImageId,
      environment: { DEEPSEEK_API_KEY: "injected-test-only" },
      resolveProof: vi.fn(async (_run, environment) => ({ model: "deepseek-v4-flash-vision-exp", childEnv: { ...environment, DEEPSEEK_MAX_RETRIES: "0" }, toolsCallTimeoutMs: 100 })),
      spawnChild,
      classify: classifier,
      retainDiagnostic: (diagnostic: unknown) => diagnostics.push(diagnostic),
      retainTerminalSnapshot: (snapshot: unknown) => terminalSnapshots.push(snapshot),
    })).rejects.toThrow("[docker-review:tools/call] failed");

    expect(classifier).toHaveBeenCalledOnce();
    expect(terminalSnapshots).toEqual([expect.objectContaining({
      branch: "post_tools_pre_fetch", mcp_tools_call_count: 1, observed_provider_requests: 0,
      reservation_count: 1, schema: "evidencelens.terminal-snapshot.v1", mac: expect.stringMatching(/^[a-f0-9]{64}$/u),
    })]);
    expect(diagnostics).toEqual([expect.objectContaining({
      invariant_id: "provider-http-json-decode",
      feature_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u),
      tier: "provider",
      regression_id: expect.stringMatching(/^P10-24-/u),
      permitted_files: ["src/providers/deepseek.ts"],
      repair: "allowlisted"
    })]);
    const childEnvironment = (child as any).diagnosticEnvironment;
    expect(childEnvironment).not.toHaveProperty(CHILD_DIAGNOSTIC_KEY_ENV);
    expect(childEnvironment).not.toHaveProperty(CHILD_DIAGNOSTIC_GENERATION_ENV);
    expect(JSON.stringify(diagnostics)).not.toMatch(/injected-test-only|ordinary private stderr|apiKey|mac|generation/u);
  });

  it("drains and authenticates one post-fetch transport category with its observed-send receipt", async () => {
    const child = failingLiveChild((environment, target) => {
      target.stderr.emit("data", diagnosticLine(environment, { path: ["provider", "transport", "fetch"], code: "dns" }));
      target.stderr.emit("data", requestReceiptLine(environment, 1));
    });
    const diagnostics: unknown[] = [];
    const terminalSnapshots: any[] = [];
    await expect(runReviewHarness({
      isOffline: false,
      imageId: certifiedImageId,
      environment: { DEEPSEEK_API_KEY: "injected-test-only" },
      resolveProof: vi.fn(async (_run, environment) => ({ model: "deepseek-v4-flash-vision-exp", childEnv: { ...environment, DEEPSEEK_MAX_RETRIES: "0" }, toolsCallTimeoutMs: 100 })),
      spawnChild: vi.fn((_command, _args, options) => { (child as any).diagnosticEnvironment = options.env; return child; }),
      retainDiagnostic: (diagnostic: unknown) => diagnostics.push(diagnostic),
      retainTerminalSnapshot: (snapshot: unknown) => terminalSnapshots.push(snapshot),
    })).rejects.toThrow("[docker-review:tools/call] failed");

    expect(diagnostics).toEqual([expect.objectContaining({
      invariant_id: "provider-transport-dns", tier: "transport", permitted_files: ["src/providers/retry.ts"], repair: "allowlisted"
    })]);
    expect(terminalSnapshots).toEqual([expect.objectContaining({
      branch: "post_fetch_non_pass", observed_provider_requests: 1,
      request_receipt: expect.objectContaining({ observed_provider_requests: 1, max_retries: 0 }),
      diagnostic: { code: "provider-transport-dns" }, stream_truncated: false
    })]);
    expect(JSON.stringify({ diagnostics, terminalSnapshots })).not.toMatch(/injected-test-only|private\.example|hostname|stack|errno|syscall/u);
  });

  it("drains an authenticated zero-send receipt and lifecycle after terminating a failed tools call", async () => {
    const child = failingLiveChild(() => undefined);
    child.stdin.end.mockImplementation(() => undefined);
    const terminalSnapshots: any[] = [];
    const spawnChild = vi.fn((_command, _args, options) => {
      const environment = { ...(options.env as Record<string, string>) };
      (child as any).diagnosticEnvironment = environment;
      child.kill.mockImplementation((signal: NodeJS.Signals) => {
        child.killed = true;
        child.signalCode = signal;
        setImmediate(() => {
          child.stderr.emit("data", requestReceiptLine(environment, 0));
          child.stdout.emit("end");
          child.stderr.emit("end");
          child.exitCode = 1;
          child.emit("exit", 1, null);
          child.emit("close", 1, null);
        });
        return true;
      });
      return child;
    });

    await expect(runReviewHarness({
      isOffline: false,
      imageId: certifiedImageId,
      environment: { DEEPSEEK_API_KEY: "injected-test-only" },
      resolveProof: vi.fn(async (_run, environment) => ({ model: "deepseek-v4-flash-vision-exp", childEnv: { ...environment, DEEPSEEK_MAX_RETRIES: "0" }, toolsCallTimeoutMs: 100 })),
      spawnChild,
      failureDrainTimeoutMs: 0,
      retainTerminalSnapshot: (snapshot: unknown) => terminalSnapshots.push(snapshot),
    })).rejects.toThrow("[docker-review:tools/call] failed");

    expect(terminalSnapshots).toEqual([expect.objectContaining({
      branch: "post_tools_pre_fetch",
      close: { code: 1, observed: true, signal: null },
      exit: { code: 1, observed: true, signal: null },
      mcp_tools_call_count: 1,
      observed_provider_requests: 0,
      request_receipt: expect.objectContaining({ observed_provider_requests: 0, reservation_count: 1 }),
      stream_truncated: true,
      transcript: { close_code: 1, exit_code: 1, mcp_method: "tools/call", tool: "review_evidence" },
    })]);
  });

  it("does not terminate a failed tools call before its authenticated receipt and natural lifecycle drain", async () => {
    const child = failingLiveChild(() => undefined);
    const terminalSnapshots: any[] = [];
    const spawnChild = vi.fn((_command, _args, options) => {
      const environment = { ...(options.env as Record<string, string>) };
      (child as any).diagnosticEnvironment = environment;
      child.stdin.end.mockImplementation(() => {
        setImmediate(() => {
          child.stderr.emit("data", requestReceiptLine(environment, 0));
          child.stdout.emit("end");
          child.stderr.emit("end");
          child.exitCode = 130;
          child.emit("exit", 130, null);
          child.emit("close", 130, null);
        });
      });
      return child;
    });

    await expect(runReviewHarness({
      isOffline: false,
      imageId: certifiedImageId,
      environment: { DEEPSEEK_API_KEY: "injected-test-only" },
      resolveProof: vi.fn(async (_run, environment) => ({ model: "deepseek-v4-flash-vision-exp", childEnv: { ...environment, DEEPSEEK_MAX_RETRIES: "0" }, toolsCallTimeoutMs: 100 })),
      spawnChild,
      retainTerminalSnapshot: (snapshot: unknown) => terminalSnapshots.push(snapshot),
    })).rejects.toThrow("[docker-review:tools/call] failed");

    expect(child.kill).not.toHaveBeenCalled();
    expect(terminalSnapshots).toEqual([expect.objectContaining({
      branch: "post_tools_pre_fetch",
      close: { code: 130, observed: true, signal: null },
      exit: { code: 130, observed: true, signal: null },
      request_receipt: expect.objectContaining({ observed_provider_requests: 0, reservation_count: 1 }),
    })]);
  });

  it.each(["exit-close", "close-exit"] as const)("authenticates a buffered receipt delivered after process %s but before stderr completion", async (order) => {
    const child = failingLiveChild(() => undefined);
    const terminalSnapshots: any[] = [];
    const diagnostics: any[] = [];
    const spawnChild = vi.fn((_command, _args, options) => {
      const environment = { ...(options.env as Record<string, string>) };
      (child as any).diagnosticEnvironment = environment;
      child.stdin.end.mockImplementation(() => {
        setImmediate(() => {
          child.exitCode = 0;
          const events = order === "exit-close" ? ["exit", "close"] : ["close", "exit"];
          child.emit(events[0], 0, null);
          child.emit(events[1], 0, null);
          child.stderr.emit("data", diagnosticLine(environment));
          child.stderr.emit("data", requestReceiptLine(environment, 0));
          child.stdout.emit("end");
          child.stderr.emit("end");
        });
      });
      return child;
    });

    await expect(runReviewHarness({
      isOffline: false,
      imageId: certifiedImageId,
      environment: { DEEPSEEK_API_KEY: "injected-test-only" },
      resolveProof: vi.fn(async (_run, environment) => ({ model: "deepseek-v4-flash-vision-exp", childEnv: { ...environment, DEEPSEEK_MAX_RETRIES: "0" }, toolsCallTimeoutMs: 100 })),
      spawnChild,
      retainDiagnostic: (diagnostic: unknown) => diagnostics.push(diagnostic),
      retainTerminalSnapshot: (snapshot: unknown) => terminalSnapshots.push(snapshot),
    })).rejects.toThrow("[docker-review:tools/call] failed");

    expect(child.kill).not.toHaveBeenCalled();
    expect(diagnostics).toEqual([expect.objectContaining({ invariant_id: "provider-http-json-decode" })]);
    expect(terminalSnapshots).toEqual([expect.objectContaining({
      branch: "post_tools_pre_fetch",
      close: { code: 0, observed: true, signal: null },
      exit: { code: 0, observed: true, signal: null },
      observed_provider_requests: 0,
      request_receipt: expect.objectContaining({ observed_provider_requests: 0, reservation_count: 1 }),
      stream_truncated: false,
    })]);
  });

  it.each([
    ["absent", () => undefined],
    ["multiple", (environment: Record<string, string>, child: FakeStdioChild) => child.stderr.emit("data", diagnosticLine(environment) + diagnosticLine(environment))],
    ["conflicting", (environment: Record<string, string>, child: FakeStdioChild) => child.stderr.emit("data", diagnosticLine(environment) + diagnosticLine(environment, { path: ["provider", "choices"], code: "too_small" }))],
    ["bad MAC", (environment: Record<string, string>, child: FakeStdioChild) => child.stderr.emit("data", diagnosticLine(environment).replace(/"mac":"[a-f0-9]/u, '"mac":"z'))],
    ["stale generation", (environment: Record<string, string>, child: FakeStdioChild) => child.stderr.emit("data", diagnosticLine(environment, { generation: "f".repeat(64) }))],
    ["detail-bearing", (environment: Record<string, string>, child: FakeStdioChild) => child.stderr.emit("data", diagnosticLine(environment, { detail: "private" }))],
    ["stdout confusion", (environment: Record<string, string>, child: FakeStdioChild) => child.stdout.emit("data", diagnosticLine(environment))],
    ["late", (environment: Record<string, string>, child: FakeStdioChild) => { child.stderr.emit("end"); child.stderr.emit("data", diagnosticLine(environment)); }],
    ["overflow", (environment: Record<string, string>, child: FakeStdioChild) => child.stderr.emit("data", `${CHILD_DIAGNOSTIC_PREFIX}${"x".repeat(4097)}\n`)]
  ] as const)("routes %s child diagnostics to one ambiguous zero-budget result", async (_name, emitFrame) => {
    const child = failingLiveChild((environment, target) => emitFrame(environment, target));
    const diagnostics: any[] = [];
    const classifier = vi.fn(classifyDiagnostic);
    await expect(runReviewHarness({
      isOffline: false,
      imageId: certifiedImageId,
      environment: { DEEPSEEK_API_KEY: "injected-test-only" },
      resolveProof: vi.fn(async (_run, environment) => ({ model: "deepseek-v4-flash-vision-exp", childEnv: { ...environment, DEEPSEEK_MAX_RETRIES: "0" }, toolsCallTimeoutMs: 100 })),
      spawnChild: vi.fn((_command, _args, options) => { (child as any).diagnosticEnvironment = options.env; return child; }),
      classify: classifier,
      retainDiagnostic: (diagnostic: unknown) => diagnostics.push(diagnostic)
    })).rejects.toThrow("[docker-review:tools/call] failed");
    expect(classifier).toHaveBeenCalledOnce();
    expect(diagnostics).toEqual([{ invariant_id: "ambiguous", feature_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u), repair: "no_repair", follow_up_request_budget: 0 }]);
  });

  it("defines a closed, collision-free and secret-free diagnostic invariant registry", () => {
    const entries = Object.entries(DIAGNOSTIC_INVARIANT_MAP);
    expect(entries.length).toBeGreaterThan(30);
    expect(new Set(entries.map(([id]) => id)).size).toBe(entries.length);
    expect(new Set(entries.map(([, entry]: any) => entry.regression_id)).size).toBe(entries.length);
    for (const [id, entry] of entries as any) {
      expect(entry).toEqual({
        invariant_id: id,
        tier: expect.stringMatching(/^(?:transport|mcp|public|provider|provenance|orchestration)$/u),
        production_file: expect.stringMatching(/^(?:scripts|src)\//u),
        test_file: expect.stringMatching(/^tests\//u),
        regression_id: expect.stringMatching(/^P10-24-/u),
        permitted_files: expect.arrayContaining([entry.production_file])
      });
      expect(JSON.stringify(entry)).not.toMatch(/secret|\/Users\/private|\/workspace\/private/u);
    }
  });

  it("classifies only one allowlisted structural feature and fails closed otherwise", () => {
    const first = Object.values(DIAGNOSTIC_INVARIANT_MAP)[0] as any;
    expect(classifyDiagnostic([{ path: ["rpc", "envelope"], code: "invalid_type" }])).toEqual({
      invariant_id: first.invariant_id,
      feature_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u),
      tier: first.tier,
      regression_id: first.regression_id,
      permitted_files: first.permitted_files,
      repair: "allowlisted"
    });
    for (const features of [[], [{ path: ["private-secret"], code: "custom" }], [{ path: ["rpc", "envelope"], code: "invalid_type" }, { path: ["unknown"], code: "custom" }]]) {
      expect(classifyDiagnostic(features)).toEqual({ invariant_id: "ambiguous", feature_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u), repair: "no_repair", follow_up_request_budget: 0 });
    }
  });

  it("reproduces every diagnostic invariant offline with one distinct canonical vector", () => {
    const diagnostics = Object.entries(DIAGNOSTIC_INVARIANT_MAP).map(([id, entry]: any) => {
      const feature = diagnosticFeatureForInvariant(id);
      const result = classifyDiagnostic([feature]);
      expect(result).toMatchObject({ invariant_id: id, tier: entry.tier, regression_id: entry.regression_id, permitted_files: entry.permitted_files, repair: "allowlisted" });
      expect(result.feature_fingerprint).toMatch(/^[a-f0-9]{64}$/u);
      expect(JSON.stringify(result)).not.toMatch(/passed:|credentialed review passed|secret|\/Users\/|\/workspace\//u);
      return result;
    });
    expect(new Set(diagnostics.map((value) => value.invariant_id)).size).toBe(diagnostics.length);
    expect(new Set(diagnostics.map((value) => value.feature_fingerprint)).size).toBe(diagnostics.length);
  });

  it("routes duplicate, multi-issue, unknown and ambiguous vectors to zero-budget no-repair", () => {
    const feature = diagnosticFeatureForInvariant(Object.keys(DIAGNOSTIC_INVARIANT_MAP)[0]);
    for (const features of [[feature, feature], [feature, { path: ["unknown"], code: "custom" }], [{ path: ["unknown"], code: "custom" }], null]) {
      const diagnostic = classifyDiagnostic(features as any);
      expect(diagnostic).toMatchObject({ invariant_id: "ambiguous", repair: "no_repair", follow_up_request_budget: 0 });
      expect(JSON.stringify(diagnostic)).not.toContain("passed");
    }
  });

  it("never promotes raw content or a finish-reason value into host authority", () => {
    const unsafe = [
      [{ path: ["provider", "content", "object"], code: "unbalanced", raw_content: "private provider body", finish_reason: "length" }, "provider-json-object-unbalanced"],
      [{ path: ["provider", "finish_reason"], code: "length", raw_content: "private provider body", finish_reason: "length" }, "provider-finish-reason-length"]
    ];
    for (const [candidate, invariantId] of unsafe) {
      const classified = classifyDiagnostic([candidate]);
      const serialized = JSON.stringify(classified);
      expect(classified).toMatchObject({ invariant_id: invariantId, repair: "allowlisted" });
      expect(serialized).not.toMatch(/private provider body|finish_reason|"length"|"passed"/u);
    }
  });
  it("drives the production orchestration seam through the complete offline-shaped lifecycle", async () => {
    const child = new FakeStdioChild();
    const transcript: any[] = [];
    const write = vi.fn();
    child.stdin.write.mockImplementation((raw: string, callback?: (error?: Error) => void) => {
      const message = JSON.parse(raw);
      transcript.push(message);
      if (message.method === "initialize") {
        child.stdout.emit("data", Buffer.from(line({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "evidencelens", version: "0.1.3" } } })));
      } else if (message.method === "tools/list") {
        child.stdout.emit("data", Buffer.from(line({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "review_evidence", annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true } }] } })));
      } else if (message.method === "tools/call") {
        const payload = successPayload();
        payload.requestId = "docker-smoke-001";
        delete payload.metadata.provider;
        payload.findings[0].id = "deterministic:finding-1";
        child.stdout.emit("data", Buffer.from(line({ jsonrpc: "2.0", id: 3, result: mcp(payload) })));
        setTimeout(() => {
          child.stdout.emit("end");
          child.stderr.emit("end");
          child.exitCode = 0;
          child.emit("exit", 0, null);
          child.emit("close", 0, null);
        }, 0);
      }
      callback?.();
      return true;
    });

    await expect(runReviewHarness({
      isOffline: true,
      spawnChild: vi.fn(() => child),
      write
    })).resolves.toBeUndefined();

    expect(transcript.map(({ method }) => method)).toEqual(["initialize", "notifications/initialized", "tools/list", "tools/call"]);
    expect(transcript.map(({ id }) => id)).toEqual([1, undefined, 2, 3]);
    expect(transcript[3].params.arguments).toEqual(fixtureRequest(true));
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith("offline smoke passed: 4 fixtures, 1 findings\n");
  });

  it("writes the exact initialize, initialized, tools/list, and tools/call transcript", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    child.stdin.write.mockImplementation((raw: string, callback?: (error?: Error) => void) => {
      const message = JSON.parse(raw);
      if (message.method === "initialize") {
        child.stdout.emit("data", line({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "evidencelens", version: "0.1.3" } } }));
      } else if (message.method === "tools/list") {
        child.stdout.emit("data", line({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "review_evidence", annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true } }] } }));
      } else if (message.method === "tools/call") {
        child.stdout.emit("data", line({ jsonrpc: "2.0", id: 3, result: mcp(successPayload()) }));
      }
      callback?.(); return true;
    });

    await expect(performMcpReview(client, true)).resolves.toMatchObject({ ok: true });
    const transcript = child.stdin.write.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(transcript.map(({ method }) => method)).toEqual(["initialize", "notifications/initialized", "tools/list", "tools/call"]);
    expect(transcript.map(({ id }) => id)).toEqual([1, undefined, 2, 3]);
    expect(transcript[1]).toEqual({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    expect(Object.prototype.hasOwnProperty.call(transcript[1], "id")).toBe(false);
  });

  it.each([
    [{ capabilities: {}, serverInfo: { name: "server", version: "1" } }, "missing protocolVersion"],
    [{ protocolVersion: "", capabilities: {}, serverInfo: { name: "server", version: "1" } }, "blank protocolVersion"],
    [{ protocolVersion: 2, capabilities: {}, serverInfo: { name: "server", version: "1" } }, "wrong protocolVersion type"],
    [{ protocolVersion: "other", capabilities: {}, serverInfo: { name: "server", version: "1" } }, "mismatched protocolVersion"],
    [{ protocolVersion: "2025-11-25", serverInfo: { name: "server", version: "1" } }, "missing capabilities"],
    [{ protocolVersion: "2025-11-25", capabilities: [], serverInfo: { name: "server", version: "1" } }, "non-object capabilities"],
    [{ protocolVersion: "2025-11-25", capabilities: {} }, "missing serverInfo"],
    [{ protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "", version: "1" } }, "blank server name"],
    [{ protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "server", version: 1 } }, "wrong server version type"]
  ] as const)("rejects malformed initialize result: %s (%s)", (result) => {
    expect(() => validateInitializeResult(result, "2025-11-25")).toThrow("[docker-review:initialize] failed");
  });

  it("stops before initialized notification and tools/list when initialization is invalid", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    child.stdin.write.mockImplementation((raw: string, callback?: (error?: Error) => void) => {
      const message = JSON.parse(raw);
      if (message.method === "initialize") child.stdout.emit("data", line({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "wrong", capabilities: {}, serverInfo: { name: "private", version: "secret" } } }));
      callback?.(); return true;
    });

    await expect(performMcpReview(client, true)).rejects.toThrow("[docker-review:initialize] failed");
    expect(child.stdin.write).toHaveBeenCalledOnce();
    expect(JSON.parse(child.stdin.write.mock.calls[0][0]).method).toBe("initialize");
  });

  it("emits success only after one observed, stream-complete exit and close pair", async () => {
    const child = new FakeChild();
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 100);
    const completion = completeProofLifecycle(lifecycle, successPayload(), false, { write });

    expect(child.stdin.end).toHaveBeenCalledOnce();
    expect(write).not.toHaveBeenCalled();
    child.exitCode = 0;
    child.emit("exit", 0, null);
    child.stdout.emit("end");
    child.stderr.emit("end");
    child.emit("close", 0, null);

    await expect(completion).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledWith("credentialed review passed: 4 fixtures, 1 findings\n");
  });

  it.each([
    [1, null, "nonzero exit"],
    [null, "SIGTERM", "signal exit"]
  ] as const)("rejects %s/%s %s without success or private lifecycle detail", async (code, signal) => {
    const child = new FakeChild();
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 100);
    const completion = completeProofLifecycle(lifecycle, successPayload(), false, { write });
    child.exitCode = code;
    child.signalCode = signal;
    child.emit("exit", code, signal);
    child.stdout.emit("end");
    child.stderr.emit("end");
    child.emit("close", code, signal);

    await expect(completion).rejects.toThrow("[docker-review:protocol] failed");
    expect(write).not.toHaveBeenCalled();
  });

  it("rejects a spawn error without exposing its details or emitting success", async () => {
    const child = new FakeChild();
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 100);
    const completion = completeProofLifecycle(lifecycle, successPayload(), false, { write });
    const rejection = expect(completion).rejects.toThrow("[docker-review:docker] failed");
    child.emit("error", new Error("private stderr /Users/private cause stack response-body"));

    await rejection;
    expect(write).not.toHaveBeenCalled();
  });

  it("rejects a bounded shutdown timeout without success", async () => {
    vi.useFakeTimers();
    try {
      const child = new FakeChild();
      const write = vi.fn();
      const lifecycle = captureChildLifecycle(child, 50);
      const completion = completeProofLifecycle(lifecycle, successPayload(), false, { write });
      const rejection = expect(completion).rejects.toThrow("[docker-review:timeout] failed");
      await vi.advanceTimersByTimeAsync(50);
      await rejection;
      expect(write).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not infer lifecycle evidence from child process properties", async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    child.exitCode = 0;
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 50);
    const completion = completeProofLifecycle(lifecycle, successPayload(), true, { write });
    const rejection = expect(completion).rejects.toThrow("[docker-review:timeout] failed");
    await vi.advanceTimersByTimeAsync(50);
    await rejection;
    expect(write).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it.each(["exit", "close"])("rejects a missing %s event at the absolute deadline", async (missing) => {
    vi.useFakeTimers();
    try {
      const child = new FakeChild();
      const lifecycle = captureChildLifecycle(child, 50);
      const completion = completeProofLifecycle(lifecycle, successPayload(), true, { write: vi.fn() });
      child.stdout.emit("end"); child.stderr.emit("end");
      if (missing === "exit") child.emit("close", 0, null);
      else child.emit("exit", 0, null);
      const rejection = expect(completion).rejects.toThrow("[docker-review:timeout] failed");
      await vi.advanceTimersByTimeAsync(50);
      await rejection;
    } finally { vi.useRealTimers(); }
  });

  it("rejects a close that arrives after the absolute deadline", async () => {
    vi.useFakeTimers();
    try {
      const child = new FakeChild();
      const write = vi.fn();
      const lifecycle = captureChildLifecycle(child, 50);
      const completion = completeProofLifecycle(lifecycle, successPayload(), true, { write });
      child.stdout.emit("end"); child.stderr.emit("end"); child.emit("exit", 0, null);
      const rejection = expect(completion).rejects.toThrow("[docker-review:timeout] failed");
      await vi.advanceTimersByTimeAsync(50);
      child.emit("close", 0, null);
      await rejection;
      expect(write).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

  it.each(["exit-first", "close-first"])("accepts the %s order only after both matching events", async (order) => {
    const child = new FakeChild();
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 100);
    const completion = completeProofLifecycle(lifecycle, successPayload(), true, { write });
    child.stdout.emit("end"); child.stderr.emit("end");
    const events = order === "exit-first" ? ["exit", "close"] : ["close", "exit"];
    child.emit(events[0], 0, null);
    expect(write).not.toHaveBeenCalled();
    child.emit(events[1], 0, null);
    await expect(completion).resolves.toBeUndefined();
  });

  it.each([
    [0, null, 1, null, "code"],
    [null, "SIGTERM", null, "SIGKILL", "signal"]
  ] as const)("rejects exit/close %s disagreement", async (exitCode, exitSignal, closeCode, closeSignal) => {
    const child = new FakeChild();
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 100);
    const completion = completeProofLifecycle(lifecycle, successPayload(), true, { write });
    child.stdout.emit("end"); child.stderr.emit("end");
    child.emit("exit", exitCode, exitSignal);
    child.emit("close", closeCode, closeSignal);
    await expect(completion).rejects.toThrow("[docker-review:protocol] failed");
    expect(write).not.toHaveBeenCalled();
  });

  it.each(["exit", "close"])("rejects a duplicate %s event", async (duplicate) => {
    const child = new FakeChild();
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 100);
    const completion = completeProofLifecycle(lifecycle, successPayload(), true, { write });
    child.stdout.emit("end"); child.stderr.emit("end");
    child.emit(duplicate, 0, null);
    child.emit(duplicate, 0, null);
    await expect(completion).rejects.toThrow("[docker-review:protocol] failed");
    expect(write).not.toHaveBeenCalled();
  });

  it.each(["stdout-data", "stderr-data", "stdout-error", "child-error"])("rejects a late %s race after terminal events", async (kind) => {
    const child = new FakeChild();
    const write = vi.fn();
    const lifecycle = captureChildLifecycle(child, 100);
    const completion = completeProofLifecycle(lifecycle, successPayload(), true, { write });
    child.stdout.emit("end"); child.stderr.emit("end");
    child.emit("exit", 0, null); child.emit("close", 0, null);
    if (kind === "stdout-data") child.stdout.emit("data", "late");
    if (kind === "stderr-data") child.stderr.emit("data", "late");
    if (kind === "stdout-error") child.stdout.emit("error", new Error("private"));
    if (kind === "child-error") child.emit("error", new Error("private"));
    await expect(completion).rejects.toThrow(/\[docker-review:(?:docker|protocol)\] failed/u);
    expect(write).not.toHaveBeenCalled();
  });
  it("forces a literal zero-retry child environment and encloses one provider attempt", () => {
    const result = liveProofPreflight({ DEEPSEEK_TIMEOUT_MS: "30000", DEEPSEEK_MAX_RETRIES: "0" }, { DEEPSEEK_MAX_RETRIES: "2", KEEP: "yes" });
    expect(result).toEqual({
      childEnv: { DEEPSEEK_MAX_RETRIES: "0", KEEP: "yes" },
      providerTimeoutMs: 30_000,
      toolsCallTimeoutMs: 60_000
    });
    expect(result.toolsCallTimeoutMs).toBeGreaterThan(result.providerTimeoutMs);
  });

  it("rejects every explicit output cap before Compose resolution and omits it from the child environment", async () => {
    expect(() => liveProofPreflight(
      { DEEPSEEK_TIMEOUT_MS: "30000", DEEPSEEK_MAX_RETRIES: "0" },
      { DEEPSEEK_MAX_TOKENS: "20000" }
    )).toThrowError(new Error("[docker-review:preflight] failed"));
    expect(() => liveProofPreflight(
      { DEEPSEEK_TIMEOUT_MS: "30000", DEEPSEEK_MAX_RETRIES: "0", DEEPSEEK_MAX_TOKENS: "20000" },
      {}
    )).toThrowError(new Error("[docker-review:preflight] failed"));

    const runCompose = vi.fn();
    await expect(resolveLiveProof(runCompose, { DEEPSEEK_MAX_TOKENS: "20000" }))
      .rejects.toThrowError(new Error("[docker-review:preflight] failed"));
    expect(runCompose).not.toHaveBeenCalled();
  });

  it("resolves the real review Compose preflight without a proof-only credential", async () => {
    const environment = {
      PATH: process.env.PATH,
      DEEPSEEK_API_KEY: "review-compose-regression-not-a-secret",
      DEEPSEEK_MAX_RETRIES: "0",
      EVIDENCELENS_DISABLE_PROVIDER: "1",
    };

    const result = await resolveLiveProof(undefined, environment);

    expect(result).toMatchObject({
      model: "deepseek-v4-flash-vision-exp",
      providerTimeoutMs: 30_000,
      toolsCallTimeoutMs: 60_000,
      childEnv: {
        DEEPSEEK_API_KEY: "review-compose-regression-not-a-secret",
        DEEPSEEK_MAX_RETRIES: "0",
        EVIDENCELENS_PROOF_DEEPSEEK_API_KEY: PROOF_SENTINEL,
      },
    });
  });

  it("resolves the review service to the authenticated immutable image instead of the mutable tag", async () => {
    const result = await execFileAsync("docker", ["compose", "--profile", "review", "config", "--format", "json"], {
      env: {
        ...process.env,
        DEEPSEEK_API_KEY: "review-compose-regression-not-a-secret",
        EVIDENCELENS_PROOF_DEEPSEEK_API_KEY: PROOF_SENTINEL,
        [REVIEW_IMAGE_ENV]: certifiedImageId,
      },
    });
    expect(JSON.parse(result.stdout).services.review.image).toBe(certifiedImageId);
  });

  it("keeps the review credential out of Compose config resolution", async () => {
    const realLookingReviewCredential = "sk-review-must-not-enter-compose-config";
    const runCompose = vi.fn(async (_file: string, _argv: string[], options: { env: Record<string, string | undefined> }) => {
      expect(options.env.DEEPSEEK_API_KEY).toBe(REVIEW_SENTINEL);
      expect(options.env.EVIDENCELENS_PROOF_DEEPSEEK_API_KEY).toBe(PROOF_SENTINEL);
      expect(Object.values(options.env)).not.toContain(realLookingReviewCredential);
      return {
        stdout: JSON.stringify({
          services: {
            review: {
              environment: {
                DEEPSEEK_API_KEY: REVIEW_SENTINEL,
                DEEPSEEK_MAX_RETRIES: "0",
                DEEPSEEK_MODEL: "deepseek-v4-flash-vision-exp",
                DEEPSEEK_TIMEOUT_MS: "30000",
              },
            },
          },
        }),
      };
    });

    const result = await resolveLiveProof(runCompose, {
      DEEPSEEK_API_KEY: realLookingReviewCredential,
      DEEPSEEK_MAX_RETRIES: "2",
    });

    expect(runCompose).toHaveBeenCalledOnce();
    expect(result.childEnv.DEEPSEEK_API_KEY).toBe(realLookingReviewCredential);
    expect(result.childEnv.EVIDENCELENS_PROOF_DEEPSEEK_API_KEY).toBe(PROOF_SENTINEL);
    expect(result.childEnv.DEEPSEEK_MAX_RETRIES).toBe("0");
  });

  it.each([
    [{ DEEPSEEK_TIMEOUT_MS: "30000" }, "missing retry"],
    [{ DEEPSEEK_TIMEOUT_MS: "30000", DEEPSEEK_MAX_RETRIES: "" }, "blank retry"],
    [{ DEEPSEEK_TIMEOUT_MS: "30000", DEEPSEEK_MAX_RETRIES: "wat" }, "malformed retry"],
    [{ DEEPSEEK_TIMEOUT_MS: "30000", DEEPSEEK_MAX_RETRIES: "1" }, "nonzero retry"],
    [{ DEEPSEEK_TIMEOUT_MS: "999", DEEPSEEK_MAX_RETRIES: "0" }, "low timeout"],
    [{ DEEPSEEK_TIMEOUT_MS: "120001", DEEPSEEK_MAX_RETRIES: "0" }, "high timeout"],
    [{ DEEPSEEK_TIMEOUT_MS: "Infinity", DEEPSEEK_MAX_RETRIES: "0" }, "non-finite timeout"]
  ])("rejects %s with only a sanitized preflight failure", (resolvedEnvironment) => {
    expect(() => liveProofPreflight(resolvedEnvironment, {})).toThrowError(new Error("[docker-review:preflight] failed"));
  });

  it.each([
    [undefined, 30_000, 60_000], ["1000", 1_000, 31_000], ["120000", 120_000, 150_000]
  ])("accepts the production timeout default/boundaries", (raw, providerTimeoutMs, toolsCallTimeoutMs) => {
    const environment: Record<string, string> = { DEEPSEEK_MAX_RETRIES: "0" };
    if (raw !== undefined) environment.DEEPSEEK_TIMEOUT_MS = raw;
    expect(liveProofPreflight(environment, {})).toMatchObject({ providerTimeoutMs, toolsCallTimeoutMs });
  });

  it("uses the one-attempt budget only for tools/call", () => {
    expect(methodTimeoutMs("tools/call", 60_000)).toBe(60_000);
    for (const method of ["initialize", "tools/list", "shutdown"]) expect(methodTimeoutMs(method, 60_000)).toBe(30_000);
  });

  it("redacts every failure category", () => {
    const secrets = ["rpc-secret", "/Users/private", "/workspace/private", "raw-fixture", "stack-secret", "config-secret"];
    const allowed = ["preflight", "docker", "initialize", "tools/list", "tools/call", "protocol", "timeout"];
    for (const phase of [...allowed, "runtime", "shutdown"]) {
      const output = classifyFailure(phase, ...secrets);
      expect(allowed).toContain(output);
      secrets.forEach((secret) => expect(output).not.toContain(secret));
    }
  });

  it("rejects missing credentials before Docker startup", async () => {
    for (const key of [undefined, "   "]) {
      const env = { ...process.env };
      if (key === undefined) delete env.DEEPSEEK_API_KEY; else env.DEEPSEEK_API_KEY = key;
      const result = await execFileAsync(process.execPath, ["scripts/docker-review-real.mjs"], { cwd: process.cwd(), env }).catch((error: any) => error);
      expect(result.code).not.toBe(0); expect(result.stdout).toBe(""); expect(result.stderr).toBe("[docker-review:preflight] failed\n");
    }
  });

  it("keeps the bounded four-file request", () => {
    expect(fixtureRequest(false).evidence.map((item: any) => `filesystem://${item.filesystem.rootId}/${item.filesystem.relativePath}`)).toEqual(refs);
  });

  it("accepts a complete production response bound to the resolved DeepSeek model", () => {
    expect(assertStructuralReview(mcp(successPayload()), false, "deepseek-v4-flash-vision-exp")).toMatchObject({ metadata: { provider: { name: "deepseek" } } });
  });

  it("rejects fake attribution, namespace/model drift, missing fields, and invalid provenance", () => {
    const mutations = [
      (p: any) => { p.metadata.provider.name = "fake"; }, (p: any) => { p.metadata.provider.model = "deepseek-v4-pro"; },
      (p: any) => { p.findings[0].id = "provider:fake:finding"; }, (p: any) => { p.findings[0].id = "deterministic:finding"; },
      (p: any) => { delete p.metadata.serverName; }, (p: any) => { p.metadata.extra = true; },
      (p: any) => { p.findings[0].followUpChecks = []; }, (p: any) => { p.normalizedEvidence[0].references = []; },
      (p: any) => { p.normalizedEvidence[0].contentHash = "invalid"; }, (p: any) => { p.normalizedEvidence[0].references[0].startLine = 0; },
      (p: any) => { p.findings[0].citations[0].evidenceId = "missing"; }, (p: any) => { p.findings[0].citations[0].role = "rubric"; },
      (p: any) => { p.findings[0].citations[0].contentHash = "b".repeat(64); }, (p: any) => { p.findings[0].citations[0].sourceReference = refs[1]; },
      (p: any) => { p.findings[0].citations[0].location = { kind: "text", startLine: 2, endLine: 2 }; }
    ];
    for (const mutate of mutations) { const payload = successPayload(); mutate(payload); rejectProtocol(mcp(payload)); }
  });

  it("rejects malformed MCP envelopes and private content with one protocol diagnostic", () => {
    for (const value of [null, {}, { content: [] }, { content: [{ type: "image", text: "secret" }] }, { content: [{ type: "text", text: "raw-schema-secret" }] }, { content: [{ type: "text", text: "{}" }], extra: true }]) rejectProtocol(value);
    for (const leaked of ["Read the assignment brief.", "Criterion,Excellent", "/Users/private/file", "/workspace/private/file"]) { const payload = successPayload(); payload.findings[0].summary = leaked; rejectProtocol(mcp(payload)); }
  });

  it.each([
    ["shell/process override", "deepseek-v4-pro"],
    ["project .env interpolation", "deepseek-v4-flash"],
    ["Compose default", "deepseek-v4-flash-vision-exp"]
  ])("uses the resolved model for %s solely through the injected Compose-config seam", async (_source, model) => {
      const run = vi.fn().mockResolvedValue({ stdout: JSON.stringify({ services: { review: { environment: { DEEPSEEK_API_KEY: "secret", DEEPSEEK_MODEL: model } } } }) });
      await expect(resolveReviewModel(run)).resolves.toBe(model);
      expect(run).toHaveBeenCalledWith("docker", ["compose", "--profile", "review", "config", "--format", "json"]);
  });

  it("sanitizes missing, malformed, disallowed, and failed Compose resolution", async () => {
    const configs: unknown[] = ["not-json", null, {}, { services: null }, { services: {} }, { services: { review: null } }, { services: { review: { environment: null } } }, { services: { review: { environment: {} } } }, { services: { review: { environment: { DEEPSEEK_MODEL: "" } } } }, { services: { review: { environment: { DEEPSEEK_MODEL: "other" } } } }];
    for (const config of configs) {
      const raw = typeof config === "string" ? config : JSON.stringify(config);
      try { await resolveReviewModel(vi.fn().mockResolvedValue({ stdout: raw })); throw new Error("accepted"); }
      catch (error) { expect((error as Error).message).toBe("[docker-review:preflight] failed"); expect((error as Error).message).not.toContain(raw); }
    }
    await expect(resolveReviewModel(vi.fn().mockRejectedValue(new Error("external-secret")))).rejects.toThrow("[docker-review:preflight] failed");
  });

  it("keeps routine commands disconnected from the explicit live command", async () => {
    const pkg = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.test + pkg.scripts["test:e2e"] + pkg.scripts["docker:smoke"]).not.toContain("docker:review:real");
    expect(pkg.scripts["docker:review:real"]).toBe("node scripts/docker-review-real.mjs");
  });
});
