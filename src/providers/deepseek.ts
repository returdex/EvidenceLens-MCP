import { createHash } from "node:crypto";
import type { NormalizedEvidence, ReviewFinding } from "../contracts/review.js";
import {
  MAX_PROVIDER_CITATIONS,
  MAX_PROVIDER_FINDINGS,
  MAX_PROVIDER_FOLLOW_UP_CHARS,
  MAX_PROVIDER_FOLLOW_UP_CHECKS,
  MAX_PROVIDER_PROSE_CHARS,
  MAX_PROVIDER_TITLE_CHARS,
  PROVIDER_PROMPT_VERSION,
  type ProviderEvidenceItem,
  type ProviderRequestBudget,
  type ProviderRequestReceipt,
  type ProviderReviewRequest,
  type ProviderReviewResult,
  type ReviewProvider
} from "./types.js";
import { validateProviderFindings, type ProviderFindingDraft } from "./provenance.js";
import { ProviderError } from "./errors.js";
import { fetchWithRetry, type RetryClock } from "./retry.js";
import type { ProviderConfig } from "./config.js";
import type { DiagnosticSink } from "./diagnostics.js";
import { ProviderRequestBudgetError } from "./request-budget.js";

export interface DeepSeekTransport {
  fetch(input: string, init: RequestInit): Promise<Response>;
}

export interface DeepSeekProofOptions {
  requestBudget: ProviderRequestBudget;
  receiptSink: (receipt: ProviderRequestReceipt) => void;
}

const MAX_VISUAL_BYTES = 8_000_000;
const MAX_REQUEST_BYTES = 24_000_000;
export const MAX_PROVIDER_RESPONSE_BYTES = 4_194_304;

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
    ...(request.inference.maxTokens === undefined ? {} : { maxTokens: request.inference.maxTokens })
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
  const content: Record<string, unknown>[] = [{ type: "text", text: JSON.stringify({
    instruction: `Return one JSON object with exactly one root key, findings. findings must be an array of at most ${MAX_PROVIDER_FINDINGS} highest-priority distinct findings; return {"findings":[]} when there is no defensible finding. Each finding must include these required keys: id, type, severity, confidence, title, summary, observation, interpretation, followUpChecks, evidenceIds, citations. uncertainty is optional. id must be a non-empty string of at most 128 characters. type must be exactly one of omission, contradiction, requirement_conflict, evidence_quality. severity must be exactly one of info, low, medium, high. confidence must be exactly one of high, medium, low, unknown. title must be a non-empty string of at most ${MAX_PROVIDER_TITLE_CHARS} characters. summary, observation, interpretation, and any uncertainty must each be non-empty strings of at most ${MAX_PROVIDER_PROSE_CHARS} characters. followUpChecks must contain between 1 and ${MAX_PROVIDER_FOLLOW_UP_CHECKS} non-empty strings, each at most ${MAX_PROVIDER_FOLLOW_UP_CHARS} characters. citations must contain between 1 and ${MAX_PROVIDER_CITATIONS} entries. Each citation must contain exactly evidenceId, location, and visual: evidenceId must identify supplied evidence, location must be copied exactly from that evidence item's references, and visual must be a boolean. Do not invent role, contentHash, sourceReference, or visualPayloadSha256. Citations must be unique and sorted by evidenceId. evidenceIds must be a non-empty array exactly equal to the sorted citation evidenceId values. Unknown additional finding fields are ignored by the adapter. Prefer concise findings that cover different evidence or failure modes.`,
    objective: safeText(request.objective),
    promptVersion: request.promptVersion,
    evidence: request.evidence.map(evidenceForPrompt),
    requirements: request.requirements,
    solutionClaims: request.solutionClaims
  }) }];
  const thinking = request.inference.model !== "deepseek-v4-flash-vision-exp"
    ? { thinking: { type: "enabled" }, reasoning_effort: "high" }
    : {};
  let bytes = 0;
  for (const item of request.evidence) for (const payload of item.visualPayloads ?? []) {
    const decoded = Buffer.from(payload.base64, "base64");
    if (decoded.byteLength !== payload.byteLength || decoded.byteLength > MAX_VISUAL_BYTES) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
    bytes += decoded.byteLength;
    if (bytes > MAX_REQUEST_BYTES) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
    content.push({ type: "image_url", image_url: { url: `data:${payload.mimeType};base64,${payload.base64}` } });
  }
  return {
    model: request.inference.model,
    messages: [{ role: "user", content }],
    temperature: request.inference.temperature,
    ...(request.inference.maxTokens === undefined ? {} : { max_tokens: request.inference.maxTokens }),
    ...thinking,
    response_format: { type: "json_object" },
    stream: false
  };
}

function invalidResponse(diagnostics: DiagnosticSink | undefined, path: readonly (string | number)[], code: string): never {
  diagnostics?.emit({ path, code });
  throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
}

async function readBoundedJson(response: Response, diagnostics?: DiagnosticSink): Promise<unknown> {
  const reader = response.body?.getReader();
  if (reader === undefined) invalidResponse(diagnostics, ["provider", "http", "body"], "invalid_type");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        invalidResponse(diagnostics, ["provider", "http", "bytes"], "too_big");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    invalidResponse(diagnostics, ["provider", "http", "body"], "invalid_format");
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { invalidResponse(diagnostics, ["provider", "http", "utf8"], "invalid_format"); }
  try { return JSON.parse(text); }
  catch { invalidResponse(diagnostics, ["provider", "http", "json"], "invalid_format"); }
}

function findingsFromRoot(value: unknown): ProviderFindingDraft[] | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "findings") return undefined;
  const findings = (value as { findings?: unknown }).findings;
  return Array.isArray(findings) ? findings as ProviderFindingDraft[] : undefined;
}

function findingsFromWholeDocument(value: unknown): ProviderFindingDraft[] | undefined {
  if (Array.isArray(value)) {
    if (value.length !== 1) return undefined;
    return findingsFromRoot(value[0]);
  }
  return findingsFromRoot(value);
}

type JsonObjectExtractionFailure = "no_candidate" | "multiple_candidates" | "unbalanced" | "wrong_root" | "structural_context" | "malformed_json";
type JsonObjectExtraction = { findings: ProviderFindingDraft[] } | { failure: JsonObjectExtractionFailure };

function matchingSquareBracket(value: string, start: number): number | undefined {
  const stack: string[] = ["["];
  let inString = false;
  let escaped = false;
  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") inString = true;
    else if (character === "[" || character === "{") stack.push(character);
    else if (character === "]" || character === "}") {
      const expected = character === "]" ? "[" : "{";
      if (stack.at(-1) !== expected) return index;
      stack.pop();
      if (stack.length === 0) return index;
    }
  }
  return undefined;
}

function unmatchedSquareBracketCouldStartJson(value: string, start: number): boolean {
  const remainder = value.slice(start + 1).trimStart();
  if (remainder.length === 0) return false;
  if (/^[{["\-0-9]/u.test(remainder)) return true;
  return /^(?:true|false|null)(?:\s|,|\]|$)/u.test(remainder);
}

function unmatchedClosingSquareBracketCouldEndJson(value: string, end: number): boolean {
  const prefix = value.slice(0, end).trimEnd();
  return prefix.length > 0 && /[}\]"0-9]/u.test(prefix.at(-1)!);
}

function extractSingleJsonObject(value: string): JsonObjectExtraction {
  try {
    const findings = findingsFromWholeDocument(JSON.parse(value));
    return findings === undefined ? { failure: "wrong_root" } : { findings };
  } catch { /* A bounded wrapper is handled below. */ }

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let structuralGarbage = false;
  let malformedCandidate = false;
  const objects: unknown[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (start < 0) {
      if (character === "{") {
        start = index;
        depth = 1;
        inString = false;
        escaped = false;
      } else if (character === "[") {
        const matching = matchingSquareBracket(value, index);
        if (matching !== undefined || unmatchedSquareBracketCouldStartJson(value, index)) structuralGarbage = true;
      } else if (character === "]") {
        if (unmatchedClosingSquareBracketCouldEndJson(value, index)) structuralGarbage = true;
      } else if (character === "}") {
        structuralGarbage = true;
      }
      continue;
    }

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        try { objects.push(JSON.parse(value.slice(start, index + 1))); }
        catch { malformedCandidate = true; }
        start = -1;
      }
    }
  }

  if (start >= 0 || inString) return { failure: "unbalanced" };
  if (structuralGarbage) return { failure: "structural_context" };
  if (malformedCandidate) return { failure: "malformed_json" };
  if (objects.length === 0) return { failure: "no_candidate" };
  if (objects.length > 1) return { failure: "multiple_candidates" };
  const findings = findingsFromRoot(objects[0]);
  return findings === undefined ? { failure: "wrong_root" } : { findings };
}

function parseDrafts(response: unknown, diagnostics?: DiagnosticSink): ProviderFindingDraft[] {
  if (typeof response !== "object" || response === null || !Array.isArray((response as { choices?: unknown }).choices)
    || (response as { choices: unknown[] }).choices.length === 0) {
    invalidResponse(diagnostics, ["provider", "choices"], "too_small");
  }
  const choice = (response as { choices: Array<{ finish_reason?: unknown; message?: { content?: unknown; reasoning_content?: unknown } }> }).choices[0];
  const finishReason = choice?.finish_reason;
  if (typeof finishReason !== "string") invalidResponse(diagnostics, ["provider", "finish_reason"], "invalid_type");
  if (finishReason !== "stop" && finishReason !== "length") {
    if (finishReason === "content_filter" || finishReason === "tool_calls" || finishReason === "insufficient_system_resource") {
      invalidResponse(diagnostics, ["provider", "finish_reason"], finishReason);
    }
    invalidResponse(diagnostics, ["provider", "finish_reason"], "invalid_value");
  }
  const message = choice?.message;
  const content = message?.content;
  if (typeof content !== "string") invalidResponse(diagnostics, ["provider", "message", "content"], "invalid_type");
  if (content.length > 1_000_000) invalidResponse(diagnostics, ["provider", "content", "bytes"], "too_big");
  const candidates = [content];
  let extractionFailure: JsonObjectExtractionFailure = "no_candidate";
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.length > 1_000_000 || candidate.length === 0) continue;
    const extraction = extractSingleJsonObject(candidate);
    if ("findings" in extraction) {
      return extraction.findings;
    }
    extractionFailure = extraction.failure;
  }
  invalidResponse(diagnostics, ["provider", "content", "object"], extractionFailure);
}

export function createDeepSeekProvider(
  config: ProviderConfig,
  transport: DeepSeekTransport = { fetch: (input, init) => fetch(input, init) },
  diagnostics?: DiagnosticSink,
  proof?: DeepSeekProofOptions
): ReviewProvider {
  if (proof !== undefined && config.maxRetries !== 0) throw new Error("PROVIDER_PROOF_RETRIES_FORBIDDEN");
  let proofInvocationClaimed = false;
  const provider: ReviewProvider = {
    name: "deepseek",
    async review(request: ProviderReviewRequest): Promise<ProviderReviewResult> {
      if (proof !== undefined) {
        if (proofInvocationClaimed) throw new ProviderRequestBudgetError("PROVIDER_REQUEST_BUDGET_EXHAUSTED");
        proofInvocationClaimed = true;
      }
      try {
        if (request.promptVersion !== PROVIDER_PROMPT_VERSION) throw new ProviderError("PROVIDER_INVALID_RESPONSE", { retryable: false });
        assertFingerprint(request);
        const body = buildBody(request);
        const response = await fetchWithRetry({
          retryPolicy: proof === undefined ? "bounded" : "none",
          maxRetries: config.maxRetries, timeoutMs: config.timeoutMs, maxTotalWaitMs: config.maxTotalWaitMs,
          diagnostics,
          operation: (signal) => {
            proof?.requestBudget.acquireHttpSend();
            return transport.fetch(`${config.baseUrl}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify(body), signal });
          },
        });
        const decoded = await readBoundedJson(response, diagnostics);
        const findings: ReviewFinding[] = validateProviderFindings(
          normalizedFromProviderEvidence(request.evidence),
          parseDrafts(decoded, diagnostics),
          diagnostics
        );
        return { provider: provider.name, model: request.inference.model, promptVersion: request.promptVersion, inputFingerprint: request.inputFingerprint, modelFindings: findings, deterministicFindings: [] };
      } finally {
        if (proof !== undefined) proof.receiptSink(proof.requestBudget.receipt());
      }
    }
  };
  return provider;
}
