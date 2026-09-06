import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { assertStructuralReview, classifyFailure, completeProofLifecycle, fixtureRequest, liveProofPreflight, methodTimeoutMs, resolveReviewModel } from "../../scripts/docker-review-real.mjs";

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

describe("credentialed Docker review harness", () => {
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
