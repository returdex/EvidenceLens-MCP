import { describe, expect, it } from "vitest";
import {
  reviewRequestSchema,
  reviewToolResultSchema,
  type ReviewToolResult
} from "../../src/contracts/review.js";
import { EvidenceLensError, toToolErrorResult } from "../../src/errors.js";

const validRequest = {
  reviewId: "review-001",
  objective: "Check the submitted solution against the rubric.",
  evidence: [
    {
      id: "brief-1",
      role: "assignment_brief",
      type: "text",
      reference: "course/assignment-brief"
    }
  ],
  limits: {
    maxEvidenceItems: 20,
    maxObjectiveLength: 4000
  }
};

describe("review_evidence schema and error contract", () => {
  it("accepts a valid metadata-only review request schema", () => {
    const parsed = reviewRequestSchema.safeParse(validRequest);

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid schema inputs before handler wiring", () => {
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: Array.from({ length: 21 }, (_, index) => ({
          id: `evidence-${index}`,
          role: "other",
          type: "text"
        }))
      }).success
    ).toBe(false);

    expect(reviewRequestSchema.safeParse({ ...validRequest, objective: "a".repeat(4001) }).success).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "bad-type", role: "other", type: "audio" }]
      }).success
    ).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "", role: "other", type: "text" }]
      }).success
    ).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "bad-reference", role: "other", type: "text", reference: "safe\u0000unsafe" }]
      }).success
    ).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "bad-reference", role: "other", type: "text", reference: "safe\nunsafe" }]
      }).success
    ).toBe(false);
  });

  it("parses MCP text-content wrappers returned by success and error helpers", () => {
    const toolResult: ReviewToolResult = {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true })
        }
      ]
    };

    expect(reviewToolResultSchema.parse(toolResult)).toEqual(toolResult);
    expect(reviewToolResultSchema.parse(toToolErrorResult(new EvidenceLensError("INVALID_REQUEST", "Bad input")))).toEqual(
      toToolErrorResult(new EvidenceLensError("INVALID_REQUEST", "Bad input"))
    );
  });

  it("serializes sanitized stable machine-readable error JSON", () => {
    const result = toToolErrorResult(
      new EvidenceLensError("INVALID_REQUEST", "Bad input\nwith /Users/example/secret.txt details")
    );
    const payload = JSON.parse(result.content[0]?.text ?? "{}");

    expect(payload).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      message: expect.any(String)
    });
    expect(payload.message).not.toContain("\n");
    expect(payload.message).not.toContain("/Users/example/secret.txt");
  });
});
