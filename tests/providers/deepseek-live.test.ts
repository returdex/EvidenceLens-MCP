import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadProviderConfig } from "../../src/providers/config.js";
import { createDeepSeekProvider, computeProviderInputFingerprint } from "../../src/providers/deepseek.js";
import { PROVIDER_PROMPT_VERSION, type ProviderReviewRequest } from "../../src/providers/types.js";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("DeepSeek live structural review", () => {
  it("calls the opt-in API and validates structural/provenance output", async ({ skip }) => {
    let config;
    try {
      config = loadProviderConfig(undefined, {});
    } catch {
      skip();
      return;
    }
    const model = "deepseek-v4-flash-vision-exp" as const;

    const screenshot = await readFile(new URL("../fixtures/evidence/images/rubric-screenshot.png", import.meta.url));
    const evidence: ProviderReviewRequest["evidence"] = [
      { evidenceId: "screenshot", role: "solution", type: "screenshot", contentHash: sha256(screenshot), sourceReference: "fixture://rubric-screenshot.png", references: [{ kind: "image", width: 320, height: 180, mimeType: "image/png" }], visualPayloads: [{ mimeType: "image/png", base64: screenshot.toString("base64"), byteLength: screenshot.byteLength, sha256: sha256(screenshot), width: 320, height: 180, evidenceId: "screenshot", location: { kind: "image", width: 320, height: 180, mimeType: "image/png" } }] }
    ];
    const withoutFingerprint = {
      evidence,
      requirements: [],
      solutionClaims: [],
      objective: "Inspect this screenshot and return only findings that can be cited to it.",
      promptVersion: PROVIDER_PROMPT_VERSION,
      inference: { model, temperature: config.temperature, maxTokens: config.maxTokens }
    } satisfies Omit<ProviderReviewRequest, "inputFingerprint">;
    const request: ProviderReviewRequest = { ...withoutFingerprint, inputFingerprint: computeProviderInputFingerprint(withoutFingerprint) };
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
