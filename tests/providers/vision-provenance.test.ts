import { describe, expect, it } from "vitest";
import { createDeepSeekProvider, computeProviderInputFingerprint } from "../../src/providers/deepseek.js";
import { PROVIDER_PROMPT_VERSION, type ProviderReviewRequest } from "../../src/providers/types.js";

const textHash = "a".repeat(64);
const imageHash = "b".repeat(64);

const baseEvidence: ProviderReviewRequest["evidence"] = [
  {
    evidenceId: "brief",
    role: "assignment_brief",
    type: "text",
    contentHash: textHash,
    sourceReference: "fixture://brief",
    references: [{ kind: "text", startLine: 1, endLine: 1 }],
    text: "Synthetic requirement."
  },
  {
    evidenceId: "screenshot",
    role: "solution",
    type: "screenshot",
    contentHash: imageHash,
    sourceReference: "fixture://screenshot.png",
    references: [{ kind: "image", width: 1, height: 1 }],
    visualPayloads: [{
      mimeType: "image/png", base64: "iVBORw0KGgo=", byteLength: 8, sha256: imageHash,
      width: 1, height: 1, evidenceId: "screenshot", location: { kind: "image", width: 1, height: 1 }
    }]
  }
];

const withoutFingerprint = {
  evidence: baseEvidence,
  requirements: [{ text: "Synthetic requirement.", evidenceId: "brief", role: "assignment_brief" as const, location: { kind: "text" as const, startLine: 1, endLine: 1 }, kind: "requirement" as const }],
  solutionClaims: [],
  objective: "Inspect synthetic visual evidence.",
  promptVersion: PROVIDER_PROMPT_VERSION,
  inference: { model: "deepseek-v4-flash-vision-exp" as const, temperature: 0.2, maxTokens: 400 }
} satisfies Omit<ProviderReviewRequest, "inputFingerprint">;

const request: ProviderReviewRequest = { ...withoutFingerprint, inputFingerprint: computeProviderInputFingerprint(withoutFingerprint) };

function transportFor(content: string) {
  return {
    fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }), { status: 200 })
  };
}

const finding = {
  id: "vision-1", type: "evidence_quality", severity: "info", confidence: "high",
  title: "Synthetic visual evidence", summary: "The visual reference is available.",
  observation: "The submitted image can be inspected.", interpretation: "The image is usable for review.",
  followUpChecks: ["Confirm the complete submission."], evidenceIds: ["screenshot"],
  citations: [{ evidenceId: "screenshot", location: { kind: "image", width: 1, height: 1 }, visual: true }]
};

describe("DeepSeek vision provenance boundary", () => {
  it("enriches a compact visual reference into the public citation contract", async () => {
    const result = await createDeepSeekProvider({ apiKey: "test-key", baseUrl: "https://example.test", model: request.inference.model, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 }, transportFor(JSON.stringify({ findings: [finding] }))).review(request);
    expect(result.modelFindings[0]?.citations[0]).toEqual({
      evidenceId: "screenshot", role: "solution", contentHash: imageHash, sourceReference: "fixture://screenshot.png",
      location: { kind: "image", width: 1, height: 1 }, visual: true, visualPayloadSha256: imageHash
    });
  });

  it("fills a unique local citation location and visual flag from evidenceId alone", async () => {
    const compact = { ...finding, citations: [{ evidenceId: "screenshot" }] };
    const result = await createDeepSeekProvider({ apiKey: "test-key", baseUrl: "https://example.test", model: request.inference.model, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 }, transportFor(JSON.stringify({ findings: [compact] }))).review(request);
    expect(result.modelFindings[0]?.citations[0]).toMatchObject({
      evidenceId: "screenshot", location: { kind: "image", width: 1, height: 1 }, visual: true,
      contentHash: imageHash, sourceReference: "fixture://screenshot.png"
    });
  });

  it("ignores provider-added citation fields and uses local provenance", async () => {
    const compact = { ...finding, citations: [{ evidenceId: "screenshot", contentHash: textHash, providerNote: "ignored" }] };
    const result = await createDeepSeekProvider({ apiKey: "test-key", baseUrl: "https://example.test", model: request.inference.model, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 }, transportFor(JSON.stringify({ findings: [compact] }))).review(request);
    expect(result.modelFindings[0]?.citations[0]).toMatchObject({ contentHash: imageHash, sourceReference: "fixture://screenshot.png" });
    expect(result.modelFindings[0]?.citations[0]).not.toHaveProperty("providerNote");
  });

  it("requires an explicit location when one evidence item has multiple references", async () => {
    const multiWithoutFingerprint = {
      ...withoutFingerprint,
      evidence: withoutFingerprint.evidence.map((item) => item.evidenceId === "brief"
        ? { ...item, references: [{ kind: "text" as const, startLine: 1, endLine: 1 }, { kind: "text" as const, startLine: 2, endLine: 2 }] }
        : item)
    };
    const multiRequest: ProviderReviewRequest = { ...multiWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(multiWithoutFingerprint) };
    const compact = { ...finding, evidenceIds: ["brief"], citations: [{ evidenceId: "brief" }] };
    await expect(createDeepSeekProvider({ apiKey: "test-key", baseUrl: "https://example.test", model: request.inference.model, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 }, transportFor(JSON.stringify({ findings: [compact] }))).review(multiRequest))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
  });

  it.each([
    ["malformed JSON", "not-json"],
    ["unknown evidence", JSON.stringify({ findings: [{ ...finding, citations: [{ ...finding.citations[0], evidenceId: "forged" }], evidenceIds: ["forged"] }] })],
    ["non-visual image citation", JSON.stringify({ findings: [{ ...finding, citations: [{ ...finding.citations[0], visual: false }] }] })],
    ["duplicate citations", JSON.stringify({ findings: [{ ...finding, citations: [finding.citations[0], finding.citations[0]], evidenceIds: ["screenshot", "screenshot"] }] })],
    ["invalid finding field", JSON.stringify({ findings: [{ ...finding, severity: "critical" }] })]
  ])("rejects %s without fallback", async (_label, content) => {
    await expect(createDeepSeekProvider({ apiKey: "test-key", baseUrl: "https://example.test", model: request.inference.model, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 }, transportFor(content)).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
  });
});
