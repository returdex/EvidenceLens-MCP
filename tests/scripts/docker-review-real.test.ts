import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { assertStructuralReview, classifyFailure, completeProofLifecycle, fixtureRequest, isJsonRpcResponse, liveProofPreflight, methodTimeoutMs, performMcpReview, resolveReviewModel, StdioClient, validateInitializeResult } from "../../scripts/docker-review-real.mjs";

const execFileAsync = promisify(execFile);
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
  stdin = { end: vi.fn() };
}

class FakeStream extends EventEmitter {
  setEncoding = vi.fn();
}

class FakeStdioChild extends EventEmitter {
  stdout = new FakeStream();
  stdin = { write: vi.fn(), end: vi.fn() };
}

const line = (value: unknown) => `${JSON.stringify(value)}\n`;

describe("bounded Docker stdio event delivery", () => {
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
    if (kind === "exit") child.emit("exit", 1, null);
    else child.emit("error", new Error("private /Users/path stack secret"));

    const event = await waiting;
    expect(event).toEqual(kind === "exit" ? { done: true } : { dockerError: true });
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
  it("writes the exact initialize, initialized, tools/list, and tools/call transcript", async () => {
    const child = new FakeStdioChild();
    const client = new StdioClient(child);
    child.stdin.write.mockImplementation((raw: string) => {
      const message = JSON.parse(raw);
      if (message.method === "initialize") {
        child.stdout.emit("data", line({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "evidencelens", version: "0.1.3" } } }));
      } else if (message.method === "tools/list") {
        child.stdout.emit("data", line({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "review_evidence", annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true } }] } }));
      } else if (message.method === "tools/call") {
        child.stdout.emit("data", line({ jsonrpc: "2.0", id: 3, result: mcp(successPayload()) }));
      }
      return true;
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
    child.stdin.write.mockImplementation((raw: string) => {
      const message = JSON.parse(raw);
      if (message.method === "initialize") child.stdout.emit("data", line({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "wrong", capabilities: {}, serverInfo: { name: "private", version: "secret" } } }));
      return true;
    });

    await expect(performMcpReview(client, true)).rejects.toThrow("[docker-review:initialize] failed");
    expect(child.stdin.write).toHaveBeenCalledOnce();
    expect(JSON.parse(child.stdin.write.mock.calls[0][0]).method).toBe("initialize");
  });

  it("emits success only after a clean child exit", async () => {
    const child = new FakeChild();
    const write = vi.fn();
    const completion = completeProofLifecycle(child, successPayload(), false, { write, timeoutMs: 100 });

    expect(child.stdin.end).toHaveBeenCalledOnce();
    expect(write).not.toHaveBeenCalled();
    child.exitCode = 0;
    child.emit("exit", 0, null);

    await expect(completion).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledWith("credentialed review passed: 4 fixtures, 1 findings\n");
  });

  it.each([
    [1, null, "nonzero exit"],
    [null, "SIGTERM", "signal exit"]
  ] as const)("rejects %s/%s %s without success or private lifecycle detail", async (code, signal) => {
    const child = new FakeChild();
    const write = vi.fn();
    const completion = completeProofLifecycle(child, successPayload(), false, { write, timeoutMs: 100 });
    child.exitCode = code;
    child.signalCode = signal;
    child.emit("exit", code, signal);

    await expect(completion).rejects.toThrow("[docker-review:protocol] failed");
    expect(write).not.toHaveBeenCalled();
  });

  it("rejects a spawn error without exposing its details or emitting success", async () => {
    const child = new FakeChild();
    const write = vi.fn();
    const completion = completeProofLifecycle(child, successPayload(), false, { write, timeoutMs: 100 });
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
      const completion = completeProofLifecycle(child, successPayload(), false, { write, timeoutMs: 50 });
      const rejection = expect(completion).rejects.toThrow("[docker-review:timeout] failed");
      await vi.advanceTimersByTimeAsync(50);
      await rejection;
      expect(write).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("observes a child that exited before the shutdown waiter was attached", async () => {
    const child = new FakeChild();
    child.exitCode = 0;
    const write = vi.fn();

    await expect(completeProofLifecycle(child, successPayload(), true, { write, timeoutMs: 100 })).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledWith("offline smoke passed: 4 fixtures, 1 findings\n");
    expect(child.listenerCount("exit")).toBe(0);
    expect(child.listenerCount("error")).toBe(0);
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
