import { describe, expect, it } from "vitest";
import { createDeepSeekProvider, computeProviderInputFingerprint, type DeepSeekTransport } from "../../src/providers/deepseek.js";
import { serializeProviderError } from "../../src/providers/errors.js";
import { PROVIDER_PROMPT_VERSION, type ProviderReviewRequest } from "../../src/providers/types.js";

const hash = "a".repeat(64);
const requestWithoutFingerprint = {
  evidence: [{ evidenceId: "brief", role: "assignment_brief" as const, type: "text" as const, contentHash: hash, sourceReference: "inline://brief", references: [{ kind: "text" as const, startLine: 1, endLine: 1 }], text: "Students must include a conclusion." }],
  requirements: [{ text: "Students must include a conclusion.", evidenceId: "brief", role: "assignment_brief" as const, location: { kind: "text" as const, startLine: 1, endLine: 1 }, kind: "requirement" as const }],
  solutionClaims: [], objective: "Check the submission", promptVersion: PROVIDER_PROMPT_VERSION,
  inference: { model: "deepseek-v4-flash-vision-exp" as const, temperature: 0.2, maxTokens: 400 }
};
const request: ProviderReviewRequest = { ...requestWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(requestWithoutFingerprint) };
const draft = { findings: [{ id: "provider-1", type: "omission", severity: "medium", confidence: "high", title: "Missing conclusion", summary: "The conclusion is not present.", observation: "The submission omits a conclusion.", interpretation: "This may fail the requirement.", uncertainty: "The available evidence is limited.", followUpChecks: ["Check the complete submission."], evidenceIds: ["brief"], citations: [{ evidenceId: "brief", role: "assignment_brief", contentHash: hash, sourceReference: "inline://brief", location: { kind: "text", startLine: 1, endLine: 1 }, visual: false }] }] };

function transportFor(body: unknown, status = 200): DeepSeekTransport & { calls: RequestInit[] } {
  const calls: RequestInit[] = [];
  return { calls, fetch: async (_input, init) => { calls.push(init); return new Response(status === 200 ? JSON.stringify({ choices: [{ message: { content: JSON.stringify(body) } }] }) : "upstream secret body", { status, headers: { "content-type": "application/json" } }); } };
}

const config = { apiKey: "secret-key", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash-vision-exp" as const, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 };

describe("DeepSeek provider adapter", () => {
  it("sends an ordered JSON multimodal request and validates returned provenance", async () => {
    const visualRequestWithoutFingerprint = { ...requestWithoutFingerprint, evidence: [...requestWithoutFingerprint.evidence, { evidenceId: "screenshot", role: "other" as const, type: "screenshot" as const, contentHash: "b".repeat(64), sourceReference: "inline://screenshot", references: [{ kind: "image" as const, width: 1, height: 1 }], visualPayloads: [{ mimeType: "image/png" as const, base64: "iVBORw0KGgo=", byteLength: 8, sha256: "b".repeat(64), width: 1, height: 1, evidenceId: "screenshot", location: { kind: "image" as const, width: 1, height: 1 } }] }] };
    const visualRequest: ProviderReviewRequest = { ...visualRequestWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(visualRequestWithoutFingerprint) };
    const transport = transportFor(draft);
    const provider = createDeepSeekProvider(config, transport);
    const result = await provider.review(visualRequest);
    const init = transport.calls[0]!;
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ model: request.inference.model, response_format: { type: "json_object" } });
    expect(JSON.stringify(sent)).toContain("data:image/png;base64,iVBORw0KGgo=");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret-key");
    expect(String(init.body)).not.toContain("Files");
    expect(String(init.body)).not.toContain("/Users/");
    expect(result).toMatchObject({ provider: "deepseek", model: visualRequest.inference.model, inputFingerprint: visualRequest.inputFingerprint });
    expect(result.modelFindings).toHaveLength(1);
  });

  it("rejects malformed, invalid, and forged provider output without fallback", async () => {
    for (const response of [{ choices: [{ message: { content: "not json" } }] }, { findings: [{ ...draft.findings[0], severity: "critical" }] }, { findings: [{ ...draft.findings[0], citations: [{ ...draft.findings[0].citations[0], evidenceId: "forged" }] }] }]) {
      const provider = createDeepSeekProvider(config, transportFor(response));
      await expect(provider.review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
    }
  });

  it("maps non-transient HTTP failures without leaking upstream details", async () => {
    const provider = createDeepSeekProvider(config, transportFor(draft, 401));
    await expect(provider.review(request)).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED", message: "Provider request failed" });
    try { await provider.review(request); } catch (error) { expect(serializeProviderError(error)).toEqual(expect.objectContaining({ code: "PROVIDER_REQUEST_FAILED", message: "Provider request failed" })); expect(JSON.stringify(serializeProviderError(error))).not.toMatch(/secret-key|api\.deepseek|upstream secret body|stack/iu); }
  });
});
