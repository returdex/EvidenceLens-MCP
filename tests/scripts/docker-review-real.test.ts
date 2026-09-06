import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  assertStructuralReview,
  classifyFailure,
  fixtureRequest
} from "../../scripts/docker-review-real.mjs";

const execFileAsync = promisify(execFile);
const hash = "a".repeat(64);
const references = [
  "filesystem://course/tests/fixtures/evidence/text/assignment.txt",
  "filesystem://course/tests/fixtures/evidence/tables/rubric.csv",
  "filesystem://course/tests/fixtures/evidence/images/rubric-screenshot.png",
  "filesystem://course/tests/fixtures/evidence/pdfs/text-page.pdf"
];

function successPayload(): Record<string, unknown> {
  return {
    ok: true,
    status: "accepted",
    requestId: "docker-review-real-001",
    normalizedEvidence: references.map((reference, index) => ({
      source: { id: `evidence-${index}`, type: ["text", "table", "image", "pdf"][index], reference },
      role: ["assignment_brief", "rubric", "teacher_instructions", "solution"][index],
      contentHash: hash,
      extraction: { extractor: "fixture", extractorVersion: "1", generatedAt: "1970-01-01T00:00:00.000Z", partial: false },
      references: [], warnings: []
    })),
    findings: [{
      id: "provider:deepseek:finding-1", type: "evidence_quality", severity: "low", confidence: "medium",
      title: "Unconstrained prose", summary: "Unconstrained prose", observation: "Unconstrained prose",
      interpretation: "Unconstrained prose", uncertainty: "Unconstrained prose", followUpChecks: [],
      evidenceIds: ["evidence-0"], citations: [{ evidenceId: "evidence-0", role: "assignment_brief", contentHash: hash, sourceReference: references[0], location: { kind: "text", startLine: 1, endLine: 1 }, visual: false }]
    }],
    metadata: { analyzer: { name: "deterministic-rules", version: "1.0.0" }, provider: { name: "deepseek", model: "deepseek-v4-flash-vision-exp" }, generatedAt: "1970-01-01T00:00:00.000Z", evidenceCount: 4, findingCount: 1 }
  };
}

function mcpResult(payload: unknown): unknown {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

describe("credentialed Docker review harness", () => {
  it("reduces all failures to stable public categories without interpolating private details", () => {
    const sentinels = [
      "rpc-error-sentinel", "stderr-sentinel", "raw-body-sentinel", "/Users/private/course.txt",
      "/workspace/private.pdf", "fixture-secret-text", "cause-sentinel", "stack-sentinel",
      "key-sentinel", "https://private.invalid/v1", "config-sentinel"
    ];
    const allowed = ["preflight", "docker", "initialize", "tools/list", "tools/call", "protocol", "timeout"];
    for (const phase of [...allowed, "runtime", "shutdown", "unknown"]) {
      const output = classifyFailure(phase, ...sentinels);
      expect(allowed).toContain(output);
      for (const sentinel of sentinels) expect(output).not.toContain(sentinel);
    }
  });

  it("rejects a missing or blank key before Docker can be spawned", async () => {
    for (const key of [undefined, "   "]) {
      const env = { ...process.env };
      if (key === undefined) delete env.DEEPSEEK_API_KEY;
      else env.DEEPSEEK_API_KEY = key;
      const result = await execFileAsync(process.execPath, ["scripts/docker-review-real.mjs"], { cwd: process.cwd(), env }).catch((error: { stdout: string; stderr: string; code: number }) => error);
      expect(result.code).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("[docker-review:preflight] failed\n");
      expect(result.stderr).not.toContain("DEEPSEEK_API_KEY");
    }
  });

  it("uses exactly the four bounded filesystem roles and fixture paths", () => {
    const request = fixtureRequest(false);
    expect(request.evidence).toEqual([
      { id: "brief", role: "assignment_brief", type: "text", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/text/assignment.txt" } },
      { id: "rubric", role: "rubric", type: "table", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/tables/rubric.csv" } },
      { id: "instructions", role: "teacher_instructions", type: "image", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/images/rubric-screenshot.png" } },
      { id: "solution", role: "solution", type: "pdf", filesystem: { kind: "filesystem", rootId: "course", relativePath: "tests/fixtures/evidence/pdfs/text-page.pdf" } }
    ]);
  });

  it("accepts provider-attributed public output and rejects every private or transport field", () => {
    expect(assertStructuralReview(mcpResult(successPayload()), false)).toMatchObject({ metadata: { provider: { name: "deepseek" } } });
    const forbidden = ["apiKey", "inputFingerprint", "promptVersion", "jsonrpc", "result", "error", "params", "method", "cause", "stack"];
    for (const key of forbidden) {
      const payload = successPayload();
      (payload.metadata as Record<string, unknown>)[key] = "sentinel";
      expect(() => assertStructuralReview(mcpResult(payload), false)).toThrow("[docker-review:protocol] failed");
    }
    for (const leaked of ["Read the assignment brief.", "Criterion,Excellent", "/Users/private/file", "/workspace/private/file"]) {
      const payload = successPayload();
      (payload.findings as Array<Record<string, unknown>>)[0]!.summary = leaked;
      expect(() => assertStructuralReview(mcpResult(payload), false)).toThrow("[docker-review:protocol] failed");
    }
  });

  it("keeps routine commands disconnected from the explicit real-review command", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(packageJson.scripts.test).not.toContain("docker:review:real");
    expect(packageJson.scripts["test:e2e"]).not.toContain("docker:review:real");
    expect(packageJson.scripts["docker:smoke"]).not.toContain("docker:review:real");
    expect(packageJson.scripts["docker:review:real"]).toBe("node scripts/docker-review-real.mjs");
  });
});
