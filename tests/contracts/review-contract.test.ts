import { describe, expect, it } from "vitest";
import {
  evidenceTypeSchema,
  reviewEvidenceInputSchema,
  reviewRequestSchema,
  reviewResponseSchema,
  reviewToolResultSchema
} from "../../src/contracts/review.js";

describe("Phase 1 review contract", () => {
  it("exports runtime schemas for request, response, and MCP tool result validation", () => {
    expect(reviewRequestSchema.safeParse({ reviewId: "r1", objective: "Review it." }).success).toBe(true);
    expect(reviewResponseSchema.safeParse({
      ok: true,
      requestId: "r1",
      status: "accepted",
      findings: [],
      metadata: {
        serverName: "evidencelens",
        serverVersion: "0.1.0",
        generatedAt: "1970-01-01T00:00:00.000Z"
      }
    }).success).toBe(true);
    expect(reviewToolResultSchema.safeParse({ content: [{ type: "text", text: "{}" }] }).success).toBe(true);
  });

  it("keeps evidence metadata-only and includes Phase 1 supported evidence types", () => {
    expect(evidenceTypeSchema.options).toEqual(["text", "pdf", "image", "screenshot", "table"]);
    expect(
      reviewEvidenceInputSchema.safeParse({
        id: "brief-1",
        role: "assignment_brief",
        type: "text",
        reference: "opaque-reference"
      }).success
    ).toBe(true);
    expect(
      reviewEvidenceInputSchema.safeParse({
        id: "brief-1",
        role: "assignment_brief",
        type: "text",
        path: "/tmp/brief.txt"
      }).success
    ).toBe(false);
    expect(
      reviewEvidenceInputSchema.safeParse({
        id: "brief-1",
        role: "assignment_brief",
        type: "text",
        content: "raw evidence"
      }).success
    ).toBe(false);
  });

  it("requires deterministic response metadata with accepted skeleton status", () => {
    const parsed = reviewResponseSchema.parse({
      ok: true,
      requestId: "review-001",
      status: "accepted",
      findings: [],
      metadata: {
        serverName: "evidencelens",
        serverVersion: "0.1.0",
        generatedAt: "1970-01-01T00:00:00.000Z"
      }
    });

    expect(parsed.status).toBe("accepted");
    expect(parsed.requestId).toBe("review-001");
    expect(parsed.findings).toEqual([]);
    expect(parsed.metadata).toEqual({
      serverName: "evidencelens",
      serverVersion: "0.1.0",
      generatedAt: "1970-01-01T00:00:00.000Z"
    });
  });
});
