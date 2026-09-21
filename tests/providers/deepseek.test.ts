import { describe, expect, it } from "vitest";
import { createDeepSeekProvider, computeProviderInputFingerprint, MAX_PROVIDER_RESPONSE_BYTES, type DeepSeekTransport } from "../../src/providers/deepseek.js";
import { serializeProviderError } from "../../src/providers/errors.js";
import {
  MAX_PROVIDER_CITATIONS,
  MAX_PROVIDER_FINDINGS,
  MAX_PROVIDER_FOLLOW_UP_CHARS,
  MAX_PROVIDER_FOLLOW_UP_CHECKS,
  MAX_PROVIDER_PROSE_CHARS,
  MAX_PROVIDER_TITLE_CHARS,
  PROVIDER_PROMPT_VERSION,
  type ProviderReviewRequest
} from "../../src/providers/types.js";
import type { DiagnosticFeature, DiagnosticSink } from "../../src/providers/diagnostics.js";
import { createProviderRequestBudget } from "../../src/providers/request-budget.js";
import type { ProviderRequestReceipt } from "../../src/providers/types.js";

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
  return { calls, fetch: async (_input, init) => { calls.push(init); return new Response(status === 200 ? JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }] }) : "upstream secret body", { status, headers: { "content-type": "application/json" } }); } };
}

function paddedEnvelope(size: number, pad = "x"): Uint8Array {
  const envelope = { ignored: "", choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ findings: [] }) } }] };
  const empty = JSON.stringify(envelope);
  const padBytes = new TextEncoder().encode(pad).byteLength;
  const count = Math.floor((size - Buffer.byteLength(empty)) / padBytes);
  envelope.ignored = pad.repeat(count);
  let text = JSON.stringify(envelope);
  text += " ".repeat(size - Buffer.byteLength(text));
  return new TextEncoder().encode(text);
}

const config = { apiKey: "secret-key", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-pro" as const, timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400 };

function recordingSink(): DiagnosticSink & { features: DiagnosticFeature[] } {
  const features: DiagnosticFeature[] = [];
  return { features, emit(feature) { features.push(feature); return true; } };
}

function fetchFailure(code: string, details: Record<string, unknown> = {}): TypeError {
  const cause = Object.assign(new Error("private cause"), { code, ...details });
  return new TypeError("fetch failed", { cause });
}

describe("DeepSeek provider adapter", () => {
  it("acquires immediately around transport.fetch and permanently blocks a second send", async () => {
    let calls = 0;
    const receipts: ProviderRequestReceipt[] = [];
    const transport: DeepSeekTransport = {
      fetch: async () => {
        calls += 1;
        throw new TypeError("uncertain network outcome");
      }
    };
    const budget = createProviderRequestBudget({ generation: "a".repeat(64), key: Buffer.alloc(32, 7) });
    const provider = createDeepSeekProvider(config, transport, undefined, {
      requestBudget: budget,
      receiptSink: (receipt) => { receipts.push(receipt); }
    });

    await expect(provider.review(request)).rejects.toMatchObject({ code: "PROVIDER_RETRY_EXHAUSTED" });
    await expect(provider.review(request)).rejects.toThrow("PROVIDER_REQUEST_BUDGET_EXHAUSTED");
    expect(calls).toBe(1);
    expect(receipts[0]).toMatchObject({ reservation_count: 1, observed_provider_requests: 1, max_retries: 0 });
  });

  it("rejects a concurrent hostile second review before its transport.fetch invocation", async () => {
    let calls = 0;
    let releaseFirst: (() => void) | undefined;
    const firstFetchEntered = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const transport: DeepSeekTransport = {
      async fetch() {
        calls += 1;
        await firstFetchEntered;
        return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(draft) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    };
    const budget = createProviderRequestBudget({ generation: "d".repeat(64), key: Buffer.alloc(32, 10) });
    const receipts: ProviderRequestReceipt[] = [];
    const provider = createDeepSeekProvider(config, transport, undefined, {
      requestBudget: budget,
      receiptSink: (receipt) => { receipts.push(receipt); }
    });

    const first = provider.review(request);
    const second = provider.review(request);
    await expect(second).rejects.toThrow("PROVIDER_REQUEST_BUDGET_EXHAUSTED");
    releaseFirst?.();
    await expect(first).resolves.toMatchObject({ provider: "deepseek" });

    expect(calls).toBe(1);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ reservation_count: 1, observed_provider_requests: 1 });
  });

  it("reports observed zero when request construction fails before fetch", async () => {
    let calls = 0;
    const receipts: ProviderRequestReceipt[] = [];
    const invalidWithoutFingerprint = {
      ...requestWithoutFingerprint,
      evidence: [{ ...requestWithoutFingerprint.evidence[0], visualPayloads: [{ mimeType: "image/png" as const, base64: "AA==", byteLength: 2, sha256: hash, width: 1, height: 1, evidenceId: "brief", location: { kind: "image" as const, width: 1, height: 1 } }] }]
    };
    const invalid: ProviderReviewRequest = { ...invalidWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(invalidWithoutFingerprint) };
    const budget = createProviderRequestBudget({ generation: "b".repeat(64), key: Buffer.alloc(32, 8) });
    const provider = createDeepSeekProvider(config, { fetch: async () => { calls += 1; return new Response(); } }, undefined, {
      requestBudget: budget,
      receiptSink: (receipt) => { receipts.push(receipt); }
    });

    await expect(provider.review(invalid)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
    expect(calls).toBe(0);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ reservation_count: 1, observed_provider_requests: 0, max_retries: 0 });
  });

  it("rejects proof mode unless maxRetries is exactly zero", () => {
    const budget = createProviderRequestBudget({ generation: "c".repeat(64), key: Buffer.alloc(32, 9) });
    expect(() => createDeepSeekProvider({ ...config, maxRetries: 1 }, transportFor(draft), undefined, {
      requestBudget: budget,
      receiptSink: () => undefined
    })).toThrow("PROVIDER_PROOF_RETRIES_FORBIDDEN");
  });

  it("sends an ordered JSON multimodal request and validates returned provenance", async () => {
    const visualRequestWithoutFingerprint = { ...requestWithoutFingerprint, evidence: [...requestWithoutFingerprint.evidence, { evidenceId: "screenshot", role: "other" as const, type: "screenshot" as const, contentHash: "b".repeat(64), sourceReference: "inline://screenshot", references: [{ kind: "image" as const, width: 1, height: 1 }], visualPayloads: [{ mimeType: "image/png" as const, base64: "iVBORw0KGgo=", byteLength: 8, sha256: "b".repeat(64), width: 1, height: 1, evidenceId: "screenshot", location: { kind: "image" as const, width: 1, height: 1 } }] }] };
    const visualRequest: ProviderReviewRequest = { ...visualRequestWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(visualRequestWithoutFingerprint) };
    const transport = transportFor(draft);
    const provider = createDeepSeekProvider(config, transport);
    const result = await provider.review(visualRequest);
    const init = transport.calls[0]!;
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ model: request.inference.model, max_tokens: 400, response_format: { type: "json_object" } });
    const messages = sent.messages as Array<{ content: Array<{ type: string; text?: string }> }>;
    const prompt = JSON.parse(messages[0]!.content[0]!.text!) as { instruction: string; promptVersion: string };
    expect(prompt.promptVersion).toBe(PROVIDER_PROMPT_VERSION);
    expect(prompt.instruction).toContain(`at most ${MAX_PROVIDER_FINDINGS} highest-priority distinct findings`);
    expect(prompt.instruction).toContain(`at most ${MAX_PROVIDER_PROSE_CHARS} characters`);
    expect(prompt.instruction).toContain("include these required keys: id, type, severity, confidence, title, summary, observation, interpretation, followUpChecks, evidenceIds, citations");
    expect(prompt.instruction).toContain(`between 1 and ${MAX_PROVIDER_FOLLOW_UP_CHECKS} non-empty strings`);
    expect(prompt.instruction).toContain("evidenceIds must be a non-empty array exactly equal to the sorted citation evidenceId values");
    expect(JSON.stringify(sent)).toContain("data:image/png;base64,iVBORw0KGgo=");
    expect(sent).toMatchObject({ thinking: { type: "enabled" }, reasoning_effort: "high" });
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret-key");
    expect(String(init.body)).not.toContain("Files");
    expect(String(init.body)).not.toContain("/Users/");
    expect(result).toMatchObject({ provider: "deepseek", model: visualRequest.inference.model, inputFingerprint: visualRequest.inputFingerprint });
    expect(result.modelFindings).toHaveLength(1);
  });

  it("omits max_tokens when no explicit output limit is configured", async () => {
    const transport = transportFor({ findings: [] });
    const inference = { model: request.inference.model, temperature: request.inference.temperature };
    const withoutFingerprint = { ...requestWithoutFingerprint, inference };
    const providerRequest: ProviderReviewRequest = {
      ...withoutFingerprint,
      inputFingerprint: computeProviderInputFingerprint(withoutFingerprint)
    };

    await createDeepSeekProvider({ ...config, maxTokens: undefined }, transport).review(providerRequest);

    const sent = JSON.parse(String(transport.calls[0]!.body)) as Record<string, unknown>;
    expect(sent).not.toHaveProperty("max_tokens");
  });

  it("accepts a valid multibyte response exactly at the bounded byte limit", async () => {
    const bytes = paddedEnvelope(MAX_PROVIDER_RESPONSE_BYTES, "界");
    expect(bytes.byteLength).toBe(MAX_PROVIDER_RESPONSE_BYTES);
    const transport: DeepSeekTransport = { fetch: async () => new Response(bytes) };
    await expect(createDeepSeekProvider(config, transport).review(request)).resolves.toMatchObject({ provider: "deepseek" });
  });

  it.each([
    ["oversized ignored field", paddedEnvelope(MAX_PROVIDER_RESPONSE_BYTES + 1)],
    ["oversized reasoning content", new TextEncoder().encode(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ findings: [] }), reasoning_content: "x".repeat(MAX_PROVIDER_RESPONSE_BYTES) } }] }))],
    ["oversized ignored choice", new TextEncoder().encode(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ findings: [] }) } }, { ignored: "x".repeat(MAX_PROVIDER_RESPONSE_BYTES) }] }))]
  ])("rejects %s before parsing or inspecting provider content", async (_name, bytes) => {
    const diagnostics = recordingSink();
    const transport: DeepSeekTransport = { fetch: async () => new Response(bytes) };
    await expect(createDeepSeekProvider(config, transport, diagnostics).review(request))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostics.features).toEqual([{ path: ["provider", "http", "bytes"], code: "too_big" }]);
  });

  it("rejects malformed UTF-8 with a stable content-free diagnostic", async () => {
    const diagnostics = recordingSink();
    const transport: DeepSeekTransport = { fetch: async () => new Response(Uint8Array.from([0x7b, 0xff, 0x7d])) };
    await expect(createDeepSeekProvider(config, transport, diagnostics).review(request))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostics.features).toEqual([{ path: ["provider", "http", "utf8"], code: "invalid_format" }]);
  });

  it("preserves provider-default thinking behavior for the bounded vision JSON request", async () => {
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
    for (const response of [{ choices: [{ finish_reason: "stop", message: { content: "not json" } }] }, { findings: [{ ...draft.findings[0], severity: "critical" }] }, { findings: [{ ...draft.findings[0], citations: [{ ...draft.findings[0].citations[0], evidenceId: "forged" }] }] }]) {
      const provider = createDeepSeekProvider(config, transportFor(response));
      await expect(provider.review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
    }
  });

  it("rejects provider output that exceeds the prompt's deterministic finding count", async () => {
    const diagnostics = recordingSink();
    const findings = Array.from({ length: MAX_PROVIDER_FINDINGS + 1 }, (_, index) => ({ ...draft.findings[0], id: `provider-${index}` }));
    await expect(createDeepSeekProvider(config, transportFor({ findings }), diagnostics).review(request))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostics.features).toEqual([{ path: ["findings"], code: "too_big" }]);
  });

  it("rejects verbose provider prose beyond the advertised field budget", async () => {
    const diagnostics = recordingSink();
    const findings = [{ ...draft.findings[0], summary: "x".repeat(MAX_PROVIDER_PROSE_CHARS + 1) }];
    await expect(createDeepSeekProvider(config, transportFor({ findings }), diagnostics).review(request))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostics.features).toEqual([{ path: ["findings", "text"], code: "too_big" }]);
  });

  it.each([
    ["direct JSON", JSON.stringify(draft)],
    ["whole-document singleton array", JSON.stringify([draft])],
    ["JSON code fence", `\`\`\`json\n${JSON.stringify(draft)}\n\`\`\``],
    ["plain code fence", `\`\`\`\n${JSON.stringify(draft)}\n\`\`\``],
    ["non-structural prose wrapper", `Review result follows:\n${JSON.stringify(draft)}\nEnd of review.`],
    ["unmatched prose bracket before object", `Review [requested output follows:\n${JSON.stringify(draft)}\nEnd of review.`],
    ["unmatched prose bracket after object", `${JSON.stringify(draft)}\nReview note [not JSON.`],
    ["unmatched prose closing bracket", `Review result follows:\n${JSON.stringify(draft)}\nEnd note].`],
    ["nested braces and escapes in strings", JSON.stringify({ findings: [{ ...draft.findings[0], summary: "Object { nested: \\\"value\\\" } and slash \\\\ remain text." }] })]
  ])("extracts one bounded strict findings object from %s", async (_name, content) => {
    const transport: DeepSeekTransport = {
      fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } })
    };
    await expect(createDeepSeekProvider(config, transport).review(request)).resolves.toMatchObject({ provider: "deepseek" });
  });

  it("accepts finish_reason length only when the returned content independently passes the complete validation pipeline", async () => {
    const transport: DeepSeekTransport = {
      fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: JSON.stringify(draft) } }] }), { status: 200, headers: { "content-type": "application/json" } })
    };
    await expect(createDeepSeekProvider(config, transport).review(request)).resolves.toMatchObject({ provider: "deepseek", modelFindings: [{ id: "provider-1" }] });
  });

  it("accepts a complete boundary-sized response whose byte envelope exceeds the former numeric output ceiling", async () => {
    const evidence = Array.from({ length: MAX_PROVIDER_CITATIONS }, (_, index) => ({
      evidenceId: `evidence-${index}`,
      role: "assignment_brief" as const,
      type: "text" as const,
      contentHash: String(index).repeat(64),
      sourceReference: `inline://evidence-${index}`,
      references: [{ kind: "text" as const, startLine: index + 1, endLine: index + 1 }],
      text: `Requirement ${index}`
    }));
    const boundaryWithoutFingerprint = { ...requestWithoutFingerprint, evidence, inference: { ...requestWithoutFingerprint.inference, maxTokens: 20_000 } };
    const boundaryRequest: ProviderReviewRequest = { ...boundaryWithoutFingerprint, inputFingerprint: computeProviderInputFingerprint(boundaryWithoutFingerprint) };
    const citations = evidence.map((item, index) => ({ evidenceId: item.evidenceId, location: { kind: "text" as const, startLine: index + 1, endLine: index + 1 }, visual: false }));
    const evidenceIds = citations.map((citation) => citation.evidenceId);
    const findings = Array.from({ length: MAX_PROVIDER_FINDINGS }, (_, index) => ({
      id: `boundary-${index}`,
      type: "evidence_quality" as const,
      severity: "high" as const,
      confidence: "unknown" as const,
      title: "t".repeat(MAX_PROVIDER_TITLE_CHARS),
      summary: "s".repeat(MAX_PROVIDER_PROSE_CHARS),
      observation: "o".repeat(MAX_PROVIDER_PROSE_CHARS),
      interpretation: "i".repeat(MAX_PROVIDER_PROSE_CHARS),
      uncertainty: "u".repeat(MAX_PROVIDER_PROSE_CHARS),
      followUpChecks: Array.from({ length: MAX_PROVIDER_FOLLOW_UP_CHECKS }, () => "f".repeat(MAX_PROVIDER_FOLLOW_UP_CHARS)),
      evidenceIds,
      citations
    }));
    const content = JSON.stringify({ findings });
    expect(Buffer.byteLength(content, "utf8")).toBeGreaterThan(8_000);
    const transport: DeepSeekTransport = {
      fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } })
    };
    await expect(createDeepSeekProvider({ ...config, maxTokens: 20_000 }, transport).review(boundaryRequest))
      .resolves.toMatchObject({ modelFindings: { length: MAX_PROVIDER_FINDINGS } });
  });

  it("never treats reasoning_content as the final JSON result", async () => {
    const diagnostics = recordingSink();
    const transport: DeepSeekTransport = {
      fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: "", reasoning_content: JSON.stringify(draft) } }] }), { status: 200, headers: { "content-type": "application/json" } })
    };
    await expect(createDeepSeekProvider(config, transport, diagnostics).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
    expect(diagnostics.features).toEqual([{ path: ["provider", "content", "object"], code: "no_candidate" }]);
  });

  it.each([
    ["truncated JSON", JSON.stringify(draft).slice(0, -1), { path: ["provider", "content", "object"], code: "unbalanced" }],
    ["empty content", "", { path: ["provider", "content", "object"], code: "no_candidate" }],
    ["multiple JSON roots", `${JSON.stringify(draft)}\n${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "multiple_candidates" }],
    ["balanced structural ambiguity", `${JSON.stringify(draft)}\n[]`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["wrong root", JSON.stringify({ findings: draft.findings, extra: true }), { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["malformed JSON", `private-prefix {"findings":[} private-suffix`, { path: ["provider", "content", "object"], code: "malformed_json" }],
    ["dangerous root key", `{"findings":[],"__proto__":{"polluted":true}}`, { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["oversized content", "x".repeat(1_000_001), { path: ["provider", "content", "bytes"], code: "too_big" }],
    ["too many findings", JSON.stringify({ findings: Array.from({ length: MAX_PROVIDER_FINDINGS + 1 }, (_, index) => ({ ...draft.findings[0], id: `provider-${index}` })) }), { path: ["findings"], code: "too_big" }],
    ["oversized finding prose", JSON.stringify({ findings: [{ ...draft.findings[0], summary: "x".repeat(MAX_PROVIDER_PROSE_CHARS + 1) }] }), { path: ["findings", "text"], code: "too_big" }],
    ["schema-invalid JSON", JSON.stringify({ findings: [{ ...draft.findings[0], severity: "critical" }] }), { path: ["findings", "enum"], code: "invalid_value" }],
    ["forged citation evidence", JSON.stringify({ findings: [{ ...draft.findings[0], citations: [{ ...draft.findings[0].citations[0], evidenceId: "forged" }] }] }), { path: ["citations", "evidenceId"], code: "invalid_value" }],
    ["forged citation location", JSON.stringify({ findings: [{ ...draft.findings[0], citations: [{ ...draft.findings[0].citations[0], location: { kind: "text", startLine: 2, endLine: 2 } }] }] }), { path: ["citations", "location"], code: "invalid_value" }],
    ["forged citation hash", JSON.stringify({ findings: [{ ...draft.findings[0], citations: [{ ...draft.findings[0].citations[0], contentHash: "b".repeat(64) }] }] }), { path: ["citations", "contentHash"], code: "invalid_value" }],
    ["citation provenance mismatch", JSON.stringify({ findings: [{ ...draft.findings[0], evidenceIds: ["forged"] }] }), { path: ["findings", "evidenceIds"], code: "custom" }]
  ] as const)("rejects finish_reason length with %s", async (_name, content, feature) => {
    const diagnostics = recordingSink();
    const transport: DeepSeekTransport = {
      fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } })
    };
    await expect(createDeepSeekProvider(config, transport, diagnostics).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostics.features).toEqual([feature]);
  });

  it.each([
    ["missing required field", { summary: undefined }, { path: ["findings", "text"], code: "too_big" }],
    ["empty follow-up list", { followUpChecks: [] }, { path: ["findings", "followUpChecks"], code: "too_small" }],
    ["missing evidence ids", { evidenceIds: undefined }, { path: ["findings", "evidenceIds"], code: "custom" }],
    ["empty citations", { citations: [] }, { path: ["findings", "citations"], code: "custom" }],
    ["unknown finding type", { type: "formatting" }, { path: ["findings", "type"], code: "invalid_value" }]
  ] as const)("classifies synthetic strict-schema mismatch without retaining content: %s", async (_name, changes, feature) => {
    const finding = { ...draft.findings[0], ...changes } as Record<string, unknown>;
    for (const key of Object.keys(finding)) if (finding[key] === undefined) delete finding[key];
    const diagnostics = recordingSink();
    await expect(createDeepSeekProvider(config, transportFor({ findings: [finding] }), diagnostics).review(request))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostics.features).toEqual([feature]);
    expect(JSON.stringify(diagnostics.features)).not.toMatch(/private provider-authored text|rationale|formatting/iu);
  });

  it("accepts the required provider shape and discards unknown additional fields", async () => {
    const providerDraft = {
      findings: [{
        ...draft.findings[0],
        rationale: "provider-only extension"
      }],
    };

    const result = await createDeepSeekProvider(config, transportFor(providerDraft)).review(request);

    expect(result.modelFindings).toHaveLength(1);
    expect(result.modelFindings[0]).not.toHaveProperty("rationale");
  });

  it.each([
    ["missing content", undefined],
    ["wrong-type content", 42]
  ] as const)("rejects finish_reason length with %s before extraction", async (_name, content) => {
    const diagnostics = recordingSink();
    const transport: DeepSeekTransport = {
      fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { ...(content !== undefined ? { content } : {}) } }] }), { status: 200, headers: { "content-type": "application/json" } })
    };
    await expect(createDeepSeekProvider(config, transport, diagnostics).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
    expect(diagnostics.features).toEqual([{ path: ["provider", "message", "content"], code: "invalid_type" }]);
  });

  it.each([
    ["missing", undefined, "invalid_type"],
    ["wrong type", 42, "invalid_type"],
    ["unknown", "private_unrecognized_reason", "invalid_value"],
    ["content filter", "content_filter", "content_filter"],
    ["tool call", "tool_calls", "tool_calls"],
    ["provider resource limit", "insufficient_system_resource", "insufficient_system_resource"]
  ] as const)("rejects %s finish_reason before parsing content with one bounded diagnostic", async (_name, finishReason, code) => {
    const diagnostics = recordingSink();
    const choice = {
      ...(finishReason !== undefined ? { finish_reason: finishReason } : {}),
      message: { content: `private-response-${String(finishReason)} {"findings":[}` }
    };
    const transport: DeepSeekTransport = {
      fetch: async () => new Response(JSON.stringify({ choices: [choice] }), { status: 200, headers: { "content-type": "application/json" } })
    };
    await expect(createDeepSeekProvider(config, transport, diagnostics).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostics.features).toEqual([{ path: ["provider", "finish_reason"], code }]);
    expect(JSON.stringify(diagnostics.features)).not.toMatch(/private-response|private_unrecognized_reason|findings/iu);
  });

  it.each([
    ["no candidate", "private prose with no JSON object", { path: ["provider", "content", "object"], code: "no_candidate" }],
    ["multiple objects", `${JSON.stringify(draft)}\n${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "multiple_candidates" }],
    ["truncated object", JSON.stringify(draft).slice(0, -1), { path: ["provider", "content", "object"], code: "unbalanced" }],
    ["unmatched trailing object", `${JSON.stringify(draft)}\n{`, { path: ["provider", "content", "object"], code: "unbalanced" }],
    ["unsafe trailing array", `${JSON.stringify(draft)}\n[]`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["array plus leading prose", `prefix ${JSON.stringify([draft])}`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["array plus trailing prose", `${JSON.stringify([draft])} suffix`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["brackets in prose", `Review [one]: ${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["valid JSON array before object", `[1]\n${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["balanced malformed array before object", `[one]\n${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["truncated array containing object", `[${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["unmatched JSON-like array before object", `[1,\n${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["extra valid object inside prose brackets", `[note ${JSON.stringify(draft)}]\n${JSON.stringify(draft)}`, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["empty array", JSON.stringify([]), { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["multiple array members", JSON.stringify([draft, draft]), { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["nested singleton array", JSON.stringify([[draft]]), { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["singleton array primitive", JSON.stringify([1]), { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["singleton array extra root key", JSON.stringify([{ ...draft, extra: true }]), { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["singleton array prototype-pollution key", `[{"findings":[],"__proto__":{"polluted":true}}]`, { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["singleton array constructor key", `[{"findings":[],"constructor":{"polluted":true}}]`, { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["singleton array prototype key", `[{"findings":[],"prototype":{"polluted":true}}]`, { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["fenced singleton array", `\`\`\`json\n${JSON.stringify([draft])}\n\`\`\``, { path: ["provider", "content", "object"], code: "structural_context" }],
    ["truncated singleton array", JSON.stringify([draft]).slice(0, -1), { path: ["provider", "content", "object"], code: "structural_context" }],
    ["extra root key", JSON.stringify({ ...draft, extra: true }), { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["prototype-pollution root key", `{"findings":[],"__proto__":{"polluted":true}}`, { path: ["provider", "content", "object"], code: "wrong_root" }],
    ["malformed candidate", `private-prefix {"findings":[} private-suffix`, { path: ["provider", "content", "object"], code: "malformed_json" }],
    ["oversized input", "x".repeat(1_000_001), { path: ["provider", "content", "bytes"], code: "too_big" }]
  ] as const)("rejects ambiguous or unsafe bounded object content with one safe shape: %s", async (_name, content, feature) => {
    const diagnostics = recordingSink();
    let transportCalls = 0;
    const transport: DeepSeekTransport = {
      fetch: async () => {
        transportCalls += 1;
        return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });
      }
    };
    await expect(createDeepSeekProvider(config, transport, diagnostics).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(transportCalls).toBe(1);
    expect(diagnostics.features).toEqual([feature]);
    expect(JSON.stringify(diagnostics.features)).not.toMatch(/private|prefix|suffix|prose|extra|polluted|findings|1_000_001/iu);
  });

  it("maps non-transient HTTP failures without leaking upstream details", async () => {
    const provider = createDeepSeekProvider(config, transportFor(draft, 401));
    await expect(provider.review(request)).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED", message: "Provider request failed" });
    try { await provider.review(request); } catch (error) { expect(serializeProviderError(error)).toEqual(expect.objectContaining({ code: "PROVIDER_REQUEST_FAILED", message: "Provider request failed" })); expect(JSON.stringify(serializeProviderError(error))).not.toMatch(/secret-key|api\.deepseek|upstream secret body|stack/iu); }
  });

  it.each([
    ["dns", () => { throw fetchFailure("ENOTFOUND", { errno: -3008, syscall: "getaddrinfo", hostname: "private.example" }); }, config],
    ["tls", () => { throw fetchFailure("CERT_HAS_EXPIRED"); }, config],
    ["connection", () => { throw fetchFailure("ECONNREFUSED", { errno: -61, syscall: "connect", address: "127.0.0.1", port: 443 }); }, config],
    ["network_timeout", () => { throw fetchFailure("UND_ERR_CONNECT_TIMEOUT"); }, config],
    ["http_error", () => new Response("private", { status: 401 }), config],
    ["rate_limited", () => new Response("private", { status: 429 }), config],
    ["server_error", () => new Response("private", { status: 503 }), config],
    ["retry_budget", () => { throw fetchFailure("ENOTFOUND", { errno: -3008, syscall: "getaddrinfo", hostname: "private.example" }); }, { ...config, maxRetries: 2, maxTotalWaitMs: 1 }]
  ] as const)("emits the closed %s transport diagnostic from the production adapter path", async (code, outcome, diagnosticConfig) => {
    const diagnostics = recordingSink();
    const provider = createDeepSeekProvider(diagnosticConfig, { fetch: async () => outcome() }, diagnostics);
    await expect(provider.review(request)).rejects.toBeInstanceOf(Error);
    expect(diagnostics.features).toEqual([{ path: ["provider", "transport", "fetch"], code }]);
    expect(JSON.stringify(diagnostics.features)).not.toMatch(/private|example|127\.0\.0\.1|443|ENOTFOUND|CERT_HAS_EXPIRED|ECONNREFUSED|UND_ERR/iu);
  });

  it("accepts Node fetch system-error subclasses without exposing their private fields", async () => {
    class SystemDnsError extends Error {}
    const cause = Object.assign(new SystemDnsError("private resolver detail"), {
      code: "EAI_AGAIN", errno: -3001, hostname: "private.example", syscall: "getaddrinfo"
    });
    const diagnostics = recordingSink();
    const provider = createDeepSeekProvider(config, { fetch: async () => { throw new TypeError("fetch failed", { cause }); } }, diagnostics);
    await expect(provider.review(request)).rejects.toBeInstanceOf(Error);
    expect(diagnostics.features).toEqual([{ path: ["provider", "transport", "fetch"], code: "dns" }]);
    expect(JSON.stringify(diagnostics.features)).not.toMatch(/private|example|EAI_AGAIN|getaddrinfo/iu);
  });

  it("emits the closed timeout diagnostic only after the production adapter aborts", async () => {
    const diagnostics = recordingSink();
    const provider = createDeepSeekProvider({ ...config, timeoutMs: 5 }, {
      fetch: async (_input, init) => new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("private abort", "AbortError")), { once: true });
      })
    }, diagnostics);
    await expect(provider.review(request)).rejects.toMatchObject({ code: "PROVIDER_RETRY_EXHAUSTED" });
    expect(diagnostics.features).toEqual([{ path: ["provider", "transport", "fetch"], code: "timeout" }]);
  });

  it.each([
    ["unknown code", () => { throw fetchFailure("PRIVATE_UNKNOWN"); }],
    ["multiple causes", () => { throw new TypeError("fetch failed", { cause: new AggregateError([new Error("one"), new Error("two")]) }); }],
    ["detail-bearing cause", () => { throw fetchFailure("ENOTFOUND", { privateDetail: "secret" }); }],
    ["detail-bearing root", () => { const error = fetchFailure("ENOTFOUND"); Object.assign(error, { privateDetail: "secret" }); throw error; }]
  ] as const)("keeps %s transport failures diagnostically ambiguous", async (_name, outcome) => {
    const diagnostics = recordingSink();
    const provider = createDeepSeekProvider(config, { fetch: async () => outcome() }, diagnostics);
    await expect(provider.review(request)).rejects.toBeInstanceOf(Error);
    expect(diagnostics.features).toEqual([]);
  });

  it("emits one canonical feature at each real response decode and content failure site", async () => {
    const cases: Array<{ response: unknown; feature: DiagnosticFeature }> = [
      { response: { choices: [] }, feature: { path: ["provider", "choices"], code: "too_small" } },
      { response: { choices: [{ finish_reason: "stop", message: { content: 42 } }] }, feature: { path: ["provider", "message", "content"], code: "invalid_type" } },
      { response: { choices: [{ finish_reason: "stop", message: { content: "x".repeat(1_000_001) } }] }, feature: { path: ["provider", "content", "bytes"], code: "too_big" } },
      { response: { choices: [{ finish_reason: "stop", message: { content: "not-json" } }] }, feature: { path: ["provider", "content", "object"], code: "no_candidate" } }
    ];
    for (const entry of cases) {
      const diagnostic = recordingSink();
      const transport: DeepSeekTransport = { fetch: async () => new Response(JSON.stringify(entry.response), { status: 200, headers: { "content-type": "application/json" } }) };
      await expect(createDeepSeekProvider(config, transport, diagnostic).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE" });
      expect(diagnostic.features).toEqual([entry.feature]);
    }

    const diagnostic = recordingSink();
    const transport: DeepSeekTransport = { fetch: async () => new Response("{") };
    await expect(createDeepSeekProvider(config, transport, diagnostic).review(request)).rejects.toMatchObject({ code: "PROVIDER_INVALID_RESPONSE", message: "Provider response is invalid" });
    expect(diagnostic.features).toEqual([{ path: ["provider", "http", "json"], code: "invalid_format" }]);
  });
});
