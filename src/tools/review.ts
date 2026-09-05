import type { McpServer } from "@modelcontextprotocol/server";
import { ZodError } from "zod/v4";
import {
  reviewRequestSchema,
  reviewResponseSchema,
  type ReviewRequest,
  type ReviewResponse,
  type ReviewToolResult
} from "../contracts/review.js";
import { normalizeEvidenceBundle } from "../evidence/index.js";
import { EvidenceLensError, toToolErrorResult } from "../errors.js";
import type { FilesystemPolicy } from "../filesystem/policy.js";
import type { FilesystemReadAdapter } from "../filesystem/read.js";
import { buildReviewAnalysisInput, cloneReviewAnalysisInputForAnalyzer } from "../review/analysis.js";
import { createDeterministicReviewAnalyzer, type ReviewAnalyzer } from "../review/engine.js";
import { validateReviewRoles } from "../review/roles.js";
import { computeProviderInputFingerprint } from "../providers/deepseek.js";
import { isProviderReviewResultEnvelope, PROVIDER_PROMPT_VERSION, providerInferenceSettingsSchema, providerReviewResultSchema, type ProviderEvidenceItem, type ProviderReviewRequest, type ProviderReviewResult, type ReviewProvider } from "../providers/types.js";
import type { ProviderConfig } from "../providers/config.js";
import { ProviderError } from "../providers/errors.js";
import { reviewFindingSchema, type ReviewFinding } from "../contracts/review.js";

const SERVER_NAME = "evidencelens";
const SERVER_VERSION = "0.1.3";
const GENERATED_AT = "1970-01-01T00:00:00.000Z";
const SUPPORTED_EVIDENCE_TYPES = new Set(["text", "pdf", "image", "screenshot", "table"]);
const TRUSTED_ANALYZER_IDENTITY = {
  name: "deterministic-rules",
  version: "1.0.0"
} as const;

export interface ReviewHandlerOptions {
  filesystemPolicy?: FilesystemPolicy;
  filesystemReadAdapter?: FilesystemReadAdapter;
  provider?: ReviewProvider;
  providerConfig?: Pick<ProviderConfig, "model" | "temperature" | "maxTokens">;
  analyzer?: ReviewAnalyzer;
}

const DEFAULT_PROVIDER_INFERENCE = {
  model: "deepseek-v4-pro",
  temperature: 0.2,
  maxTokens: 4_000
} as const;

function providerEvidence(analysis: ReturnType<typeof buildReviewAnalysisInput>): ProviderEvidenceItem[] {
  const normalizedById = new Map(analysis.normalizedEvidence.map((evidence) => [evidence.source.id, evidence]));
  return analysis.payloads.map((payload) => {
    const normalized = normalizedById.get(payload.evidenceId);
    const visualPayloads = normalized?.source.type === "pdf"
      ? (normalized.visualPayloads ?? []).map((visual) => ({
          mimeType: visual.mimeType as "image/png" | "image/jpeg",
          base64: visual.base64,
          byteLength: visual.byteLength,
          sha256: visual.sha256,
          width: visual.width,
          height: visual.height,
          evidenceId: payload.evidenceId,
          location: normalized.references.find((reference): reference is Extract<typeof reference, { kind: "pdf" }> => reference.kind === "pdf" && reference.pageNumber === visual.pageNumber)
            ?? { kind: "pdf", pageNumber: visual.pageNumber }
        }))
      : normalized?.visualPayload
        ? [{
            mimeType: normalized.visualPayload.mimeType as "image/png" | "image/jpeg",
            base64: normalized.visualPayload.base64,
            byteLength: normalized.visualPayload.byteLength,
            sha256: normalized.visualPayload.sha256,
            width: normalized.visualPayload.width,
            height: normalized.visualPayload.height,
            evidenceId: payload.evidenceId,
            location: normalized.references.find((reference): reference is Extract<typeof reference, { kind: "image" }> => reference.kind === "image")
              ?? { kind: "image" }
          }]
        : undefined;
    return {
      evidenceId: payload.evidenceId,
      role: payload.role,
      type: payload.type,
      contentHash: payload.contentHash,
      sourceReference: payload.reference,
      references: payload.references,
      ...(payload.text !== undefined ? { text: payload.text } : {}),
      ...(payload.tableCells !== undefined ? {
        tableCells: payload.tableCells.map((cell) => ({
          value: cell.value,
          evidenceId: payload.evidenceId,
          role: payload.role,
          location: cell.location
        }))
      } : {}),
      ...(visualPayloads?.length ? { visualPayloads } : {})
    };
  });
}

function providerRequest(
  analysis: ReturnType<typeof buildReviewAnalysisInput>,
  request: ReviewRequest,
  providerConfig: ReviewHandlerOptions["providerConfig"]
): ProviderReviewRequest {
  const config = providerConfig ?? DEFAULT_PROVIDER_INFERENCE;
  const inference = providerInferenceSettingsSchema.parse({
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens
  });
  const withoutFingerprint = structuredClone({
    evidence: providerEvidence(analysis),
    requirements: analysis.requirements.map(({ text, evidenceId, role, location, kind }) => ({ text, evidenceId, role, location, kind })),
    solutionClaims: analysis.solutionClaims.map(({ text, evidenceId, role, location, kind }) => ({ text, evidenceId, role, location, kind })),
    objective: request.objective,
    promptVersion: PROVIDER_PROMPT_VERSION,
    inference
  } satisfies Omit<ProviderReviewRequest, "inputFingerprint">);
  return { ...withoutFingerprint, inputFingerprint: computeProviderInputFingerprint(withoutFingerprint) };
}

function freezeOwnedTree<T>(owned: T): T {
  const seen = new Set<object>();
  const freeze = (value: unknown): void => {
    if (typeof value !== "object" || value === null || seen.has(value)) return;
    seen.add(value);
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(owned);
  return owned;
}

function freezeProviderRequest(request: ProviderReviewRequest): Readonly<ProviderReviewRequest> {
  return freezeOwnedTree(request);
}

function namespaceProviderFindings(result: ProviderReviewResult, deterministic: readonly ReviewFinding[]): ReviewFinding[] {
  if (!result.provider || !/^[a-z][a-z0-9-]{0,31}$/u.test(result.provider)) throw new ProviderError("PROVIDER_INVALID_RESPONSE");
  const deterministicIds = new Set(deterministic.map((finding) => finding.id));
  const namespaced = result.modelFindings.map((finding) => {
    const id = `provider:${result.provider}:${finding.id}`;
    const parsed = reviewFindingSchema.safeParse({ ...finding, id });
    if (!parsed.success || deterministicIds.has(id)) throw new ProviderError("PROVIDER_INVALID_RESPONSE");
    return parsed.data;
  });
  if (new Set(namespaced.map((finding) => finding.id)).size !== namespaced.length) throw new ProviderError("PROVIDER_INVALID_RESPONSE");
  return namespaced;
}

/** @internal */
export function assertNoForbiddenProviderAuthoredStrings(
  findings: readonly ReviewFinding[],
  forbiddenValues: ReadonlySet<string>
): void {
  for (const finding of findings) {
    const idSuffix = finding.id.replace(/^provider:[a-z][a-z0-9-]{0,31}:/u, "");
    const authoredStrings = [
      idSuffix,
      finding.title,
      finding.summary,
      finding.observation,
      finding.interpretation,
      ...(finding.uncertainty === undefined ? [] : [finding.uncertainty]),
      ...finding.followUpChecks
    ];
    if (authoredStrings.some((value) => [...forbiddenValues].some((forbidden) => value.includes(forbidden)))) {
      throw new ProviderError("PROVIDER_INVALID_RESPONSE");
    }
  }
}

function validateProviderResultIdentity(
  provider: ReviewProvider,
  request: ProviderReviewRequest,
  result: ProviderReviewResult
): void {
  if (
    result.provider !== provider.name
    || result.model !== request.inference.model
    || result.promptVersion !== request.promptVersion
    || result.inputFingerprint !== request.inputFingerprint
  ) {
    throw new ProviderError("PROVIDER_INVALID_RESPONSE");
  }
}

interface InternalReviewResult {
  deterministicFindings: readonly ReviewFinding[];
  providerResult?: ProviderReviewResult;
  providerFindings: readonly ReviewFinding[];
}

type CleanupRegistrationObserver = (
  stage: "original" | "isolated",
  analysis: ReturnType<typeof buildReviewAnalysisInput>
) => void;

async function createReviewResponse(
  request: ReviewRequest,
  options: ReviewHandlerOptions = {},
  onCleanupRegistered?: CleanupRegistrationObserver
): Promise<ReviewResponse> {
  let filesystemPolicy: FilesystemPolicy | undefined;
  let filesystemReadAdapter: FilesystemReadAdapter | undefined;
  try {
    filesystemPolicy = options.filesystemPolicy;
    filesystemReadAdapter = options.filesystemReadAdapter;
  } catch {
    throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
  }
  const bundle = await normalizeEvidenceBundle(request.evidence, {
    filesystemPolicy,
    filesystemReadAdapter,
    generatedAt: GENERATED_AT
  });
  const analysis = buildReviewAnalysisInput(bundle);
  const cleanupClosures: Array<() => void> = [];
  cleanupClosures.push(analysis.clear.bind(analysis));
  onCleanupRegistered?.("original", analysis);
  let response: ReviewResponse | undefined;
  let pendingError: unknown;
  try {
    const analyzerAnalysis = cloneReviewAnalysisInputForAnalyzer(analysis);
    cleanupClosures.push(analyzerAnalysis.clear.bind(analyzerAnalysis));
    onCleanupRegistered?.("isolated", analyzerAnalysis);
    const provider = options.provider;
    const providerConfig = options.providerConfig;
    const analyzer = options.analyzer ?? createDeterministicReviewAnalyzer();
    const expectedProviderRequest = provider === undefined
      ? undefined
      : freezeProviderRequest(providerRequest(analysis, request, providerConfig));
    let deterministicFindings: readonly ReviewFinding[];
    try {
      const analyzerName = analyzer.name;
      const analyzerVersion = analyzer.version;
      if (analyzerName !== TRUSTED_ANALYZER_IDENTITY.name || analyzerVersion !== TRUSTED_ANALYZER_IDENTITY.version) {
        throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
      }
      deterministicFindings = analyzer.analyze(analyzerAnalysis);
    } catch {
      throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
    }
    const deterministicResponse = reviewResponseSchema.parse({
      ok: true,
      requestId: request.reviewId,
      status: "accepted",
      findings: deterministicFindings,
      normalizedEvidence: bundle.normalizedEvidence,
      metadata: {
        serverName: SERVER_NAME,
        serverVersion: SERVER_VERSION,
        analyzerName: TRUSTED_ANALYZER_IDENTITY.name,
        analyzerVersion: TRUSTED_ANALYZER_IDENTITY.version,
        generatedAt: GENERATED_AT
      }
    });
    const trustedDeterministicFindings = freezeOwnedTree(structuredClone(deterministicResponse.findings));
    const trustedDeterministicResponse = {
      ...deterministicResponse,
      findings: trustedDeterministicFindings
    } satisfies ReviewResponse;
    response = trustedDeterministicResponse;

    if (provider !== undefined) {
      if (expectedProviderRequest === undefined) throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
      let internal: InternalReviewResult;
      let providerMetadata: { provider?: { name: string; model: string } };
      try {
        let untrustedProviderResult: unknown;
        try {
          untrustedProviderResult = await provider.review(expectedProviderRequest);
        } catch (error) {
          if (error instanceof ProviderError) throw error;
          throw new ProviderError("PROVIDER_REQUEST_FAILED");
        }
        if (!isProviderReviewResultEnvelope(untrustedProviderResult)) {
          throw new ProviderError("PROVIDER_INVALID_RESPONSE");
        }
        const parsedProviderResult = providerReviewResultSchema.safeParse(untrustedProviderResult);
        if (!parsedProviderResult.success || !isProviderReviewResultEnvelope(untrustedProviderResult)) {
          throw new ProviderError("PROVIDER_INVALID_RESPONSE");
        }
        const providerResult = parsedProviderResult.data;
        validateProviderResultIdentity(provider, expectedProviderRequest, providerResult);
        const namespacedProviderFindings = namespaceProviderFindings(providerResult, trustedDeterministicFindings);
        providerMetadata = namespacedProviderFindings.length > 0
          ? { provider: { name: providerResult.provider, model: providerResult.model } }
          : {};
        const providerOnlyResponse = reviewResponseSchema.parse({
          ...trustedDeterministicResponse,
          findings: namespacedProviderFindings,
          metadata: { ...trustedDeterministicResponse.metadata, ...providerMetadata }
        });
        const providerFindings = providerOnlyResponse.findings;
        const forbiddenProviderValues = new Set([
          expectedProviderRequest.inputFingerprint,
          expectedProviderRequest.promptVersion
        ].filter((value) => value.length > 0));
        assertNoForbiddenProviderAuthoredStrings(providerFindings, forbiddenProviderValues);
        internal = {
          deterministicFindings: trustedDeterministicFindings,
          providerResult,
          providerFindings
        };
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        throw new ProviderError("PROVIDER_INVALID_RESPONSE");
      }

      const mergedResponse = {
        ...trustedDeterministicResponse,
        findings: [...internal.deterministicFindings, ...internal.providerFindings],
        metadata: { ...trustedDeterministicResponse.metadata, ...providerMetadata }
      } satisfies ReviewResponse;
      response = reviewResponseSchema.parse(mergedResponse);
    }
  } catch (error) {
    pendingError = error instanceof EvidenceLensError || error instanceof ProviderError
      ? error
      : new EvidenceLensError("INTERNAL_ERROR", "Internal error");
  } finally {
    for (const clear of cleanupClosures) {
      try {
        clear();
      } catch {
        if (pendingError === undefined) pendingError = new EvidenceLensError("INTERNAL_ERROR", "Internal error");
      }
    }
  }

  if (pendingError !== undefined) throw pendingError;
  if (response === undefined) throw new EvidenceLensError("INTERNAL_ERROR", "Internal error");
  return response;
}

function errorFromValidation(error: ZodError, input: unknown): EvidenceLensError {
  const evidence = typeof input === "object" && input !== null && "evidence" in input
    ? (input as { evidence?: unknown }).evidence
    : undefined;
  const hasUnsupportedEvidenceType = Array.isArray(evidence) && evidence.some((item) => {
    if (typeof item !== "object" || item === null || !("type" in item)) {
      return false;
    }

    const type = (item as { type?: unknown }).type;
    return typeof type === "string" && !SUPPORTED_EVIDENCE_TYPES.has(type);
  });

  if (hasUnsupportedEvidenceType) {
    return new EvidenceLensError("UNSUPPORTED_EVIDENCE_TYPE", "Unsupported evidence type");
  }

  const code = error.issues.some((issue) => issue.code === "too_big" && issue.path.length === 1 && (issue.path[0] === "evidence" || issue.path[0] === "objective"))
    ? "LIMIT_EXCEEDED"
    : "INVALID_REQUEST";
  return new EvidenceLensError(code, "Review request failed validation");
}

async function handleReviewRequestInternal(
  input: unknown,
  options: ReviewHandlerOptions,
  onCleanupRegistered?: CleanupRegistrationObserver
): Promise<ReviewToolResult> {
  const parsed = reviewRequestSchema.safeParse(input);

  if (!parsed.success) {
    return toToolErrorResult(errorFromValidation(parsed.error, input));
  }

  const roles = validateReviewRoles(parsed.data);
  if (!roles.ok) {
    return toToolErrorResult(new EvidenceLensError("INVALID_REVIEW_ROLES", "Review evidence roles are invalid"));
  }

  try {
    return {
      content: [{ type: "text", text: JSON.stringify(await createReviewResponse(parsed.data, options, onCleanupRegistered)) }]
    };
  } catch (error) {
    if (error instanceof RangeError) {
      return toToolErrorResult(new EvidenceLensError("LIMIT_EXCEEDED", "Evidence content exceeds the configured parser limit"));
    }
    if (error instanceof TypeError) {
      return toToolErrorResult(new EvidenceLensError("INVALID_REQUEST", "Evidence content is invalid"));
    }
    return toToolErrorResult(error);
  }
}

export async function handleReviewRequest(input: unknown, options: ReviewHandlerOptions = {}): Promise<ReviewToolResult> {
  return handleReviewRequestInternal(input, options);
}

/** @internal */
export async function handleReviewRequestForTest(
  input: unknown,
  options: ReviewHandlerOptions,
  onCleanupRegistered: CleanupRegistrationObserver
): Promise<ReviewToolResult> {
  return handleReviewRequestInternal(input, options, onCleanupRegistered);
}

export function registerReviewTool(server: McpServer, options: ReviewHandlerOptions = {}): void {
  server.registerTool(
    "review_evidence",
    {
      title: "Review Evidence",
      description: "Apply deterministic review rules with optional provider-backed findings, returning role-aware results with typed citations, uncertainty, and follow-up checks.",
      inputSchema: reviewRequestSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (input) => handleReviewRequest(input, options)
  );
}
