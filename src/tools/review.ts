import type { McpServer } from "@modelcontextprotocol/server";
import { ZodError } from "zod/v4";
import {
  reviewRequestSchema,
  type ReviewRequest,
  type ReviewResponse,
  type ReviewToolResult
} from "../contracts/review.js";
import { normalizeEvidenceItems } from "../evidence/index.js";
import { EvidenceLensError, toToolErrorResult } from "../errors.js";
import type { FilesystemPolicy } from "../filesystem/policy.js";
import type { FilesystemReadAdapter } from "../filesystem/read.js";

const SERVER_NAME = "evidencelens";
const SERVER_VERSION = "0.1.1";
const GENERATED_AT = "1970-01-01T00:00:00.000Z";
const SUPPORTED_EVIDENCE_TYPES = new Set(["text", "pdf", "image", "screenshot", "table"]);

export interface ReviewHandlerOptions {
  filesystemPolicy?: FilesystemPolicy;
  filesystemReadAdapter?: FilesystemReadAdapter;
}

async function createReviewResponse(request: ReviewRequest, options: ReviewHandlerOptions = {}): Promise<ReviewResponse> {
  const normalizedEvidence = await normalizeEvidenceItems(request.evidence, { ...options, generatedAt: GENERATED_AT });
  return {
    ok: true,
    requestId: request.reviewId,
    status: "accepted",
    findings: [],
    normalizedEvidence,
    metadata: {
      serverName: SERVER_NAME,
      serverVersion: SERVER_VERSION,
      generatedAt: GENERATED_AT
    }
  };
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
      description: "Accept Phase 1 evidence review metadata and return a deterministic skeleton response.",
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
