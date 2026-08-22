import { describe, expect, it } from "vitest";
import {
  evidenceTypeSchema,
  reviewCitationSchema,
  reviewFindingSchema,
  reviewFindingTypeSchema,
  reviewObservationSchema,
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
      normalizedEvidence: [],
      metadata: {
        serverName: "evidencelens",
        serverVersion: "0.1.2",
        analyzerName: "deterministic-rules",
        analyzerVersion: "1.0.0",
        generatedAt: "1970-01-01T00:00:00.000Z"
      }
    }).success).toBe(true);
    expect(reviewToolResultSchema.safeParse({ content: [{ type: "text", text: "{}" }] }).success).toBe(true);
  });

  it("preserves supported evidence types and accepts bounded Phase 2 content", () => {
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
    ).toBe(true);
  });

  it("requires deterministic response metadata with accepted skeleton status", () => {
    const parsed = reviewResponseSchema.parse({
      ok: true,
      requestId: "review-001",
      status: "accepted",
      findings: [],
      normalizedEvidence: [],
      metadata: {
        serverName: "evidencelens",
        serverVersion: "0.1.2",
        analyzerName: "deterministic-rules",
        analyzerVersion: "1.0.0",
        generatedAt: "1970-01-01T00:00:00.000Z"
      }
    });

    expect(parsed.status).toBe("accepted");
    expect(parsed.requestId).toBe("review-001");
    expect(parsed.findings).toEqual([]);
    expect(parsed.normalizedEvidence).toEqual([]);
    expect(parsed.metadata).toEqual({
      serverName: "evidencelens",
      serverVersion: "0.1.0",
      generatedAt: "1970-01-01T00:00:00.000Z"
    });
  });

  it("defines provider-neutral observations and all finding categories", () => {
    expect(reviewFindingTypeSchema.options).toEqual(["omission", "contradiction", "requirement_conflict", "evidence_quality"]);
    expect(reviewObservationSchema.safeParse({ observation: "The requirement is not addressed." }).success).toBe(true);
    expect(reviewObservationSchema.safeParse({ observation: "Observed", provider: "secret-model" }).success).toBe(false);

    for (const type of reviewFindingTypeSchema.options) {
      expect(reviewFindingSchema.safeParse({
        id: `finding-${type}`,
        type,
        severity: "medium",
        confidence: "unknown",
        title: "Finding",
        summary: "A bounded summary.",
        observation: "A bounded observation.",
        interpretation: "A bounded interpretation.",
        followUpChecks: ["Check the source again."],
        evidenceIds: ["brief-1"],
        citations: [{
          evidenceId: "brief-1",
          role: "assignment_brief",
          contentHash: "a".repeat(64),
          sourceReference: "inline://brief-1",
          location: { kind: "text", startLine: 1, endLine: 1 },
          visual: false
        }]
      }).success).toBe(true);
    }
  });

  it("rejects ambiguous citations and enforces finding invariants", () => {
    const citation = {
      evidenceId: "brief-1",
      role: "assignment_brief",
      contentHash: "a".repeat(64),
      sourceReference: "inline://brief-1",
      location: { kind: "text", startLine: 1, endLine: 1 },
      visual: false
    };
    expect(reviewCitationSchema.safeParse({ ...citation, location: { path: "/tmp/secret" } }).success).toBe(false);
    expect(reviewCitationSchema.safeParse({ ...citation, visual: true }).success).toBe(false);
    expect(reviewCitationSchema.safeParse({ ...citation, extra: true }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({
      id: "f1", type: "omission", severity: "low", confidence: "high", title: "T", summary: "S",
      observation: "O", interpretation: "I", uncertainty: "", followUpChecks: ["F"], evidenceIds: ["brief-1", "brief-1"], citations: [citation]
    }).success).toBe(false);
  });

  it("rejects duplicate evidence ids at deterministic evidence-index paths", () => {
    const parsed = reviewRequestSchema.safeParse({
      reviewId: "r1", objective: "Review it.", evidence: [
        { id: "same", role: "other", type: "text" },
        { id: "same", role: "other", type: "text" },
        { id: "same", role: "other", type: "text" }
      ]
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path)).toEqual([["evidence", 1, "id"], ["evidence", 2, "id"]]);
    }
  });
});
