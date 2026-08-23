import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseProviderConfig } from "../../src/providers/config.js";
import { createDeepSeekProvider, computeProviderInputFingerprint } from "../../src/providers/deepseek.js";
import { PROVIDER_PROMPT_VERSION, type ProviderReviewRequest } from "../../src/providers/types.js";

const model = "deepseek-v4-flash-vision-exp" as const;
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("DeepSeek live structural review", () => {
  it("calls the opt-in API and validates structural/provenance output", async ({ skip }) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      skip();
      return;
    }

    const assignment = await readFile(new URL("../fixtures/evidence/text/assignment.txt", import.meta.url));
    const rubric = await readFile(new URL("../fixtures/evidence/tables/rubric.csv", import.meta.url), "utf8");
    const screenshot = await readFile(new URL("../fixtures/evidence/images/rubric-screenshot.png", import.meta.url));
    const evidence: ProviderReviewRequest["evidence"] = [
      { evidenceId: "assignment", role: "assignment_brief", type: "text", contentHash: sha256(assignment), sourceReference: "fixture://assignment.txt", references: [{ kind: "text", startLine: 1, endLine: assignment.toString("utf8").split(/\r?\n/u).length }], text: assignment.toString("utf8") },
      { evidenceId: "rubric", role: "rubric", type: "table", contentHash: sha256(Buffer.from(rubric)), sourceReference: "fixture://rubric.csv", references: [{ kind: "table", sheetName: "Sheet1", row: 1, column: 1, cell: "A1" }], text: rubric },
      { evidenceId: "instructions", role: "teacher_instructions", type: "text", contentHash: sha256(assignment), sourceReference: "fixture://assignment.txt#instructions", references: [{ kind: "text", startLine: 1, endLine: 1 }], text: "Support each claim with evidence." },
      { evidenceId: "screenshot", role: "solution", type: "screenshot", contentHash: sha256(screenshot), sourceReference: "fixture://rubric-screenshot.png", references: [{ kind: "image", width: 320, height: 180, mimeType: "image/png" }], visualPayloads: [{ mimeType: "image/png", base64: screenshot.toString("base64"), byteLength: screenshot.byteLength, sha256: sha256(screenshot), width: 320, height: 180, evidenceId: "screenshot", location: { kind: "image", width: 320, height: 180, mimeType: "image/png" } }] }
    ];
    const withoutFingerprint = {
      evidence,
      requirements: [{ text: "Support each claim with evidence.", evidenceId: "instructions", role: "teacher_instructions" as const, location: { kind: "text" as const, startLine: 1, endLine: 1 }, kind: "requirement" as const }],
      solutionClaims: [{ text: "The submission is concise.", evidenceId: "screenshot", role: "solution" as const, location: { kind: "image" as const, width: 320, height: 180, mimeType: "image/png" }, kind: "solution" as const }],
      objective: "Review the solution against the assignment and rubric.",
      promptVersion: PROVIDER_PROMPT_VERSION,
      inference: { model, temperature: 0.2, maxTokens: 4000 }
    } satisfies Omit<ProviderReviewRequest, "inputFingerprint">;
    const request: ProviderReviewRequest = { ...withoutFingerprint, inputFingerprint: computeProviderInputFingerprint(withoutFingerprint) };
    const config = parseProviderConfig({ env: { DEEPSEEK_API_KEY: apiKey } });
    const result = await createDeepSeekProvider(config).review(request);

    expect(result.provider).toBe("deepseek");
    expect(result.model).toBe(model);
    expect(result.promptVersion).toBe(PROVIDER_PROMPT_VERSION);
    expect(result.inputFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(Array.isArray(result.modelFindings)).toBe(true);
    for (const finding of result.modelFindings) {
      expect(["omission", "contradiction", "requirement_conflict", "evidence_quality"]).toContain(finding.type);
      expect(finding.evidenceIds.length).toBeGreaterThan(0);
      for (const citation of finding.citations) {
        expect(request.evidence.map((item) => item.evidenceId)).toContain(citation.evidenceId);
        expect(citation.contentHash).toMatch(/^[a-f0-9]{64}$/u);
        expect(citation.role).toBeTruthy();
        expect(citation.sourceReference).toMatch(/^fixture:\/\//u);
      }
    }
    expect(request.evidence.find((item) => item.evidenceId === "screenshot")?.visualPayloads?.[0]?.base64.length).toBeGreaterThan(0);
  }, 120_000);
});
