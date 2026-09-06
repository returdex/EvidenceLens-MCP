import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { assertStructuralReview, classifyFailure, fixtureRequest, resolveReviewModel } from "../../scripts/docker-review-real.mjs";

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

describe("credentialed Docker review harness", () => {
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

  it("resolves allowlisted models solely through the injected Compose-config seam", async () => {
    for (const model of ["deepseek-v4-pro", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"]) {
      const run = vi.fn().mockResolvedValue({ stdout: JSON.stringify({ services: { review: { environment: { DEEPSEEK_API_KEY: "secret", DEEPSEEK_MODEL: model } } } }) });
      await expect(resolveReviewModel(run)).resolves.toBe(model);
      expect(run).toHaveBeenCalledWith("docker", ["compose", "--profile", "review", "config", "--format", "json"]);
    }
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
