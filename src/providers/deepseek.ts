import { createHash } from "node:crypto";
import type { NormalizedEvidence, ReviewFinding } from "../contracts/review.js";
import { PROVIDER_PROMPT_VERSION, type ProviderEvidenceItem, type ProviderReviewRequest, type ProviderReviewResult, type ReviewProvider } from "./types.js";
import { validateProviderFindings, type ProviderFindingDraft } from "./provenance.js";
import { ProviderError } from "./errors.js";
import { fetchWithRetry, type RetryClock } from "./retry.js";
import type { ProviderConfig } from "./config.js";

export interface DeepSeekTransport {
  fetch(input: string, init: RequestInit): Promise<Response>;
}

const MAX_VISUAL_BYTES = 8_000_000;
const MAX_REQUEST_BYTES = 24_000_000;

function canonical(value: unknown): string {
  return JSON.stringify(value);
}

export function computeProviderInputFingerprint(request: Omit<ProviderReviewRequest, "inputFingerprint">): string {
  const digest = createHash("sha256");
  digest.update(canonical({
    evidence: request.evidence.map((item) => ({ ...item, visualPayloads: item.visualPayloads?.map((payload) => ({ ...payload, base64: payload.base64 })) })),
    requirements: request.requirements,
    solutionClaims: request.solutionClaims,
    objective: request.objective,
    promptVersion: request.promptVersion,
    model: request.inference.model,
    temperature: request.inference.temperature,
    maxTokens: request.inference.maxTokens
  }));
  return digest.digest("hex");
}

function assertFingerprint(request: ProviderReviewRequest): void {
  const { inputFingerprint: _inputFingerprint, ...withoutFingerprint } = request;
  if (!/^[a-f0-9]{64}$/u.test(request.inputFingerprint) || request.inputFingerprint !== computeProviderInputFingerprint(withoutFingerprint)) {
    throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
  }
}

function safeText(value: string): string { return value.normalize("NFKC").slice(0, 4_000); }

function evidenceForPrompt(item: ProviderEvidenceItem): Record<string, unknown> {
  return {
    evidenceId: item.evidenceId,
    role: item.role,
    type: item.type,
    contentHash: item.contentHash,
    references: item.references,
    ...(item.text !== undefined ? { text: safeText(item.text) } : {}),
    ...(item.tableCells !== undefined ? { tableCells: item.tableCells.slice(0, 10_000) } : {})
  };
}

function normalizedFromProviderEvidence(evidence: readonly ProviderEvidenceItem[]): NormalizedEvidence[] {
  return evidence.map((item) => ({
    source: { id: item.evidenceId, type: item.type, reference: item.sourceReference },
    role: item.role,
    contentHash: item.contentHash,
    extraction: { extractor: "provider-boundary", extractorVersion: "1.0.0", generatedAt: "1970-01-01T00:00:00.000Z", partial: false },
    references: [...item.references],
    warnings: [],
    ...(item.visualPayloads?.length ? {
      ...(item.type === "pdf" ? { visualPayloads: item.visualPayloads.map((payload) => ({ ...payload, pageNumber: payload.location.kind === "pdf" ? payload.location.pageNumber : 1 })) } : { visualPayload: item.visualPayloads[0] })
    } : {})
  } as NormalizedEvidence));
}

function buildBody(request: ProviderReviewRequest): Record<string, unknown> {
  const content: Record<string, unknown>[] = [{ type: "text", text: JSON.stringify({ objective: safeText(request.objective), promptVersion: request.promptVersion, evidence: request.evidence.map(evidenceForPrompt), requirements: request.requirements, solutionClaims: request.solutionClaims }) }];
  let bytes = 0;
  for (const item of request.evidence) for (const payload of item.visualPayloads ?? []) {
    const decoded = Buffer.from(payload.base64, "base64");
    if (decoded.byteLength !== payload.byteLength || decoded.byteLength > MAX_VISUAL_BYTES) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
    bytes += decoded.byteLength;
    if (bytes > MAX_REQUEST_BYTES) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
    content.push({ type: "image_url", image_url: { url: `data:${payload.mimeType};base64,${payload.base64}` } });
  }
  return { model: request.inference.model, messages: [{ role: "user", content }], temperature: request.inference.temperature, max_tokens: request.inference.maxTokens, response_format: { type: "json_object" }, stream: false };
}

function parseDrafts(response: unknown): ProviderFindingDraft[] {
  if (typeof response !== "object" || response === null || !Array.isArray((response as { choices?: unknown }).choices)) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
  const content = (response as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message?.content;
  if (typeof content !== "string" || content.length > 1_000_000) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { findings?: unknown }).findings)) throw new Error();
    return (parsed as { findings: ProviderFindingDraft[] }).findings;
  } catch { throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false }); }
}

export function createDeepSeekProvider(config: ProviderConfig, transport: DeepSeekTransport = { fetch: (input, init) => fetch(input, init) }): ReviewProvider {
  const provider: ReviewProvider = {
    name: "deepseek",
    async review(request: ProviderReviewRequest): Promise<ProviderReviewResult> {
      if (request.promptVersion !== PROVIDER_PROMPT_VERSION) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
      assertFingerprint(request);
      const body = buildBody(request);
      const response = await fetchWithRetry({
        maxRetries: config.maxRetries, timeoutMs: config.timeoutMs, maxTotalWaitMs: config.maxTotalWaitMs,
        operation: (signal) => transport.fetch(`${config.baseUrl}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify(body), signal }),
      });
      let decoded: unknown;
      try { decoded = await response.json(); } catch { throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false }); }
      const findings: ReviewFinding[] = validateProviderFindings(normalizedFromProviderEvidence(request.evidence), parseDrafts(decoded));
      return { provider: provider.name, model: request.inference.model, promptVersion: request.promptVersion, inputFingerprint: request.inputFingerprint, modelFindings: findings, deterministicFindings: [] };
    }
  };
  return provider;
}
