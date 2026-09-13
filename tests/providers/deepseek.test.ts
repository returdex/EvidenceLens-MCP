import { describe, expect, it } from "vitest";
import { createDeepSeekProvider, computeProviderInputFingerprint, type DeepSeekTransport } from "../../src/providers/deepseek.js";
import { serializeProviderError } from "../../src/providers/errors.js";
import { PROVIDER_PROMPT_VERSION, type ProviderReviewRequest } from "../../src/providers/types.js";
import type { DiagnosticFeature, DiagnosticSink } from "../../src/providers/diagnostics.js";

const hash = "a".repeat(64);
const requestWithoutFingerprint = {
  evidence: [{ evidenceId: "brief", role: "assignment_brief" as const, type: "text" as const, contentHash: hash, sourceReference: "inline://brief", references: [{ kind: "text" as const, startLine: 1, endLine: 1 }], text: "Students must include a conclusion." }],
  requirements: [{ text: "Students must include a conclusion.", evidenceId: "brief", role: "assignment_brief" as const, location: { kind: "text" as const, startLine: 1, endLine: 1 }, kind: "requirement" as const }],
  solutionClaims: [], objective: "Check the submission", promptVersion: PROVIDER_PROMPT_VERSION,
  inference: { model: "deepseek-v4-pro" as const, temperature: 0.2, maxTokens: 400 }
};
const request: ProviderReviewRequest = { ...requestWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(requestWithoutFingerprint) };
const draft = { findings: [{ id: "provider-1", type: "omission", severity: "medium", confidence: "high", title: "Missing conclusion", summary: "The conclusion is not present.", observation: "The submission omits a conclusion.", interpretation: "This may fail the requirement.", uncertainty: "The available evidence is limited.", followUpChecks: ["Check the complete submission."], evidenceIds: ["brief"], citations: [{ evidenceId: "brief", role: "assignment_brief", contentHash: hash, sourceReference: "inline://brief", location: { kind: "text", startLine: 1, endLine: 1 }, visual: false }] }] };

function transportFor(body: unknown, status = 200): DeepSeekTransport & { calls: RequestInit[] } {
  const calls: RequestInit[] = [];
  return { calls, fetch: async (_input, init) => { calls.push(init); return new Response(status === 200 ? JSON.stringify({ choices: [{ message: { content: JSON.stringify(body) } }] }) : "upstream secret body", { status, headers: { "content-type": "application/json" } }); } };
}

const config = { apiKey: "secret-key", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-pro" as const, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 };

function recordingSink(): DiagnosticSink & { features: DiagnosticFeature[] } {
  const features: DiagnosticFeature[] = [];
  return { features, emit(feature) { features.push(feature); return true; } };
}

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
    expect(sent).toMatchObject({ thinking: { type: "enabled" }, reasoning_effort: "high" });
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret-key");
    expect(String(init.body)).not.toContain("Files");
    expect(String(init.body)).not.toContain("/Users/");
    expect(result).toMatchObject({ provider: "deepseek", model: visualRequest.inference.model, inputFingerprint: visualRequest.inputFingerprint });
    expect(result.modelFindings).toHaveLength(1);
  });

  it("uses the official vision model request shape without thinking parameters", async () => {
    const visualRequestWithoutFingerprint = {
      ...requestWithoutFingerprint,
      evidence: [{ evidenceId: "screenshot", role: "other" as const, type: "screenshot" as const, contentHash: "b".repeat(64), sourceReference: "inline://screenshot", references: [{ kind: "image" as const, width: 1, height: 1 }], visualPayloads: [{ mimeType: "image/png" as const, base64: "iVBORw0KGgo=", byteLength: 8, sha256: "b".repeat(64), width: 1, height: 1, evidenceId: "screenshot", location: { kind: "image" as const, width: 1, height: 1 } }] }],
      inference: { ...requestWithoutFingerprint.inference, model: "deepseek-v4-flash-vision-exp" as const }
    };
    const visualRequest: ProviderReviewRequest = { ...visualRequestWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(visualRequestWithoutFingerprint) };
    const transport = transportFor({ findings: [] });
    await createDeepSeekProvider(config, transport).review(visualRequest);
    const sent = JSON.parse(String(transport.calls[0]!.body)) as Record<string, unknown>;
    expect(sent.model).toBe("deepseek-v4-flash-vision-exp");
    expect(sent).not.toHaveProperty("thinking");
    expect(sent).not.toHaveProperty("reasoning_effort");
    expect(JSON.stringify(sent)).toContain("data:image/png;base64,iVBORw0KGgo=");
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

  it("emits one canonical feature at each real response decode and content failure site", async () => {
    const cases: Array<{ response: unknown; feature: DiagnosticFeature }> = [
      { response: { choices: [] }, feature: { path: ["provider", "choices"], code: "too_small" } },
      { response: { choices: [{ message: { content: 42 } }] }, feature: { path: ["provider", "message", "content"], code: "invalid_type" } },
      { response: { choices: [{ message: { content: "x".repeat(1_000_001) } }] }, feature: { path: ["provider", "content", "bytes"], code: "too_big" } },
      { response: { choices: [{ message: { content: "not-json" } }] }, feature: { path: ["provider", "content", "object"], code: "invalid_format" } }
    ];
    for (const entry of cases) {
      const diagnostic = recordingSink();
      const transport: DeepSeekTransport = { fetch: async () => new Response(JSON.stringify(entry.response), { status: 200, headers: { "content-type": "application/json" } }) };
      await expect(createDeepSeekProvider(config, transport, diagnostic).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
      expect(diagnostic.features).toEqual([entry.feature]);
    }

    const diagnostic = recordingSink();
    const transport: DeepSeekTransport = { fetch: async () => ({ ok: true, json: async () => { throw new Error("private-body"); } }) as Response };
    await expect(createDeepSeekProvider(config, transport, diagnostic).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostic.features).toEqual([{ path: ["provider", "http", "json"], code: "invalid_format" }]);
  });
});
