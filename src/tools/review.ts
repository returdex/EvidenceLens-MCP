import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import type { ReviewResponse } from "../contracts/review.js";

const SERVER_NAME = "evidencelens";
const SERVER_VERSION = "0.1.0";
const GENERATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_REQUEST_ID = "phase-1-review";

const reviewInputSchema = z
  .object({
    reviewId: z.string().optional(),
    objective: z.string().optional(),
    evidence: z.array(z.unknown()).optional(),
    limits: z.unknown().optional()
  })
  .passthrough();

type ReviewToolInput = z.infer<typeof reviewInputSchema>;

function createReviewResponse(input: ReviewToolInput): ReviewResponse {
  return {
    requestId: input.reviewId ?? DEFAULT_REQUEST_ID,
    status: "accepted",
    findings: [],
    metadata: {
      serverName: SERVER_NAME,
      serverVersion: SERVER_VERSION,
      generatedAt: GENERATED_AT
    }
  };
}

export function registerReviewTool(server: McpServer): void {
  server.registerTool(
    "review_evidence",
    {
      title: "Review Evidence",
      description: "Accept Phase 1 evidence review metadata and return a deterministic skeleton response.",
      inputSchema: reviewInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (input) => {
      const response = createReviewResponse(input);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response)
          }
        ]
      };
    }
  );
}
