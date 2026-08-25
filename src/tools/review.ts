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
import { buildReviewAnalysisInput } from "../review/analysis.js";
import { createDeterministicReviewAnalyzer } from "../review/engine.js";
import { validateReviewRoles } from "../review/roles.js";
import { computeProviderInputFingerprint } from "../providers/deepseek.js";
import { PROVIDER_PROMPT_VERSION, type ProviderEvidenceItem, type ProviderReviewRequest, type ProviderReviewResult, type ReviewProvider } from "../providers/types.js";
import type { ProviderConfig } from "../providers/config.js";
import { ProviderError } from "../providers/errors.js";
import { reviewFindingSchema, type ReviewFinding } from "../contracts/review.js";

const SERVER_NAME = "evidencelens";
const SERVER_VERSION = "0.1.3";
const GENERATED_AT = "1970-01-01T00:00:00.000Z";
const SUPPORTED_EVIDENCE_TYPES = new Set(["text", "pdf", "image", "screenshot", "table"]);

export interface ReviewHandlerOptions {
  filesystemPolicy?: FilesystemPolicy;
  filesystemReadAdapter?: FilesystemReadAdapter;
  provider?: ReviewProvider;
  providerConfig?: Pick<ProviderConfig, "model" | "temperature" | "maxTokens">;
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

function providerRequest(analysis: ReturnType<typeof buildReviewAnalysisInput>, request: ReviewRequest, options: ReviewHandlerOptions): ProviderReviewRequest {
  const inference = options.providerConfig ?? DEFAULT_PROVIDER_INFERENCE;
  const withoutFingerprint = {
    evidence: providerEvidence(analysis),
    requirements: analysis.requirements.map(({ text, evidenceId, role, location, kind }) => ({ text, evidenceId, role, location, kind })),
    solutionClaims: analysis.solutionClaims.map(({ text, evidenceId, role, location, kind }) => ({ text, evidenceId, role, location, kind })),
    objective: request.objective,
    promptVersion: PROVIDER_PROMPT_VERSION,
    inference
  } satisfies Omit<ProviderReviewRequest, "inputFingerprint">;
  return { ...withoutFingerprint, inputFingerprint: computeProviderInputFingerprint(withoutFingerprint) };
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

interface InternalReviewResult {
  deterministicFindings: readonly ReviewFinding[];
  providerResult?: ProviderReviewResult;
  providerFindings: readonly ReviewFinding[];
}

async function createReviewResponse(request: ReviewRequest, options: ReviewHandlerOptions = {}): Promise<ReviewResponse> {
  const bundle = await normalizeEvidenceBundle(request.evidence, { ...options, generatedAt: GENERATED_AT });
  const analysis = buildReviewAnalysisInput(bundle);
  const analyzer = createDeterministicReviewAnalyzer();
  try {
    const deterministicFindings = analyzer.analyze(analysis);
    const providerResult = options.provider
      ? await options.provider.review(providerRequest(analysis, request, options))
      : undefined;
    const internal: InternalReviewResult = {
      deterministicFindings,
      providerResult,
      providerFindings: providerResult ? namespaceProviderFindings(providerResult, deterministicFindings) : []
    };
    const response = {
    ok: true,
    requestId: request.reviewId,
    status: "accepted",
    findings: [...internal.deterministicFindings, ...internal.providerFindings],
    normalizedEvidence: bundle.normalizedEvidence,
    metadata: {
      serverName: SERVER_NAME,
      serverVersion: SERVER_VERSION,
      analyzerName: analyzer.name,
      analyzerVersion: analyzer.version,
      generatedAt: GENERATED_AT
    }
    } satisfies ReviewResponse;
    return reviewResponseSchema.parse(response);
  } finally {
    analysis.clear();
  }
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

export async function handleReviewRequest(input: unknown, options: ReviewHandlerOptions = {}): Promise<ReviewToolResult> {
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
      content: [{ type: "text", text: JSON.stringify(await createReviewResponse(parsed.data, options)) }]
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

export function registerReviewTool(server: McpServer, options: ReviewHandlerOptions = {}): void {
  server.registerTool(
    "review_evidence",
    {
      title: "Review Evidence",
      description: "Analyze bounded evidence deterministically and return role-aware omissions, contradictions, and requirement conflicts with typed citations, uncertainty, and follow-up checks.",
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
